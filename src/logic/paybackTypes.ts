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
