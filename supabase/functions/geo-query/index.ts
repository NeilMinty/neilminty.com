const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface QueryResult {
  engine:    string
  cited:     boolean
  citations: string[]
  snippet:   string
  error?:    string
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .trim()
}

function isCited(domain: string, citations: string[]): boolean {
  const d = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').toLowerCase().replace(/\/$/, '')
  return citations.some(url => url.toLowerCase().includes(d))
}

function topDomains(citations: string[], exclude: string, limit = 3): string[] {
  const excl = exclude.replace(/^www\./, '').toLowerCase()
  const domains = citations
    .map(url => {
      try { return new URL(url).hostname.replace(/^www\./, '') } catch { return null }
    })
    .filter((h): h is string => !!h && !h.includes(excl))
  return [...new Set(domains)].slice(0, limit)
}

// ─── PERPLEXITY ───────────────────────────────────────────────────────────────

async function queryPerplexity(query: string, domain: string): Promise<QueryResult> {
  const apiKey = Deno.env.get('PERPLEXITY_API_KEY')
  if (!apiKey) return { engine: 'Perplexity', cited: false, citations: [], snippet: '', error: 'API key not configured' }

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      model:    'sonar',
      messages: [{ role: 'user', content: query }],
      max_tokens: 400,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { error?: { message?: string } }
    return { engine: 'Perplexity', cited: false, citations: [], snippet: '', error: err.error?.message ?? `HTTP ${response.status}` }
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>
    citations?: string[]
  }

  const text      = data.choices?.[0]?.message?.content ?? ''
  const citations = data.citations ?? []
  const snippet   = stripMarkdown(text).slice(0, 600)

  console.info(`[geo-query] Perplexity: ${citations.length} citations, cited=${isCited(domain, citations)}`)
  console.info(`[geo-query] Perplexity citations:`, JSON.stringify(citations))

  return {
    engine:    'Perplexity',
    cited:     isCited(domain, citations),
    citations: citations.slice(0, 10),
    snippet,
  }
}

// ─── OPENAI WEB SEARCH ────────────────────────────────────────────────────────

async function queryOpenAI(query: string, domain: string): Promise<QueryResult> {
  const apiKey = Deno.env.get('Chat_GPT_API_Key')
  if (!apiKey) return { engine: 'ChatGPT', cited: false, citations: [], snippet: '', error: 'API key not configured' }

  const OPENAI_MODEL = 'gpt-4o'
  console.info(`[geo-query] ChatGPT using model: ${OPENAI_MODEL}`)

  const response = await fetch('https://api.openai.com/v1/responses', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      model: OPENAI_MODEL,
      tools: [{ type: 'web_search_preview' }],
      tool_choice: { type: 'web_search_preview' },
      input: query,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { error?: { message?: string } }
    return { engine: 'ChatGPT', cited: false, citations: [], snippet: '', error: err.error?.message ?? `HTTP ${response.status}` }
  }

  const data = await response.json() as {
    output?: Array<{
      type:     string
      content?: Array<{
        type:         string
        text?:        string
        annotations?: Array<{ type: string; url?: string; title?: string }>
      }>
    }>
  }

  // Extract text and URL citations from output
  let text      = ''
  const citationUrls: string[] = []

  for (const item of data.output ?? []) {
    if (item.type !== 'message') continue
    for (const block of item.content ?? []) {
      if (block.text) text += block.text
      for (const ann of block.annotations ?? []) {
        if (ann.type === 'url_citation' && ann.url) citationUrls.push(ann.url)
      }
    }
  }

  const snippet = stripMarkdown(text).slice(0, 600)
  console.info(`[geo-query] ChatGPT raw response:`, JSON.stringify(data))
  console.info(`[geo-query] ChatGPT: ${citationUrls.length} citations, cited=${isCited(domain, citationUrls)}`)

  return {
    engine:    'ChatGPT',
    cited:     isCited(domain, citationUrls),
    citations: citationUrls.slice(0, 10),
    snippet,
  }
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { domain, query } = await req.json() as { domain?: string; query?: string }

    if (!domain || !query) {
      return new Response(
        JSON.stringify({ success: false, error: 'domain and query are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    console.info(`[geo-query] domain=${domain} query="${query}"`)

    const [perplexity, openai] = await Promise.allSettled([
      queryPerplexity(query, domain),
      queryOpenAI(query, domain),
    ])

    const results: QueryResult[] = []

    if (perplexity.status === 'fulfilled') {
      results.push(perplexity.value)
    } else {
      results.push({ engine: 'Perplexity', cited: false, citations: [], snippet: '', error: perplexity.reason?.message ?? 'Failed' })
    }

    if (openai.status === 'fulfilled') {
      results.push(openai.value)
    } else {
      results.push({ engine: 'ChatGPT', cited: false, citations: [], snippet: '', error: openai.reason?.message ?? 'Failed' })
    }

    // Attach topDomains for uncited results so the client can show "cited instead"
    const enriched = results.map(r => ({
      ...r,
      top_alternatives: r.cited ? [] : topDomains(r.citations, domain),
    }))

    return new Response(
      JSON.stringify({ success: true, results: enriched }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[geo-query] error:', error)
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
