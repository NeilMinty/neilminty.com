import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const FIRECRAWL_BASE = 'https://api.firecrawl.dev/v1'
const WORD_FLOOR     = 120
const PAGE_HARD_CAP  = 15

const SAMPLE_LIMITS = { product: 3, collection: 2, content: 3, core: 3 } as const
type PageType = keyof typeof SAMPLE_LIMITS | 'other' | 'skip'

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function classifyUrl(raw: string): PageType {
  try {
    const { pathname } = new URL(raw)
    const p = pathname.toLowerCase()

    // Pass 1 — explicit exclusions
    if (/\/(account|login|logout|cart|checkout|wishlist|bag)\b/.test(p)) return 'skip'
    if (/\/(legal|terms|privacy|cookies|gdpr)\b/.test(p)) return 'skip'
    if (/\/(press|newsroom|investors?|careers?|jobs|hiring)\b/.test(p)) return 'skip'
    if (/\/(sitemap|robots)/.test(p)) return 'skip'
    if (/\.(xml|pdf|jpg|jpeg|png|gif|svg|webp|css|js|ico)(\?|$)/.test(p)) return 'skip'
    if (/\/(supplier|corporate)\b/.test(p)) return 'skip'

    // Pass 2 — positive classification
    if (/\/(products?|item|pd|sku)\/[^/]/.test(p)) return 'product'
    if (/\/p\/[a-z0-9]/.test(p)) return 'product'
    if (/\/t\/[a-z0-9]/.test(p)) return 'product'
    if (/\/shop\/[a-z0-9]/.test(p)) return 'product'

    if (/\/(collections?|categor(y|ies)|cat|department|browse)\/[^/]/.test(p)) return 'collection'
    if (/\/c\/[a-z0-9]/.test(p)) return 'collection'
    if (/\/w\/[a-z0-9]/.test(p)) return 'collection'

    if (/\/(blogs?|articles?|posts?|learn|guides?|journal|stories|editorial|magazine)\/[^/]/.test(p)) return 'content'
    if (/\/news\/[^/]/.test(p)) return 'content'
    if (/\/resources?\/[^/]/.test(p)) return 'content'
    if (/\/\/[^/]+\/[a-z]{2}\/a\/[^/]/.test(raw.toLowerCase())) return 'content'  // locale/a/ pattern e.g. /fr/a/slug

    if (p === '/' || /^\/(pages\/)?(about(-us)?|contact|faq s?|pricing|our-story|how-it-works|who-we-are|sustainability)(\/|$)/.test(p)) return 'core'

    // Pass 3 — unrecognised, kept as "other" (sampled as last resort)
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

const NOISE_PATTERNS = [
  /\bcookies?\b/i,
  /\bconsent\b/i,
  /\baccept all\b/i,
  /\bprivacy preference/i,
  /\bwe use cookies\b/i,
]

function getNoiseReason(text: string, url: string): string | null {
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 15)
  const unique    = new Set(sentences.map(s => s.toLowerCase()))
  const totalWords = countWords(text)

  console.log(`[geo-crawl] quality check ${url} — unique sentences: ${unique.size}, words: ${totalWords}`)
  console.log(`[geo-crawl] first 200 chars: ${text.slice(0, 200).replace(/\n/g, ' ')}`)

  if (unique.size < 3) return `unique sentences ${unique.size} < 3`

  const head = text.slice(0, 500).toLowerCase()
  const matchedPatterns = NOISE_PATTERNS.filter(re => re.test(head)).map(re => re.toString())
  if (matchedPatterns.length >= 2 && totalWords < 300) {
    return `noise patterns [${matchedPatterns.join(', ')}] on short page (${totalWords} words)`
  }

  return null
}

// ─── LOCALE FILTER ────────────────────────────────────────────────────────────

const NON_ENGLISH_PATH_LOCALES = new Set([
  'fr', 'de', 'es', 'it', 'ja', 'zh', 'pt', 'nl', 'ko', 'ar', 'ru', 'pl', 'sv', 'da', 'fi',
  'at', 'lu', 'ro', 'be', 'ch',
  'fr-fr', 'de-de', 'es-es', 'zh-cn', 'zh-tw', 'de-ch', 'fr-ch', 'fr-be', 'nl-be',
])

const ENGLISH_PATH_LOCALES = new Set([
  'en', 'en-gb', 'en-us', 'en-au', 'en-ca', 'en-in', 'us', 'uk', 'gb',
])

const NON_ENGLISH_SUBDOMAINS = new Set(['fr', 'de', 'es', 'it', 'ja', 'zh', 'pt', 'nl'])

function isNonEnglishUrl(url: string): boolean {
  try {
    const { hostname, pathname } = new URL(url)
    const h = hostname.toLowerCase()
    const p = pathname.toLowerCase()

    // Non-English subdomain: fr.example.com, de.example.com, etc.
    const hostParts = h.split('.')
    if (hostParts.length >= 3 && NON_ENGLISH_SUBDOMAINS.has(hostParts[0])) return true

    // Path segments: if any segment is explicitly English, allow through
    const segments = p.split('/').filter(Boolean)
    if (segments.some(s => ENGLISH_PATH_LOCALES.has(s))) return false
    if (segments.some(s => NON_ENGLISH_PATH_LOCALES.has(s))) return true

    return false
  } catch {
    return false
  }
}

// ─── SITEMAP INDEX DETECTION + PARSING ───────────────────────────────────────

function isSitemapIndexResult(links: string[]): boolean {
  if (links.length === 0) return false
  const xmlCount = links.filter(u => /sitemap[^/]*\.xml/i.test(u)).length
  return xmlCount / links.length >= 0.3
}

function extractLocsFromXml(xml: string): string[] {
  const matches = [...xml.matchAll(/<loc>\s*(https?:\/\/[^<\s]+)\s*<\/loc>/g)]
  return matches.map(m => m[1].trim())
}

function isChildSitemapUrl(url: string): boolean {
  return /sitemap[^/]*\.xml/i.test(url)
}

// Prioritise: product > collection > content > page; deprioritise: image, video, news
function scoreChildSitemapUrl(url: string): number {
  const lower = url.toLowerCase()
  if (lower.includes('product'))    return 4
  if (lower.includes('collection')) return 3
  if (lower.includes('content') || lower.includes('article') || lower.includes('blog')) return 2
  if (lower.includes('page'))       return 1
  if (lower.includes('image') || lower.includes('video') || lower.includes('news')) return -1
  return 0
}

async function fetchChildSitemapUrls(
  childSitemapUrls: string[],
  maxChildren: number,
): Promise<string[]> {
  const sorted = [...childSitemapUrls].sort((a, b) => scoreChildSitemapUrl(b) - scoreChildSitemapUrl(a))
  const toFetch = sorted.slice(0, maxChildren)

  const pageUrls: string[] = []

  for (const sitemapUrl of toFetch) {
    try {
      console.log(`[geo-crawl] fetching child sitemap: ${sitemapUrl}`)
      const res = await fetch(sitemapUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GeoAuditBot/1.0)' },
        signal:  AbortSignal.timeout(10_000),
      })
      if (!res.ok) {
        console.log(`[geo-crawl] child sitemap ${res.status}: ${sitemapUrl}`)
        continue
      }
      const xml  = await res.text()
      const locs = extractLocsFromXml(xml)
      // Filter out nested sitemap index entries — keep only page URLs
      pageUrls.push(...locs.filter(u => !isChildSitemapUrl(u)))
      console.log(`[geo-crawl] child sitemap ${sitemapUrl}: ${locs.length} locs, ${pageUrls.length} total page urls so far`)
    } catch (err) {
      console.log(`[geo-crawl] child sitemap fetch error ${sitemapUrl}:`, err)
    }
  }

  return pageUrls
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

    const mapData  = await mapRes.json() as { links?: string[] }
    const mapLinks: string[] = mapData.links ?? []
    console.log(`[geo-crawl] map returned ${mapLinks.length} raw links`)
    console.log('[geo-crawl] urls_returned:', mapLinks.length)
    console.log('[geo-crawl] first_10_urls:', JSON.stringify(mapLinks.slice(0, 10)))
    console.log('[geo-crawl] xml_url_count:', mapLinks.filter(u => u.endsWith('.xml')).length)
    console.log('[geo-crawl] sitemap_type_detected:', isSitemapIndexResult(mapLinks) ? 'index' : 'standard')

    if (mapLinks.length === 0) {
      await writeUsageLog({ status: 'failed', durationMs: Date.now() - startedAt, errorMessage: 'map returned 0 links' })
      return new Response(
        JSON.stringify({ success: false, error: 'No pages found for this domain. The site may not have a discoverable sitemap.' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── Step 1b: sitemap index detection + resolution ─────────────────────────
    let rawLinks: string[]
    let sitemapType: 'index' | 'standard'

    if (isSitemapIndexResult(mapLinks)) {
      console.log(`[geo-crawl] sitemap index detected (${mapLinks.filter(u => /sitemap[^/]*\.xml/i.test(u)).length} XML entries in ${mapLinks.length} links)`)
      sitemapType = 'index'
      const childSitemaps = mapLinks.filter(isChildSitemapUrl)
      console.log(`[geo-crawl] following ${Math.min(childSitemaps.length, 4)} child sitemaps`)
      rawLinks = await fetchChildSitemapUrls(childSitemaps, 4)
      console.log(`[geo-crawl] resolved ${rawLinks.length} page URLs from child sitemaps`)
      if (rawLinks.length === 0) {
        // Fallback: treat original map links as page URLs (better than nothing)
        rawLinks = mapLinks
        console.log('[geo-crawl] child sitemap fetch yielded 0 URLs, falling back to map links')
      }
    } else {
      sitemapType = 'standard'
      rawLinks    = mapLinks
      console.log(`[geo-crawl] standard sitemap, ${rawLinks.length} links`)
    }

    const urlsDiscovered = rawLinks.length

    // ── Step 2: deduplicate + classify ────────────────────────────────────────
    const seen = new Set<string>()
    const classified: { url: string; type: PageType }[] = []

    for (const raw of rawLinks) {
      const url = normaliseUrl(raw)
      if (seen.has(url)) continue
      seen.add(url)
      classified.push({ url, type: classifyUrl(url) })
    }

    const classBreakdown: Record<string, string[]> = { product: [], collection: [], content: [], core: [], other: [], skip: [] }
    for (const { url, type } of classified) classBreakdown[type].push(url)

    const classificationSummary = {
      product:    classBreakdown.product.length,
      collection: classBreakdown.collection.length,
      content:    classBreakdown.content.length,
      core:       classBreakdown.core.length,
      skip:       classBreakdown.skip.length,
      fallback:   classBreakdown.other.length,
    }
    console.log('[geo-crawl] classification_summary:', JSON.stringify(classificationSummary))
    console.log(`[geo-crawl] product urls: ${JSON.stringify(classBreakdown.product.slice(0, 5))}`)
    console.log(`[geo-crawl] collection urls: ${JSON.stringify(classBreakdown.collection.slice(0, 5))}`)
    console.log(`[geo-crawl] content urls: ${JSON.stringify(classBreakdown.content.slice(0, 5))}`)
    console.log(`[geo-crawl] core urls: ${JSON.stringify(classBreakdown.core.slice(0, 5))}`)
    console.log(`[geo-crawl] other (fallback) sample: ${JSON.stringify(classBreakdown.other.slice(0, 10))}`)

    // ── Step 2b: locale filter ────────────────────────────────────────────────
    const FILTERABLE_POOLS = ['product', 'collection', 'content', 'core'] as const
    const relaxedPools: string[] = []
    const localeFilterLog: Record<string, number | string[]> = {}

    for (const pool of FILTERABLE_POOLS) {
      const before = classBreakdown[pool]
      localeFilterLog[`${pool}_before`] = before.length
      const filtered = before.filter(url => !isNonEnglishUrl(url))
      if (filtered.length >= 2 || before.length === 0) {
        classBreakdown[pool] = filtered
        localeFilterLog[`${pool}_after`] = filtered.length
      } else {
        // Too few English pages — relax filter entirely for this pool
        relaxedPools.push(pool)
        localeFilterLog[`${pool}_after`] = before.length
      }
    }
    localeFilterLog['relaxed_pools'] = relaxedPools

    console.log('[geo-crawl] locale_filter:', JSON.stringify(localeFilterLog))

    // Build allow-sets for O(1) lookup in sampler
    const localeAllowed: Record<string, Set<string>> = {}
    for (const pool of FILTERABLE_POOLS) {
      localeAllowed[pool] = new Set(classBreakdown[pool])
    }

    // ── Step 3: sample ────────────────────────────────────────────────────────
    const counts: Record<string, number> = { product: 0, collection: 0, content: 0, core: 0 }
    const sampled: { url: string; type: PageType }[] = []

    for (const entry of classified) {
      if (sampled.length >= PAGE_HARD_CAP) break
      if (entry.type === 'other' || entry.type === 'skip') continue
      if (!localeAllowed[entry.type]?.has(entry.url)) continue
      const limit = SAMPLE_LIMITS[entry.type as keyof typeof SAMPLE_LIMITS]
      if (counts[entry.type] < limit) {
        sampled.push(entry)
        counts[entry.type]++
      }
    }

    // Last-resort fallback: pull from "other" if fewer than 3 typed pages found
    if (sampled.length < 3) {
      for (const entry of classified) {
        if (sampled.length >= Math.min(PAGE_HARD_CAP, 5)) break
        if (entry.type !== 'other') continue
        sampled.push({ url: entry.url, type: 'product' })
        counts['product']++
      }
      if (classBreakdown.other.length > 0) {
        console.log(`[geo-crawl] fallback: pulled ${sampled.length} pages from "other" pool`)
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
        const content    = scrapeData.data?.markdown ?? ''
        const wordCount  = countWords(content)
        const preview    = content.slice(0, 200).replace(/\n/g, ' ')

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

    // ── Step 5: confidence note ───────────────────────────────────────────────
    const confidenceNotes: string[] = []
    if (relaxedPools.length > 0) {
      confidenceNotes.push('Limited English-language content — sample includes localised pages')
    }
    if (pages.length < 8 && urlsDiscovered > 500) {
      confidenceNotes.push('Large site — sample may not be representative')
    }
    const confidenceNote: string | null = confidenceNotes.length > 0 ? confidenceNotes.join('. ') : null

    if (confidenceNote) {
      console.log(`[geo-crawl] confidence note: ${confidenceNote} (pages=${pages.length}, urls_discovered=${urlsDiscovered})`)
    }

    await writeUsageLog({ status: 'success', durationMs: Date.now() - startedAt, errorMessage: null })

    console.log(`[geo-crawl] returning ${pages.length} pages, ${skipped.length} skipped, sitemap_type=${sitemapType}`)
    return new Response(
      JSON.stringify({
        success: true,
        pages,
        skipped,
        urls_discovered:  urlsDiscovered,
        sitemap_type:     sitemapType,
        confidence_note:  confidenceNote,
        debug: {
          raw_link_count:         mapLinks.length,
          classification_summary: classificationSummary,
          sampled_urls:           sampled.map(s => ({ url: s.url, type: s.type })),
          other_sample:           classBreakdown.other.slice(0, 15),
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
