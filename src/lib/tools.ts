export interface ToolDefinition {
  name: string;
  description: string;
  path: string;
  cta: string;
}

export const TOOLS: ToolDefinition[] = [
  {
    name: 'Entry Point Economics',
    description: "Understand which products are building your business and which are building a leaky funnel.",
    path: '/tools/first-purchase',
    cta: 'Analyse your entry points →',
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
    description: "Build a consistent naming convention for Meta and Google paid campaigns. Define dimensions, add values, and preview the naming string before you roll it out.",
    path: '/tools/taxonomy-builder',
    cta: 'Build your taxonomy →',
  },
  {
    name: 'GEO Readiness Audit',
    description: "How visible is your site to AI engines? Enter a domain and get a GEO readiness score across five dimensions — entity clarity, claim specificity, structure, citation worthiness, and comparison anchoring.",
    path: '/tools/geo-audit',
    cta: 'Audit your site →',
  },
  {
    name: 'Meta Creative Audit',
    description: 'See where your Meta budget is actually going. Spend concentration by creative and how much is sitting in the learning phase — from a single CSV export.',
    path: '/tools/meta-creative-audit',
    cta: 'Audit your account →',
  },
  {
    name: 'SKU Margin × Velocity Matrix',
    description: 'Plot every SKU by how its margin compares to your catalogue average and how fast it moves. Four quadrants, one decision per product.',
    path: '/tools/margin-velocity',
    cta: 'Map your catalogue →',
  },
  {
    name: 'Subscription Survival Model',
    description: "See how your subscriber cohort decays across orders, where your CAC is recovered, and what moving churn by 5 points actually costs you.",
    path: '/tools/subscription-survival',
    cta: 'Model your cohort →',
  },
];
