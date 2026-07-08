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

interface ShopifyVariant { price: string }
interface ShopifyProduct { title: string; product_type: string; variants: ShopifyVariant[] }

function buildSummary(products: ShopifyProduct[]) {
  const prices: number[] = []
  for (const p of products) {
    for (const v of p.variants) {
      const n = parseFloat(v.price)
      if (!isNaN(n) && n > 0) prices.push(n)
    }
  }
  prices.sort((a, b) => a - b)

  const n   = prices.length
  const p33 = prices[Math.floor(n * 0.33)] ?? 0
  const p67 = prices[Math.floor(n * 0.67)] ?? 0

  const entry   = prices.filter(p => p <= p33)
  const core    = prices.filter(p => p > p33 && p <= p67)
  const premium = prices.filter(p => p > p67)

  const tier = (arr: number[]) =>
    arr.length ? { min: Math.min(...arr), max: Math.max(...arr) } : null

  const typeCounts: Record<string, number> = {}
  for (const p of products) {
    const t = p.product_type?.trim() || 'Uncategorised'
    typeCounts[t] = (typeCounts[t] ?? 0) + 1
  }
  const categorySpread = Object.entries(typeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([type, count]) => `${type} (${count})`)
    .join(', ')

  const avgVariants =
    products.reduce((s, p) => s + p.variants.length, 0) / (products.length || 1)

  return {
    productCount: products.length,
    minPrice:     prices[0] ?? 0,
    maxPrice:     prices[n - 1] ?? 0,
    medianPrice:  prices[Math.floor(n / 2)] ?? 0,
    priceLadder:  { entry: tier(entry), core: tier(core), premium: tier(premium) },
    categorySpread,
    avgVariants:  Math.round(avgVariants * 10) / 10,
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

    const prompt = `Analyse this Shopify competitor catalogue and return a structured brief.

Store: ${domain}
Products: ${s.productCount}
Price range: ${s.minPrice}–${s.maxPrice} (median ${s.medianPrice})
Price ladder — Entry: ${tierStr(s.priceLadder.entry)}, Core: ${tierStr(s.priceLadder.core)}, Premium: ${tierStr(s.priceLadder.premium)}
Category spread: ${s.categorySpread}
Average variants per product: ${s.avgVariants}

Return this JSON exactly — no markdown fences, no extra keys:
{
  "sections": [
    { "title": "Price positioning", "body": "2–3 sentences using the numbers." },
    { "title": "Product mix", "body": "2–3 sentences on category spread and depth." },
    { "title": "Variant depth", "body": "1–2 sentences on variant structure." },
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
        max_tokens: 600,
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
        success:      true,
        storeDomain:  domain,
        productCount: s.productCount,
        priceLadder:  s.priceLadder,
        brief:        parsed.sections,
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
