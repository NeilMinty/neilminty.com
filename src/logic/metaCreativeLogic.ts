import type {
  DeliveryBucket,
  RawAdRow,
  ProcessedAd,
  SpendSummary,
  ParseResult,
  CreativeAnalysisResult,
} from './metaCreativeTypes';

export function findColumn(fields: string[], patterns: string[]): string | undefined {
  return fields.find((f) => patterns.some((p) => f.toLowerCase().includes(p)));
}

export function classifyDelivery(raw: string): DeliveryBucket {
  const lower = raw.toLowerCase();
  if (lower.includes('learning limited')) return 'learning_limited';
  if (lower.includes('learning')) return 'learning';
  if (lower.includes('active')) return 'stable';
  return 'other';
}

export function parseMetaExport(raw: Record<string, string>[]): ParseResult {
  if (raw.length === 0) return { rows: [], error: 'File is empty.', warnings: [] };

  const fields = Object.keys(raw[0]);

  const adNameCol  = findColumn(fields, ['ad name', 'name']);
  const spendCol   = findColumn(fields, ['amount spent', 'spend', 'cost']);
  const deliveryCol = findColumn(fields, ['delivery', 'status']);

  if (!adNameCol) {
    return { rows: [], error: `Could not find Ad Name column. Found: ${fields.join(', ')}.`, warnings: [] };
  }
  if (!spendCol) {
    return { rows: [], error: `Could not find Spend column. Found: ${fields.join(', ')}.`, warnings: [] };
  }

  const warnings: string[] = [];
  if (!deliveryCol) {
    warnings.push('Delivery status column could not be detected — all ads will be classified as other.');
  }

  const parseNum = (v: string): number => parseFloat(v.replace(/[£$€,\s]/g, ''));

  const rows: RawAdRow[] = [];
  for (const r of raw) {
    const adName = r[adNameCol]?.trim() ?? '';
    const spend  = parseNum(r[spendCol] ?? '');
    if (!adName) continue;
    if (!spend || isNaN(spend) || spend <= 0) continue;
    const delivery = deliveryCol ? (r[deliveryCol]?.trim() ?? '') : '';
    rows.push({ adName, spend, delivery });
  }

  if (rows.length === 0) {
    return { rows: [], error: 'No rows with positive spend found after filtering.', warnings };
  }

  return { rows, error: null, warnings };
}

export function analyseCreatives(rows: RawAdRow[]): CreativeAnalysisResult {
  const total = rows.reduce((sum, r) => sum + r.spend, 0);

  const ads: ProcessedAd[] = rows
    .map((r) => ({
      adName:     r.adName,
      spend:      r.spend,
      spendShare: total > 0 ? (r.spend / total) * 100 : 0,
      bucket:     classifyDelivery(r.delivery),
    }))
    .sort((a, b) => b.spend - a.spend);

  const stable          = ads.filter((a) => a.bucket === 'stable').reduce((s, a) => s + a.spend, 0);
  const learning        = ads.filter((a) => a.bucket === 'learning').reduce((s, a) => s + a.spend, 0);
  const learningLimited = ads.filter((a) => a.bucket === 'learning_limited').reduce((s, a) => s + a.spend, 0);
  const other           = ads.filter((a) => a.bucket === 'other').reduce((s, a) => s + a.spend, 0);
  const estimatedPremium = (learning + learningLimited) * 0.40;

  const summary: SpendSummary = { total, stable, learning, learningLimited, other, estimatedPremium };

  const activeAds = ads.filter((a) => a.bucket !== 'other').length;

  return { ads, summary, totalAds: ads.length, activeAds };
}
