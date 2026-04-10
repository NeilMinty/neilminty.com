export interface ToolDefinition {
  name: string;
  description: string;
  path: string;
}

export const TOOLS: ToolDefinition[] = [
  {
    name: 'First Purchase Predictor',
    description: "What is the expected value of a new customer's first order?",
    path: '/tools/first-purchase',
  },
  {
    name: 'Promotions Profitability',
    description: 'Does this promotion generate margin after discounts and acquisition cost?',
    path: '/tools/promotions',
  },
  {
    name: 'Margin Leakage',
    description: 'Where is contribution margin being lost between revenue and net profit?',
    path: '/tools/margin-leakage',
  },
  {
    name: 'Returns Cost',
    description: 'What is the true margin impact of your current returns rate?',
    path: '/tools/returns-cost',
  },
  {
    name: 'Payback Period',
    description: 'How many orders does it take to recover the cost of acquiring a customer?',
    path: '/tools/payback-period',
  },
];
