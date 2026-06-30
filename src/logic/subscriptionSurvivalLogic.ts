import type {
  SubscriptionSurvivalInputs,
  SubscriptionSurvivalResults,
  OrderStep,
} from './subscriptionSurvivalTypes';

function buildSurvivors(o1: number, o2: number, o3: number): number[] {
  const s = new Array(11).fill(0);
  s[1] = 100;
  s[2] = s[1] * (1 - o1 / 100);
  s[3] = s[2] * (1 - o2 / 100);
  s[4] = s[3] * (1 - o3 / 100);
  const lr = o3 / 2;
  for (let n = 5; n <= 10; n++) {
    s[n] = s[n - 1] * (1 - lr / 100);
  }
  return s;
}

function buildCumulativeMargin(survivors: number[], marginPerOrder: number): number[] {
  const cm = new Array(11).fill(0);
  for (let n = 1; n <= 10; n++) {
    cm[n] = cm[n - 1] + (survivors[n] / 100) * marginPerOrder;
  }
  return cm;
}

function findPaybackOrder(cm: number[], cac: number): number | null {
  for (let n = 1; n <= 10; n++) {
    if (cm[n] >= cac) return n;
  }
  return null;
}

export function calculateSubscriptionSurvival(
  inputs: SubscriptionSurvivalInputs
): SubscriptionSurvivalResults {
  const { aov, grossMarginPercent, cac, churnO1, churnO2, churnO3 } = inputs;

  const marginPerOrder = aov * (grossMarginPercent / 100);
  const longRunChurnRate = churnO3 / 2;

  const survivors = buildSurvivors(churnO1, churnO2, churnO3);
  const cumulativeMargin = buildCumulativeMargin(survivors, marginPerOrder);
  const cacPaybackOrder = findPaybackOrder(cumulativeMargin, cac);

  const steps: OrderStep[] = [];
  for (let n = 1; n <= 10; n++) {
    steps.push({
      order: n,
      survivors: survivors[n],
      cumulativeMargin: cumulativeMargin[n],
    });
  }

  // Subscribers before activation
  const activationOrder = cacPaybackOrder;
  const subscribersBeforeActivation =
    activationOrder !== null ? Math.max(0, 100 - survivors[activationOrder]) : 100;

  // Net loss per 100 acquired from early-churning subscribers
  // For each order step before activation: sum(churned × orders_completed × marginPerOrder)
  // then subtract from (churnerCount × CAC)
  let netLossPerHundred: number;
  if (activationOrder !== null) {
    let totalChurnerRevenue = 0;
    for (let n = 1; n < activationOrder; n++) {
      const churned = Math.max(0, survivors[n] - survivors[n + 1]);
      totalChurnerRevenue += churned * n * marginPerOrder;
    }
    const churnerCount = 100 - survivors[activationOrder];
    netLossPerHundred = Math.max(0, churnerCount * cac - totalChurnerRevenue);
  } else {
    // No payback within 10 orders: all 100 subscribers are in the loss zone
    netLossPerHundred = Math.max(0, 100 * cac - cumulativeMargin[10] * 100);
  }

  // Sensitivity: O2 churn reduced by 5pp (clamped at 0)
  // O2 churn affects survivors[3] and beyond — never survivors[1] or [2].
  // sensitivityIndex clamps to 3 so the diff is always non-zero when O2 churn has any effect.
  const compareOrder = activationOrder ?? 10;
  const sensitivityIndex = Math.max(compareOrder, 3);
  const survivorsModified = buildSurvivors(churnO1, Math.max(0, churnO2 - 5), churnO3);

  const extraSubscribers = Math.max(
    0,
    survivorsModified[sensitivityIndex] - survivors[sensitivityIndex]
  );
  const extraMargin = Math.max(
    0,
    extraSubscribers * cumulativeMargin[compareOrder]
  );

  return {
    steps,
    cacPaybackOrder,
    longRunChurnRate,
    subscribersBeforeActivation,
    netLossPerHundred,
    sensitivityDelta: { extraSubscribers, extraMargin },
  };
}
