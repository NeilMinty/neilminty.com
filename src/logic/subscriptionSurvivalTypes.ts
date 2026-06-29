export type SubscriptionFrequency = 'monthly' | 'every6weeks' | 'every2months';

export interface SubscriptionSurvivalInputs {
  aov: number;
  grossMarginPercent: number; // 0–100
  frequency: SubscriptionFrequency;
  cac: number;
  churnO1: number; // 0–80 (percent)
  churnO2: number; // 0–80
  churnO3: number; // 0–80
}

export interface OrderStep {
  order: number;
  survivors: number;        // out of 100
  cumulativeMargin: number; // £ per starting subscriber
}

export interface SensitivityDelta {
  extraSubscribers: number; // additional survivors at activation order at O2 -5pp
  extraMargin: number;      // £ per 100 acquired, additional margin
}

export interface SubscriptionSurvivalResults {
  steps: OrderStep[];
  cacPaybackOrder: number | null; // null = not recovered within 10 orders
  longRunChurnRate: number;       // percent, derived as churnO3 / 2
  subscribersBeforeActivation: number; // count out of 100
  netLossPerHundred: number;      // £ per 100 acquired (net CAC loss from early churners)
  sensitivityDelta: SensitivityDelta;
}
