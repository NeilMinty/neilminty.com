const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const MODEL         = 'claude-haiku-4-5-20251001'

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Tier         { min: number; max: number }
interface ShopifyVariant { price: string; compare_at_price: string | null }
interface ShopifyOption  { name: string; values: string[] }
interface ShopifyProduct {
  title:        string
  product_type: string
  variants:     ShopifyVariant[]
  options?:     ShopifyOption[]
  created_at?:  string
  tags?:        string | string[]
}

interface CatRow { type: string; count: number; min: number; median: number; max: number }

interface Summary {
  productCount:        number
  minPrice:            number
  maxPrice:            number
  medianPrice:         number
  priceLadder:         { entry: Tier | null; core: Tier | null; premium: Tier | null }
  categoryPriceLadder: CatRow[]
  discountIntensity:   { pctDiscounted: number; avgDiscountDepth: number }
  newArrivals:         { last30: number; last60: number; last90: number }
  sizeRange:           string[] | null
  topTags:             Array<{ tag: string; count: number }>
  avgVariants:         number
}

interface OverlapRow {
  type:   string
  onlyIn: 'a' | 'b' | null
  a:      { count: number; min: number; median: number; max: number } | null
  b:      { count: number; min: number; median: number; max: number } | null
}

// ─── HELPERS (mirrors catalogue-price-ladder) ─────────────────────────────────

function normaliseDomain(input: string): string | null {
  try {
    const withProto = /^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`
    return new URL(withProto).hostname
  } catch {
    return null
  }
}

function medianOf(sorted: number[]): number {
  if (sorted.length === 0) return 0
  return sorted[Math.floor(sorted.length / 2)]
}

function buildSummary(products: ShopifyProduct[]): Summary {
  const now    = Date.now()
  const DAY_MS = 86_400_000

  const allPrices:  number[]                 = []
  const typePrices: Record<string, number[]> = {}
  const typeCounts: Record<string, number>   = {}
  const tagCounts:  Record<string, number>   = {}
  const sizeValues  = new Set<string>()
  let hasSizeOpt    = false

  let discountedVariants = 0
  let totalVariants      = 0
  let totalDepth         = 0
  let totalVariantCount  = 0
  let last30 = 0, last60 = 0, last90 = 0

  for (const p of products) {
    const type = p.product_type?.trim() || 'Uncategorised'
    typeCounts[type] = (typeCounts[type] ?? 0) + 1
    if (!typePrices[type]) typePrices[type] = []

    totalVariantCount += p.variants.length

    for (const v of p.variants) {
      const price   = parseFloat(v.price)
      const compare = parseFloat(v.compare_at_price ?? '')
      totalVariants++
      if (!isNaN(price) && price > 0) {
        allPrices.push(price)
        typePrices[type].push(price)
      }
      if (!isNaN(compare) && !isNaN(price) && compare > price && price > 0) {
        discountedVariants++
        totalDepth += (compare - price) / compare
      }
    }

    const created = new Date(p.created_at ?? '').getTime()
    if (!isNaN(created)) {
      const ageDays = (now - created) / DAY_MS
      if (ageDays <= 30) last30++
      if (ageDays <= 60) last60++
      if (ageDays <= 90) last90++
    }

    const rawTags    = typeof p.tags === 'string' ? p.tags : (Array.isArray(p.tags) ? (p.tags as string[]).join(',') : '')
    const productTags = [...new Set(rawTags.split(',').map((t: string) => t.trim()).filter(Boolean))]
    for (const tag of productTags) tagCounts[tag] = (tagCounts[tag] ?? 0) + 1

    for (const opt of p.options ?? []) {
      if (opt.name?.toLowerCase() === 'size') {
        hasSizeOpt = true
        for (const val of opt.values ?? []) sizeValues.add(val.trim())
      }
    }
  }

  allPrices.sort((a, b) => a - b)
  const n   = allPrices.length
  const p33 = allPrices[Math.floor(n * 0.33)] ?? 0
  const p67 = allPrices[Math.floor(n * 0.67)] ?? 0

  const entry   = allPrices.filter(p => p <= p33)
  const core    = allPrices.filter(p => p > p33 && p <= p67)
  const premium = allPrices.filter(p => p > p67)
  const tier    = (arr: number[]) => arr.length ? { min: Math.min(...arr), max: Math.max(...arr) } : null

  const sortedTypes = Object.entries(typeCounts).sort(([, a], [, b]) => b - a).slice(0, 8)

  return {
    productCount:        products.length,
    minPrice:            allPrices[0] ?? 0,
    maxPrice:            allPrices[n - 1] ?? 0,
    medianPrice:         medianOf(allPrices),
    priceLadder:         { entry: tier(entry), core: tier(core), premium: tier(premium) },
    categoryPriceLadder: sortedTypes.map(([type, count]) => {
      const arr = (typePrices[type] ?? []).slice().sort((a, b) => a - b)
      return { type, count, min: arr[0] ?? 0, median: medianOf(arr), max: arr[arr.length - 1] ?? 0 }
    }),
    discountIntensity: {
      pctDiscounted:    totalVariants > 0 ? Math.round(discountedVariants / totalVariants * 1000) / 10 : 0,
      avgDiscountDepth: discountedVariants > 0 ? Math.round(totalDepth / discountedVariants * 1000) / 10 : 0,
    },
    newArrivals:  { last30, last60, last90 },
    sizeRange:    hasSizeOpt ? [...sizeValues].sort() : null,
    topTags:      Object.entries(tagCounts).sort(([, a], [, b]) => b - a).slice(0, 10).map(([tag, count]) => ({ tag, count })),
    avgVariants:  Math.round(totalVariantCount / (products.length || 1) * 10) / 10,
  }
}

async function scrapeAndSummarise(domain: string): Promise<{ ok: true; s: Summary } | { ok: false; error: string }> {
  try {
    const resp = await fetch(`https://${domain}/products.json?limit=250`, {
      headers: { 'User-Agent': 'CataloguePriceLadder/1.0 (+https://neilminty.com/tools/catalogue-price-ladder)' },
      signal: AbortSignal.timeout(10000),
    })
    if (resp.status === 404 || resp.status === 401 || resp.status === 403) {
      return { ok: false, error: 'Catalogue not accessible — store may not be Shopify, may be password-protected, or the URL is wrong.' }
    }
    if (resp.status === 429 || resp.status === 430) {
      return { ok: false, error: 'Catalogue not accessible — store is rate-limiting requests.' }
    }
    if (!resp.ok) {
      return { ok: false, error: `Catalogue not accessible (HTTP ${resp.status}).` }
    }
    const data = await resp.json() as { products?: unknown }
    if (!Array.isArray(data.products)) {
      return { ok: false, error: 'Catalogue not accessible — response was not a Shopify products feed.' }
    }
    const products = data.products as ShopifyProduct[]
    if (products.length === 0) return { ok: false, error: 'No products found in this catalogue.' }
    return { ok: true, s: buildSummary(products) }
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'TimeoutError'
    return { ok: false, error: isTimeout ? 'Catalogue not accessible — request timed out.' : 'Catalogue not accessible — could not reach the store.' }
  }
}

function normCat(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function buildMergedGrid(catA: CatRow[], catB: CatRow[]): OverlapRow[] {
  const mapA = new Map(catA.map(r => [normCat(r.type), r]))
  const mapB = new Map(catB.map(r => [normCat(r.type), r]))

  const shared: OverlapRow[] = []
  const onlyA:  OverlapRow[] = []
  const onlyB:  OverlapRow[] = []

  for (const r of catA) {
    const bRow = mapB.get(normCat(r.type))
    if (bRow) {
      shared.push({ type: r.type, onlyIn: null,
        a: { count: r.count, min: r.min, median: r.median, max: r.max },
        b: { count: bRow.count, min: bRow.min, median: bRow.median, max: bRow.max } })
    } else {
      onlyA.push({ type: r.type, onlyIn: 'a',
        a: { count: r.count, min: r.min, median: r.median, max: r.max }, b: null })
    }
  }
  for (const r of catB) {
    if (!mapA.has(normCat(r.type))) {
      onlyB.push({ type: r.type, onlyIn: 'b',
        a: null, b: { count: r.count, min: r.min, median: r.median, max: r.max } })
    }
  }

  shared.sort((x, y) => ((y.a?.count ?? 0) + (y.b?.count ?? 0)) - ((x.a?.count ?? 0) + (x.b?.count ?? 0)))
  return [...shared, ...onlyA, ...onlyB]
}

function tierWidth(pl: Summary['priceLadder'], median: number): number {
  if (!pl.entry || !pl.premium || median === 0) return 0
  return Math.round((pl.premium.min - pl.entry.max) / median * 100) / 100
}

function tierStr(t: Tier | null): string {
  return t ? `${t.min}–${t.max}` : 'n/a'
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const { urlA, urlB } = await req.json() as { urlA?: string; urlB?: string }

    const domainA = normaliseDomain(urlA ?? '')
    const domainB = normaliseDomain(urlB ?? '')

    if (!domainA || !domainA.includes('.')) {
      return json({ success: false, errorA: 'Enter a valid domain, e.g. competitor.com', errorB: null }, 400)
    }
    if (!domainB || !domainB.includes('.')) {
      return json({ success: false, errorA: null, errorB: 'Enter a valid domain, e.g. competitor.com' }, 400)
    }

    // Scrape both in parallel
    const [resA, resB] = await Promise.all([
      scrapeAndSummarise(domainA),
      scrapeAndSummarise(domainB),
    ])

    if (!resA.ok || !resB.ok) {
      return json({
        success: false,
        errorA:  resA.ok  ? null : resA.error,
        errorB:  resB.ok  ? null : resB.error,
      }, 422)
    }

    const sA = resA.s
    const sB = resB.s

    const mergedCategoryGrid = buildMergedGrid(sA.categoryPriceLadder, sB.categoryPriceLadder)

    const sharedCategories = mergedCategoryGrid.filter(r => r.onlyIn === null).map(r => r.type)
    const uniqueToA        = mergedCategoryGrid.filter(r => r.onlyIn === 'a').map(r => r.type)
    const uniqueToB        = mergedCategoryGrid.filter(r => r.onlyIn === 'b').map(r => r.type)

    const twA = tierWidth(sA.priceLadder, sA.medianPrice)
    const twB = tierWidth(sB.priceLadder, sB.medianPrice)

    const deltas = {
      medianPriceGapAbs:    Math.round((sB.medianPrice - sA.medianPrice) * 100) / 100,
      medianPriceGapPct:    sA.medianPrice > 0 ? Math.round((sB.medianPrice - sA.medianPrice) / sA.medianPrice * 1000) / 10 : 0,
      discountRateGap:      Math.round((sB.discountIntensity.pctDiscounted - sA.discountIntensity.pctDiscounted) * 10) / 10,
      discountDepthGap:     Math.round((sB.discountIntensity.avgDiscountDepth - sA.discountIntensity.avgDiscountDepth) * 10) / 10,
      variantComplexityGap: Math.round((sB.avgVariants - sA.avgVariants) * 10) / 10,
      tierWidthRatioA:      twA,
      tierWidthRatioB:      twB,
      sharedCategories,
      uniqueToA,
      uniqueToB,
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) {
      return json({ success: false, errorA: null, errorB: null, error: 'API key not configured.' }, 500)
    }

    const catSpreadA = sA.categoryPriceLadder.map(c => `${c.type} (${c.count})`).join(', ')
    const catSpreadB = sB.categoryPriceLadder.map(c => `${c.type} (${c.count})`).join(', ')
    const higherMedian = deltas.medianPriceGapAbs >= 0
      ? `${domainB} is higher by ${Math.abs(deltas.medianPriceGapAbs)}`
      : `${domainA} is higher by ${Math.abs(deltas.medianPriceGapAbs)}`
    const tighterLadder = twA <= twB ? domainA : domainB

    const prompt = `Compare these two Shopify catalogues head-to-head. Write about contrast and tension, not description.

Store A: ${domainA} — ${sA.productCount} products, ${sA.categoryPriceLadder.length} categories
Price: ${sA.minPrice}–${sA.maxPrice} (median ${sA.medianPrice})
Ladder: Entry ${tierStr(sA.priceLadder.entry)}, Core ${tierStr(sA.priceLadder.core)}, Premium ${tierStr(sA.priceLadder.premium)}
Ladder span ratio: ${twA} (lower = tighter, cleaner good-better-best)
Discounts: ${sA.discountIntensity.pctDiscounted}% of variants on sale, avg ${sA.discountIntensity.avgDiscountDepth}% off
Categories: ${catSpreadA}
Avg variants/product: ${sA.avgVariants}
New arrivals (90 days): ${sA.newArrivals.last90}

Store B: ${domainB} — ${sB.productCount} products, ${sB.categoryPriceLadder.length} categories
Price: ${sB.minPrice}–${sB.maxPrice} (median ${sB.medianPrice})
Ladder: Entry ${tierStr(sB.priceLadder.entry)}, Core ${tierStr(sB.priceLadder.core)}, Premium ${tierStr(sB.priceLadder.premium)}
Ladder span ratio: ${twB} (lower = tighter, cleaner good-better-best)
Discounts: ${sB.discountIntensity.pctDiscounted}% of variants on sale, avg ${sB.discountIntensity.avgDiscountDepth}% off
Categories: ${catSpreadB}
Avg variants/product: ${sB.avgVariants}
New arrivals (90 days): ${sB.newArrivals.last90}

Head-to-head:
Median price: ${higherMedian}
Discount rate: ${domainA} ${sA.discountIntensity.pctDiscounted}% vs ${domainB} ${sB.discountIntensity.pctDiscounted}% (${Math.abs(deltas.discountRateGap).toFixed(1)}pp gap${deltas.discountRateGap > 0 ? ', ' + domainB + ' discounts more' : deltas.discountRateGap < 0 ? ', ' + domainA + ' discounts more' : ''})
Ladder span: ${domainA} ${twA} vs ${domainB} ${twB} — ${tighterLadder} has the tighter ladder
Shared categories: ${sharedCategories.length} | Only in ${domainA}: ${uniqueToA.join(', ') || 'none'} | Only in ${domainB}: ${uniqueToB.join(', ') || 'none'}

Return JSON — no markdown fences, no extra keys:
{
  "sections": [
    { "title": "Pricing architecture", "body": "2–3 sentences. Name which store has the cleaner ladder and why — use the tier width ratio and the actual tier ranges. Explain the mechanism, not just the observation." },
    { "title": "Discount posture", "body": "2–3 sentences. Use the rate and depth gap directly. Call out who is running clearance-mode vs full-price discipline. Be specific about the numbers." },
    { "title": "Catalogue strategy", "body": "2–3 sentences. Contrast breadth vs depth explicitly — product count, category count, variant complexity. Name the strategic implication." },
    { "title": "Closing line", "body": "ONE sentence only. Standalone. Quotable. Dry precision. States the sharpest single contrast as a fact using both store names and specific numbers. No preamble, no summary framing." }
  ]
}

Rules: open each paragraph with the contrast, not the setup. Use both store names. No hedging, no 'it appears that', no preamble. The Closing line is exactly one sentence — not two joined with a semicolon.`

    const aiResp = await fetch(ANTHROPIC_API, {
      method:  'POST',
      headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: 700, messages: [{ role: 'user', content: prompt }] }),
    })

    const aiData = await aiResp.json() as {
      content?: Array<{ type: string; text: string }>
      error?:   { message: string }
    }

    if (!aiResp.ok) {
      console.error('[catalogue-compare] Anthropic error:', aiData.error?.message)
      return json({ success: false, errorA: null, errorB: null, error: 'Brief generation failed. Try again.' }, 502)
    }

    const raw     = aiData.content?.[0]?.type === 'text' ? aiData.content[0].text : ''
    const cleaned = raw.replace(/^```(?:json)?\s*/m, '').replace(/```\s*$/m, '').trim()
    const parsed  = JSON.parse(cleaned) as { sections: Array<{ title: string; body: string }> }

    const toResult = (domain: string, s: Summary) => ({
      storeDomain:         domain,
      productCount:        s.productCount,
      medianPrice:         s.medianPrice,
      priceLadder:         s.priceLadder,
      categoryPriceLadder: s.categoryPriceLadder,
      discountIntensity:   s.discountIntensity,
      newArrivals:         s.newArrivals,
      sizeRange:           s.sizeRange,
      topTags:             s.topTags,
      avgVariants:         s.avgVariants,
      brief:               [],
    })

    return json({
      success:             true,
      domainA,
      domainB,
      dataA:               toResult(domainA, sA),
      dataB:               toResult(domainB, sB),
      deltas,
      mergedCategoryGrid,
      brief:               parsed.sections,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[catalogue-compare] unhandled error:', error)
    return json({ success: false, errorA: null, errorB: null, error: msg }, 500)
  }
})
