const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const MODEL         = 'claude-haiku-4-5-20251001'

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function normaliseDomain(input: string): string | null {
  try {
    const withProto = /^https?:\/\//i.test(input.trim())
      ? input.trim()
      : `https://${input.trim()}`
    return new URL(withProto).hostname
  } catch {
    return null
  }
}

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

function medianOf(sorted: number[]): number {
  if (sorted.length === 0) return 0
  return sorted[Math.floor(sorted.length / 2)]
}

function buildSummary(products: ShopifyProduct[]) {
  const now    = Date.now()
  const DAY_MS = 86_400_000

  const allPrices:  number[]               = []
  const typePrices: Record<string, number[]> = {}
  const typeCounts: Record<string, number>   = {}
  const tagCounts:  Record<string, number>   = {}
  const sizeValues  = new Set<string>()
  let hasSizeOpt    = false

  let discountedVariants = 0
  let totalVariants      = 0
  let totalDepth         = 0
  let last30 = 0, last60 = 0, last90 = 0

  for (const p of products) {
    const type = p.product_type?.trim() || 'Uncategorised'
    typeCounts[type] = (typeCounts[type] ?? 0) + 1
    if (!typePrices[type]) typePrices[type] = []

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

    const rawTags = typeof p.tags === 'string' ? p.tags : (Array.isArray(p.tags) ? (p.tags as string[]).join(',') : '')
    const productTags = [...new Set(rawTags.split(',').map((t: string) => t.trim()).filter(Boolean))]
    for (const tag of productTags) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1
    }

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

  const tier = (arr: number[]) =>
    arr.length ? { min: Math.min(...arr), max: Math.max(...arr) } : null

  const sortedTypes = Object.entries(typeCounts).sort(([, a], [, b]) => b - a).slice(0, 8)

  const categorySpread = sortedTypes.map(([type, count]) => `${type} (${count})`).join(', ')

  const categoryPriceLadder = sortedTypes.map(([type, count]) => {
    const arr = (typePrices[type] ?? []).slice().sort((a, b) => a - b)
    return { type, count, min: arr[0] ?? 0, median: medianOf(arr), max: arr[arr.length - 1] ?? 0 }
  })

  const avgVariants = products.reduce((s, p) => s + p.variants.length, 0) / (products.length || 1)

  const discountIntensity = {
    pctDiscounted:    totalVariants > 0 ? Math.round(discountedVariants / totalVariants * 1000) / 10 : 0,
    avgDiscountDepth: discountedVariants > 0 ? Math.round(totalDepth / discountedVariants * 1000) / 10 : 0,
  }

  const topTags = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }))

  return {
    productCount:        products.length,
    minPrice:            allPrices[0] ?? 0,
    maxPrice:            allPrices[n - 1] ?? 0,
    medianPrice:         medianOf(allPrices),
    priceLadder:         { entry: tier(entry), core: tier(core), premium: tier(premium) },
    categorySpread,
    avgVariants:         Math.round(avgVariants * 10) / 10,
    categoryPriceLadder,
    discountIntensity,
    newArrivals:         { last30, last60, last90 },
    sizeRange:           hasSizeOpt ? [...sizeValues].sort() : null,
    topTags,
  }
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { url } = await req.json() as { url?: string }

    if (!url || typeof url !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const domain = normaliseDomain(url)
    if (!domain || !domain.includes('.')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Enter a valid domain, e.g. competitor.com' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Fetch products.json
    let products: ShopifyProduct[]
    try {
      const resp = await fetch(`https://${domain}/products.json?limit=250`, {
        headers: { 'User-Agent': 'CataloguePriceLadder/1.0 (+https://neilminty.com/tools/catalogue-price-ladder)' },
        signal: AbortSignal.timeout(10000),
      })
      if (resp.status === 404 || resp.status === 401 || resp.status === 403) {
        return new Response(
          JSON.stringify({ success: false, error: 'Catalogue not accessible — store may not be Shopify, may be password-protected, or the URL is wrong.' }),
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      if (resp.status === 429 || resp.status === 430) {
        return new Response(
          JSON.stringify({ success: false, error: 'Catalogue not accessible — store is rate-limiting requests.' }),
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      if (!resp.ok) {
        return new Response(
          JSON.stringify({ success: false, error: `Catalogue not accessible (HTTP ${resp.status}).` }),
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      const data = await resp.json() as { products?: unknown }
      if (!Array.isArray(data.products)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Catalogue not accessible — response was not a Shopify products feed.' }),
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      products = data.products as ShopifyProduct[]
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'TimeoutError'
      return new Response(
        JSON.stringify({ success: false, error: isTimeout
          ? 'Catalogue not accessible — request timed out.'
          : 'Catalogue not accessible — could not reach the store.' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (products.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No products found in this catalogue.' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const s = buildSummary(products)

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'API key not configured.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const tierStr = (t: { min: number; max: number } | null) =>
      t ? `${t.min}–${t.max}` : 'n/a'

    const catPriceStr = s.categoryPriceLadder
      .map(c => `  ${c.type}: ${c.count} products, ${c.min}–${c.max} (median ${c.median})`)
      .join('\n')

    const prompt = `Analyse this Shopify competitor catalogue and return a structured brief.

Store: ${domain}
Products: ${s.productCount}
Price range: ${s.minPrice}–${s.maxPrice} (median ${s.medianPrice})
Price ladder — Entry: ${tierStr(s.priceLadder.entry)}, Core: ${tierStr(s.priceLadder.core)}, Premium: ${tierStr(s.priceLadder.premium)}
Average variants per product: ${s.avgVariants}

Category price breakdown:
${catPriceStr}

Discount intensity: ${s.discountIntensity.pctDiscounted}% of variants currently on sale, average ${s.discountIntensity.avgDiscountDepth}% off
New arrivals: ${s.newArrivals.last30} products added in last 30 days, ${s.newArrivals.last60} in last 60, ${s.newArrivals.last90} in last 90
${s.sizeRange ? `Size range: ${s.sizeRange.join(', ')}` : 'Size range: not available'}
Top tags: ${s.topTags.map(t => `${t.tag} (${t.count})`).join(', ')}

Return this JSON exactly — no markdown fences, no extra keys:
{
  "sections": [
    { "title": "Price positioning", "body": "2–3 sentences using the numbers." },
    { "title": "Product mix", "body": "2–3 sentences on category spread and depth." },
    { "title": "Variant depth", "body": "1–2 sentences on variant structure." },
    { "title": "Discount and pricing behaviour", "body": "2–3 sentences using discount intensity and category price spread to characterise their promotion strategy." },
    { "title": "Launch cadence and range signals", "body": "2–3 sentences using new arrival counts, size range, and top tags to characterise how actively they are expanding." },
    { "title": "Strategic observation", "body": "1–2 sentences. One specific, actionable insight for a competitor." }
  ]
}

Rules: be specific, use the data, no hedging language, no "it appears that", no preamble.`

    const aiResp = await fetch(ANTHROPIC_API, {
      method:  'POST',
      headers: {
        'x-api-key':         anthropicKey,
        'anthropic-version': '2023-06-01',
        'Content-Type':      'application/json',
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: 900,
        messages:   [{ role: 'user', content: prompt }],
      }),
    })

    const aiData = await aiResp.json() as {
      content?: Array<{ type: string; text: string }>
      error?:   { message: string }
    }

    if (!aiResp.ok) {
      console.error('[catalogue-price-ladder] Anthropic error:', aiData.error?.message)
      return new Response(
        JSON.stringify({ success: false, error: 'Brief generation failed. Try again.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const raw     = aiData.content?.[0]?.type === 'text' ? aiData.content[0].text : ''
    const cleaned = raw.replace(/^```(?:json)?\s*/m, '').replace(/```\s*$/m, '').trim()
    const parsed  = JSON.parse(cleaned) as { sections: Array<{ title: string; body: string }> }

    return new Response(
      JSON.stringify({
        success:             true,
        storeDomain:         domain,
        productCount:        s.productCount,
        priceLadder:         s.priceLadder,
        categoryPriceLadder: s.categoryPriceLadder,
        discountIntensity:   s.discountIntensity,
        newArrivals:         s.newArrivals,
        sizeRange:           s.sizeRange,
        topTags:             s.topTags,
        brief:               parsed.sections,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[catalogue-price-ladder] unhandled error:', error)
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
