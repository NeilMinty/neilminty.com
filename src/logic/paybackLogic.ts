import type { PaybackInputs, PaybackResults } from './paybackTypes';

export function calculatePayback(inputs: PaybackInputs): PaybackResults {
  const {
    blendedCAC,
    aov,
    grossMarginPercent,
    repeatPurchaseRate,
    avgOrderFrequencyMonths,
  } = inputs;

  // Adapt to source formula conventions:
  // margin and retention are decimals; freq is orders per year; horizonRatio scales the LTV window.
  const margin = Math.max(0, Math.min(1, grossMarginPercent / 100));
  const retention = Math.max(0, Math.min(1, repeatPurchaseRate / 100));
  const freq = avgOrderFrequencyMonths > 0 ? 12 / avgOrderFrequencyMonths : 0;

  // Margin per order — first-purchase contribution
  const marginPerOrder = aov * margin;

  // Monthly contribution to payback:
  //   AOV × gross_margin × repeat_purchase_rate × purchase_frequency_per_month
  //
  // Trace — base inputs (CAC=50, AOV=80, margin=55%, repeat=35%, freq=every 4 months):
  //   freq_per_month  = 1/4 = 0.25
  //   monthlyContrib  = 80 × 0.55 × 0.35 × 0.25 = 3.85
  //   monthsToPayback = 50 / 3.85 ≈ 12.99   ← expected (correct)
  //
  //   Old formula (missing retention): 80 × 0.55 × 0.25 = 11 → 50/11 ≈ 4.55  ← was wrong
  const monthlyContribution = aov * margin * retention * freq / 12;

  // Months to recover CAC
  const monthsToPayback = monthlyContribution > 0 ? blendedCAC / monthlyContribution : Infinity;

  // Orders to recover CAC at full margin per order
  const ordersToPayback = marginPerOrder > 0 ? blendedCAC / marginPerOrder : Infinity;

  // LTV formula (source verbatim): aov * margin * (1 + retention * max(0, freq − 1) * horizonRatio)
  // horizonRatio = 1 for 12 months (365/365), 2 for 24 months (730/365)
  const ltv12Month = aov * margin * (1 + retention * Math.max(0, freq - 1) * 1);
  const ltv24Month = aov * margin * (1 + retention * Math.max(0, freq - 1) * 2);

  const ltvCacRatio12 = blendedCAC > 0 ? ltv12Month / blendedCAC : 0;
  const ltvCacRatio24 = blendedCAC > 0 ? ltv24Month / blendedCAC : 0;

  // Verdict thresholds per spec: strong ≤ 6, acceptable ≤ 12, stretched ≤ 18, unviable > 18
  const paybackVerdict: PaybackResults['paybackVerdict'] =
    monthsToPayback <= 6 ? 'strong' :
    monthsToPayback <= 12 ? 'acceptable' :
    monthsToPayback <= 18 ? 'stretched' :
    'unviable';

  return {
    marginPerOrder,
    monthsToPayback,
    ltv12Month,
    ltv24Month,
    ordersToPayback,
    paybackVerdict,
    ltvCacRatio12,
    ltvCacRatio24,
  };
}
