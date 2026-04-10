import type { MarginInputs, MarginResults } from './marginTypes';

type LeakageKey = 'returns' | 'discount' | 'delivery';

const fmt = (n: number) => Math.round(n).toLocaleString('en-GB');

function buildRecommendation(
  key: LeakageKey,
  values: {
    returnsLeakage: number;
    returnsRate: number;
    writeOffPercent: number;
    discountedResellPercent: number;
    resaleDiscountPercent: number;
    discountErosion: number;
    promotedOrdersPercent: number;
    discountDepth: number;
    deliverySubsidy: number;
    freeDeliveryPercent: number;
    deliveryCharge: number;
    deliveryCost: number;
  }
): string {
  const {
    returnsLeakage, returnsRate, writeOffPercent, discountedResellPercent,
    resaleDiscountPercent, discountErosion, promotedOrdersPercent, discountDepth,
    deliverySubsidy, freeDeliveryPercent, deliveryCharge, deliveryCost,
  } = values;

  switch (key) {
    case 'returns': {
      const savingsPerPoint = returnsLeakage / returnsRate;
      return `Returns are your largest margin drain. At a ${returnsRate}% return rate — with ${writeOffPercent}% written off and ${discountedResellPercent}% resold at an average ${resaleDiscountPercent}% markdown — every percentage point reduction saves approximately £${fmt(savingsPerPoint)} annually. The highest leverage action is identifying which SKUs or size groups are driving disproportionate returns.`;
    }
    case 'discount': {
      const savingsPer2Points = discountErosion * (2 / discountDepth);
      return `Promotional depth is your largest margin leak. With ${promotedOrdersPercent}% of orders carrying a ${discountDepth}% average discount, you are transferring £${fmt(discountErosion)} directly from margin to customers. A 2 point reduction in average discount depth would recover approximately £${fmt(savingsPer2Points)} annually.`;
    }
    case 'delivery': {
      const underchargeNote =
        deliveryCharge > 0 && deliveryCharge < deliveryCost
          ? ` Paid delivery orders are also under-recovering by £${fmt(deliveryCost - deliveryCharge)} per order.`
          : '';
      return `Delivery subsidy is your largest margin leak, costing £${fmt(deliverySubsidy)} annually across ${freeDeliveryPercent}% of orders receiving free delivery.${underchargeNote} The critical question merchants rarely ask is whether free delivery actually drove incremental orders — or simply subsidised purchases that would have happened anyway. Testing a minimum order threshold would reveal this delta.`;
    }
  }
}

export function calculateLeakage(inputs: MarginInputs): MarginResults {
  const {
    annualRevenue,
    aov,
    returnsRate,
    discountedResellPercent,
    writeOffPercent,
    resaleDiscountPercent,
    returnProcessingCost,
    promotedOrdersPercent,
    discountDepth,
    deliveryCost,
    deliveryCharge,
    freeDeliveryPercent,
    grossMarginPercent,
  } = inputs;

  // Derived
  const totalOrders = aov > 0 ? annualRevenue / aov : 0;
  const returnedOrders = totalOrders * (returnsRate / 100);
  const freeDeliveryOrders = totalOrders * (freeDeliveryPercent / 100);
  const paidDeliveryOrders = totalOrders * (1 - freeDeliveryPercent / 100);

  // Returns leakage
  const returnedRevenue = annualRevenue * (returnsRate / 100);
  const revenueLeakage =
    returnedRevenue * (writeOffPercent / 100) +
    returnedRevenue * (discountedResellPercent / 100) * (resaleDiscountPercent / 100);
  const processingCost = returnedOrders * returnProcessingCost;
  const returnsLeakage = revenueLeakage + processingCost;
  const returnsLeakagePct = annualRevenue > 0 ? (returnsLeakage / annualRevenue) * 100 : 0;

  // Discount erosion
  const discountErosion = annualRevenue * (promotedOrdersPercent / 100) * (discountDepth / 100);
  const discountErosionPct = annualRevenue > 0 ? (discountErosion / annualRevenue) * 100 : 0;

  // Delivery subsidy
  const freeDeliverySubsidy = freeDeliveryOrders * deliveryCost;
  const paidDeliverySubsidy = paidDeliveryOrders * Math.max(0, deliveryCost - deliveryCharge);
  const deliverySubsidy = freeDeliverySubsidy + paidDeliverySubsidy;
  const deliverySubsidyPct = annualRevenue > 0 ? (deliverySubsidy / annualRevenue) * 100 : 0;

  // Contribution margin
  const grossMargin = annualRevenue * (grossMarginPercent / 100);
  const contributionMargin = grossMargin - returnsLeakage - discountErosion - deliverySubsidy;
  const contributionMarginPct = annualRevenue > 0 ? (contributionMargin / annualRevenue) * 100 : 0;
  const contributionMarginClass: MarginResults['contributionMarginClass'] =
    contributionMarginPct >= 30 ? 'healthy' :
    contributionMarginPct >= 15 ? 'under_pressure' :
    'critical';

  // Total leakage
  const totalLeakage = returnsLeakage + discountErosion + deliverySubsidy;

  // Leakage ranking with labels and pcts
  const leakageSources: Array<{ key: LeakageKey; label: string; value: number }> = [
    { key: 'returns', label: 'Returns leakage', value: returnsLeakage },
    { key: 'discount', label: 'Discount erosion', value: discountErosion },
    { key: 'delivery', label: 'Delivery subsidy', value: deliverySubsidy },
  ];
  const sortedSources = [...leakageSources].sort((a, b) => b.value - a.value);
  const biggestLeverKey = sortedSources[0].key;
  const leakageRanked = sortedSources.map(s => ({
    label: s.label,
    value: s.value,
    pct: annualRevenue > 0 ? (s.value / annualRevenue) * 100 : 0,
  }));

  const biggestLeverRecommendation =
    totalLeakage === 0
      ? 'No significant leakage identified across returns, discounting, or delivery. Review your inputs if this seems unexpected.'
      : buildRecommendation(biggestLeverKey, {
          returnsLeakage,
          returnsRate,
          discountedResellPercent,
          writeOffPercent,
          resaleDiscountPercent,
          discountErosion,
          promotedOrdersPercent,
          discountDepth,
          deliverySubsidy,
          freeDeliveryPercent,
          deliveryCharge,
          deliveryCost,
        });

  // Unit economics
  const revenuePerOrder = aov;
  const deliveryCostPerOrder =
    (freeDeliveryPercent / 100) * deliveryCost +
    (1 - freeDeliveryPercent / 100) * Math.max(0, deliveryCost - deliveryCharge);
  const trueMarginPerOrder =
    aov * (grossMarginPercent / 100) -
    returnProcessingCost * (returnsRate / 100) -
    deliveryCostPerOrder -
    aov * (promotedOrdersPercent / 100) * (discountDepth / 100);

  return {
    returnsLeakage,
    returnsLeakagePct,
    discountErosion,
    discountErosionPct,
    deliverySubsidy,
    deliverySubsidyPct,
    totalLeakage,
    contributionMargin,
    contributionMarginPct,
    contributionMarginClass,
    leakageRanked,
    biggestLeverRecommendation,
    revenuePerOrder,
    trueMarginPerOrder,
  };
}
