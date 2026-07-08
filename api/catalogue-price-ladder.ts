import Anthropic from '@anthropic-ai/sdk';

// ─── RATE LIMITER ─────────────────────────────────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const WINDOW_MS  = 60 * 60 * 1000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function normaliseDomain(input: string): string | null {
  try {
    const withProto = /^https?:\/\//i.test(input.trim())
      ? input.trim()
      : `https://${input.trim()}`;
    return new URL(withProto).hostname;
  } catch {
    return null;
  }
}

interface ShopifyVariant { price: string }
interface ShopifyProduct { title: string; product_type: string; variants: ShopifyVariant[] }

function buildSummary(products: ShopifyProduct[]) {
  const prices: number[] = [];
  for (const p of products) {
    for (const v of p.variants) {
      const n = parseFloat(v.price);
      if (!isNaN(n) && n > 0) prices.push(n);
    }
  }
  prices.sort((a, b) => a - b);

  const n = prices.length;
  const p33 = prices[Math.floor(n * 0.33)] ?? 0;
  const p67 = prices[Math.floor(n * 0.67)] ?? 0;

  const entry   = prices.filter(p => p <= p33);
  const core    = prices.filter(p => p > p33 && p <= p67);
  const premium = prices.filter(p => p > p67);

  const tier = (arr: number[]) =>
    arr.length ? { min: Math.min(...arr), max: Math.max(...arr) } : null;

  const typeCounts: Record<string, number> = {};
  for (const p of products) {
    const t = p.product_type?.trim() || 'Uncategorised';
    typeCounts[t] = (typeCounts[t] ?? 0) + 1;
  }
  const categorySpread = Object.entries(typeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([type, count]) => `${type} (${count})`)
    .join(', ');

  const avgVariants =
    products.reduce((s, p) => s + p.variants.length, 0) / (products.length || 1);

  return {
    productCount: products.length,
    minPrice:  prices[0] ?? 0,
    maxPrice:  prices[n - 1] ?? 0,
    medianPrice: prices[Math.floor(n / 2)] ?? 0,
    priceLadder: { entry: tier(entry), core: tier(core), premium: tier(premium) },
    categorySpread,
    avgVariants: Math.round(avgVariants * 10) / 10,
  };
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests. Try again in an hour.' });
  }

  const { url } = (req.body ?? {}) as { url?: string };
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required.' });
  }

  const domain = normaliseDomain(url);
  if (!domain || !domain.includes('.')) {
    return res.status(400).json({ error: 'Enter a valid domain, e.g. competitor.com' });
  }

  // Fetch products.json
  let products: ShopifyProduct[];
  try {
    const resp = await fetch(`https://${domain}/products.json?limit=250`, {
      headers: { 'User-Agent': 'CataloguePriceLadder/1.0 (+https://neilminty.com/tools/catalogue-price-ladder)' },
      signal: AbortSignal.timeout(10000),
    });
    if (resp.status === 404 || resp.status === 401 || resp.status === 403) {
      return res.status(422).json({ error: 'Catalogue not accessible — store may not be Shopify, may be password-protected, or the URL is wrong.' });
    }
    if (resp.status === 429 || resp.status === 430) {
      return res.status(422).json({ error: 'Catalogue not accessible — store is rate-limiting requests.' });
    }
    if (!resp.ok) {
      return res.status(422).json({ error: `Catalogue not accessible (HTTP ${resp.status}).` });
    }
    const json = await resp.json() as { products?: unknown };
    if (!Array.isArray(json.products)) {
      return res.status(422).json({ error: 'Catalogue not accessible — response was not a Shopify products feed.' });
    }
    products = json.products as ShopifyProduct[];
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      return res.status(422).json({ error: 'Catalogue not accessible — request timed out.' });
    }
    return res.status(422).json({ error: 'Catalogue not accessible — could not reach the store.' });
  }

  if (products.length === 0) {
    return res.status(422).json({ error: 'No products found in this catalogue.' });
  }

  const s = buildSummary(products);

  // Call Claude
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const tierStr = (t: { min: number; max: number } | null) =>
    t ? `${t.min}–${t.max}` : 'n/a';

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

Rules: be specific, use the data, no hedging language, no "it appears that", no preamble.`;

  let brief: Array<{ title: string; body: string }>;
  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const cleaned = text.replace(/^```(?:json)?\s*/m, '').replace(/```\s*$/m, '').trim();
    const parsed = JSON.parse(cleaned) as { sections: typeof brief };
    brief = parsed.sections;
  } catch {
    return res.status(500).json({ error: 'Brief generation failed. Try again.' });
  }

  return res.status(200).json({
    storeDomain:  domain,
    productCount: s.productCount,
    priceLadder:  s.priceLadder,
    brief,
  });
}
