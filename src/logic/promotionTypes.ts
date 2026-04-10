export interface PromotionInputs {
  aov: number;
  grossMarginPercent: number;
  baselineWeeklyOrders: number;
  discountDepth: number;
  promotionDurationDays: number;
  fulfilmentCostPerOrder: number;
  deliveryChargePerOrder: number;
  freeDeliveryPercent: number;
  incrementalMarketingSpend: number;
  returnsRateIncrease: number;
  subscriptionPercent: number;
  isOverstockClearance: boolean;
}

export interface ScenarioResult {
  upliftPercent: number;
  orders: number;
  revenue: number;
  profit: number;
  profitVsBaseline: number;
  profitVsBaselinePercent: number;
}

export interface PromotionResults {
  fullPriceMarginPerOrder: number;
  promotionalMarginPerOrder: number;
  adjustedPromotionalMarginPerOrder: number;
  marginReductionPercent: number;
  baselineProfit: number;
  breakEvenUpliftPercent: number;
  profitableUpliftPercent: number;
  profitabilityClassification: 'achievable' | 'ambitious' | 'unrealistic';
  scenarios: ScenarioResult[];
  returnsImpactOnBreakEven: number;
  marketingSpendImpactOnBreakEven: number;
  biggestLever: string;
  biggestLeverRecommendation: string;
  overstockNote: string;
}
