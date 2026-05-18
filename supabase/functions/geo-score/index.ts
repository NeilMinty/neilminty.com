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
  try {
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
  } catch (err) {
    console.error('[geo-score] writeUsageLog threw:', err)
  }
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

    const systemPrompt = `You are a GEO (Generative Engine Optimisation) readiness scorer. You score pages against the criteria that live retrieval systems — Perplexity, ChatGPT with web search, and similar — actually use when deciding what to cite.

Scoring is strict. Most pages score between 20–60. A score above 70 on any dimension means the page genuinely excels at that criterion. A score above 80 is rare and requires clear evidence.

Score each dimension 0–100 using these criteria:

ENTITY_CLARITY (Is the brand/product entity unambiguously defined?)
- 80–100: Brand name, product name, category, and differentiator stated explicitly and consistently across the page. A retrieval system could describe this brand in one sentence from this page alone.
- 50–79: Entity is identifiable but vague or inconsistent. Generic category language used instead of specific positioning.
- 20–49: Entity is implied but not defined. Could apply to any brand in the category.
- 0–19: No clear entity definition. Retrieval system cannot identify what this brand is or does.

CLAIM_SPECIFICITY (Are claims verifiable and concrete?)
- 80–100: Named ingredients with specific dosages, cited mechanisms, referenced studies, or quantified outcomes. Claims are falsifiable.
- 50–79: Some specific claims but mixed with vague benefit language ('supports', 'helps', 'may improve').
- 20–49: Mostly vague benefit language. No dosages, no mechanisms, no studies referenced.
- 0–19: Pure marketing copy. No verifiable claims at all.

STRUCTURE_LEGIBILITY (Can a retrieval system parse this page?)
- 80–100: Clear heading hierarchy, short paragraphs, FAQ section present, structured data (JSON-LD) present, content scannable without context.
- 50–79: Reasonable structure but missing FAQ or structured data. Some long paragraphs.
- 20–49: Poor heading structure or wall-of-text content. Retrieval system would struggle to extract specific answers.
- 0–19: No discernible structure. Content not parseable by a retrieval system.

CITATION_WORTHINESS (Would a retrieval system cite this page as a source?)
- 80–100: Page contains specific, attributable claims that answer real user questions. Has a clear point of view, named evidence, or proprietary data. Something a retrieval system could quote.
- 50–79: Page is useful but generic. Contains information available on many other sites. Low reason to cite specifically.
- 20–49: Page is primarily promotional. Retrieval system would prefer an authority site over this for any query.
- 0–19: Nothing citable. Pure product listing or marketing copy.

COMPARISON_ANCHORING (Does the page position against alternatives?)
- 80–100: Explicitly addresses alternatives, competitors, or category comparisons. Answers 'why this over that' directly. Retrieval systems favour pages that answer comparative queries.
- 50–79: Some differentiation language but no direct comparison. Implied superiority without stated basis.
- 20–49: No comparison or differentiation. Page assumes the reader has already chosen this product.
- 0–19: Actively avoids comparison. Generic category content only.

PENALTIES — reduce scores as follows:
- Generic benefit language throughout ('supports immunity', 'promotes sleep'): -15 on claim_specificity and citation_worthiness
- No FAQ section or structured data: -10 on structure_legibility
- Brand name not stated in first 100 words: -10 on entity_clarity
- No comparison or differentiation anywhere on page: -15 on comparison_anchoring
- Content duplicates what is available on authority sites (NHS, Healthline, WebMD) without adding proprietary perspective: -20 on citation_worthiness

Return JSON only, no preamble, no markdown:
{
  "overall": number (weighted average: entity_clarity 20%, claim_specificity 25%, structure_legibility 20%, citation_worthiness 25%, comparison_anchoring 10%),
  "dimensions": {
    "entity_clarity": number,
    "claim_specificity": number,
    "structure_legibility": number,
    "citation_worthiness": number,
    "comparison_anchoring": number
  },
  "verdict": "string (2-3 sentences, plain English. State the single biggest barrier to citation, not a summary of scores. Be direct.)",
  "pages_scored": number,
  "confidence": "high" | "medium" | "low"
}`

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
