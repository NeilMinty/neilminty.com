import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// ─── USAGE LOGGING ────────────────────────────────────────────────────────────

async function writeUsageLog(params: {
  sessionId:    string | null
  toolName:     string
  model:        string | null
  tokensIn:     number | null
  tokensOut:    number | null
  status:       string
  durationMs:   number
  errorMessage: string | null
  endpoint:     string
}): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase env vars not set — skipping usage log')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const { error } = await supabase.from('tool_usage_logs').insert({
    session_id:    params.sessionId,
    tool_name:     params.toolName,
    api_provider:  'firecrawl',
    model:         params.model,
    tokens_in:     params.tokensIn,
    tokens_out:    params.tokensOut,
    cost_estimate: null,
    endpoint:      params.endpoint,
    status:        params.status,
    duration_ms:   params.durationMs,
    error_message: params.errorMessage,
  })

  if (error) console.error('Failed to write usage log:', error.message)
}

// ─── SHOPIFY DETECTION ────────────────────────────────────────────────────────

async function detectShopify(formattedUrl: string): Promise<string | null> {
  const parsed = new URL(formattedUrl)
  const base = `${parsed.protocol}//${parsed.hostname}`

  if (parsed.hostname.endsWith('.myshopify.com')) {
    console.log('[shopify] myshopify.com domain detected')
    return base
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    const probe = await fetch(`${base}/products.json?limit=1`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    clearTimeout(timer)
    if (probe.ok) {
      const json = await probe.json()
      if (json && Array.isArray(json.products)) {
        console.log('[shopify] /products.json probe succeeded')
        return base
      }
    }
  } catch {
    // not Shopify or unreachable — fall through to Firecrawl
  }

  return null
}

function extractProductHandle(pathname: string): string | null {
  const match = pathname.match(/\/products\/([^/?#]+)/)
  return match ? match[1] : null
}

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface ShopifyVariant {
  id: number
  title: string
  price: string
  available: boolean
  sku?: string
}

interface ShopifyProduct {
  title: string
  vendor?: string
  product_type?: string
  tags?: string[]
  body_html?: string
  handle?: string
  variants?: ShopifyVariant[]
  options?: Array<{ name: string; values: string[] }>
}

// ─── PAGINATION ───────────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, timeoutMs: number, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function fetchAllShopifyProducts(base: string): Promise<ShopifyProduct[]> {
  const PAGE_CAP = 10
  const all: ShopifyProduct[] = []

  for (let page = 1; page <= PAGE_CAP; page++) {
    const url = `${base}/products.json?limit=250&page=${page}`
    console.log(`[shopify] fetching page ${page}: ${url}`)
    const res = await fetchWithTimeout(url, 10_000, { headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(`Shopify /products.json returned ${res.status} on page ${page}`)
    const json = await res.json()
    const batch: ShopifyProduct[] = json.products ?? []
    all.push(...batch)
    if (batch.length < 250) break
  }

  console.log(`[shopify] fetched ${all.length} products total`)
  return all
}

// ─── NOISE FILTER ─────────────────────────────────────────────────────────────

const NOISE_TITLE_PATTERNS = [/\bbasement\b/i, /\btrade\b/i, /\btest\b/i]

function filterProducts(products: ShopifyProduct[]): ShopifyProduct[] {
  return products.filter(p => {
    if (NOISE_TITLE_PATTERNS.some(re => re.test(p.title))) return false
    if (p.handle && /test/i.test(p.handle)) return false
    return true
  })
}

// ─── MARKDOWN FORMATTERS ──────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function formatSingleProduct(product: ShopifyProduct, sourceUrl: string): string {
  const lines: string[] = []
  lines.push(`# ${product.title}`)
  if (product.vendor) lines.push(`\n**Vendor:** ${product.vendor}`)
  if (product.product_type) lines.push(`**Type:** ${product.product_type}`)
  if (product.tags?.length) lines.push(`**Tags:** ${product.tags.join(', ')}`)

  if (product.variants?.length) {
    const prices = product.variants.map(v => parseFloat(v.price)).filter(p => !isNaN(p))
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const priceStr = minPrice === maxPrice
      ? `£${minPrice.toFixed(2)}`
      : `£${minPrice.toFixed(2)} – £${maxPrice.toFixed(2)}`
    lines.push(`**Price:** ${priceStr}`)
    lines.push(`**Available:** ${product.variants.some(v => v.available) ? 'Yes' : 'No'}`)
  }

  if (product.body_html) {
    const description = stripHtml(product.body_html)
    if (description) lines.push(`\n## Description\n\n${description}`)
  }

  if (product.options?.length) {
    const nonDefault = product.options.filter(o => o.name !== 'Title' && o.values.length > 1)
    if (nonDefault.length) {
      lines.push('\n## Options')
      for (const opt of nonDefault) {
        lines.push(`- **${opt.name}:** ${opt.values.join(', ')}`)
      }
    }
  }

  if (product.variants && product.variants.length > 1) {
    lines.push('\n## Variants')
    for (const v of product.variants) {
      const stock = v.available ? '' : ' *(out of stock)*'
      lines.push(`- ${v.title}: £${parseFloat(v.price).toFixed(2)}${stock}`)
    }
  }

  lines.push(`\n---\n*Source: ${sourceUrl}*`)
  return lines.join('\n')
}

function formatProductList(products: ShopifyProduct[], base: string): string {
  if (!products.length) return '# No products found'
  const lines: string[] = [`# Product Catalogue — ${base.replace('https://', '')} (${products.length} products)\n`]
  for (const p of products) {
    lines.push(`## ${p.title}`)
    if (p.vendor) lines.push(`**Vendor:** ${p.vendor}`)
    if (p.product_type) lines.push(`**Type:** ${p.product_type}`)
    if (p.variants?.length) {
      const prices = p.variants.map(v => parseFloat(v.price)).filter(n => !isNaN(n))
      const min = Math.min(...prices)
      const max = Math.max(...prices)
      lines.push(`**Price:** ${min === max ? `£${min.toFixed(2)}` : `£${min.toFixed(2)} – £${max.toFixed(2)}`}`)
      if (p.variants.length > 1) {
        lines.push(`**Variants:** ${p.variants.map(v => v.title).join(', ')}`)
      }
    }
    if (p.handle) lines.push(`**URL:** ${base}/products/${p.handle}`)
    if (p.body_html) {
      const desc = stripHtml(p.body_html)
      if (desc) lines.push(`\n${desc}`)
    }
    lines.push('')
  }
  return lines.join('\n')
}

// ─── SHOPIFY FETCH ────────────────────────────────────────────────────────────

async function fetchShopifyData(
  base: string,
  handle: string | null,
  sourceUrl: string,
): Promise<{ markdown: string; links: string[]; metadata: Record<string, unknown> }> {
  if (handle) {
    const endpoint = `${base}/products/${handle}.json`
    console.log(`[shopify] fetching single product: ${endpoint}`)
    const res = await fetchWithTimeout(endpoint, 10_000, { headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(`Shopify API returned ${res.status} for ${endpoint}`)
    const json = await res.json()
    if (!json.product) throw new Error('Unexpected Shopify response shape')

    const markdown = formatSingleProduct(json.product, sourceUrl)
    const links = (json.product.variants ?? [])
      .map((v: ShopifyVariant) => `${base}/products/${handle}?variant=${v.id}`)

    return {
      markdown,
      links,
      metadata: {
        title: json.product.title || handle,
        sourceURL: sourceUrl,
        shopifyDetected: true,
      },
    }
  }

  // Catalogue path
  const raw = await fetchAllShopifyProducts(base)
  const products = filterProducts(raw)
  console.log(`[shopify] ${raw.length} products fetched, ${products.length} after filtering`)

  const links = products
    .filter(p => p.handle)
    .map(p => `${base}/products/${p.handle}`) as string[]

  const markdown = formatProductList(products, base)

  return {
    markdown,
    links,
    metadata: {
      title: `Products — ${base.replace('https://', '')}`,
      sourceURL: sourceUrl,
      shopifyDetected: true,
      productCount: products.length,
      filteredCount: raw.length - products.length,
    },
  }
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startedAt = Date.now()

  try {
    const { url, options, sessionId = null, toolName = 'unknown' } = await req.json()

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY')
    if (!firecrawlKey) {
      console.error('FIRECRAWL_API_KEY not configured')
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let formattedUrl = url.trim()
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`
    }

    console.log('Scraping URL:', formattedUrl)

    // ── Shopify detection and fast path ──────────────────────────────────────
    const shopifyBase = await detectShopify(formattedUrl)

    if (shopifyBase) {
      const handle = extractProductHandle(new URL(formattedUrl).pathname)
      try {
        const { markdown, links, metadata } = await fetchShopifyData(shopifyBase, handle, formattedUrl)
        console.log('[shopify] scrape successful')
        await writeUsageLog({
          sessionId,
          toolName,
          model:        null,
          tokensIn:     null,
          tokensOut:    null,
          status:       'success',
          durationMs:   Date.now() - startedAt,
          errorMessage: null,
          endpoint:     formattedUrl,
        })
        return new Response(
          JSON.stringify({ success: true, data: { markdown, links, metadata } }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (shopifyError) {
        const msg = shopifyError instanceof Error ? shopifyError.message : 'Shopify fetch failed'
        console.warn(`[shopify] ${msg} — falling back to Firecrawl`)
      }
    }

    // ── Firecrawl (non-Shopify or Shopify fallback) ───────────────────────────
    const firecrawlEndpoint = 'https://api.firecrawl.dev/v1/scrape'
    const response = await fetch(firecrawlEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: options?.formats || ['markdown', 'links'],
        onlyMainContent: options?.onlyMainContent ?? true,
        waitFor: options?.waitFor,
      }),
    })

    const data = await response.json()
    const durationMs = Date.now() - startedAt

    if (!response.ok) {
      console.error('Firecrawl API error:', data)
      await writeUsageLog({
        sessionId,
        toolName,
        model:        null,
        tokensIn:     null,
        tokensOut:    null,
        status:       'failed',
        durationMs,
        errorMessage: data.error ?? `Request failed with status ${response.status}`,
        endpoint:     firecrawlEndpoint,
      })
      return new Response(
        JSON.stringify({ success: false, error: data.error || `Request failed with status ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Scrape successful')
    await writeUsageLog({
      sessionId,
      toolName,
      model:        null,
      tokensIn:     null,
      tokensOut:    null,
      status:       'success',
      durationMs,
      errorMessage: null,
      endpoint:     firecrawlEndpoint,
    })
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const durationMs   = Date.now() - startedAt
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape'
    console.error('Error scraping:', error)
    await writeUsageLog({
      sessionId:    null,
      toolName:     'unknown',
      model:        null,
      tokensIn:     null,
      tokensOut:    null,
      status:       'failed',
      durationMs,
      errorMessage,
      endpoint:     'https://api.firecrawl.dev/v1/scrape',
    })
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
