export type DeliveryBucket = 'stable' | 'learning' | 'learning_limited' | 'other';

export interface RawAdRow {
  adName: string;
  spend: number;
  delivery: string;
}

export interface ProcessedAd {
  adName: string;
  spend: number;
  spendShare: number;
  bucket: DeliveryBucket;
}

export interface SpendSummary {
  total: number;
  stable: number;
  learning: number;
  learningLimited: number;
  other: number;
  estimatedPremium: number;
}

export interface ParseResult {
  rows: RawAdRow[];
  error: string | null;
  warnings: string[];
}

export interface CreativeAnalysisResult {
  ads: ProcessedAd[];
  summary: SpendSummary;
  totalAds: number;
  activeAds: number;
}
