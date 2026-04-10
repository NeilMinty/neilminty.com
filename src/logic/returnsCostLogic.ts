import type { ReturnsCostInputs, ReturnsCostResults } from './returnsCostTypes';

export function calculateReturnsCost(inputs: ReturnsCostInputs): ReturnsCostResults {
  const {
    annualRevenue,
    aov,
    returnsRate,
    grossMargin,
    costPerReturn,
    resaleDiscountedPct,
    writeoffPct,
    avgDiscountPct,
    fulfilmentCostPct,
    returnsDragPct,
  } = inputs;

  const annualOrders = aov > 0 ? annualRevenue / aov : 0;
  const annualReturns = annualOrders * (returnsRate / 100);
  const hardReturnsCost = annualReturns * costPerReturn;

  const discountedUnits = annualReturns * (resaleDiscountedPct / 100);
  const writeoffUnits = annualReturns * (writeoffPct / 100);
  const discountedRevenueLoss = discountedUnits * aov * (avgDiscountPct / 100);
  const writeoffRevenueLoss = writeoffUnits * aov;
  const discountedMarginLoss = discountedRevenueLoss * (grossMargin / 100);
  const writeoffMarginLoss = writeoffRevenueLoss * (grossMargin / 100);
  const marginLeakage = discountedMarginLoss + writeoffMarginLoss;

  const fulfilmentCost = annualRevenue * (fulfilmentCostPct / 100);
  const operationalDrag = fulfilmentCost * (returnsDragPct / 100);
  const totalReturnsCost = hardReturnsCost + marginLeakage + operationalDrag;
  const trueReturnsCost = annualReturns > 0 ? totalReturnsCost / annualReturns : 0;

  return {
    annualReturns,
    hardReturnsCost,
    discountedMarginLoss,
    writeoffMarginLoss,
    marginLeakage,
    operationalDrag,
    totalReturnsCost,
    trueReturnsCost,
  };
}
