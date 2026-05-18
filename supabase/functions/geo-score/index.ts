import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const MODEL         = 'claude-sonnet-4-20250514'
const CONTENT_CAP   = 600 // words per page sent to Claude

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Page {
  url:       string
  type:      string
  content:   string
  wordCount: number
}

interface GeoScore {
  overall:    number
  dimensions: {
    entity_clarity:        number
    claim_specificity:     number
    structure_legibility:  number
    citation_worthiness:   number
    comparison_anchoring:  number
  }
  verdict:       string
  pages_scored:  number
  confidence:    'high' | 'medium' | 'low'
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function truncateToWords(text: string, limit: number): string {
  const words = text.trim().split(/\s+/)
  if (words.length <= limit) return text
  return words.slice(0, limit).join(' ') + ' …'
}

function formatPagesForPrompt(pages: Page[]): string {
  return pages.map((p, i) =>
    `--- Page ${i + 1} [${p.type}]: ${p.url} ---\n${truncateToWords(p.content, CONTENT_CAP)}`
  ).join('\n\n')
}

// ─── USAGE LOG ────────────────────────────────────────────────────────────────

async function writeUsageLog(params: {
  tokensIn:     number | null
  tokensOut:    number | null
  status:       string
  durationMs:   number
  errorMessage: string | null
}): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !supabaseKey) return

  // Claude Sonnet 4 pricing: $3/$15 per MTok in/out
  const costEstimate =
    params.tokensIn !== null && params.tokensOut !== null
      ? (params.tokensIn * 3 + params.tokensOut * 15) / 1_000_000
      : null

  const supabase = createClient(supabaseUrl, supabaseKey)
  const { error } = await supabase.from('tool_usage_logs').insert({
    session_id:    null,
    tool_name:     'geo-audit',
    api_provider:  'anthropic',
    model:         MODEL,
    tokens_in:     params.tokensIn,
    tokens_out:    params.tokensOut,
    cost_estimate: costEstimate,
    endpoint:      ANTHROPIC_API,
    status:        params.status,
    duration_ms:   params.durationMs,
    error_message: params.errorMessage,
  })
  if (error) console.error('[geo-score] usage log error:', error.message)
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startedAt = Date.now()

  try {
    const { pages } = await req.json() as { pages?: Page[] }

    if (!Array.isArray(pages) || pages.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'pages array is required and must not be empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const anthropicKey = Deno.env.get('Anthropic_GEO_Key')
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Anthropic API key not configured.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    console.log(`[geo-score] scoring ${pages.length} pages`)

    const systemPrompt = `You are a GEO (Generative Engine Optimisation) readiness scorer. Analyse the provided pages and return a single site-level assessment. Return JSON only, no preamble, no markdown.

Score across 5 dimensions (0–100 each):
- entity_clarity: How clearly the brand/product entity is defined and distinguished
- claim_specificity: How specific, verifiable and concrete the claims are
- structure_legibility: How well-structured the content is for AI parsing
- citation_worthiness: How likely these pages are to be cited by an AI as a source
- comparison_anchoring: How well the site positions against alternatives

Return:
{
  "overall": number,
  "dimensions": {
    "entity_clarity": number,
    "claim_specificity": number,
    "structure_legibility": number,
    "citation_worthiness": number,
    "comparison_anchoring": number
  },
  "verdict": "string (2–3 sentences, plain English, biggest gap and primary opportunity)",
  "pages_scored": number,
  "confidence": "high" | "medium" | "low"
}

confidence: high if ≥8 pages scored, medium if 4–7, low if <4`

    const userContent = `Pages to score (${pages.length} total):\n\n${formatPagesForPrompt(pages)}`

    const response = await fetch(ANTHROPIC_API, {
      method:  'POST',
      headers: {
        'x-api-key':         anthropicKey,
        'anthropic-version': '2023-06-01',
        'Content-Type':      'application/json',
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: 512,
        messages: [
          { role: 'user', content: userContent },
        ],
        system: systemPrompt,
      }),
    })

    const data = await response.json() as {
      content?: Array<{ type: string; text: string }>
      usage?:   { input_tokens: number; output_tokens: number }
      error?:   { message: string }
    }

    const durationMs = Date.now() - startedAt
    const tokensIn   = data.usage?.input_tokens  ?? null
    const tokensOut  = data.usage?.output_tokens ?? null

    if (!response.ok) {
      const msg = data.error?.message ?? `Anthropic returned ${response.status}`
      console.error('[geo-score] Anthropic error:', msg)
      await writeUsageLog({ tokensIn, tokensOut, status: 'failed', durationMs, errorMessage: msg })
      return new Response(
        JSON.stringify({ success: false, error: 'Scoring service error. Please try again.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const raw = data.content?.[0]?.text ?? ''
    console.log('[geo-score] raw response:', raw.substring(0, 200))

    let score: GeoScore
    try {
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      score = JSON.parse(cleaned) as GeoScore
    } catch (parseErr) {
      console.error('[geo-score] JSON parse error:', parseErr, 'raw:', raw)
      await writeUsageLog({ tokensIn, tokensOut, status: 'parse_error', durationMs, errorMessage: 'Failed to parse score JSON' })
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse score response. Please try again.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    await writeUsageLog({ tokensIn, tokensOut, status: 'success', durationMs, errorMessage: null })

    return new Response(
      JSON.stringify({ success: true, score }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[geo-score] unhandled error:', error)
    await writeUsageLog({ tokensIn: null, tokensOut: null, status: 'failed', durationMs: Date.now() - startedAt, errorMessage: msg })
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
