import { describe, it, expect } from 'vitest';
import { calculatePromotion } from './promotionLogic';
import type { PromotionInputs } from './promotionTypes';

function base(overrides: Partial<PromotionInputs> = {}): PromotionInputs {
  return {
    aov: 100,
    grossMarginPercent: 50,
    baselineWeeklyOrders: 100,
    discountDepth: 20,
    promotionDurationDays: 14,
    fulfilmentCostPerOrder: 0,
    deliveryChargePerOrder: 0,
    freeDeliveryPercent: 0,
    incrementalMarketingSpend: 0,
    returnsRateIncrease: 0,
    subscriptionPercent: 0,
    isOverstockClearance: false,
    ...overrides,
  };
}

describe('calculatePromotion', () => {
  // ─── Margin per order ────────────────────────────────────────────────────────

  it('computes full-price margin per order', () => {
    const r = calculatePromotion(base());
    expect(r.fullPriceMarginPerOrder).toBe(50); // 100 × 0.5
  });

  it('computes promotional margin per order', () => {
    const r = calculatePromotion(base());
    expect(r.promotionalMarginPerOrder).toBe(40); // 80 × 0.5
  });

  it('computes margin reduction percent', () => {
    const r = calculatePromotion(base());
    expect(r.marginReductionPercent).toBeCloseTo(20); // (50-40)/50 × 100
  });

  it('adds effective delivery revenue to both margins', () => {
    const r = calculatePromotion(base({ deliveryChargePerOrder: 5, freeDeliveryPercent: 40 }));
    // effectiveDeliveryRevenue = 5 × 0.6 = 3
    expect(r.fullPriceMarginPerOrder).toBeCloseTo(53);
    expect(r.promotionalMarginPerOrder).toBeCloseTo(43);
  });

  it('subtracts fulfilment cost from both margins', () => {
    const r = calculatePromotion(base({ fulfilmentCostPerOrder: 8 }));
    expect(r.fullPriceMarginPerOrder).toBe(42);
    expect(r.promotionalMarginPerOrder).toBe(32);
  });

  it('zero discount yields identical full-price and promotional margin', () => {
    const r = calculatePromotion(base({ discountDepth: 0 }));
    expect(r.promotionalMarginPerOrder).toBe(r.fullPriceMarginPerOrder);
    expect(r.marginReductionPercent).toBe(0);
  });

  // ─── Returns impact ──────────────────────────────────────────────────────────

  it('applies returns uplift to adjusted margin', () => {
    // returnsImpact = 80 × 0.10 × 0.50 = 4; adjusted = 40 - 4 = 36
    const r = calculatePromotion(base({ returnsRateIncrease: 10 }));
    expect(r.adjustedPromotionalMarginPerOrder).toBeCloseTo(36);
  });

  it('zero returns uplift leaves margin unchanged', () => {
    const r = calculatePromotion(base({ returnsRateIncrease: 0 }));
    expect(r.adjustedPromotionalMarginPerOrder).toBe(r.promotionalMarginPerOrder);
  });

  // ─── Subscription multiplier ─────────────────────────────────────────────────

  it('subscription percent reduces adjusted margin', () => {
    // multiplier = 1 - 1 × 0.15 = 0.85; adjusted = 40 × 0.85 = 34
    const r = calculatePromotion(base({ subscriptionPercent: 100 }));
    expect(r.adjustedPromotionalMarginPerOrder).toBeCloseTo(34);
  });

  it('zero subscription percent has no effect', () => {
    const r = calculatePromotion(base({ subscriptionPercent: 0 }));
    expect(r.adjustedPromotionalMarginPerOrder).toBe(r.promotionalMarginPerOrder);
  });

  it('subscription and returns both applied together', () => {
    // returns = 80×0.1×0.5 = 4; pre-mult = 36; mult = 0.85; adjusted = 30.6
    const r = calculatePromotion(base({ returnsRateIncrease: 10, subscriptionPercent: 100 }));
    expect(r.adjustedPromotionalMarginPerOrder).toBeCloseTo(30.6);
  });

  // ─── Break-even ──────────────────────────────────────────────────────────────

  it('computes break-even uplift percent', () => {
    // baselineProfit = 200 × 50 = 10000; breakEvenOrders = 10000/40 = 250; uplift = 25%
    const r = calculatePromotion(base());
    expect(r.breakEvenUpliftPercent).toBeCloseTo(25);
  });

  it('zero discount yields zero break-even uplift', () => {
    const r = calculatePromotion(base({ discountDepth: 0 }));
    expect(r.breakEvenUpliftPercent).toBeCloseTo(0);
  });

  it('marketing spend increases break-even uplift', () => {
    // breakEvenOrders = (10000+2000)/40 = 300; uplift = 50%
    const r = calculatePromotion(base({ incrementalMarketingSpend: 2000 }));
    expect(r.breakEvenUpliftPercent).toBeCloseTo(50);
  });

  it('returns Infinity break-even when adjusted margin is negative', () => {
    // margin = 10%, discount = 90%, fulfilment = 5 → promoMargin = 10×0.1 - 5 = -4
    const r = calculatePromotion(base({ grossMarginPercent: 10, discountDepth: 90, fulfilmentCostPerOrder: 5 }));
    expect(r.breakEvenUpliftPercent).toBe(Infinity);
  });

  // ─── Profitability classification ────────────────────────────────────────────

  it('classifies as achievable when profitable uplift ≤ 20%', () => {
    // AOV=100, margin=80%, discount=5%: profitableUplift ≈ 15.8%
    const r = calculatePromotion(base({ grossMarginPercent: 80, discountDepth: 5 }));
    expect(r.profitabilityClassification).toBe('achievable');
  });

  it('classifies as ambitious when profitable uplift 20–40%', () => {
    // default base: profitableUplift = 37.5%
    const r = calculatePromotion(base());
    expect(r.profitabilityClassification).toBe('ambitious');
  });

  it('classifies as unrealistic when profitable uplift > 40%', () => {
    // margin=30%, discount=40%: profitableUplift ≈ 83%
    const r = calculatePromotion(base({ grossMarginPercent: 30, discountDepth: 40 }));
    expect(r.profitabilityClassification).toBe('unrealistic');
  });

  // ─── Scenario table ──────────────────────────────────────────────────────────

  it('generates three scenarios at 10%, 25%, 50% uplift', () => {
    const r = calculatePromotion(base());
    expect(r.scenarios.map(s => s.upliftPercent)).toEqual([10, 25, 50]);
  });

  it('scenario at 25% uplift is at break-even (profit = baseline)', () => {
    // breakEvenUplift = 25%, so 25% scenario profitVsBaseline ≈ 0
    const r = calculatePromotion(base());
    const s25 = r.scenarios.find(s => s.upliftPercent === 25)!;
    expect(s25.profitVsBaseline).toBeCloseTo(0);
  });

  it('scenario at 10% uplift is below baseline', () => {
    const r = calculatePromotion(base());
    const s10 = r.scenarios.find(s => s.upliftPercent === 10)!;
    expect(s10.profitVsBaseline).toBeLessThan(0);
  });

  it('scenario at 50% uplift is above baseline', () => {
    const r = calculatePromotion(base());
    const s50 = r.scenarios.find(s => s.upliftPercent === 50)!;
    expect(s50.profitVsBaseline).toBeGreaterThan(0);
  });

  // ─── Risk impact on break-even ───────────────────────────────────────────────

  it('zero returns uplift adds 0% to break-even', () => {
    const r = calculatePromotion(base({ returnsRateIncrease: 0 }));
    expect(r.returnsImpactOnBreakEven).toBeCloseTo(0);
  });

  it('zero marketing spend adds 0% to break-even', () => {
    const r = calculatePromotion(base({ incrementalMarketingSpend: 0 }));
    expect(r.marketingSpendImpactOnBreakEven).toBeCloseTo(0);
  });

  it('returnsImpactOnBreakEven is positive when returns are non-zero', () => {
    const r = calculatePromotion(base({ returnsRateIncrease: 10 }));
    expect(r.returnsImpactOnBreakEven).toBeGreaterThan(0);
  });

  it('marketingSpendImpactOnBreakEven is positive when spend is non-zero', () => {
    const r = calculatePromotion(base({ incrementalMarketingSpend: 500 }));
    expect(r.marketingSpendImpactOnBreakEven).toBeGreaterThan(0);
  });

  // ─── Biggest lever ───────────────────────────────────────────────────────────

  it('identifies discountDepth lever when discount > 25% and marginReduction > 40%', () => {
    // AOV=100, margin=50%, discount=45% → marginReduction = (50-27.5)/50 × 100 = 45% > 40%
    const r = calculatePromotion(base({ discountDepth: 45 }));
    expect(r.biggestLever).toBe('discountDepth');
    expect(r.biggestLeverRecommendation).toContain('45%');
  });

  it('identifies returnsRate lever when returns > 5% (and no high discount)', () => {
    const r = calculatePromotion(base({ returnsRateIncrease: 10 }));
    expect(r.biggestLever).toBe('returnsRate');
  });

  it('identifies marketingSpend lever when spend > 10% of baseline profit', () => {
    // baselineProfit = 10000; 10% = 1000; use spend = 2000
    const r = calculatePromotion(base({ incrementalMarketingSpend: 2000 }));
    expect(r.biggestLever).toBe('marketingSpend');
  });

  it('identifies fulfilmentCost lever when cost > 15% of promo AOV', () => {
    // promoAOV = 80; 15% = 12; use fulfilment = 15; no high discount/returns/marketing
    const r = calculatePromotion(base({ fulfilmentCostPerOrder: 15 }));
    expect(r.biggestLever).toBe('fulfilmentCost');
  });

  it('falls back to default lever for low-risk inputs', () => {
    // Low discount, no returns, no marketing, low fulfilment
    const r = calculatePromotion(base({ discountDepth: 10, fulfilmentCostPerOrder: 2 }));
    expect(r.biggestLever).toBe('default');
  });

  // ─── Overstock note ──────────────────────────────────────────────────────────

  it('overstock note is non-empty when isOverstockClearance is true', () => {
    const r = calculatePromotion(base({ isOverstockClearance: true }));
    expect(r.overstockNote).toBeTruthy();
  });

  it('overstock note is empty when isOverstockClearance is false', () => {
    const r = calculatePromotion(base({ isOverstockClearance: false }));
    expect(r.overstockNote).toBe('');
  });

  // ─── Baseline profit ─────────────────────────────────────────────────────────

  it('scales baseline profit with duration', () => {
    const r1 = calculatePromotion(base({ promotionDurationDays: 7 }));
    const r2 = calculatePromotion(base({ promotionDurationDays: 14 }));
    expect(r2.baselineProfit).toBeCloseTo(r1.baselineProfit * 2);
  });
});
