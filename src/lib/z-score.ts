// ─── TYPES ──────────────────────────────────────────────────────────────────

export type ZClassification = "outlier" | "mild_outlier" | "normal";

export interface ZScoreData {
  zScore: number;
  zClassification: ZClassification;
}

// ─── CLASSIFICATION ─────────────────────────────────────────────────────────

export function classifyZScore(z: number): ZClassification {
  const abs = Math.abs(z);
  if (abs >= 2.0) return "outlier";
  if (abs >= 1.5) return "mild_outlier";
  return "normal";
}

export function computeZScore(value: number, mean: number, stdDev: number): ZScoreData {
  if (stdDev < 0.01) return { zScore: 0, zClassification: "normal" };
  const z = +((value - mean) / stdDev).toFixed(1);
  return { zScore: z, zClassification: classifyZScore(z) };
}
