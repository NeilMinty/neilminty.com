const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const FIRECRAWL_BASE = 'https://api.firecrawl.dev/v1'
const ANTHROPIC_API  = 'https://api.anthropic.com/v1/messages'
const HAIKU_MODEL    = 'claude-haiku-4-5-20251001'
const SOURCE_CAP     = 6
const CONTENT_WORDS  = 400

// ─── TYPES ────────────────────────────────────────────────────────────────────

type SourceType    = 'editorial' | 'community' | 'aggregator' | 'expert'
type CoverageLevel = 'strong' | 'partial' | 'absent'

interface BrandMention {
  url:                 string
  source_type:         SourceType
  mentioned:           boolean
  context:             string | null
  competitors_on_page: string[]
}

interface SignalCoverageResult {
  category:        string
  sources_checked: number
  brand_mentions:  BrandMention[]
  signal_summary: {
    editorial_coverage:           CoverageLevel
    community_coverage:           CoverageLevel
    expert_coverage:              CoverageLevel
    top_competitors_by_frequency: string[]
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function extractBrandName(domain: string): string {
  const host  = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
  const noTld = host.replace(/(\.[a-z]{2,4}){1,2}$/, '')
  return noTld.replace(/[-_.]/g, ' ').toLowerCase().trim()
}

function classifyUrl(url: string): SourceType {
  const lower = url.toLowerCase()
  if (lower.includes('reddit.com') || lower.includes('quora.com') || lower.includes('stackexchange'))
    return 'community'
  if (lower.includes('examine.com') || lower.includes('healthline.com') || lower.includes('webmd.com') ||
      lower.includes('nhs.uk') || lower.includes('pubmed') || lower.includes('mayoclinic') ||
      lower.includes('nih.gov') || lower.includes('cochrane') || lower.includes('aad.org') ||
      lower.includes('skincancer.org') || lower.includes('dermnetnz.org'))
    return 'expert'
  if (lower.includes('amazon.com') || lower.includes('trustpilot') || lower.includes('tripadvisor') ||
      lower.includes('yelp.com') || lower.includes('google.com/shopping') || lower.includes('iherb'))
    return 'aggregator'
  return 'editorial'
}

function truncateToWords(text: string, limit: number): string {
  const words = text.trim().split(/\s+/)
  return words.length <= limit ? text : words.slice(0, limit).join(' ') + ' …'
}

function isMentioned(content: string, brandName: string, domain: string): boolean {
  const lower    = content.toLowerCase()
  const domainCore = domain.replace(/\.[^.]+$/, '').replace(/^www\./, '').toLowerCase()
  return lower.includes(brandName) || lower.includes(domainCore)
}

function coverageLevel(mentions: BrandMention[], type: SourceType): CoverageLevel {
  const ofType = mentions.filter(m => m.source_type === type)
  if (ofType.length === 0) return 'absent'
  return ofType.some(m => m.mentioned) ? 'strong' : 'partial'
}

function getExpertQuery(category: string): string {
  if (/skincare|spf|sunscreen|suntan|\buv\b/i.test(category))
    return `dermatologist recommended ${category} site:aad.org OR site:skincancer.org OR dermatologist review`
  if (/supplement|vitamin|nutrition/i.test(category))
    return `clinical evidence ${category} site:examine.com OR site:nih.gov OR registered dietitian`
  if (/footwear|running|sport/i.test(category))
    return `podiatrist OR sports medicine ${category} review`
  return `expert review ${category} clinical evidence`
}

// ─── ANTHROPIC ────────────────────────────────────────────────────────────────

async function anthropicCall(
  system: string,
  user:   string,
  apiKey: string,
  maxTokens: number,
): Promise<string> {
  const res = await fetch(ANTHROPIC_API, {
    method:  'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      model:      HAIKU_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  const data = await res.json() as { content?: Array<{ text: string }>; error?: { message: string } }
  if (!res.ok) throw new Error(data.error?.message ?? `Anthropic HTTP ${res.status}`)
  return data.content?.[0]?.text?.trim() ?? ''
}

// ─── FIRECRAWL SEARCH ─────────────────────────────────────────────────────────

interface FirecrawlResult { url: string; markdown: string }

async function firecrawlSearch(
  query:        string,
  limit:        number,
  firecrawlKey: string,
): Promise<FirecrawlResult[]> {
  try {
    const res = await fetch(`${FIRECRAWL_BASE}/search`, {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        query,
        limit,
        scrapeOptions: { formats: ['markdown'], onlyMainContent: true },
      }),
    })
    if (!res.ok) {
      console.info(`[geo-signal] search "${query}" returned ${res.status}`)
      return []
    }
    const data = await res.json() as { success: boolean; data?: FirecrawlResult[] }
    return data.data ?? []
  } catch (err) {
    console.info(`[geo-signal] search "${query}" threw:`, err)
    return []
  }
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { domain, verdict } = await req.json() as { domain?: string; verdict?: string }

    if (!domain || !verdict) {
      return new Response(
        JSON.stringify({ success: false, error: 'domain and verdict are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY')
    const anthropicKey = Deno.env.get('Anthropic_GEO_Key')

    if (!firecrawlKey || !anthropicKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'API keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── Step 1: Infer category ─────────────────────────────────────────────
    const stripMarkdown = (s: string) => s.replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '').trim()

    let category = stripMarkdown(await anthropicCall(
      'What is the single primary commercial category of this brand? Identify the dominant revenue category only — ignore incidental product mentions, lifestyle content, or secondary ranges. If the brand sells across multiple categories, return the one most central to its commercial identity. Examples: "athletic footwear", "nutritional supplements", "skincare", "outdoor apparel". Maximum 3 words. Return the category only, no punctuation, no preamble. Return plain text only. No markdown, no bold, no asterisks.',
      `Verdict: "${verdict}"`,
      anthropicKey,
      20,
    ))

    // Guard: retry if response is too generic (e.g. "Home goods retail")
    let retryFired = false
    if (/\b(retail|goods|products|store|shop)\b/i.test(category)) {
      retryFired = true
      console.info(`[geo-signal] category "${category}" too generic, retrying`)
      const retry = stripMarkdown(await anthropicCall(
        'Name the specific product type this brand sells. One noun phrase, maximum 3 words, no retail/commerce words. Return plain text only. No markdown, no bold, no asterisks.',
        `Verdict: "${verdict}"`,
        anthropicKey,
        20,
      ))
      if (retry) category = retry
    }

    console.info('[geo-signal-coverage] category_extracted:', category)
    console.info('[geo-signal-coverage] retry_fired:', retryFired)
    console.info(`[geo-signal] domain=${domain} category="${category}"`)

    const brandName = extractBrandName(domain)
    const year      = new Date().getFullYear()

    // ── Step 2: Build and run searches in parallel ─────────────────────────
    const searchConfigs: Array<{ query: string; limit: number }> = [
      { query: `best ${category} ${year} review`,          limit: 2 },
      { query: `top ${category} brands recommended`,       limit: 1 },
      { query: `reddit ${category} which brand recommend`, limit: 2 },
      { query: getExpertQuery(category),                   limit: 2 },
    ]

    const searchSettled = await Promise.allSettled(
      searchConfigs.map(({ query, limit }) => firecrawlSearch(query, limit, firecrawlKey)),
    )

    const rawResults: FirecrawlResult[] = []
    for (const r of searchSettled) {
      if (r.status === 'fulfilled') rawResults.push(...r.value)
    }

    // Deduplicate and cap
    const seen = new Set<string>()
    const dedupedResults = rawResults
      .filter(r => r.url && !seen.has(r.url) && seen.add(r.url))
      .slice(0, SOURCE_CAP)

    console.info(`[geo-signal] ${dedupedResults.length} unique sources to analyse`)

    if (dedupedResults.length === 0) {
      const emptyResult: SignalCoverageResult = {
        category,
        sources_checked: 0,
        brand_mentions:  [],
        signal_summary: {
          editorial_coverage:           'absent',
          community_coverage:           'absent',
          expert_coverage:              'absent',
          top_competitors_by_frequency: [],
        },
      }
      return new Response(
        JSON.stringify({ success: true, result: emptyResult }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── Step 3: Single Anthropic call to extract mentions + competitors ────
    const pagesSummary = dedupedResults
      .map((r, i) => `--- Source ${i + 1}: ${r.url} ---\n${truncateToWords(r.markdown ?? '', CONTENT_WORDS)}`)
      .join('\n\n')

    const analysisRaw = await anthropicCall(
      `Analyse web pages for brand mentions and competitor names.
Return a JSON array — one object per source:
[{
  "source_index": number (1-based),
  "mentioned_brands": string[] (up to 8 specific brand/product names found; exclude generic words),
  "context_if_target_present": string | null (one sentence only if the target brand is mentioned; otherwise null)
}]
Return JSON array only.`,
      `Target brand: "${brandName}" (domain: ${domain})\n\n${pagesSummary}`,
      anthropicKey,
      900,
    )

    let analysis: Array<{
      source_index:              number
      mentioned_brands:          string[]
      context_if_target_present: string | null
    }> = []
    try {
      const cleaned = analysisRaw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      analysis = JSON.parse(cleaned)
    } catch {
      console.info('[geo-signal] analysis JSON parse failed, using string-match fallback')
    }

    // ── Step 4: Assemble brand_mentions ───────────────────────────────────
    const brandMentions: BrandMention[] = dedupedResults.map((r, i) => {
      const sourceType = classifyUrl(r.url)
      const aiResult   = analysis.find(a => a.source_index === i + 1)
      const mentioned  = aiResult?.context_if_target_present !== null && aiResult?.context_if_target_present !== undefined
        ? true
        : isMentioned(r.markdown ?? '', brandName, domain)
      const context    = aiResult?.context_if_target_present ?? null
      const competitors = (aiResult?.mentioned_brands ?? [])
        .filter(b => b.length > 2 && !b.toLowerCase().includes(brandName.split(' ')[0]))
        .slice(0, 5)

      return { url: r.url, source_type: sourceType, mentioned, context, competitors_on_page: competitors }
    })

    // ── Step 5: Aggregate competitor frequency ────────────────────────────
    const freq: Record<string, number> = {}
    for (const m of brandMentions) {
      for (const c of m.competitors_on_page) {
        const key  = c.toLowerCase()
        freq[key]  = (freq[key] ?? 0) + 1
      }
    }
    const topCompetitors = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name)

    const result: SignalCoverageResult = {
      category,
      sources_checked: dedupedResults.length,
      brand_mentions:  brandMentions,
      signal_summary: {
        editorial_coverage:           coverageLevel(brandMentions, 'editorial'),
        community_coverage:           coverageLevel(brandMentions, 'community'),
        expert_coverage:              coverageLevel(brandMentions, 'expert'),
        top_competitors_by_frequency: topCompetitors,
      },
    }

    const mentionCount = brandMentions.filter(m => m.mentioned).length
    console.info(`[geo-signal] complete: ${mentionCount}/${dedupedResults.length} sources mention brand`)

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[geo-signal] unhandled error:', error)
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
