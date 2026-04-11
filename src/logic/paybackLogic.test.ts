import { describe, it, expect } from 'vitest';
import { calculatePayback } from './paybackLogic';
import type { PaybackInputs } from './paybackTypes';

// Equivalent to source BASE_INPUTS:
//   blendedCAC = (60 + 40) / 2 = 50
//   grossMarginPercent = 55 (0.55 decimal in source)
//   repeatPurchaseRate = 35 (0.35 decimal in source)
//   avgPurchaseFrequency = 3 orders/year → avgOrderFrequencyMonths = 4
function base(overrides: Partial<PaybackInputs> = {}): PaybackInputs {
  return {
    blendedCAC: 50,
    aov: 80,
    grossMarginPercent: 55,
    repeatPurchaseRate: 35,
    avgOrderFrequencyMonths: 4,
    ...overrides,
  };
}

// ─── Core formula (ported from source tests) ─────────────────────────────────

describe('core formulas', () => {
  it('computes marginPerOrder as aov × grossMarginPercent', () => {
    // 80 × 0.55 = 44
    const r = calculatePayback(base());
    expect(r.marginPerOrder).toBeCloseTo(44);
  });

  it('computes LTV at 12 months correctly', () => {
    // freq = 12/4 = 3; ltv = 80 × 0.55 × (1 + 0.35 × (3−1) × 1) = 44 × 1.70 = 74.8
    const r = calculatePayback(base());
    expect(r.ltv12Month).toBeCloseTo(74.8, 2);
  });

  it('computes LTV at 24 months correctly', () => {
    // ltv24 = 80 × 0.55 × (1 + 0.35 × 2 × 2) = 44 × 2.4 = 105.6
    const r = calculatePayback(base());
    expect(r.ltv24Month).toBeCloseTo(105.6, 2);
  });

  it('ltv24Month is greater than ltv12Month when retention > 0 and freq > 1', () => {
    const r = calculatePayback(base());
    expect(r.ltv24Month).toBeGreaterThan(r.ltv12Month);
  });

  it('computes monthsToPayback correctly', () => {
    // monthlyContribution = 80 × 0.55 × 0.35 × (1/4) = 3.85; payback = 50 / 3.85 ≈ 12.987
    const r = calculatePayback(base());
    expect(r.monthsToPayback).toBeCloseTo(50 / 3.85, 3);
  });

  it('computes ordersToPayback as blendedCAC / marginPerOrder', () => {
    // 50 / 44 ≈ 1.136
    const r = calculatePayback(base());
    expect(r.ordersToPayback).toBeCloseTo(50 / 44, 3);
  });

  it('ltvCacRatio12 = ltv12Month / blendedCAC', () => {
    const r = calculatePayback(base());
    expect(r.ltvCacRatio12).toBeCloseTo(r.ltv12Month / 50, 5);
  });

  it('ltvCacRatio24 = ltv24Month / blendedCAC', () => {
    const r = calculatePayback(base());
    expect(r.ltvCacRatio24).toBeCloseTo(r.ltv24Month / 50, 5);
  });

  it('monthsToPayback scales with blendedCAC', () => {
    const r1 = calculatePayback(base({ blendedCAC: 50 }));
    const r2 = calculatePayback(base({ blendedCAC: 100 }));
    expect(r2.monthsToPayback).toBeCloseTo(r1.monthsToPayback * 2, 3);
  });

  it('monthsToPayback is Infinity when grossMarginPercent is 0', () => {
    const r = calculatePayback(base({ grossMarginPercent: 0 }));
    expect(r.monthsToPayback).toBe(Infinity);
  });

  it('ordersToPayback is Infinity when grossMarginPercent is 0', () => {
    const r = calculatePayback(base({ grossMarginPercent: 0 }));
    expect(r.ordersToPayback).toBe(Infinity);
  });
});

// ─── Payback verdict classifications ─────────────────────────────────────────

describe('paybackVerdict', () => {
  it('strong when monthsToPayback ≤ 6', () => {
    // CAC = 5, monthlyContrib = 11 → payback ≈ 0.45
    const r = calculatePayback(base({ blendedCAC: 5 }));
    expect(r.paybackVerdict).toBe('strong');
    expect(r.monthsToPayback).toBeLessThanOrEqual(6);
  });

  it('strong at boundary (≤ 6 months)', () => {
    // monthlyContrib = 80 × 0.55 × 0.35 × 0.25 ≈ 3.85; CAC=23 → ~5.97 months
    const r = calculatePayback(base({ blendedCAC: 23 }));
    expect(r.monthsToPayback).toBeLessThanOrEqual(6);
    expect(r.paybackVerdict).toBe('strong');
  });

  it('acceptable when 6 < monthsToPayback ≤ 12', () => {
    // monthlyContrib = 3.85; CAC = 35 → payback = 35/3.85 ≈ 9.09
    const r = calculatePayback(base({ blendedCAC: 35 }));
    expect(r.monthsToPayback).toBeCloseTo(35 / 3.85, 2);
    expect(r.paybackVerdict).toBe('acceptable');
  });

  it('stretched when 12 < monthsToPayback ≤ 18', () => {
    // monthlyContrib = 3.85; CAC = 58 → payback = 58/3.85 ≈ 15.06
    const r = calculatePayback(base({ blendedCAC: 58 }));
    expect(r.monthsToPayback).toBeCloseTo(58 / 3.85, 2);
    expect(r.paybackVerdict).toBe('stretched');
  });

  it('unviable when monthsToPayback > 18', () => {
    // monthlyContrib = 3.85; CAC = 80 → payback = 80/3.85 ≈ 20.78
    const r = calculatePayback(base({ blendedCAC: 80 }));
    expect(r.monthsToPayback).toBeGreaterThan(18);
    expect(r.paybackVerdict).toBe('unviable');
  });

  it('very high CAC produces unviable verdict', () => {
    const r = calculatePayback(base({ blendedCAC: 5_000 }));
    expect(r.paybackVerdict).toBe('unviable');
  });
});

// ─── Human-operator edge cases ───────────────────────────────────────────────

describe('edge cases — zero and extreme inputs', () => {
  it('blendedCAC = 0: instant payback (0 months), all LTV:CAC ratios are 0', () => {
    const r = calculatePayback(base({ blendedCAC: 0 }));
    expect(r.monthsToPayback).toBe(0);
    expect(r.ltvCacRatio12).toBe(0);
    expect(r.ltvCacRatio24).toBe(0);
    expect(r.paybackVerdict).toBe('strong');
  });

  it('avgOrderFrequencyMonths = 0: guard prevents division by zero, payback = Infinity', () => {
    const r = calculatePayback(base({ avgOrderFrequencyMonths: 0 }));
    expect(r.monthsToPayback).toBe(Infinity);
  });

  it('aov = 0: zero margin per order, payback = Infinity', () => {
    const r = calculatePayback(base({ aov: 0 }));
    expect(r.marginPerOrder).toBe(0);
    expect(r.monthsToPayback).toBe(Infinity);
  });

  it('grossMarginPercent = 100: full price recovery', () => {
    const r = calculatePayback(base({ grossMarginPercent: 100 }));
    expect(r.marginPerOrder).toBeCloseTo(80); // aov = 80
    expect(isFinite(r.monthsToPayback)).toBe(true);
  });

  it('repeatPurchaseRate = 100: maximum retention, LTV grows steeply', () => {
    const r = calculatePayback(base({ repeatPurchaseRate: 100 }));
    expect(r.ltv24Month).toBeGreaterThan(r.ltv12Month);
    expect(r.ltv12Month).toBeGreaterThan(r.marginPerOrder);
  });

  it('very high CAC (£1,000,000): still produces finite values', () => {
    const r = calculatePayback(base({ blendedCAC: 1_000_000 }));
    expect(isFinite(r.monthsToPayback)).toBe(true);
    expect(r.paybackVerdict).toBe('unviable');
  });

  it('grossMarginPercent > 100 is clamped to 100', () => {
    // clamp: Math.max(0, Math.min(1, 150/100)) = 1
    const r = calculatePayback(base({ grossMarginPercent: 150 }));
    expect(r.marginPerOrder).toBeCloseTo(80); // 80 × 1.0
  });

  it('grossMarginPercent < 0 is clamped to 0', () => {
    const r = calculatePayback(base({ grossMarginPercent: -20 }));
    expect(r.marginPerOrder).toBe(0);
    expect(r.monthsToPayback).toBe(Infinity);
  });

  it('repeatPurchaseRate > 100 is clamped to 100', () => {
    const rNormal = calculatePayback(base({ repeatPurchaseRate: 100 }));
    const rOver = calculatePayback(base({ repeatPurchaseRate: 150 }));
    expect(rOver.ltv12Month).toBeCloseTo(rNormal.ltv12Month);
  });

  it('all inputs zero: no NaN, no crash', () => {
    const r = calculatePayback({
      blendedCAC: 0, aov: 0, grossMarginPercent: 0,
      repeatPurchaseRate: 0, avgOrderFrequencyMonths: 0,
    });
    Object.values(r).forEach(v => {
      if (typeof v === 'number') expect(isNaN(v)).toBe(false);
    });
  });

  it('freq < 1 order/month (slow buyer, e.g. every 18 months): LTV still computes', () => {
    // avgOrderFrequencyMonths = 18 → freq = 12/18 ≈ 0.667 orders/year
    const r = calculatePayback(base({ avgOrderFrequencyMonths: 18 }));
    expect(isFinite(r.monthsToPayback)).toBe(true);
    expect(r.ltv12Month).toBeGreaterThan(0);
  });

  it('ordersToPayback = Infinity when grossMarginPercent is 0', () => {
    const r = calculatePayback(base({ grossMarginPercent: 0 }));
    expect(r.ordersToPayback).toBe(Infinity);
  });

  it('no NaN in any numeric output across common operator scenarios', () => {
    const scenarios = [
      base(),
      base({ blendedCAC: 120, aov: 90, grossMarginPercent: 45, repeatPurchaseRate: 40, avgOrderFrequencyMonths: 3 }),
      base({ blendedCAC: 200, grossMarginPercent: 60, repeatPurchaseRate: 0 }),
      base({ blendedCAC: 75, aov: 120, grossMarginPercent: 65, repeatPurchaseRate: 55, avgOrderFrequencyMonths: 6 }),
    ];
    scenarios.forEach(inputs => {
      const r = calculatePayback(inputs);
      Object.values(r).forEach(v => {
        if (typeof v === 'number') expect(isNaN(v)).toBe(false);
      });
    });
  });
});

// ─── LTV:CAC ratio thresholds ─────────────────────────────────────────────────

describe('ltvCacRatio thresholds', () => {
  it('ltvCacRatio12 ≥ 3 when CAC is very low', () => {
    // CAC=10, ltv12=74.8 → ratio=7.48
    const r = calculatePayback(base({ blendedCAC: 10 }));
    expect(r.ltvCacRatio12).toBeGreaterThanOrEqual(3);
  });

  it('ltvCacRatio12 < 1 when CAC exceeds ltv12', () => {
    // CAC=100, ltv12=74.8 → ratio=0.748
    const r = calculatePayback(base({ blendedCAC: 100 }));
    expect(r.ltvCacRatio12).toBeLessThan(1);
  });

  it('ltvCacRatio24 > ltvCacRatio12 when freq > 1 and retention > 0', () => {
    const r = calculatePayback(base());
    expect(r.ltvCacRatio24).toBeGreaterThan(r.ltvCacRatio12);
  });

  it('zero blendedCAC yields zero ratios', () => {
    const r = calculatePayback(base({ blendedCAC: 0 }));
    expect(r.ltvCacRatio12).toBe(0);
    expect(r.ltvCacRatio24).toBe(0);
  });
});

// ─── Zero repeat rate edge case ───────────────────────────────────────────────

describe('zero repeat rate', () => {
  it('ltv12Month equals marginPerOrder when repeatPurchaseRate is 0', () => {
    const r = calculatePayback(base({ repeatPurchaseRate: 0 }));
    expect(r.ltv12Month).toBeCloseTo(r.marginPerOrder);
  });

  it('ltv12Month equals ltv24Month when repeatPurchaseRate is 0', () => {
    const r = calculatePayback(base({ repeatPurchaseRate: 0 }));
    expect(r.ltv12Month).toBeCloseTo(r.ltv24Month);
  });

  it('payback is Infinity with zero repeat rate — no repeat purchases means CAC is never recovered', () => {
    const r = calculatePayback(base({ repeatPurchaseRate: 0 }));
    expect(r.monthsToPayback).toBe(Infinity);
  });
});
