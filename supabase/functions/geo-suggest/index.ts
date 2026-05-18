const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const MODEL         = 'claude-haiku-4-5-20251001'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { domain, verdict } = await req.json() as { domain?: string; verdict?: string }

    if (!domain || !verdict) {
      return new Response(
        JSON.stringify({ success: false, error: 'domain and verdict are required' }),
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

    const response = await fetch(ANTHROPIC_API, {
      method:  'POST',
      headers: {
        'x-api-key':         anthropicKey,
        'anthropic-version': '2023-06-01',
        'Content-Type':      'application/json',
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: 60,
        system:     'You suggest search queries. Return only the query string, no quotes, no explanation.',
        messages: [{
          role:    'user',
          content: `Domain: ${domain}\n\nSite summary: ${verdict}\n\nSuggest the single most likely search query a potential customer would use to find this brand or its products. Return the query only.`,
        }],
      }),
    })

    const data = await response.json() as {
      content?: Array<{ type: string; text: string }>
      error?:   { message: string }
    }

    if (!response.ok) {
      return new Response(
        JSON.stringify({ success: false, error: data.error?.message ?? 'Suggestion failed' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const query = (data.content?.[0]?.text ?? '').trim().replace(/^["']|["']$/g, '')

    return new Response(
      JSON.stringify({ success: true, query }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
