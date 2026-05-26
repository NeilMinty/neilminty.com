import { describe, it, expect } from 'vitest';
import {
  discountTiersValid,
  discountQualityScore,
  ltvVelocity,
  epeScoreForProduct,
  paybackPeriod,
  computeProduct,
  computeBlended,
} from './epeScore';
import type { EpeProductInput } from './epeScore';

// ─── BASE FACTORY ─────────────────────────────────────────────────────────────

function base(overrides: Partial<EpeProductInput> = {}): EpeProductInput {
  return {
    volume: 200,
    rpr90d: 40,
    fullPricePct: 60,
    emailExchangePct: 20,
    promotionalPct: 15,
    markdownPct: 5,
    ltv90d: 80,
    ltv180d: 140,
    cac: 25,
    grossMarginPct: 55,
    ...overrides,
  };
}

// ─── discountTiersValid ───────────────────────────────────────────────────────

describe('discountTiersValid', () => {
  it('returns true when tiers sum exactly to 100', () => {
    expect(discountTiersValid(60, 20, 15, 5)).toBe(true);
  });

  it('returns true for 100% full price', () => {
    expect(discountTiersValid(100, 0, 0, 0)).toBe(true);
  });

  it('returns true for 100% markdown', () => {
    expect(discountTiersValid(0, 0, 0, 100)).toBe(true);
  });

  it('returns false when sum < 100', () => {
    expect(discountTiersValid(50, 20, 15, 5)).toBe(false);
  });

  it('returns false when sum > 100', () => {
    expect(discountTiersValid(60, 25, 15, 5)).toBe(false);
  });

  it('returns false when all zero', () => {
    expect(discountTiersValid(0, 0, 0, 0)).toBe(false);
  });

  it('rounds to nearest integer — 99.6 passes (rounds to 100)', () => {
    expect(discountTiersValid(60, 20, 14.8, 4.8)).toBe(true);
  });

  it('rounds to nearest integer — 100.4 passes (rounds to 100)', () => {
    expect(discountTiersValid(60, 20, 15.2, 5.2)).toBe(true);
  });

  it('100.5 fails (rounds to 101)', () => {
    expect(discountTiersValid(60, 20, 15.3, 5.2)).toBe(false);
  });
});

// ─── discountQualityScore ─────────────────────────────────────────────────────

describe('discountQualityScore', () => {
  it('100% full price returns 100', () => {
    expect(discountQualityScore(100, 0, 0, 0)).toBeCloseTo(100);
  });

  it('100% markdown returns 10', () => {
    expect(discountQualityScore(0, 0, 0, 100)).toBeCloseTo(10);
  });

  it('100% email exchange returns 85', () => {
    expect(discountQualityScore(0, 100, 0, 0)).toBeCloseTo(85);
  });

  it('100% promotional returns 40', () => {
    expect(discountQualityScore(0, 0, 100, 0)).toBeCloseTo(40);
  });

  it('applies correct weights to mixed tiers', () => {
    // 60×1.0 + 20×0.85 + 15×0.4 + 5×0.1 = 60 + 17 + 6 + 0.5 = 83.5
    expect(discountQualityScore(60, 20, 15, 5)).toBeCloseTo(83.5);
  });

  it('equal split 25% each: (25 + 21.25 + 10 + 2.5) = 58.75', () => {
    expect(discountQualityScore(25, 25, 25, 25)).toBeCloseTo(58.75);
  });

  it('all zeros returns 0', () => {
    expect(discountQualityScore(0, 0, 0, 0)).toBeCloseTo(0);
  });
});

// ─── ltvVelocity ─────────────────────────────────────────────────────────────

describe('ltvVelocity', () => {
  it('returns 50 when ltv90d is 0 (neutral sentinel)', () => {
    expect(ltvVelocity(0, 0)).toBe(50);
    expect(ltvVelocity(0, 200)).toBe(50);
  });

  it('ratio of 1.0 normalises to 33.33', () => {
    expect(ltvVelocity(100, 100)).toBeCloseTo(33.33, 1);
  });

  it('ratio of 1.5 normalises to 50', () => {
    expect(ltvVelocity(100, 150)).toBeCloseTo(50);
  });

  it('ratio of 3.0 (cap) normalises to 100', () => {
    expect(ltvVelocity(100, 300)).toBeCloseTo(100);
  });

  it('ratio above 3.0 is capped at 100', () => {
    expect(ltvVelocity(100, 500)).toBeCloseTo(100);
    expect(ltvVelocity(50, 1000)).toBeCloseTo(100);
  });

  it('ltv180d = 0 (declining spend) normalises to 0', () => {
    expect(ltvVelocity(100, 0)).toBeCloseTo(0);
  });

  it('base inputs: 140/80 = 1.75 → (1.75/3)×100 ≈ 58.33', () => {
    expect(ltvVelocity(80, 140)).toBeCloseTo(58.33, 1);
  });

  it('very small ltv90d produces no NaN', () => {
    const v = ltvVelocity(0.01, 0.05);
    expect(isNaN(v)).toBe(false);
  });
});

// ─── epeScoreForProduct ───────────────────────────────────────────────────────

describe('epeScoreForProduct', () => {
  it('max inputs produce 100', () => {
    expect(epeScoreForProduct(100, 100, 100)).toBeCloseTo(100);
  });

  it('zero inputs produce 0', () => {
    expect(epeScoreForProduct(0, 0, 0)).toBeCloseTo(0);
  });

  it('applies correct weights: 0.50 RPR + 0.35 DQS + 0.15 velocity', () => {
    // 40×0.5 + 83.5×0.35 + 58.33×0.15 = 20 + 29.225 + 8.75 = 57.975
    const score = epeScoreForProduct(40, 83.5, 58.33);
    expect(score).toBeCloseTo(57.975, 1);
  });

  it('is clamped at 100 for inputs above range', () => {
    expect(epeScoreForProduct(100, 150, 200)).toBe(100);
  });

  it('is clamped at 0 for negative inputs', () => {
    expect(epeScoreForProduct(-50, -50, -50)).toBe(0);
  });

  it('weights sum to 1.0 — verified by max input case', () => {
    // 100×0.5 + 100×0.35 + 100×0.15 = 100
    expect(epeScoreForProduct(100, 100, 100)).toBe(100);
  });
});

// ─── paybackPeriod ────────────────────────────────────────────────────────────

describe('paybackPeriod', () => {
  it('returns null when cac is undefined', () => {
    expect(paybackPeriod(undefined, 80, 55)).toBeNull();
  });

  it('returns null when grossMarginPct is undefined', () => {
    expect(paybackPeriod(25, 80, undefined)).toBeNull();
  });

  it('returns null when both optional fields are absent', () => {
    expect(paybackPeriod(undefined, 80, undefined)).toBeNull();
  });

  it('returns null when ltv90d is 0 (avoids division by zero)', () => {
    expect(paybackPeriod(25, 0, 55)).toBeNull();
  });

  it('computes days as cac / (ltv90d / 90)', () => {
    // 25 / (80 / 90) = 25 × 90 / 80 = 28.125
    const result = paybackPeriod(25, 80, 55);
    expect(result).not.toBeNull();
    expect(result!.days).toBeCloseTo(28.125);
  });

  it('does not exceed 180d flag when days ≤ 180', () => {
    // 25 / (80/90) ≈ 28.1 days
    const result = paybackPeriod(25, 80, 55);
    expect(result!.exceeds180d).toBe(false);
  });

  it('flags exceeds180d when days > 180', () => {
    // cac=200, ltv90d=80 → 200/(80/90) = 225 days
    const result = paybackPeriod(200, 80, 55);
    expect(result!.exceeds180d).toBe(true);
    expect(result!.days).toBeCloseTo(225);
  });

  it('boundary: exactly 180 days does not exceed', () => {
    // cac / (ltv90d/90) = 180 → cac = 180 × ltv90d / 90 = 2 × ltv90d
    // ltv90d = 90 → cac = 180
    const result = paybackPeriod(180, 90, 55);
    expect(result!.days).toBeCloseTo(180);
    expect(result!.exceeds180d).toBe(false);
  });

  it('boundary: 180.01 days exceeds', () => {
    const result = paybackPeriod(180.01, 90, 55);
    expect(result!.exceeds180d).toBe(true);
  });

  it('high cac with low ltv produces very large payback', () => {
    const result = paybackPeriod(10000, 10, 55);
    expect(result!.days).toBeCloseTo(90000);
    expect(result!.exceeds180d).toBe(true);
  });

  it('grossMarginPct does not affect the days formula (gates the calculation only)', () => {
    // Two calls with different GM% — days must be identical
    const r1 = paybackPeriod(25, 80, 30);
    const r2 = paybackPeriod(25, 80, 70);
    expect(r1!.days).toBeCloseTo(r2!.days);
  });
});

// ─── computeProduct ───────────────────────────────────────────────────────────

describe('computeProduct', () => {
  it('returns all four result fields', () => {
    const r = computeProduct(base());
    expect(typeof r.discountQualityScore).toBe('number');
    expect(typeof r.ltvVelocity).toBe('number');
    expect(typeof r.epeScore).toBe('number');
    expect(r.paybackDays).not.toBeNull();
    expect(r.paybackExceeds180d).not.toBeNull();
  });

  it('discountQualityScore matches direct formula call', () => {
    const b = base();
    const r = computeProduct(b);
    expect(r.discountQualityScore).toBeCloseTo(
      discountQualityScore(b.fullPricePct, b.emailExchangePct, b.promotionalPct, b.markdownPct)
    );
  });

  it('ltvVelocity matches direct formula call', () => {
    const b = base();
    const r = computeProduct(b);
    expect(r.ltvVelocity).toBeCloseTo(ltvVelocity(b.ltv90d, b.ltv180d));
  });

  it('epeScore matches direct formula call', () => {
    const b = base();
    const r = computeProduct(b);
    const dqs = discountQualityScore(b.fullPricePct, b.emailExchangePct, b.promotionalPct, b.markdownPct);
    const vel = ltvVelocity(b.ltv90d, b.ltv180d);
    expect(r.epeScore).toBeCloseTo(epeScoreForProduct(b.rpr90d, dqs, vel));
  });

  it('paybackDays and paybackExceeds180d are null when cac is absent', () => {
    const r = computeProduct(base({ cac: undefined }));
    expect(r.paybackDays).toBeNull();
    expect(r.paybackExceeds180d).toBeNull();
  });

  it('paybackDays and paybackExceeds180d are null when grossMarginPct is absent', () => {
    const r = computeProduct(base({ grossMarginPct: undefined }));
    expect(r.paybackDays).toBeNull();
    expect(r.paybackExceeds180d).toBeNull();
  });

  it('paybackDays and paybackExceeds180d are null when ltv90d is 0', () => {
    const r = computeProduct(base({ ltv90d: 0 }));
    expect(r.paybackDays).toBeNull();
    expect(r.paybackExceeds180d).toBeNull();
  });

  it('epeScore is within [0, 100]', () => {
    const r = computeProduct(base());
    expect(r.epeScore).toBeGreaterThanOrEqual(0);
    expect(r.epeScore).toBeLessThanOrEqual(100);
  });

  it('no NaN in any numeric output', () => {
    const r = computeProduct(base());
    [r.discountQualityScore, r.ltvVelocity, r.epeScore].forEach((v) => {
      expect(isNaN(v)).toBe(false);
    });
  });
});

// ─── computeBlended ───────────────────────────────────────────────────────────

describe('computeBlended', () => {
  it('single valid product: blendedEpeScore equals that product epeScore', () => {
    const product = base();
    const r = computeBlended([product]);
    expect(r.products).toHaveLength(1);
    expect(r.blendedEpeScore).toBeCloseTo(r.products[0].epeScore);
  });

  it('two equal-volume products: blended is simple average of EPE scores', () => {
    const a = base({ volume: 100, rpr90d: 20, fullPricePct: 100, emailExchangePct: 0, promotionalPct: 0, markdownPct: 0 });
    const b = base({ volume: 100, rpr90d: 60, fullPricePct: 100, emailExchangePct: 0, promotionalPct: 0, markdownPct: 0 });
    const r = computeBlended([a, b]);
    const expected = (computeProduct(a).epeScore + computeProduct(b).epeScore) / 2;
    expect(r.blendedEpeScore).toBeCloseTo(expected);
  });

  it('volume-weighted: higher-volume product has greater influence', () => {
    const low = base({ volume: 10, rpr90d: 10, fullPricePct: 100, emailExchangePct: 0, promotionalPct: 0, markdownPct: 0 });
    const high = base({ volume: 990, rpr90d: 90, fullPricePct: 100, emailExchangePct: 0, promotionalPct: 0, markdownPct: 0 });
    const r = computeBlended([low, high]);
    const pHigh = computeProduct(high).epeScore;
    // blended should be very close to high-volume product's score
    expect(r.blendedEpeScore!).toBeCloseTo(pHigh, 0);
  });

  it('excludes products where volume is 0', () => {
    const valid = base({ volume: 100 });
    const zero = base({ volume: 0 });
    const r = computeBlended([valid, zero]);
    expect(r.products).toHaveLength(1);
  });

  it('excludes products where discount tiers do not sum to 100', () => {
    const valid = base();
    const invalid = base({ fullPricePct: 50, emailExchangePct: 0, promotionalPct: 0, markdownPct: 0 }); // sums to 50
    const r = computeBlended([valid, invalid]);
    expect(r.products).toHaveLength(1);
    expect(r.blendedEpeScore).toBeCloseTo(r.products[0].epeScore);
  });

  it('returns null blendedEpeScore when all products have volume 0', () => {
    const r = computeBlended([base({ volume: 0 }), base({ volume: 0 })]);
    expect(r.blendedEpeScore).toBeNull();
    expect(r.products).toHaveLength(0);
  });

  it('returns null blendedEpeScore for empty input', () => {
    const r = computeBlended([]);
    expect(r.blendedEpeScore).toBeNull();
    expect(r.products).toHaveLength(0);
  });

  it('returns null blendedEpeScore when all products have invalid discount tiers', () => {
    const r = computeBlended([
      base({ fullPricePct: 10, emailExchangePct: 0, promotionalPct: 0, markdownPct: 0 }), // sums to 10
    ]);
    expect(r.blendedEpeScore).toBeNull();
  });

  it('blendedEpeScore is within [0, 100]', () => {
    const r = computeBlended([base(), base({ rpr90d: 80, volume: 50 })]);
    expect(r.blendedEpeScore!).toBeGreaterThanOrEqual(0);
    expect(r.blendedEpeScore!).toBeLessThanOrEqual(100);
  });

  it('no NaN in blendedEpeScore or product scores', () => {
    const r = computeBlended([base(), base({ volume: 50 })]);
    expect(isNaN(r.blendedEpeScore!)).toBe(false);
    r.products.forEach((p) => {
      expect(isNaN(p.epeScore)).toBe(false);
      expect(isNaN(p.discountQualityScore)).toBe(false);
      expect(isNaN(p.ltvVelocity)).toBe(false);
    });
  });
});

// ─── EDGE CASES ───────────────────────────────────────────────────────────────

describe('edge cases — zero and extreme inputs', () => {
  it('all numeric inputs zero: no crash, no NaN', () => {
    const r = computeProduct(base({
      rpr90d: 0, fullPricePct: 0, emailExchangePct: 0, promotionalPct: 0,
      markdownPct: 0, ltv90d: 0, ltv180d: 0, cac: 0, grossMarginPct: 0,
    }));
    [r.discountQualityScore, r.ltvVelocity, r.epeScore].forEach((v) => {
      expect(isNaN(v)).toBe(false);
    });
  });

  it('100% full price: maximum discount quality score', () => {
    const r = computeProduct(base({
      fullPricePct: 100, emailExchangePct: 0, promotionalPct: 0, markdownPct: 0,
    }));
    expect(r.discountQualityScore).toBeCloseTo(100);
  });

  it('100% markdown: minimum discount quality score (10)', () => {
    const r = computeProduct(base({
      fullPricePct: 0, emailExchangePct: 0, promotionalPct: 0, markdownPct: 100,
    }));
    expect(r.discountQualityScore).toBeCloseTo(10);
  });

  it('ltv90d = ltv180d: velocity ≈ 33.3 (ratio 1.0)', () => {
    const r = computeProduct(base({ ltv90d: 100, ltv180d: 100 }));
    expect(r.ltvVelocity).toBeCloseTo(33.33, 1);
  });

  it('ltv180d much larger than ltv90d: velocity capped at 100', () => {
    const r = computeProduct(base({ ltv90d: 50, ltv180d: 10000 }));
    expect(r.ltvVelocity).toBeCloseTo(100);
  });

  it('rpr90d = 100: RPR component contributes maximum 50 to epeScore', () => {
    const r = computeProduct(base({ rpr90d: 100 }));
    expect(r.epeScore).toBeGreaterThan(50);
  });

  it('rpr90d = 0: epeScore is driven only by DQS and velocity', () => {
    const b = base({ rpr90d: 0 });
    const r = computeProduct(b);
    const dqs = discountQualityScore(b.fullPricePct, b.emailExchangePct, b.promotionalPct, b.markdownPct);
    const vel = ltvVelocity(b.ltv90d, b.ltv180d);
    const expected = dqs * 0.35 + vel * 0.15;
    expect(r.epeScore).toBeCloseTo(expected);
  });

  it('missing optional fields (cac and grossMarginPct): payback fields are null', () => {
    const r = computeProduct(base({ cac: undefined, grossMarginPct: undefined }));
    expect(r.paybackDays).toBeNull();
    expect(r.paybackExceeds180d).toBeNull();
  });

  it('discount tiers not summing to 100 are excluded from blended result', () => {
    const invalid = base({
      fullPricePct: 30, emailExchangePct: 10, promotionalPct: 5, markdownPct: 5, // sums to 50
    });
    const r = computeBlended([invalid]);
    expect(r.blendedEpeScore).toBeNull();
    expect(r.products).toHaveLength(0);
  });

  it('NaN sweep: computeProduct with extreme values produces no NaN', () => {
    const extremes: Partial<EpeProductInput>[] = [
      { rpr90d: 100, ltv90d: 1_000_000, ltv180d: 1_000_000, cac: 1_000_000 },
      { rpr90d: 0.001, ltv90d: 0.01, ltv180d: 0.01 },
      { ltv90d: 0, ltv180d: 0, cac: undefined, grossMarginPct: undefined },
    ];
    extremes.forEach((overrides) => {
      const r = computeProduct(base(overrides));
      [r.discountQualityScore, r.ltvVelocity, r.epeScore].forEach((v) => {
        expect(isNaN(v)).toBe(false);
      });
    });
  });
});
