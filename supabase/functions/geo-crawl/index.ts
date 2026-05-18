import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const FIRECRAWL_BASE = 'https://api.firecrawl.dev/v1'
const WORD_FLOOR     = 120
const PAGE_HARD_CAP  = 15

const SAMPLE_LIMITS = { product: 3, collection: 2, content: 3, core: 3 } as const
type PageType = keyof typeof SAMPLE_LIMITS | 'other'

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function classifyUrl(raw: string): PageType {
  try {
    const { pathname } = new URL(raw)
    const p = pathname.toLowerCase()
    // Products
    if (/\/(products?|item|pd)\/[^/]/.test(p)) return 'product'
    // Collections / categories
    if (/\/(collections?|categor(y|ies)|cat)\/[^/]/.test(p)) return 'collection'
    // Content — /blog/, /blogs/, /articles/, /news/, /posts/, /learn/, /guides/, /resources/, /journal/
    if (/\/(blogs?|articles?|news|posts?|learn|guides?|resources?|journal)\/[^/]/.test(p)) return 'content'
    // Core — bare paths and Shopify /pages/* convention
    if (p === '/' || /^\/(pages\/)?(about|contact|faq|faqs?|pricing|our-story|how-it-works|who-we-are)(\/|$)/.test(p)) return 'core'
    return 'other'
  } catch {
    return 'other'
  }
}

function normaliseUrl(raw: string): string {
  try {
    const u = new URL(raw)
    u.search = ''
    u.hash   = ''
    return u.toString().replace(/\/$/, '') || raw
  } catch {
    return raw
  }
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

// Cookie/consent noise patterns — if these dominate, the page didn't load properly
const NOISE_PATTERNS = [
  /\bcookies?\b/i,
  /\bconsent\b/i,
  /\baccept all\b/i,
  /\bprivacy preference/i,
  /\bwe use cookies\b/i,
]

// Returns a reason string if the page should be excluded, null if it passes
function getNoiseReason(text: string, url: string): string | null {
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 15)

  const unique = new Set(sentences.map(s => s.toLowerCase()))
  const totalWords = countWords(text)

  console.log(`[geo-crawl] quality check ${url} — unique sentences: ${unique.size}, words: ${totalWords}`)
  console.log(`[geo-crawl] first 200 chars: ${text.slice(0, 200).replace(/\n/g, ' ')}`)

  if (unique.size < 3) {
    return `unique sentences ${unique.size} < 3`
  }

  const head = text.slice(0, 500).toLowerCase()
  const matchedPatterns = NOISE_PATTERNS.filter(re => re.test(head)).map(re => re.toString())

  if (matchedPatterns.length >= 2 && totalWords < 300) {
    return `noise patterns [${matchedPatterns.join(', ')}] on short page (${totalWords} words)`
  }

  return null
}

// ─── USAGE LOG ────────────────────────────────────────────────────────────────

async function writeUsageLog(params: {
  status:       string
  durationMs:   number
  errorMessage: string | null
}): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !supabaseKey) return

    const supabase = createClient(supabaseUrl, supabaseKey)
    const { error } = await supabase.from('tool_usage_logs').insert({
      session_id:    null,
      tool_name:     'geo-audit',
      api_provider:  'firecrawl',
      model:         null,
      tokens_in:     null,
      tokens_out:    null,
      cost_estimate: null,
      endpoint:      `${FIRECRAWL_BASE}/map+scrape`,
      status:        params.status,
      duration_ms:   params.durationMs,
      error_message: params.errorMessage,
    })
    if (error) console.error('[geo-crawl] usage log error:', error.message)
  } catch (err) {
    console.error('[geo-crawl] writeUsageLog threw:', err)
  }
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startedAt = Date.now()

  try {
    const { domain } = await req.json()

    if (!domain || typeof domain !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'domain is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY')
    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl API key not configured.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Normalise domain to a full URL
    let siteUrl = domain.trim().replace(/\/$/, '')
    if (!siteUrl.startsWith('http://') && !siteUrl.startsWith('https://')) {
      siteUrl = `https://${siteUrl}`
    }

    console.log('[geo-crawl] mapping:', siteUrl)

    // ── Step 1: map ───────────────────────────────────────────────────────────
    const mapRes = await fetch(`${FIRECRAWL_BASE}/map`, {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ url: siteUrl }),
    })

    if (!mapRes.ok) {
      const errData = await mapRes.json().catch(() => ({})) as Record<string, unknown>
      const msg = (errData.error as string | undefined) ?? `Firecrawl map returned ${mapRes.status}`
      await writeUsageLog({ status: 'failed', durationMs: Date.now() - startedAt, errorMessage: msg })
      return new Response(
        JSON.stringify({ success: false, error: 'Could not discover pages for this domain. Check the domain is correct and publicly accessible.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const mapData = await mapRes.json() as { links?: string[] }
    const rawLinks: string[] = mapData.links ?? []
    console.log(`[geo-crawl] map returned ${rawLinks.length} raw links`)

    if (rawLinks.length === 0) {
      await writeUsageLog({ status: 'failed', durationMs: Date.now() - startedAt, errorMessage: 'map returned 0 links' })
      return new Response(
        JSON.stringify({ success: false, error: 'No pages found for this domain. The site may not have a discoverable sitemap.' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── Step 2: deduplicate + classify ────────────────────────────────────────
    const seen = new Set<string>()
    const classified: { url: string; type: PageType }[] = []

    for (const raw of rawLinks) {
      const url = normaliseUrl(raw)
      if (seen.has(url)) continue
      seen.add(url)
      classified.push({ url, type: classifyUrl(url) })
    }

    // Full classification breakdown for debugging
    const classBreakdown: Record<string, string[]> = { product: [], collection: [], content: [], core: [], other: [] }
    for (const { url, type } of classified) classBreakdown[type].push(url)
    console.log(`[geo-crawl] classification breakdown: ${JSON.stringify(Object.fromEntries(Object.entries(classBreakdown).map(([k, v]) => [k, v.length])))}`)
    console.log(`[geo-crawl] product urls: ${JSON.stringify(classBreakdown.product.slice(0, 5))}`)
    console.log(`[geo-crawl] content urls: ${JSON.stringify(classBreakdown.content.slice(0, 5))}`)
    console.log(`[geo-crawl] core urls: ${JSON.stringify(classBreakdown.core.slice(0, 5))}`)
    console.log(`[geo-crawl] other sample: ${JSON.stringify(classBreakdown.other.slice(0, 10))}`)

    // ── Step 3: sample — first N per type in sitemap order ───────────────────
    const counts: Record<string, number> = { product: 0, collection: 0, content: 0, core: 0 }
    const sampled: { url: string; type: PageType }[] = []

    for (const entry of classified) {
      if (sampled.length >= PAGE_HARD_CAP) break
      if (entry.type === 'other') continue
      const limit = SAMPLE_LIMITS[entry.type as keyof typeof SAMPLE_LIMITS]
      if (counts[entry.type] < limit) {
        sampled.push(entry)
        counts[entry.type]++
      }
    }

    console.log(`[geo-crawl] sampled ${sampled.length} pages (${JSON.stringify(counts)})`)

    if (sampled.length === 0) {
      await writeUsageLog({ status: 'failed', durationMs: Date.now() - startedAt, errorMessage: 'no classifiable pages found' })
      return new Response(
        JSON.stringify({ success: false, error: 'Could not identify representative pages on this site. The URL structure may be non-standard.' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── Step 4: scrape each sampled page ──────────────────────────────────────
    const pages: { url: string; type: string; content: string; wordCount: number }[] = []
    const skipped: { url: string; reason: string; preview: string }[] = []

    for (const { url, type } of sampled) {
      console.log(`[geo-crawl] scraping ${type}: ${url}`)
      try {
        const scrapeRes = await fetch(`${FIRECRAWL_BASE}/scrape`, {
          method:  'POST',
          headers: { 'Authorization': `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            url,
            formats: ['markdown'],
            onlyMainContent: true,
            waitFor: 2000,
            excludeTags: [
              '#cookie-banner',
              '.cookie-consent',
              '[class*="cookie"]',
              '[id*="cookie"]',
              '[class*="consent"]',
              '[id*="consent"]',
            ],
          }),
        })

        if (!scrapeRes.ok) {
          console.warn(`[geo-crawl] scrape ${scrapeRes.status} for ${url}`)
          skipped.push({ url, reason: `scrape ${scrapeRes.status}`, preview: '' })
          continue
        }

        const scrapeData = await scrapeRes.json() as { data?: { markdown?: string } }
        const content = scrapeData.data?.markdown ?? ''
        const wordCount = countWords(content)
        const preview = content.slice(0, 200).replace(/\n/g, ' ')

        if (wordCount < WORD_FLOOR) {
          console.log(`[geo-crawl] skip ${url} — ${wordCount} words`)
          skipped.push({ url, reason: `word count ${wordCount} < ${WORD_FLOOR}`, preview })
          continue
        }

        const noiseResult = getNoiseReason(content, url)
        if (noiseResult) {
          skipped.push({ url, reason: noiseResult, preview })
          continue
        }

        pages.push({ url, type, content, wordCount })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.warn(`[geo-crawl] error scraping ${url}:`, err)
        skipped.push({ url, reason: `error: ${msg}`, preview: '' })
      }
    }

    console.log(`[geo-crawl] ${pages.length} pages above confidence floor`)

    await writeUsageLog({ status: 'success', durationMs: Date.now() - startedAt, errorMessage: null })

    console.log(`[geo-crawl] returning response with ${pages.length} pages, ${skipped.length} skipped`)
    return new Response(
      JSON.stringify({
        success: true,
        pages,
        skipped,
        debug: {
          raw_link_count: rawLinks.length,
          classified: Object.fromEntries(Object.entries(classBreakdown).map(([k, v]) => [k, v.length])),
          sampled_urls: sampled.map(s => ({ url: s.url, type: s.type })),
          other_sample: classBreakdown.other.slice(0, 15),
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[geo-crawl] unhandled error:', error)
    await writeUsageLog({ status: 'failed', durationMs: Date.now() - startedAt, errorMessage: msg })
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
