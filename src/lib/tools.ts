export interface ToolDefinition {
  name: string;
  description: string;
  path: string;
  cta: string;
}

export const TOOLS: ToolDefinition[] = [
  {
    name: 'First Purchase Predictor',
    description: "Which product should you acquire customers on? Ranks your catalogue by retention strength, adjusted for volume and discount dependency.",
    path: '/tools/first-purchase',
    cta: 'Rank your catalogue →',
  },
  {
    name: 'Promotions Profitability',
    description: "Before you run a promotion, know if it can earn its margin. Calculates break-even volume uplift and whether it's realistic.",
    path: '/tools/promotions',
    cta: 'Test your promotion →',
  },
  {
    name: 'Margin Leakage',
    description: "Where is your contribution margin going? Breaks erosion into returns, discounting, and delivery — ranked by size.",
    path: '/tools/margin-leakage',
    cta: 'Find your leakage →',
  },
  {
    name: 'Returns Cost',
    description: "Your returns rate is a headline. This is what it's actually costing you — hard cost, margin leakage, and operational drag combined.",
    path: '/tools/returns-cost',
    cta: 'Cost your returns →',
  },
  {
    name: 'LTV:CAC Analyser',
    description: "Enter your unit economics to see LTV:CAC at 12 and 24 months and how long it takes to recover acquisition cost.",
    path: '/tools/ltv-cac',
    cta: 'Analyse your LTV:CAC →',
  },
  {
    name: 'Support Cost Leakage',
    description: "What is support actually costing per order? People cost, platform cost, and refund attribution — combined into a single annual leakage figure.",
    path: '/tools/support-cost-leakage',
    cta: 'Calculate support cost →',
  },
  {
    name: 'Campaign Taxonomy Builder',
    description: "Define the dimensions of your campaign naming convention, add allowed values, and preview the structure before rolling it out.",
    path: '/tools/taxonomy-builder',
    cta: 'Build your taxonomy →',
  },
];
