import { describe, it, expect } from 'vitest';
import { calculateReturnsCost } from './returnsCostLogic';
import type { ReturnsCostInputs } from './returnsCostTypes';

function base(overrides: Partial<ReturnsCostInputs> = {}): ReturnsCostInputs {
  return {
    annualRevenue: 1_000_000,
    aov: 100,
    returnsRate: 20,        // 20%
    grossMargin: 50,        // 50%
    costPerReturn: 5,
    resaleDiscountedPct: 30, // 30%
    writeoffPct: 20,        // 20%
    avgDiscountPct: 25,     // 25%
    ...overrides,
  };
}

// ─── Annual returns ───────────────────────────────────────────────────────────

describe('annualReturns', () => {
  it('computes annual returns from orders × rate', () => {
    // orders = 1M/100 = 10,000; returns = 10,000 × 0.20 = 2,000
    const r = calculateReturnsCost(base());
    expect(r.annualReturns).toBeCloseTo(2_000);
  });

  it('scales with returns rate', () => {
    const r10 = calculateReturnsCost(base({ returnsRate: 10 }));
    const r20 = calculateReturnsCost(base({ returnsRate: 20 }));
    expect(r20.annualReturns).toBeCloseTo(r10.annualReturns * 2);
  });

  it('zero aov yields zero returns', () => {
    const r = calculateReturnsCost(base({ aov: 0 }));
    expect(r.annualReturns).toBe(0);
  });
});

// ─── Hard returns cost ────────────────────────────────────────────────────────

describe('hardReturnsCost', () => {
  it('is annualReturns × costPerReturn', () => {
    // 2,000 × 5 = 10,000
    const r = calculateReturnsCost(base());
    expect(r.hardReturnsCost).toBeCloseTo(10_000);
  });

  it('zero cost per return yields zero hard cost', () => {
    const r = calculateReturnsCost(base({ costPerReturn: 0 }));
    expect(r.hardReturnsCost).toBe(0);
  });

  it('scales linearly with costPerReturn', () => {
    const r5 = calculateReturnsCost(base({ costPerReturn: 5 }));
    const r10 = calculateReturnsCost(base({ costPerReturn: 10 }));
    expect(r10.hardReturnsCost).toBeCloseTo(r5.hardReturnsCost * 2);
  });
});

// ─── Margin leakage components ────────────────────────────────────────────────

describe('margin leakage', () => {
  it('discountedMarginLoss formula: discountedUnits × aov × discount × grossMargin', () => {
    // discountedUnits = 2000 × 0.30 = 600
    // revenueLoss = 600 × 100 × 0.25 = 15,000
    // marginLoss = 15,000 × 0.50 = 7,500
    const r = calculateReturnsCost(base());
    expect(r.discountedMarginLoss).toBeCloseTo(7_500);
  });

  it('writeoffMarginLoss formula: writeoffUnits × aov × grossMargin', () => {
    // writeoffUnits = 2000 × 0.20 = 400
    // revenueLoss = 400 × 100 = 40,000
    // marginLoss = 40,000 × 0.50 = 20,000
    const r = calculateReturnsCost(base());
    expect(r.writeoffMarginLoss).toBeCloseTo(20_000);
  });

  it('marginLeakage = discountedMarginLoss + writeoffMarginLoss', () => {
    const r = calculateReturnsCost(base());
    expect(r.marginLeakage).toBeCloseTo(r.discountedMarginLoss + r.writeoffMarginLoss);
  });

  it('zero writeoff produces zero writeoff margin loss', () => {
    const r = calculateReturnsCost(base({ writeoffPct: 0 }));
    expect(r.writeoffMarginLoss).toBe(0);
  });

  it('zero discounted resale produces zero discounted margin loss', () => {
    const r = calculateReturnsCost(base({ resaleDiscountedPct: 0 }));
    expect(r.discountedMarginLoss).toBe(0);
  });

  it('zero discount pct produces zero discounted margin loss', () => {
    const r = calculateReturnsCost(base({ avgDiscountPct: 0 }));
    expect(r.discountedMarginLoss).toBe(0);
  });
});

// ─── Total and true cost per return ──────────────────────────────────────────

describe('total and true cost', () => {
  it('totalReturnsCost = hard + leakage', () => {
    const r = calculateReturnsCost(base());
    expect(r.totalReturnsCost).toBeCloseTo(r.hardReturnsCost + r.marginLeakage);
  });

  it('trueReturnsCost = totalReturnsCost / annualReturns', () => {
    const r = calculateReturnsCost(base());
    expect(r.trueReturnsCost).toBeCloseTo(r.totalReturnsCost / r.annualReturns);
  });

  it('zero annual returns yields zero true cost per return', () => {
    const r = calculateReturnsCost(base({ returnsRate: 0 }));
    expect(r.trueReturnsCost).toBe(0);
  });

  it('high returns rate increases total cost', () => {
    const rLow = calculateReturnsCost(base({ returnsRate: 10 }));
    const rHigh = calculateReturnsCost(base({ returnsRate: 40 }));
    expect(rHigh.totalReturnsCost).toBeGreaterThan(rLow.totalReturnsCost);
  });

  it('true cost per return is independent of volume at same rate', () => {
    // Doubling revenue doubles total cost and returns equally, so true cost/return unchanged
    const r1 = calculateReturnsCost(base({ annualRevenue: 1_000_000 }));
    const r2 = calculateReturnsCost(base({ annualRevenue: 2_000_000 }));
    expect(r2.trueReturnsCost).toBeCloseTo(r1.trueReturnsCost);
  });
});

// ─── Human-operator edge cases ───────────────────────────────────────────────

describe('edge cases — zero and extreme inputs', () => {
  it('returnsRate = 100%: all orders returned, maximum leakage', () => {
    const r = calculateReturnsCost(base({ returnsRate: 100 }));
    // All 10,000 orders returned
    expect(r.annualReturns).toBeCloseTo(10_000);
    expect(r.hardReturnsCost).toBeGreaterThan(0);
    expect(r.totalReturnsCost).toBeGreaterThan(0);
  });

  it('grossMargin = 0%: discountedMarginLoss and writeoffMarginLoss are both 0', () => {
    const r = calculateReturnsCost(base({ grossMargin: 0 }));
    expect(r.discountedMarginLoss).toBe(0);
    expect(r.writeoffMarginLoss).toBe(0);
    expect(r.marginLeakage).toBe(0);
  });

  it('annualRevenue = 0: all values are 0, no NaN', () => {
    const r = calculateReturnsCost(base({ annualRevenue: 0 }));
    expect(r.annualReturns).toBe(0);
    expect(r.totalReturnsCost).toBe(0);
    expect(r.trueReturnsCost).toBe(0);
    Object.values(r).forEach(v => expect(isNaN(v as number)).toBe(false));
  });

  it('aov = 0: no orders, no returns, operationalDrag may still exist', () => {
    const r = calculateReturnsCost(base({ aov: 0 }));
    expect(r.annualReturns).toBe(0);
    expect(r.hardReturnsCost).toBe(0);
    expect(r.trueReturnsCost).toBe(0);
  });

  it('writeoffPct + resaleDiscountedPct > 100: computes without crashing', () => {
    // Operator data entry error — percentages overclaimed. Should not crash.
    const r = calculateReturnsCost(base({ writeoffPct: 70, resaleDiscountedPct: 70 }));
    expect(r.totalReturnsCost).toBeGreaterThan(0);
    expect(isNaN(r.totalReturnsCost)).toBe(false);
  });

  it('costPerReturn > aov: trueReturnsCost can exceed aov', () => {
    const r = calculateReturnsCost(base({ costPerReturn: 200, aov: 100 }));
    expect(r.trueReturnsCost).toBeGreaterThan(100);
    expect(isFinite(r.trueReturnsCost)).toBe(true);
  });

  it('all inputs zero: no crash, all outputs 0', () => {
    const r = calculateReturnsCost({
      annualRevenue: 0, aov: 0, returnsRate: 0, grossMargin: 0,
      costPerReturn: 0, resaleDiscountedPct: 0, writeoffPct: 0,
      avgDiscountPct: 0,
    });
    expect(r.totalReturnsCost).toBe(0);
    expect(r.trueReturnsCost).toBe(0);
    Object.values(r).forEach(v => expect(isNaN(v as number)).toBe(false));
  });

  it('very high returns rate (50%): totalReturnsCost is still finite', () => {
    const r = calculateReturnsCost(base({ returnsRate: 50 }));
    expect(isFinite(r.totalReturnsCost)).toBe(true);
    expect(isFinite(r.trueReturnsCost)).toBe(true);
  });

  it('no NaN in any numeric output across common operator scenarios', () => {
    const scenarios = [
      base(),
      base({ returnsRate: 35, grossMargin: 40, costPerReturn: 8 }),
      base({ writeoffPct: 50, resaleDiscountedPct: 40, avgDiscountPct: 30 }),
      base({ annualRevenue: 500_000, aov: 60, returnsRate: 15 }),
    ];
    scenarios.forEach(inputs => {
      const r = calculateReturnsCost(inputs);
      Object.values(r).forEach(v => expect(isNaN(v as number)).toBe(false));
    });
  });
});
