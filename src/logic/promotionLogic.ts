import type { PromotionInputs, PromotionResults } from './promotionTypes';

export function calculatePromotion(inputs: PromotionInputs): PromotionResults {
  const {
    aov,
    grossMarginPercent,
    baselineWeeklyOrders,
    discountDepth,
    promotionDurationDays,
    fulfilmentCostPerOrder,
    deliveryChargePerOrder,
    freeDeliveryPercent,
    incrementalMarketingSpend,
    returnsRateIncrease,
    subscriptionPercent,
    isOverstockClearance,
  } = inputs;

  // Derived
  const baselineOrdersForPeriod = baselineWeeklyOrders * (promotionDurationDays / 7);
  const promotionalAOV = aov * (1 - discountDepth / 100);
  const grossMarginDecimal = grossMarginPercent / 100;

  // Effective delivery revenue per order — scaled by the proportion that don't qualify for free delivery
  const effectiveDeliveryRevenue = deliveryChargePerOrder * (1 - freeDeliveryPercent / 100);

  // Margin per order (discount impact only — no returns, used for displayed metrics)
  const fullPriceMarginPerOrder = aov * grossMarginDecimal - fulfilmentCostPerOrder + effectiveDeliveryRevenue;
  const promotionalMarginPerOrder = promotionalAOV * grossMarginDecimal - fulfilmentCostPerOrder + effectiveDeliveryRevenue;
  const marginReductionPercent =
    fullPriceMarginPerOrder > 0
      ? ((fullPriceMarginPerOrder - promotionalMarginPerOrder) / fullPriceMarginPerOrder) * 100
      : 0;

  // Returns adjustment — only the incremental promotional uplift is applied.
  // grossMarginPercent is assumed to already reflect the business's normal returns cost.
  const returnsImpactPerOrder = promotionalAOV * (returnsRateIncrease / 100) * grossMarginDecimal;

  // Subscription margin multiplier — subscribed customers locked to discounted price have lower LTV
  const subscriptionMarginMultiplier = 1 - (subscriptionPercent / 100) * 0.15;
  const adjustedPromotionalMarginPerOrder = (promotionalMarginPerOrder - returnsImpactPerOrder) * subscriptionMarginMultiplier;

  const baselineProfit = baselineOrdersForPeriod * fullPriceMarginPerOrder;

  // Break-even (margin neutral)
  const breakEvenOrders =
    adjustedPromotionalMarginPerOrder > 0
      ? (baselineProfit + incrementalMarketingSpend) / adjustedPromotionalMarginPerOrder
      : Infinity;
  const breakEvenUpliftPercent =
    baselineOrdersForPeriod > 0
      ? ((breakEvenOrders - baselineOrdersForPeriod) / baselineOrdersForPeriod) * 100
      : 0;

  // Profitable threshold (exceed baseline by 10%)
  const profitableOrders =
    adjustedPromotionalMarginPerOrder > 0
      ? (baselineProfit * 1.1 + incrementalMarketingSpend) / adjustedPromotionalMarginPerOrder
      : Infinity;
  const profitableUpliftPercent =
    baselineOrdersForPeriod > 0
      ? ((profitableOrders - baselineOrdersForPeriod) / baselineOrdersForPeriod) * 100
      : 0;

  // Classification
  let profitabilityClassification: PromotionResults['profitabilityClassification'];
  if (profitableUpliftPercent <= 20) {
    profitabilityClassification = 'achievable';
  } else if (profitableUpliftPercent <= 40) {
    profitabilityClassification = 'ambitious';
  } else {
    profitabilityClassification = 'unrealistic';
  }

  // Scenario analysis
  const scenarios = [10, 25, 50].map((upliftPercent) => {
    const orders = baselineOrdersForPeriod * (1 + upliftPercent / 100);
    const profit = orders * adjustedPromotionalMarginPerOrder - incrementalMarketingSpend;
    const profitVsBaseline = profit - baselineProfit;
    const profitVsBaselinePercent =
      baselineProfit !== 0 ? (profitVsBaseline / baselineProfit) * 100 : 0;
    return { upliftPercent, orders, profit, profitVsBaseline, profitVsBaselinePercent };
  });

  // Risk factor: how much the promotional returns uplift adds to break-even
  const breakEvenWithoutReturns =
    baselineOrdersForPeriod > 0 && promotionalMarginPerOrder > 0
      ? ((baselineProfit + incrementalMarketingSpend) / promotionalMarginPerOrder -
          baselineOrdersForPeriod) /
        baselineOrdersForPeriod *
        100
      : 0;
  const returnsImpactOnBreakEven = breakEvenUpliftPercent - breakEvenWithoutReturns;

  // Risk factor: marketing spend impact on break-even
  const breakEvenWithoutMarketing =
    baselineOrdersForPeriod > 0 && adjustedPromotionalMarginPerOrder > 0
      ? (baselineProfit / adjustedPromotionalMarginPerOrder - baselineOrdersForPeriod) /
        baselineOrdersForPeriod *
        100
      : 0;
  const marketingSpendImpactOnBreakEven = breakEvenUpliftPercent - breakEvenWithoutMarketing;

  // Biggest lever
  let biggestLever: PromotionResults['biggestLever'];
  let biggestLeverRecommendation: string;

  if (discountDepth > 25 && marginReductionPercent > 40) {
    biggestLever = 'discountDepth';
    const reducedDiscount = discountDepth - 5;
    const reducedPromoAOV = aov * (1 - reducedDiscount / 100);
    const reducedPromoMargin = reducedPromoAOV * grossMarginDecimal - fulfilmentCostPerOrder + effectiveDeliveryRevenue;
    const reducedReturnsImpact = reducedPromoAOV * (returnsRateIncrease / 100) * grossMarginDecimal;
    const reducedAdjustedMargin = (reducedPromoMargin - reducedReturnsImpact) * subscriptionMarginMultiplier;
    const reducedBreakEvenOrders =
      reducedAdjustedMargin > 0
        ? (baselineProfit + incrementalMarketingSpend) / reducedAdjustedMargin
        : Infinity;
    const reducedBreakEvenUplift =
      baselineOrdersForPeriod > 0
        ? ((reducedBreakEvenOrders - baselineOrdersForPeriod) / baselineOrdersForPeriod) * 100
        : 0;
    biggestLeverRecommendation = `Discount depth is the dominant driver of your break-even threshold. Reducing from ${discountDepth}% to ${reducedDiscount}% would lower required uplift from ${breakEvenUpliftPercent.toFixed(1)}% to ${reducedBreakEvenUplift.toFixed(1)}%.`;
  } else if (returnsRateIncrease > 5) {
    biggestLever = 'returnsRate';
    biggestLeverRecommendation = `Returns uplift on promotional orders is adding ${returnsImpactOnBreakEven.toFixed(1)}% to your break-even threshold. Tactics that reduce promotional returns — size guidance, product exclusions, minimum order values — would have material impact.`;
  } else if (incrementalMarketingSpend > baselineProfit * 0.1) {
    biggestLever = 'marketingSpend';
    biggestLeverRecommendation = `Your media spend to promote this offer adds ${marketingSpendImpactOnBreakEven.toFixed(1)}% to the break-even threshold. This promotion needs to be largely self-serving through organic reach or existing CRM to be viable.`;
  } else if (fulfilmentCostPerOrder > promotionalAOV * 0.15) {
    biggestLever = 'fulfilmentCost';
    biggestLeverRecommendation = `Fulfilment cost represents more than 15% of your promotional AOV. Volume-driven promotions amplify this — each incremental order contributes less margin than it appears.`;
  } else {
    biggestLever = 'default';
    biggestLeverRecommendation = `The discount depth itself is the primary lever. At ${discountDepth}% off, you are giving away ${marginReductionPercent.toFixed(1)}% of your pre-promotion margin per order. The break-even maths only works if your promotion is genuinely driving new customers rather than pulling forward existing demand.`;
  }

  const overstockNote = isOverstockClearance
    ? `This promotion is intended to clear overstocked inventory. The break-even threshold above assumes the alternative is full-price trading — but if the real alternative is holding costs, further markdowns, or write-off, a margin-dilutive promotion may still be the right decision. The relevant question is not "does this match full-price margin?" but "does this recover more value than leaving the stock unsold?"`
    : '';

  return {
    fullPriceMarginPerOrder,
    promotionalMarginPerOrder,
    adjustedPromotionalMarginPerOrder,
    marginReductionPercent,
    baselineProfit,
    breakEvenUpliftPercent,
    profitableUpliftPercent,
    profitabilityClassification,
    scenarios,
    returnsImpactOnBreakEven,
    marketingSpendImpactOnBreakEven,
    biggestLever,
    biggestLeverRecommendation,
    overstockNote,
  };
}
