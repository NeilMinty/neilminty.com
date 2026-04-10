export interface ReturnsCostInputs {
  annualRevenue: number;
  aov: number;
  returnsRate: number;
  grossMargin: number;
  costPerReturn: number;
  resaleDiscountedPct: number;
  writeoffPct: number;
  avgDiscountPct: number;
  fulfilmentCostPct: number;
  returnsDragPct: number;
}

export interface ReturnsCostResults {
  annualReturns: number;
  hardReturnsCost: number;
  discountedMarginLoss: number;
  writeoffMarginLoss: number;
  marginLeakage: number;
  operationalDrag: number;
  totalReturnsCost: number;
  trueReturnsCost: number;
}
