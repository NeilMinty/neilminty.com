import type { SupportCostInputs, SupportCostResults } from './supportCostTypes';

export function calculateSupportCost(inputs: SupportCostInputs): SupportCostResults {
  const {
    monthlyOrders,
    aov,
    monthlyTickets,
    avgHandleTimeMinutes,
    teamSize,
    annualSalaryPerAgent,
    monthlyPlatformCost,
    otherToolingMonthly,
    refundRate,
    avgRefundValue,
  } = inputs;

  // People cost
  const monthlyAgentCost = (annualSalaryPerAgent * teamSize) / 12;
  const hourlyAgentRate = teamSize > 0 ? monthlyAgentCost / (teamSize * 160) : 0;
  const handleTimeCostPerTicket = (avgHandleTimeMinutes / 60) * hourlyAgentRate;
  const peopleCostPerOrder =
    monthlyOrders > 0 ? (handleTimeCostPerTicket * monthlyTickets) / monthlyOrders : 0;

  // Platform cost
  const platformCostPerOrder =
    monthlyOrders > 0 ? (monthlyPlatformCost + otherToolingMonthly) / monthlyOrders : 0;

  // Refund-attributed cost
  // Total refund cost = tickets × refund rate × avg refund value
  const refundAttributedCostPerOrder =
    monthlyOrders > 0
      ? (monthlyTickets * (refundRate / 100) * avgRefundValue) / monthlyOrders
      : 0;

  const totalSupportCostPerOrder =
    peopleCostPerOrder + platformCostPerOrder + refundAttributedCostPerOrder;

  const annualSupportLeakage = totalSupportCostPerOrder * monthlyOrders * 12;
  const supportCostAsPctOfRevenue = aov > 0 ? (totalSupportCostPerOrder / aov) * 100 : 0;
  const deflectionSaving = annualSupportLeakage * 0.2;

  return {
    monthlyAgentCost,
    hourlyAgentRate,
    handleTimeCostPerTicket,
    peopleCostPerOrder,
    platformCostPerOrder,
    refundAttributedCostPerOrder,
    totalSupportCostPerOrder,
    annualSupportLeakage,
    supportCostAsPctOfRevenue,
    deflectionSaving,
  };
}
