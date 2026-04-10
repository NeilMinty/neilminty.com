import { useMemo } from "react";
import { computeZScore } from "@/lib/z-score";
import type { ZClassification } from "@/lib/z-score";

// ─── INPUT TYPES ─────────────────────────────────────────────────────────────

export interface ProductFormRow {
  id: string;
  name: string;
  firstPurchaseVolume: string;
  repeatRate90d: string;
  avgSpend90d: string;
  avgSpend180d: string;
  /** % of first purchases at full price (0–100). Empty treated as 100. */
  fullPricePct: string;
  /** Average discount depth on first purchase orders (0–100). Optional. */
  discountDepth: string;
}

// ─── OUTPUT TYPES ─────────────────────────────────────────────────────────────

export type RetentionTier = "verified" | "signal" | "escalate";

export interface ProductAnalysis {
  id: string;
  name: string;
  firstPurchaseVolume: number;
  repeatRate90d: number;
  /**
   * repeat_rate × (1 − 1/√volume) × (fullPricePct / 100)
   * Used for default sort only — never displayed directly.
   */
  weightedScore: number;
  zScore: number;
  zClassification: ZClassification;
  avgSpend90d: number;
  avgSpend180d: number;
  /** ltv_180d / ltv_90d — continuous compounding ratio */
  ltvMomentum: number;
  retentionTier: RetentionTier;
  /** true when firstPurchaseVolume < 20 */
  lowConfidence: boolean;
  /** parsed fullPricePct, 0–100 */
  fullPricePct: number;
  /** parsed discountDepth, 0–100. 0 = not entered. */
  discountDepth: number;
}

export interface AnalysisResult {
  products: ProductAnalysis[];
  highestVolumeProduct: ProductAnalysis | null;
  /** highest by weightedScore, not raw repeat rate */
  highestRetentionProduct: ProductAnalysis | null;
  retentionGap: number;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function parseNum(s: string): number {
  const n = parseFloat(s.replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? 0 : n;
}

/** Full price pct: empty string → 100 (assume full price if not entered). */
function parseFpPct(s: string): number {
  if (!s.trim()) return 100;
  const n = parseFloat(s.replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? 100 : Math.max(0, Math.min(100, n));
}

function computeWeightedScore(repeatRate: number, volume: number, fullPricePct: number): number {
  if (volume <= 0) return 0;
  return repeatRate * (1 - 1 / Math.sqrt(volume)) * (fullPricePct / 100);
}

function assignRetentionTier(index: number, total: number): RetentionTier {
  if (total <= 1) return "verified";
  if (total === 2) return index === 0 ? "verified" : "escalate";
  const third = total / 3;
  if (index < third) return "verified";
  if (index < 2 * third) return "signal";
  return "escalate";
}

// ─── ANALYSIS ─────────────────────────────────────────────────────────────────

export function computeAnalysis(rows: ProductFormRow[]): AnalysisResult {
  const valid = rows.filter(r => r.name.trim() && parseNum(r.firstPurchaseVolume) > 0);

  if (valid.length === 0) {
    return { products: [], highestVolumeProduct: null, highestRetentionProduct: null, retentionGap: 0 };
  }

  const rates = valid.map(r => parseNum(r.repeatRate90d));
  const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
  const variance = rates.reduce((s, r) => s + (r - mean) ** 2, 0) / rates.length;
  const stdDev = Math.sqrt(variance);

  // Retention tiers by rank of raw repeat rate
  const sortedByRate = [...valid].sort(
    (a, b) => parseNum(b.repeatRate90d) - parseNum(a.repeatRate90d),
  );
  const tierMap = new Map<string, RetentionTier>();
  sortedByRate.forEach((r, i) => tierMap.set(r.id, assignRetentionTier(i, valid.length)));

  const products: ProductAnalysis[] = valid.map(r => {
    const rate = parseNum(r.repeatRate90d);
    const volume = parseNum(r.firstPurchaseVolume);
    const spend90 = parseNum(r.avgSpend90d);
    const spend180 = parseNum(r.avgSpend180d);
    const fpPct = parseFpPct(r.fullPricePct);
    const discDepth = parseNum(r.discountDepth);
    const { zScore, zClassification } = computeZScore(rate, mean, stdDev);
    return {
      id: r.id,
      name: r.name.trim(),
      firstPurchaseVolume: volume,
      repeatRate90d: rate,
      weightedScore: computeWeightedScore(rate, volume, fpPct),
      zScore,
      zClassification,
      avgSpend90d: spend90,
      avgSpend180d: spend180,
      ltvMomentum: spend90 > 0 ? spend180 / spend90 : 0,
      retentionTier: tierMap.get(r.id) ?? "signal",
      lowConfidence: volume < 20,
      fullPricePct: fpPct,
      discountDepth: discDepth,
    };
  });

  const byVolume = [...products].sort((a, b) => b.firstPurchaseVolume - a.firstPurchaseVolume);
  const byWeighted = [...products].sort((a, b) => b.weightedScore - a.weightedScore);

  const allRates = products.map(p => p.repeatRate90d);
  const retentionGap =
    products.length >= 2 ? Math.max(...allRates) - Math.min(...allRates) : 0;

  return {
    products,
    highestVolumeProduct: byVolume[0] ?? null,
    highestRetentionProduct: byWeighted[0] ?? null,
    retentionGap,
  };
}

export function useAnalysis(rows: ProductFormRow[]) {
  return useMemo(() => computeAnalysis(rows), [rows]);
}
