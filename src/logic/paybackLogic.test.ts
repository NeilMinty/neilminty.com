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
    // monthlyContribution = 80 × 0.55 × 3 / 12 = 11; payback = 50 / 11 ≈ 4.545
    const r = calculatePayback(base());
    expect(r.monthsToPayback).toBeCloseTo(50 / 11, 3);
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

  it('strong at exactly 6 months', () => {
    // monthlyContrib = 11, need CAC = 66
    const r = calculatePayback(base({ blendedCAC: 66 }));
    expect(r.monthsToPayback).toBeCloseTo(6, 0);
    expect(r.paybackVerdict).toBe('strong');
  });

  it('acceptable when 6 < monthsToPayback ≤ 12', () => {
    // CAC = 85 → payback = 85/11 ≈ 7.7
    const r = calculatePayback(base({ blendedCAC: 85 }));
    expect(r.monthsToPayback).toBeCloseTo(85 / 11, 2);
    expect(r.paybackVerdict).toBe('acceptable');
  });

  it('stretched when 12 < monthsToPayback ≤ 18', () => {
    // CAC = 165 → payback = 165/11 = 15
    const r = calculatePayback(base({ blendedCAC: 165 }));
    expect(r.monthsToPayback).toBeCloseTo(15, 2);
    expect(r.paybackVerdict).toBe('stretched');
  });

  it('unviable when monthsToPayback > 18', () => {
    // CAC = 200 → payback = 200/11 ≈ 18.2
    const r = calculatePayback(base({ blendedCAC: 200 }));
    expect(r.monthsToPayback).toBeGreaterThan(18);
    expect(r.paybackVerdict).toBe('unviable');
  });

  it('very high CAC produces unviable verdict', () => {
    const r = calculatePayback(base({ blendedCAC: 5_000 }));
    expect(r.paybackVerdict).toBe('unviable');
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

  it('payback still computable with zero repeat rate', () => {
    const r = calculatePayback(base({ repeatPurchaseRate: 0 }));
    expect(r.monthsToPayback).not.toBe(Infinity);
    expect(r.monthsToPayback).toBeGreaterThan(0);
  });
});
