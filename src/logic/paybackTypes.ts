export interface PaybackInputs {
  blendedCAC: number;
  aov: number;
  grossMarginPercent: number;
  repeatPurchaseRate: number;
  avgOrderFrequencyMonths: number;
}

export interface PaybackResults {
  marginPerOrder: number;
  monthsToPayback: number;
  ltv12Month: number;
  ltv24Month: number;
  ordersToPayback: number;
  paybackVerdict: 'strong' | 'acceptable' | 'stretched' | 'unviable';
  ltvCacRatio12: number;
  ltvCacRatio24: number;
}

// ─── Full Analyser types ──────────────────────────────────────────────────────

export interface ChannelInput {
  label: string;
  cac: number;
  volume: number;
}

export interface ChannelResult {
  label: string;
  cac: number;
  volume: number;
  ltv12: number;
  ltv24: number;
  ltvCacRatio12: number;
  ltvCacRatio24: number;
  paybackMonths: number;
  isUnderwater: boolean;
  isPaybackRisk: boolean;
}

export interface FullAnalyserResults {
  channels: ChannelResult[];
  blendedCAC: number;
  blendedLtvCacRatio12: number;
  blendedLtvCacRatio24: number;
  totalVolume: number;
}
