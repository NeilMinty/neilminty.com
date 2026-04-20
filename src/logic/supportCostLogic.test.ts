import { describe, it, expect } from 'vitest';
import { calculateSupportCost } from './supportCostLogic';
import type { SupportCostInputs } from './supportCostTypes';

function base(overrides: Partial<SupportCostInputs> = {}): SupportCostInputs {
  return {
    monthlyOrders: 1000,
    aov: 60,
    monthlyTickets: 100,
    avgHandleTimeMinutes: 8,
    teamSize: 2,
    annualSalaryPerAgent: 28000,
    monthlyPlatformCost: 120,
    otherToolingMonthly: 0,
    refundRate: 15,
    avgRefundValue: 60,
    ...overrides,
  };
}

// Base trace:
// monthlyAgentCost     = (28000 × 2) / 12             = 4666.67
// hourlyAgentRate      = 4666.67 / (2 × 160)           = 14.58
// handleTimeCost/ticket= (8/60) × 14.58               = 1.944
// peopleCost/order     = (1.944 × 100) / 1000         = 0.1944
// platformCost/order   = 120 / 1000                   = 0.12
// refundAttrib/order   = (100 × 0.15 × 60) / 1000     = 0.90
// totalCost/order      = 0.1944 + 0.12 + 0.90         = 1.2144
// annualLeakage        = 1.2144 × 1000 × 12           = 14573.3
// pctOfRevenue         = 1.2144 / 60 × 100            = 2.024
// deflectionSaving     = 14573.3 × 0.2                = 2914.7

describe('calculateSupportCost — core formulas', () => {
  it('computes monthlyAgentCost as (salary × teamSize) / 12', () => {
    const r = calculateSupportCost(base());
    expect(r.monthlyAgentCost).toBeCloseTo(4666.67, 1);
  });

  it('computes hourlyAgentRate as monthlyAgentCost / (teamSize × 160)', () => {
    const r = calculateSupportCost(base());
    expect(r.hourlyAgentRate).toBeCloseTo(14.58, 1);
  });

  it('computes handleTimeCostPerTicket as (handleTime / 60) × hourlyRate', () => {
    const r = calculateSupportCost(base());
    expect(r.handleTimeCostPerTicket).toBeCloseTo(1.944, 2);
  });

  it('computes peopleCostPerOrder from ticket volume and order volume', () => {
    const r = calculateSupportCost(base());
    expect(r.peopleCostPerOrder).toBeCloseTo(0.1944, 3);
  });

  it('computes platformCostPerOrder as (platform + tooling) / orders', () => {
    const r = calculateSupportCost(base({ monthlyPlatformCost: 120, otherToolingMonthly: 30 }));
    expect(r.platformCostPerOrder).toBeCloseTo(0.15, 5);
  });

  it('computes refundAttributedCostPerOrder as (tickets × rate × refundValue) / orders', () => {
    const r = calculateSupportCost(base());
    // (100 × 0.15 × 60) / 1000 = 0.90
    expect(r.refundAttributedCostPerOrder).toBeCloseTo(0.9, 5);
  });

  it('computes totalSupportCostPerOrder as sum of three components', () => {
    const r = calculateSupportCost(base());
    expect(r.totalSupportCostPerOrder).toBeCloseTo(
      r.peopleCostPerOrder + r.platformCostPerOrder + r.refundAttributedCostPerOrder,
      10,
    );
  });

  it('computes annualSupportLeakage as total × orders × 12', () => {
    const r = calculateSupportCost(base());
    expect(r.annualSupportLeakage).toBeCloseTo(14573, 0);
  });

  it('computes supportCostAsPctOfRevenue as (total / aov) × 100', () => {
    const r = calculateSupportCost(base());
    expect(r.supportCostAsPctOfRevenue).toBeCloseTo(2.02, 1);
  });

  it('computes deflectionSaving as annualLeakage × 0.2', () => {
    const r = calculateSupportCost(base());
    expect(r.deflectionSaving).toBeCloseTo(r.annualSupportLeakage * 0.2, 5);
  });
});

describe('calculateSupportCost — edge cases', () => {
  it('returns zero per-order costs when monthlyOrders is 0', () => {
    const r = calculateSupportCost(base({ monthlyOrders: 0 }));
    expect(r.peopleCostPerOrder).toBe(0);
    expect(r.platformCostPerOrder).toBe(0);
    expect(r.refundAttributedCostPerOrder).toBe(0);
    expect(r.totalSupportCostPerOrder).toBe(0);
    expect(r.annualSupportLeakage).toBe(0);
  });

  it('returns zero hourlyAgentRate when teamSize is 0', () => {
    const r = calculateSupportCost(base({ teamSize: 0 }));
    expect(r.hourlyAgentRate).toBe(0);
    expect(r.handleTimeCostPerTicket).toBe(0);
  });

  it('returns zero supportCostAsPctOfRevenue when aov is 0', () => {
    const r = calculateSupportCost(base({ aov: 0 }));
    expect(r.supportCostAsPctOfRevenue).toBe(0);
  });

  it('returns zero refund cost when refundRate is 0', () => {
    const r = calculateSupportCost(base({ refundRate: 0 }));
    expect(r.refundAttributedCostPerOrder).toBe(0);
  });

  it('handles all inputs zero without crashing', () => {
    const r = calculateSupportCost(base({
      monthlyOrders: 0,
      aov: 0,
      monthlyTickets: 0,
      avgHandleTimeMinutes: 0,
      teamSize: 0,
      annualSalaryPerAgent: 0,
      monthlyPlatformCost: 0,
      otherToolingMonthly: 0,
      refundRate: 0,
      avgRefundValue: 0,
    }));
    Object.values(r).forEach((v) => expect(isNaN(v)).toBe(false));
  });
});
