export interface SupportCostInputs {
  monthlyOrders: number;
  aov: number;
  monthlyTickets: number;
  avgHandleTimeMinutes: number;
  teamSize: number;
  annualSalaryPerAgent: number;
  monthlyPlatformCost: number;
  otherToolingMonthly: number;
  refundRate: number;
  avgRefundValue: number;
}

export interface SupportCostResults {
  monthlyAgentCost: number;
  hourlyAgentRate: number;
  handleTimeCostPerTicket: number;
  peopleCostPerOrder: number;
  platformCostPerOrder: number;
  refundAttributedCostPerOrder: number;
  totalSupportCostPerOrder: number;
  annualSupportLeakage: number;
  supportCostAsPctOfRevenue: number;
  deflectionSaving: number;
}
