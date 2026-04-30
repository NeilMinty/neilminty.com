import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Perplexity sonar pricing — USD per token (update if pricing changes)
const SONAR_INPUT_COST_PER_TOKEN  = 1.0 / 1_000_000
const SONAR_OUTPUT_COST_PER_TOKEN = 1.0 / 1_000_000

interface ResearchContext {
  sector?: string
  brandName?: string
  priceRange?: string
  region?: string
}

function buildSystemPrompt(context?: ResearchContext): string {
  const contextLines: string[] = []

  if (context?.brandName)  contextLines.push(`Brand: ${context.brandName}`)
  if (context?.sector)     contextLines.push(`Sector: ${context.sector}`)
  if (context?.priceRange) contextLines.push(`Price range: ${context.priceRange}`)
  if (context?.region)     contextLines.push(`Region: ${context.region}`)

  const contextBlock = contextLines.length > 0
    ? `\n\nResearch context:\n${contextLines.join('\n')}\n\nFrame all insights relative to this context where relevant.`
    : ''

  return `You are a market research analyst. Your role is to surface accurate, actionable competitive and market intelligence grounded in verifiable sources.${contextBlock}

Return ONLY valid JSON matching this schema — no markdown, no code fences, no extra text:
{
  "insights": [
    {
      "type": "competitor" | "trend" | "sentiment",
      "title": "string",
      "summary": "string (2-3 sentences, factual, cite specifics)",
      "confidence": "high" | "medium" | "low",
      "signalStrength": "strong" | "moderate" | "weak",
      "category": "string (e.g. pricing, product, positioning, distribution, market, audience)",
      "direction": "up" | "down" | "flat" (for trends, otherwise "flat")
    }
  ]
}
Rules:
- Every claim must be verifiable from the citations Perplexity provides.
- If only one source supports a claim, set confidence to "low" and signalStrength to "weak".
- Do not amplify weak signals — if evidence is thin, say so in the summary.
- Max 6 insights per response.`
}

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

  const costEstimate =
    params.tokensIn !== null && params.tokensOut !== null
      ? params.tokensIn * SONAR_INPUT_COST_PER_TOKEN + params.tokensOut * SONAR_OUTPUT_COST_PER_TOKEN
      : null

  const supabase = createClient(supabaseUrl, supabaseKey)
  const { error } = await supabase.from('tool_usage_logs').insert({
    session_id:    params.sessionId,
    tool_name:     params.toolName,
    api_provider:  'perplexity',
    model:         params.model,
    tokens_in:     params.tokensIn,
    tokens_out:    params.tokensOut,
    cost_estimate: costEstimate,
    endpoint:      params.endpoint,
    status:        params.status,
    duration_ms:   params.durationMs,
    error_message: params.errorMessage,
  })

  if (error) console.error('Failed to write usage log:', error.message)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startedAt = Date.now()

  try {
    const { query, searchRecency, domainFilter, context, sessionId = null, toolName = 'unknown' } = await req.json()

    if (!query) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = Deno.env.get('PERPLEXITY_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Perplexity API key not configured.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Perplexity research query:', query)

    const body: Record<string, unknown> = {
      model: 'sonar',
      messages: [
        { role: 'system', content: buildSystemPrompt(context) },
        { role: 'user', content: query },
      ],
      temperature: 0.1,
      max_tokens: 2000,
    }

    if (searchRecency) {
      body.search_recency_filter = searchRecency
    }

    if (domainFilter && Array.isArray(domainFilter) && domainFilter.length > 0) {
      body.search_domain_filter = domainFilter
    }

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    const durationMs = Date.now() - startedAt

    if (!response.ok) {
      console.error('Perplexity API error:', data)
      await writeUsageLog({
        sessionId,
        toolName,
        model:        data.model ?? 'sonar',
        tokensIn:     data.usage?.prompt_tokens     ?? null,
        tokensOut:    data.usage?.completion_tokens ?? null,
        status:       'failed',
        durationMs,
        errorMessage: data.error?.message ?? `Perplexity request failed (${response.status})`,
        endpoint:     'https://api.perplexity.ai/chat/completions',
      })
      return new Response(
        JSON.stringify({ success: false, error: data.error?.message ?? `Perplexity request failed (${response.status})` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const content   = data.choices?.[0]?.message?.content ?? ''
    const citations = data.citations ?? []

    let insights = []
    let parseStatus: 'success' | 'parse_error' = 'success'
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed  = JSON.parse(cleaned)
      insights = parsed.insights ?? []
    } catch (parseErr) {
      parseStatus = 'parse_error'
      console.error('Failed to parse Perplexity response as JSON:', parseErr)
      console.log('Raw content:', content)
      insights = [{
        type:           'trend',
        title:          'Research Results',
        summary:        content.substring(0, 500),
        confidence:     'low',
        signalStrength: 'weak',
        category:       'market',
        direction:      'flat',
      }]
    }

    console.log(`Perplexity returned ${insights.length} insights with ${citations.length} citations`)

    await writeUsageLog({
      sessionId,
      toolName,
      model:        data.model ?? 'sonar',
      tokensIn:     data.usage?.prompt_tokens     ?? null,
      tokensOut:    data.usage?.completion_tokens ?? null,
      status:       parseStatus,
      durationMs,
      errorMessage: parseStatus === 'parse_error' ? 'Failed to parse response as JSON' : null,
      endpoint:     'https://api.perplexity.ai/chat/completions',
    })

    return new Response(
      JSON.stringify({ success: true, insights, citations, model: data.model, usage: data.usage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const durationMs   = Date.now() - startedAt
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in perplexity-research:', error)

    await writeUsageLog({
      sessionId:    null,
      toolName:     'unknown',
      model:        null,
      tokensIn:     null,
      tokensOut:    null,
      status:       'failed',
      durationMs,
      errorMessage,
      endpoint:     'https://api.perplexity.ai/chat/completions',
    })

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
