import { describe, it, expect } from 'vitest';
import { calculateSubscriptionSurvival } from './subscriptionSurvivalLogic';
import type { SubscriptionSurvivalInputs } from './subscriptionSurvivalTypes';

// Base: AOV=40, margin=60% → marginPerOrder=24, CAC=50
// survivors: s1=100, s2=60, s3=48, s4=43.2, longRun=5%
// cumulativeMargin: cm1=24, cm2=38.4, cm3=49.92, cm4=60.288 → payback at O4
function base(overrides: Partial<SubscriptionSurvivalInputs> = {}): SubscriptionSurvivalInputs {
  return {
    aov: 40,
    grossMarginPercent: 60,
    frequency: 'monthly',
    cac: 50,
    churnO1: 40,
    churnO2: 20,
    churnO3: 10,
    ...overrides,
  };
}

describe('core formulas', () => {
  it('builds 10 order steps', () => {
    const r = calculateSubscriptionSurvival(base());
    expect(r.steps).toHaveLength(10);
    expect(r.steps[0].order).toBe(1);
    expect(r.steps[9].order).toBe(10);
  });

  it('starts cohort at 100', () => {
    const r = calculateSubscriptionSurvival(base());
    expect(r.steps[0].survivors).toBe(100);
  });

  it('applies O1 churn to get survivors at O2', () => {
    const r = calculateSubscriptionSurvival(base());
    // s2 = 100 × (1 - 0.40) = 60
    expect(r.steps[1].survivors).toBeCloseTo(60);
  });

  it('applies O2 churn to get survivors at O3', () => {
    const r = calculateSubscriptionSurvival(base());
    // s3 = 60 × (1 - 0.20) = 48
    expect(r.steps[2].survivors).toBeCloseTo(48);
  });

  it('applies O3 churn to get survivors at O4', () => {
    const r = calculateSubscriptionSurvival(base());
    // s4 = 48 × (1 - 0.10) = 43.2
    expect(r.steps[3].survivors).toBeCloseTo(43.2);
  });

  it('applies long-run churn (churnO3/2) from O5 onwards', () => {
    const r = calculateSubscriptionSurvival(base());
    // lr = 10/2 = 5%; s5 = 43.2 × (1 - 0.05) = 41.04
    expect(r.steps[4].survivors).toBeCloseTo(41.04);
  });

  it('derives longRunChurnRate as churnO3 / 2', () => {
    expect(calculateSubscriptionSurvival(base()).longRunChurnRate).toBeCloseTo(5);
    expect(calculateSubscriptionSurvival(base({ churnO3: 20 })).longRunChurnRate).toBeCloseTo(10);
  });

  it('computes cumulative margin per starting subscriber', () => {
    const r = calculateSubscriptionSurvival(base());
    // cm1 = (100/100) × 24 = 24
    expect(r.steps[0].cumulativeMargin).toBeCloseTo(24);
    // cm2 = 24 + (60/100) × 24 = 38.4
    expect(r.steps[1].cumulativeMargin).toBeCloseTo(38.4);
    // cm3 = 38.4 + (48/100) × 24 = 49.92
    expect(r.steps[2].cumulativeMargin).toBeCloseTo(49.92);
  });
});

describe('CAC payback', () => {
  it('finds payback at the first order where cumulative margin crosses CAC', () => {
    // cm3=49.92 < 50=CAC, cm4=60.288 >= 50 → O4
    expect(calculateSubscriptionSurvival(base()).cacPaybackOrder).toBe(4);
  });

  it('returns null when CAC is never recovered within 10 orders', () => {
    // Very high CAC means never recovered
    const r = calculateSubscriptionSurvival(base({ cac: 999 }));
    expect(r.cacPaybackOrder).toBeNull();
  });

  it('returns O1 when first order margin covers CAC', () => {
    // AOV=100, margin=100% → marginPerOrder=100 >= CAC=50 at O1
    const r = calculateSubscriptionSurvival(base({ aov: 100, grossMarginPercent: 100, cac: 50 }));
    expect(r.cacPaybackOrder).toBe(1);
  });

  it('counts subscribers before activation correctly', () => {
    const r = calculateSubscriptionSurvival(base());
    // payback at O4, survivors at O4 = 43.2 → 100 - 43.2 = 56.8
    expect(r.subscribersBeforeActivation).toBeCloseTo(56.8);
  });

  it('reports all 100 as pre-activation when no payback', () => {
    const r = calculateSubscriptionSurvival(base({ cac: 999 }));
    expect(r.subscribersBeforeActivation).toBe(100);
  });

  it('reports 0 pre-activation when payback at O1', () => {
    const r = calculateSubscriptionSurvival(base({ aov: 100, grossMarginPercent: 100, cac: 50 }));
    expect(r.subscribersBeforeActivation).toBe(0);
  });

  it('computes netLossPerHundred from churners before activation', () => {
    const r = calculateSubscriptionSurvival(base());
    // payback at O4
    // churned at O1→O2: 40, revenue = 40 × 1 × 24 = 960, CAC = 40 × 50 = 2000
    // churned at O2→O3: 12, revenue = 12 × 2 × 24 = 576, CAC = 12 × 50 = 600
    // churned at O3→O4: 4.8, revenue = 4.8 × 3 × 24 = 345.6, CAC = 4.8 × 50 = 240
    // totalRevenue = 1881.6, totalCAC = 2840 → loss = 958.4
    expect(r.netLossPerHundred).toBeCloseTo(958.4);
  });

  it('computes sensitivity delta for O2 churn -5pp', () => {
    const r = calculateSubscriptionSurvival(base());
    // modified: churnO2 = 15%, s3 = 60×(1-0.15) = 51, s4 = 51×(1-0.10) = 45.9
    // extraSubscribers at O4 = 45.9 - 43.2 = 2.7
    expect(r.sensitivityDelta.extraSubscribers).toBeCloseTo(2.7);
    // extraMargin = extraSubscribers × cumulativeMargin[compareOrder]
    //             = 2.7 × 60.288 = 162.78
    expect(r.sensitivityDelta.extraMargin).toBeCloseTo(162.78);
  });

  it('sensitivity delta is non-zero when payback is at O2 (regression — O2 churn only affects survivors[3+])', () => {
    // AOV=50, margin=75% → marginPerOrder=37.50, CAC=48
    // cm1=37.5, cm2=60 → payback at O2 (compareOrder=2)
    // sensitivityIndex = max(2,3) = 3
    // survivors[3]=45, survivorsModified[3](O2=20%)=48 → extraSubscribers=3
    // extraMargin = 3 × cumulativeMargin[2] = 3 × 60 = 180
    const r = calculateSubscriptionSurvival(base({ aov: 50, grossMarginPercent: 75, cac: 48, churnO2: 25, churnO3: 15 }));
    expect(r.cacPaybackOrder).toBe(2);
    expect(r.sensitivityDelta.extraSubscribers).toBeCloseTo(3);
    expect(r.sensitivityDelta.extraMargin).toBeCloseTo(180);
  });

  it('sensitivity delta is non-zero when payback is at O3 (regression)', () => {
    // AOV=50, margin=70% → marginPerOrder=35, CAC=60
    // survivors: s3=45, payback at O3 (cm3=71.75)
    // modified (churnO2=20): s3=48 → extraSubscribers=3
    // extraMargin = 3 × 71.75 = 215.25
    const r = calculateSubscriptionSurvival(base({ aov: 50, grossMarginPercent: 70, cac: 60, churnO2: 25, churnO3: 15 }));
    expect(r.cacPaybackOrder).toBe(3);
    expect(r.sensitivityDelta.extraSubscribers).toBeCloseTo(3);
    expect(r.sensitivityDelta.extraMargin).toBeCloseTo(215.25);
  });
});

describe('edge cases — zero and extreme inputs', () => {
  it('all inputs zero — no crash, no NaN', () => {
    const r = calculateSubscriptionSurvival(base({ aov: 0, cac: 0, churnO1: 0, churnO2: 0, churnO3: 0 }));
    expect(r.cacPaybackOrder).toBe(1); // cm1 = 0 >= 0 = cac
    expect(r.subscribersBeforeActivation).toBe(0);
    expect(r.netLossPerHundred).toBe(0);
    Object.values(r).forEach((v) => { if (typeof v === 'number') expect(isNaN(v)).toBe(false); });
    r.steps.forEach((s) => Object.values(s).forEach((v) => { if (typeof v === 'number') expect(isNaN(v)).toBe(false); }));
    Object.values(r.sensitivityDelta).forEach((v) => { if (typeof v === 'number') expect(isNaN(v)).toBe(false); });
  });

  it('zero AOV (zero margin) — no payback, no NaN', () => {
    const r = calculateSubscriptionSurvival(base({ aov: 0, cac: 50 }));
    expect(r.cacPaybackOrder).toBeNull();
    r.steps.forEach((s) => Object.values(s).forEach((v) => { if (typeof v === 'number') expect(isNaN(v)).toBe(false); }));
  });

  it('zero CAC — payback at O1', () => {
    const r = calculateSubscriptionSurvival(base({ cac: 0 }));
    expect(r.cacPaybackOrder).toBe(1);
  });

  it('all churns at 80% — survivors decay to near zero, no NaN', () => {
    const r = calculateSubscriptionSurvival(base({ churnO1: 80, churnO2: 80, churnO3: 80 }));
    expect(r.steps[1].survivors).toBeCloseTo(20);  // s2 = 20
    expect(r.steps[2].survivors).toBeCloseTo(4);   // s3 = 4
    Object.values(r).forEach((v) => { if (typeof v === 'number') expect(isNaN(v)).toBe(false); });
    r.steps.forEach((s) => Object.values(s).forEach((v) => { if (typeof v === 'number') expect(isNaN(v)).toBe(false); }));
    Object.values(r.sensitivityDelta).forEach((v) => { if (typeof v === 'number') expect(isNaN(v)).toBe(false); });
  });

  it('all churns at 0% — all 100 survive all 10 orders', () => {
    const r = calculateSubscriptionSurvival(base({ churnO1: 0, churnO2: 0, churnO3: 0 }));
    r.steps.forEach((s) => expect(s.survivors).toBeCloseTo(100));
    expect(r.longRunChurnRate).toBe(0);
  });

  it('high AOV — no overflow or NaN', () => {
    const r = calculateSubscriptionSurvival(base({ aov: 999999, cac: 1 }));
    expect(r.cacPaybackOrder).toBe(1);
    r.steps.forEach((s) => Object.values(s).forEach((v) => { if (typeof v === 'number') expect(isNaN(v)).toBe(false); }));
  });

  it('NaN sweep on base inputs', () => {
    const r = calculateSubscriptionSurvival(base());
    Object.values(r).forEach((v) => { if (typeof v === 'number') expect(isNaN(v)).toBe(false); });
    r.steps.forEach((s) => Object.values(s).forEach((v) => { if (typeof v === 'number') expect(isNaN(v)).toBe(false); }));
    Object.values(r.sensitivityDelta).forEach((v) => { if (typeof v === 'number') expect(isNaN(v)).toBe(false); });
  });
});
