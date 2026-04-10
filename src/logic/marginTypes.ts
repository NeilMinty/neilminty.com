export interface MarginInputs {
  annualRevenue: number;
  aov: number;
  grossMarginPercent: number;
  returnsRate: number;
  fullPriceResellPercent: number;
  discountedResellPercent: number;
  writeOffPercent: number;
  resaleDiscountPercent: number;
  returnProcessingCost: number;
  promotedOrdersPercent: number;
  discountDepth: number;
  deliveryCost: number;
  deliveryCharge: number;
  freeDeliveryPercent: number;
}

export interface MarginResults {
  returnsLeakage: number;
  returnsLeakagePct: number;
  discountErosion: number;
  discountErosionPct: number;
  deliverySubsidy: number;
  deliverySubsidyPct: number;
  totalLeakage: number;
  contributionMargin: number;
  contributionMarginPct: number;
  contributionMarginClass: 'healthy' | 'under_pressure' | 'critical';
  leakageRanked: Array<{ label: string; value: number; pct: number }>;
  biggestLeverRecommendation: string;
  revenuePerOrder: number;
  trueMarginPerOrder: number;
}
