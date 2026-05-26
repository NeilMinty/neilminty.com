// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface EpeProductInput {
  volume: number;           // first purchase order count
  rpr90d: number;           // 90-day repeat purchase rate, 0–100
  fullPricePct: number;     // 0–100, must sum to 100 with the three below
  emailExchangePct: number; // email capture / 10–15% discount tier
  promotionalPct: number;   // promotional / 20–25% discount tier
  markdownPct: number;      // markdown / 30%+ discount tier
  ltv90d: number;           // £ LTV at 90 days
  ltv180d: number;          // £ LTV at 180 days
  cac?: number;             // £ cost of acquisition — optional
  grossMarginPct?: number;  // 0–100 — required to compute payback
}

export interface EpeProductResult {
  discountQualityScore: number;      // 0–100
  ltvVelocity: number;               // 0–100
  epeScore: number;                  // 0–100, clamped
  paybackDays: number | null;        // null when cac or grossMarginPct absent, or ltv90d = 0
  paybackExceeds180d: boolean | null; // null when paybackDays is null
}

export interface EpeBlendedResult {
  products: EpeProductResult[];
  blendedEpeScore: number | null; // null when no valid products
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * Returns true when the four discount tier percentages sum to 100 (±0.5 tolerance).
 */
export function discountTiersValid(
  fullPricePct: number,
  emailExchangePct: number,
  promotionalPct: number,
  markdownPct: number
): boolean {
  const sum = fullPricePct + emailExchangePct + promotionalPct + markdownPct;
  return Math.round(sum) === 100;
}

// ─── CORE FORMULAS ───────────────────────────────────────────────────────────

/**
 * Weighted quality score for a product's discount mix.
 * Result is naturally bounded: min ~10 (100% markdown), max 100 (100% full price).
 * Inputs are percentages that should sum to 100.
 */
export function discountQualityScore(
  fullPricePct: number,
  emailExchangePct: number,
  promotionalPct: number,
  markdownPct: number
): number {
  return (
    fullPricePct * 1.0 +
    emailExchangePct * 0.85 +
    promotionalPct * 0.4 +
    markdownPct * 0.1
  );
}

/**
 * LTV velocity: how fast customer spend compounds from 90d to 180d.
 * Ratio is capped at 3.0 then normalised to 0–100.
 * Returns 50 (neutral) when ltv90d is 0.
 */
export function ltvVelocity(ltv90d: number, ltv180d: number): number {
  if (ltv90d === 0) return 50;
  const ratio = ltv180d / ltv90d;
  const capped = Math.min(ratio, 3.0);
  return (capped / 3.0) * 100;
}

/**
 * Composite EPE score for a single product.
 * Inputs are all 0–100 scaled values.
 * Result is clamped to [0, 100].
 */
export function epeScoreForProduct(
  rpr90d: number,
  dqs: number,
  velocity: number
): number {
  const raw = rpr90d * 0.5 + dqs * 0.35 + velocity * 0.15;
  return Math.min(100, Math.max(0, raw));
}

/**
 * Days to recover CAC from LTV90d revenue run-rate.
 * Formula: CAC / (LTV90d / 90)
 * Returns null when cac or grossMarginPct is absent, or when ltv90d is 0
 * (division by zero — payback is undefined).
 */
export function paybackPeriod(
  cac: number | undefined,
  ltv90d: number,
  grossMarginPct: number | undefined
): { days: number; exceeds180d: boolean } | null {
  if (cac === undefined || grossMarginPct === undefined) return null;
  if (ltv90d === 0) return null;
  const days = cac / (ltv90d / 90);
  return { days, exceeds180d: days > 180 };
}

// ─── COMPOSITE FUNCTIONS ─────────────────────────────────────────────────────

/**
 * Computes all derived scores for a single product.
 * Does not validate discount tier sum — callers are responsible for filtering.
 */
export function computeProduct(input: EpeProductInput): EpeProductResult {
  const dqs = discountQualityScore(
    input.fullPricePct,
    input.emailExchangePct,
    input.promotionalPct,
    input.markdownPct
  );
  const velocity = ltvVelocity(input.ltv90d, input.ltv180d);
  const score = epeScoreForProduct(input.rpr90d, dqs, velocity);
  const payback = paybackPeriod(input.cac, input.ltv90d, input.grossMarginPct);

  return {
    discountQualityScore: dqs,
    ltvVelocity: velocity,
    epeScore: score,
    paybackDays: payback !== null ? payback.days : null,
    paybackExceeds180d: payback !== null ? payback.exceeds180d : null,
  };
}

/**
 * Volume-weighted blended EPE score across all valid products.
 * A product is valid when:
 *   - volume > 0
 *   - discount tiers sum to 100 (±0.5 tolerance)
 * Products failing either condition are excluded from the blended score.
 * Returns null blendedEpeScore when no valid products exist.
 */
export function computeBlended(inputs: EpeProductInput[]): EpeBlendedResult {
  const valid = inputs.filter(
    (i) =>
      i.volume > 0 &&
      discountTiersValid(
        i.fullPricePct,
        i.emailExchangePct,
        i.promotionalPct,
        i.markdownPct
      )
  );

  if (valid.length === 0) {
    return { products: [], blendedEpeScore: null };
  }

  const products = valid.map(computeProduct);
  const totalVolume = valid.reduce((s, i) => s + i.volume, 0);
  const blendedEpeScore =
    totalVolume === 0
      ? null
      : valid.reduce((s, i, idx) => s + (i.volume / totalVolume) * products[idx].epeScore, 0);

  return { products, blendedEpeScore };
}
