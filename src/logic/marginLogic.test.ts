import { describe, it, expect } from 'vitest';
import { calculateLeakage } from './marginLogic';
import type { MarginInputs } from './marginTypes';

function base(overrides: Partial<MarginInputs> = {}): MarginInputs {
  return {
    annualRevenue: 1_000_000,
    aov: 100,
    grossMarginPercent: 50,
    returnsRate: 15,
    fullPriceResellPercent: 60,
    discountedResellPercent: 30,
    writeOffPercent: 10,
    resaleDiscountPercent: 20,
    returnProcessingCost: 3,
    promotedOrdersPercent: 20,
    discountDepth: 15,
    deliveryCost: 5,
    deliveryCharge: 5,
    freeDeliveryPercent: 30,
    ...overrides,
  };
}

// ─── Classification thresholds ───────────────────────────────────────────────

describe('contributionMarginClass', () => {
  it('healthy when contributionMarginPct >= 30%', () => {
    // grossMargin=40%, zero leakage
    const r = calculateLeakage(base({
      grossMarginPercent: 40,
      returnsRate: 0,
      promotedOrdersPercent: 0,
      freeDeliveryPercent: 0,
      deliveryCost: 0,
      returnProcessingCost: 0,
    }));
    expect(r.contributionMarginClass).toBe('healthy');
    expect(r.contributionMarginPct).toBeCloseTo(40);
  });

  it('healthy at exactly 30%', () => {
    const r = calculateLeakage(base({
      grossMarginPercent: 30,
      returnsRate: 0,
      promotedOrdersPercent: 0,
      freeDeliveryPercent: 0,
      deliveryCost: 0,
      returnProcessingCost: 0,
    }));
    expect(r.contributionMarginClass).toBe('healthy');
  });

  it('under_pressure when 15% <= contributionMarginPct < 30%', () => {
    const r = calculateLeakage(base({
      grossMarginPercent: 20,
      returnsRate: 0,
      promotedOrdersPercent: 0,
      freeDeliveryPercent: 0,
      deliveryCost: 0,
      returnProcessingCost: 0,
    }));
    expect(r.contributionMarginClass).toBe('under_pressure');
    expect(r.contributionMarginPct).toBeCloseTo(20);
  });

  it('under_pressure at exactly 15%', () => {
    const r = calculateLeakage(base({
      grossMarginPercent: 15,
      returnsRate: 0,
      promotedOrdersPercent: 0,
      freeDeliveryPercent: 0,
      deliveryCost: 0,
      returnProcessingCost: 0,
    }));
    expect(r.contributionMarginClass).toBe('under_pressure');
  });

  it('critical when contributionMarginPct < 15%', () => {
    const r = calculateLeakage(base({
      grossMarginPercent: 10,
      returnsRate: 0,
      promotedOrdersPercent: 0,
      freeDeliveryPercent: 0,
      deliveryCost: 0,
      returnProcessingCost: 0,
    }));
    expect(r.contributionMarginClass).toBe('critical');
    expect(r.contributionMarginPct).toBeCloseTo(10);
  });

  it('leakage pushes a 35% gross margin into under_pressure', () => {
    // Big leakage drags 35% gross margin below 30%
    const r = calculateLeakage(base({
      grossMarginPercent: 35,
      returnsRate: 20,
      promotedOrdersPercent: 30,
      discountDepth: 20,
      freeDeliveryPercent: 50,
      deliveryCost: 6,
      deliveryCharge: 0,
    }));
    expect(r.contributionMarginClass).not.toBe('healthy');
  });
});

// ─── Leakage components ───────────────────────────────────────────────────────

describe('leakage calculations', () => {
  it('zero returns rate produces zero returns leakage', () => {
    const r = calculateLeakage(base({ returnsRate: 0 }));
    expect(r.returnsLeakage).toBe(0);
    expect(r.returnsLeakagePct).toBe(0);
  });

  it('zero promoted orders produces zero discount erosion', () => {
    const r = calculateLeakage(base({ promotedOrdersPercent: 0 }));
    expect(r.discountErosion).toBe(0);
    expect(r.discountErosionPct).toBe(0);
  });

  it('zero discount depth produces zero discount erosion', () => {
    const r = calculateLeakage(base({ discountDepth: 0 }));
    expect(r.discountErosion).toBe(0);
  });

  it('discount erosion formula: revenue × promotedPct × discountDepth', () => {
    // 1M × 0.25 × 0.10 = 25,000
    const r = calculateLeakage(base({ promotedOrdersPercent: 25, discountDepth: 10 }));
    expect(r.discountErosion).toBeCloseTo(25_000);
  });

  it('delivery subsidy covers only free delivery cost when charge equals cost', () => {
    // deliveryCost = deliveryCharge → no paid undercharge; only free delivery subsidy
    const r = calculateLeakage(base({
      deliveryCost: 5,
      deliveryCharge: 5,
      freeDeliveryPercent: 40,
      aov: 100,
      annualRevenue: 1_000_000,
    }));
    // freeDeliveryOrders = 10,000 × 0.4 = 4,000; subsidy = 4,000 × 5 = 20,000
    expect(r.deliverySubsidy).toBeCloseTo(20_000);
  });

  it('delivery subsidy includes paid under-recovery when charge < cost', () => {
    const r = calculateLeakage(base({
      deliveryCost: 8,
      deliveryCharge: 3,
      freeDeliveryPercent: 0,
      aov: 100,
      annualRevenue: 1_000_000,
    }));
    // paidOrders = 10,000; undercharge = 8-3 = 5; subsidy = 50,000
    expect(r.deliverySubsidy).toBeCloseTo(50_000);
  });

  it('totalLeakage = returns + discount + delivery', () => {
    const r = calculateLeakage(base());
    expect(r.totalLeakage).toBeCloseTo(r.returnsLeakage + r.discountErosion + r.deliverySubsidy);
  });

  it('contributionMargin = grossMargin − totalLeakage', () => {
    const r = calculateLeakage(base());
    const grossMargin = 1_000_000 * 0.5;
    expect(r.contributionMargin).toBeCloseTo(grossMargin - r.totalLeakage);
  });
});

// ─── Leakage ranking ─────────────────────────────────────────────────────────

describe('leakageRanked', () => {
  it('returns leakage first when returns dominate', () => {
    const r = calculateLeakage(base({
      returnsRate: 40,
      promotedOrdersPercent: 5,
      discountDepth: 5,
      freeDeliveryPercent: 10,
      deliveryCost: 2,
      deliveryCharge: 2,
    }));
    expect(r.leakageRanked[0].label).toBe('Returns leakage');
  });

  it('discount erosion first when discounting dominates', () => {
    const r = calculateLeakage(base({
      promotedOrdersPercent: 60,
      discountDepth: 30,
      returnsRate: 2,
      freeDeliveryPercent: 0,
      deliveryCost: 0,
    }));
    expect(r.leakageRanked[0].label).toBe('Discount erosion');
  });

  it('delivery subsidy first when delivery dominates', () => {
    const r = calculateLeakage(base({
      freeDeliveryPercent: 80,
      deliveryCost: 10,
      deliveryCharge: 0,
      returnsRate: 2,
      returnProcessingCost: 0,
      writeOffPercent: 0,
      discountedResellPercent: 0,
      promotedOrdersPercent: 5,
      discountDepth: 5,
    }));
    expect(r.leakageRanked[0].label).toBe('Delivery subsidy');
  });

  it('leakageRanked has exactly 3 entries', () => {
    const r = calculateLeakage(base());
    expect(r.leakageRanked).toHaveLength(3);
  });

  it('leakageRanked pct is value / revenue × 100', () => {
    const r = calculateLeakage(base());
    r.leakageRanked.forEach(entry => {
      expect(entry.pct).toBeCloseTo((entry.value / 1_000_000) * 100);
    });
  });

  it('leakageRanked is sorted descending by value', () => {
    const r = calculateLeakage(base());
    for (let i = 0; i < r.leakageRanked.length - 1; i++) {
      expect(r.leakageRanked[i].value).toBeGreaterThanOrEqual(r.leakageRanked[i + 1].value);
    }
  });
});

// ─── Biggest lever detection ─────────────────────────────────────────────────

describe('biggestLeverRecommendation', () => {
  it('mentions return rate when returns is biggest lever', () => {
    const r = calculateLeakage(base({
      returnsRate: 40,
      promotedOrdersPercent: 5,
      discountDepth: 5,
      freeDeliveryPercent: 0,
      deliveryCost: 0,
    }));
    expect(r.biggestLeverRecommendation).toContain('40%');
  });

  it('mentions discount depth when discount is biggest lever', () => {
    const r = calculateLeakage(base({
      promotedOrdersPercent: 60,
      discountDepth: 30,
      returnsRate: 2,
      freeDeliveryPercent: 0,
      deliveryCost: 0,
    }));
    expect(r.biggestLeverRecommendation).toContain('30%');
  });

  it('mentions free delivery percent when delivery is biggest lever', () => {
    const r = calculateLeakage(base({
      freeDeliveryPercent: 80,
      deliveryCost: 10,
      deliveryCharge: 0,
      returnsRate: 2,
      returnProcessingCost: 0,
      writeOffPercent: 0,
      discountedResellPercent: 0,
      promotedOrdersPercent: 5,
      discountDepth: 5,
    }));
    expect(r.biggestLeverRecommendation).toContain('80%');
  });

  it('includes under-charge note when delivery charge < cost and delivery is biggest lever', () => {
    const r = calculateLeakage(base({
      freeDeliveryPercent: 50,
      deliveryCost: 8,
      deliveryCharge: 3,
      returnsRate: 2,
      returnProcessingCost: 0,
      writeOffPercent: 0,
      discountedResellPercent: 0,
      promotedOrdersPercent: 5,
      discountDepth: 5,
    }));
    expect(r.biggestLeverRecommendation).toContain('under-recovering');
  });
});

// ─── Zero leakage edge case ──────────────────────────────────────────────────

describe('zero leakage edge case', () => {
  it('does not produce NaN in recommendation when all leakages are zero', () => {
    const r = calculateLeakage(base({
      returnsRate: 0,
      returnProcessingCost: 0,
      writeOffPercent: 0,
      discountedResellPercent: 0,
      promotedOrdersPercent: 0,
      discountDepth: 0,
      freeDeliveryPercent: 0,
      deliveryCost: 0,
    }));
    expect(r.biggestLeverRecommendation).not.toContain('NaN');
    expect(r.biggestLeverRecommendation).not.toContain('Infinity');
    expect(r.totalLeakage).toBe(0);
  });
});

// ─── Unit economics ───────────────────────────────────────────────────────────

describe('unit economics', () => {
  it('revenuePerOrder equals aov', () => {
    const r = calculateLeakage(base({ aov: 75 }));
    expect(r.revenuePerOrder).toBe(75);
  });

  it('trueMarginPerOrder with no leakage equals aov × grossMarginPct', () => {
    const r = calculateLeakage(base({
      returnsRate: 0,
      returnProcessingCost: 0,
      promotedOrdersPercent: 0,
      freeDeliveryPercent: 0,
      deliveryCost: 0,
      deliveryCharge: 0,
    }));
    // 100 × 0.5 = 50
    expect(r.trueMarginPerOrder).toBeCloseTo(50);
  });
});

// ─── Human-operator edge cases ───────────────────────────────────────────────

describe('edge cases — zero and extreme inputs', () => {
  it('annualRevenue = 0: all percentage fields are 0, no NaN', () => {
    const r = calculateLeakage(base({ annualRevenue: 0 }));
    expect(r.returnsLeakagePct).toBe(0);
    expect(r.discountErosionPct).toBe(0);
    expect(r.deliverySubsidyPct).toBe(0);
    expect(r.contributionMarginPct).toBe(0);
    Object.values(r).forEach(v => {
      if (typeof v === 'number') expect(isNaN(v)).toBe(false);
    });
  });

  it('aov = 0: totalOrders = 0, delivery subsidy is zero, no NaN', () => {
    // Returns leakage uses revenue × rate (not order count) so can still be non-zero.
    // Delivery subsidy uses order count so is zero when aov=0.
    const r = calculateLeakage(base({ aov: 0 }));
    expect(r.deliverySubsidy).toBe(0);
    expect(r.deliverySubsidyPct).toBe(0);
    Object.values(r).forEach(v => {
      if (typeof v === 'number') expect(isNaN(v)).toBe(false);
    });
  });

  it('grossMarginPercent = 0: contributionMargin is negative (leakage exceeds zero gross)', () => {
    const r = calculateLeakage(base({ grossMarginPercent: 0 }));
    expect(r.contributionMargin).toBeLessThanOrEqual(0);
    expect(r.contributionMarginClass).toBe('critical');
  });

  it('returnsRate = 100%: all orders returned, high leakage', () => {
    const r = calculateLeakage(base({ returnsRate: 100 }));
    expect(r.returnsLeakage).toBeGreaterThan(0);
    expect(r.returnsLeakagePct).toBeGreaterThan(0);
  });

  it('deliveryCharge > deliveryCost: no negative paid subsidy (overcharging), only free portion', () => {
    const r = calculateLeakage(base({
      deliveryCost: 3,
      deliveryCharge: 10,
      freeDeliveryPercent: 20,
      aov: 100,
      annualRevenue: 1_000_000,
    }));
    // Paid delivery is over-recovering — subsidy from that portion should be 0
    // freeDelivery subsidy = 10,000 × 0.2 × 3 = 6,000
    expect(r.deliverySubsidy).toBeCloseTo(6_000);
    expect(r.deliverySubsidy).toBeGreaterThanOrEqual(0);
  });

  it('freeDeliveryPercent = 100: entire delivery cost is subsidised', () => {
    const r = calculateLeakage(base({
      freeDeliveryPercent: 100,
      deliveryCost: 5,
      deliveryCharge: 5,
      aov: 100,
      annualRevenue: 1_000_000,
    }));
    // All 10,000 orders are free → subsidy = 10,000 × 5 = 50,000
    expect(r.deliverySubsidy).toBeCloseTo(50_000);
  });

  it('all inputs zero: no NaN, no crash, totalLeakage = 0', () => {
    const r = calculateLeakage({
      annualRevenue: 0,
      aov: 0,
      grossMarginPercent: 0,
      returnsRate: 0,
      fullPriceResellPercent: 0,
      discountedResellPercent: 0,
      writeOffPercent: 0,
      resaleDiscountPercent: 0,
      returnProcessingCost: 0,
      promotedOrdersPercent: 0,
      discountDepth: 0,
      deliveryCost: 0,
      deliveryCharge: 0,
      freeDeliveryPercent: 0,
    });
    expect(r.totalLeakage).toBe(0);
    expect(r.contributionMargin).toBe(0);
    Object.values(r).forEach(v => {
      if (typeof v === 'number') {
        expect(isNaN(v)).toBe(false);
        expect(isFinite(v) || v === 0).toBe(true);
      }
    });
  });

  it('very high revenue (£10M): scales without overflow', () => {
    const r = calculateLeakage(base({ annualRevenue: 10_000_000 }));
    expect(r.totalLeakage).toBeGreaterThan(0);
    expect(isFinite(r.totalLeakage)).toBe(true);
  });

  it('negative contributionMargin is classified as critical', () => {
    const r = calculateLeakage(base({
      grossMarginPercent: 5,
      returnsRate: 30,
      promotedOrdersPercent: 50,
      discountDepth: 30,
      freeDeliveryPercent: 80,
      deliveryCost: 10,
      deliveryCharge: 0,
    }));
    expect(r.contributionMarginPct).toBeLessThan(15);
    expect(r.contributionMarginClass).toBe('critical');
  });

  it('leakageRanked pcts are always non-negative', () => {
    const r = calculateLeakage(base());
    r.leakageRanked.forEach(entry => expect(entry.pct).toBeGreaterThanOrEqual(0));
  });
});
