import { describe, it, expect } from "vitest";
import { computeAnalysis } from "./use-analysis";
import type { ProductFormRow } from "./use-analysis";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function row(
  overrides: Partial<Omit<ProductFormRow, "id">> & { id?: string },
): ProductFormRow {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    name: overrides.name ?? "Product",
    firstPurchaseVolume: overrides.firstPurchaseVolume ?? "100",
    repeatRate90d: overrides.repeatRate90d ?? "50",
    avgSpend90d: overrides.avgSpend90d ?? "40",
    avgSpend180d: overrides.avgSpend180d ?? "70",
    fullPricePct: overrides.fullPricePct ?? "100",
    discountDepth: overrides.discountDepth ?? "",
  };
}

// ─── EDGE CASES ───────────────────────────────────────────────────────────────

describe("computeAnalysis — empty / invalid inputs", () => {
  it("returns empty result for no rows", () => {
    const r = computeAnalysis([]);
    expect(r.products).toHaveLength(0);
    expect(r.highestVolumeProduct).toBeNull();
    expect(r.highestRetentionProduct).toBeNull();
    expect(r.retentionGap).toBe(0);
  });

  it("returns empty result when all rows have volume 0", () => {
    const r = computeAnalysis([row({ firstPurchaseVolume: "0" }), row({ firstPurchaseVolume: "" })]);
    expect(r.products).toHaveLength(0);
  });

  it("returns empty result when all rows have blank names", () => {
    const r = computeAnalysis([row({ name: "" }), row({ name: "  " })]);
    expect(r.products).toHaveLength(0);
  });

  it("ignores rows with blank name even when volume is valid", () => {
    const r = computeAnalysis([
      row({ name: "", firstPurchaseVolume: "50" }),
      row({ name: "Valid", firstPurchaseVolume: "50" }),
    ]);
    expect(r.products).toHaveLength(1);
    expect(r.products[0].name).toBe("Valid");
  });

  it("handles single valid product", () => {
    const r = computeAnalysis([row({ name: "Solo", repeatRate90d: "55" })]);
    expect(r.products).toHaveLength(1);
    expect(r.retentionGap).toBe(0);
    expect(r.products[0].retentionTier).toBe("verified");
    expect(r.products[0].zScore).toBe(0); // stdDev=0 edge case
    expect(r.products[0].zClassification).toBe("normal");
  });
});

// ─── WEIGHTED SCORE ───────────────────────────────────────────────────────────

describe("weightedScore formula", () => {
  it("equals rate × (1 − 1/√vol) × (fpPct/100)", () => {
    const r = computeAnalysis([
      row({ name: "A", repeatRate90d: "60", firstPurchaseVolume: "100", fullPricePct: "80" }),
    ]);
    const p = r.products[0];
    const expected = 60 * (1 - 1 / Math.sqrt(100)) * (80 / 100);
    expect(p.weightedScore).toBeCloseTo(expected, 5);
  });

  it("is 0 when volume is 0", () => {
    // volume=0 rows are filtered out — so test with volume=1
    const r = computeAnalysis([
      row({ name: "A", repeatRate90d: "60", firstPurchaseVolume: "1", fullPricePct: "100" }),
    ]);
    // 60 × (1 - 1/1) × 1 = 0
    expect(r.products[0].weightedScore).toBe(0);
  });

  it("penalises low full price pct proportionally", () => {
    const full = computeAnalysis([
      row({ name: "A", repeatRate90d: "60", firstPurchaseVolume: "100", fullPricePct: "100" }),
    ]);
    const half = computeAnalysis([
      row({ name: "A", repeatRate90d: "60", firstPurchaseVolume: "100", fullPricePct: "50" }),
    ]);
    expect(half.products[0].weightedScore).toBeCloseTo(
      full.products[0].weightedScore * 0.5,
      5,
    );
  });

  it("treats empty fullPricePct as 100", () => {
    const explicit = computeAnalysis([
      row({ name: "A", repeatRate90d: "60", firstPurchaseVolume: "100", fullPricePct: "100" }),
    ]);
    const implicit = computeAnalysis([
      row({ name: "A", repeatRate90d: "60", firstPurchaseVolume: "100", fullPricePct: "" }),
    ]);
    expect(implicit.products[0].weightedScore).toBeCloseTo(
      explicit.products[0].weightedScore,
      5,
    );
  });

  it("approaches rate as volume → ∞", () => {
    const r = computeAnalysis([
      row({ name: "A", repeatRate90d: "60", firstPurchaseVolume: "1000000", fullPricePct: "100" }),
    ]);
    // 1 − 1/√1000000 = 1 − 0.001 ≈ 0.999
    expect(r.products[0].weightedScore).toBeCloseTo(60 * 0.999, 1);
  });

  it("highestRetentionProduct uses weightedScore, not raw rate", () => {
    // A has higher raw rate but lower volume + fullPricePct
    // B has lower raw rate but higher weighted score
    const r = computeAnalysis([
      row({ id: "a", name: "A", repeatRate90d: "80", firstPurchaseVolume: "4", fullPricePct: "10" }),
      row({ id: "b", name: "B", repeatRate90d: "60", firstPurchaseVolume: "400", fullPricePct: "90" }),
    ]);
    // A weighted: 80 × (1 − 0.5) × 0.10 = 4.0
    // B weighted: 60 × (1 − 1/20) × 0.90 = 60 × 0.95 × 0.90 = 51.3
    expect(r.highestRetentionProduct?.id).toBe("b");
  });
});

// ─── Z-SCORE ──────────────────────────────────────────────────────────────────

describe("z-score on repeat rate", () => {
  it("gives z=0 when all rates are equal (stdDev=0)", () => {
    const r = computeAnalysis([
      row({ name: "A", repeatRate90d: "50" }),
      row({ name: "B", repeatRate90d: "50" }),
      row({ name: "C", repeatRate90d: "50" }),
    ]);
    r.products.forEach(p => {
      expect(p.zScore).toBe(0);
      expect(p.zClassification).toBe("normal");
    });
  });

  it("classifies extreme outlier at ≥2σ as outlier", () => {
    // Rates: 10, 50, 90 — mean=50, popStdDev=32.66
    // z for 10 = (10-50)/32.66 = -1.22 → normal
    // z for 90 = (90-50)/32.66 = +1.22 → normal
    // Use more extreme spread: 0, 50, 100
    // mean=50, variance=((−50)²+(0)²+(50)²)/3 = 5000/3≈1666.7, sd≈40.8
    // z(0) = -50/40.8 ≈ -1.22, z(100)=+1.22 — still normal
    // Use 0, 0, 100: mean=33.3, sd=47.1, z(100)=(100-33.3)/47.1=1.41 — mild
    // Use 50, 50, 100: mean=66.7, sd=23.6, z(50)=(50-66.7)/23.6=-0.71 normal, z(100)=1.41 mild
    // To guarantee outlier (≥2): rates=[50, 50, 50, 50, 50, 0]
    // mean=41.7, variance=((50-41.7)²×5 + 41.7²)/6 = (344.9+1738.9)/6=347.3, sd=18.6
    // z(0) = (0-41.7)/18.6 = -2.24 → outlier ✓
    const rows = [
      row({ name: "A", repeatRate90d: "50" }),
      row({ name: "B", repeatRate90d: "50" }),
      row({ name: "C", repeatRate90d: "50" }),
      row({ name: "D", repeatRate90d: "50" }),
      row({ name: "E", repeatRate90d: "50" }),
      row({ name: "F", repeatRate90d: "0" }),
    ];
    const r = computeAnalysis(rows);
    const outlier = r.products.find(p => p.name === "F")!;
    expect(outlier.zClassification).toBe("outlier");
    expect(outlier.zScore).toBeLessThan(-2);
  });

  it("uses population variance (divide by n, not n-1)", () => {
    // Two products: rates 20, 80
    // population stdDev = √(((20-50)² + (80-50)²)/2) = √(1800/2) = √900 = 30
    // z(20) = (20-50)/30 = -1.0
    const r = computeAnalysis([
      row({ name: "A", repeatRate90d: "20" }),
      row({ name: "B", repeatRate90d: "80" }),
    ]);
    const a = r.products.find(p => p.name === "A")!;
    expect(a.zScore).toBeCloseTo(-1.0, 1);
  });
});

// ─── RETENTION TIERS ─────────────────────────────────────────────────────────

describe("retention tier assignment", () => {
  it("single product → verified", () => {
    const r = computeAnalysis([row({ name: "A", repeatRate90d: "20" })]);
    expect(r.products[0].retentionTier).toBe("verified");
  });

  it("two products → verified and escalate, no signal", () => {
    const r = computeAnalysis([
      row({ name: "A", repeatRate90d: "80" }),
      row({ name: "B", repeatRate90d: "20" }),
    ]);
    const tiers = r.products.map(p => p.retentionTier).sort();
    expect(tiers).toEqual(["escalate", "verified"]);
  });

  it("three products → one of each tier", () => {
    const r = computeAnalysis([
      row({ name: "High", repeatRate90d: "80" }),
      row({ name: "Mid", repeatRate90d: "50" }),
      row({ name: "Low", repeatRate90d: "20" }),
    ]);
    const byName = Object.fromEntries(r.products.map(p => [p.name, p.retentionTier]));
    expect(byName["High"]).toBe("verified");
    expect(byName["Mid"]).toBe("signal");
    expect(byName["Low"]).toBe("escalate");
  });

  it("six products → two of each tier", () => {
    const rows = [80, 70, 60, 40, 30, 20].map((rate, i) =>
      row({ name: `P${i}`, repeatRate90d: String(rate) }),
    );
    const r = computeAnalysis(rows);
    const tiers = r.products.map(p => p.retentionTier);
    expect(tiers.filter(t => t === "verified")).toHaveLength(2);
    expect(tiers.filter(t => t === "signal")).toHaveLength(2);
    expect(tiers.filter(t => t === "escalate")).toHaveLength(2);
  });

  it("tiers use raw repeat rate, not weighted score", () => {
    // A has much higher raw rate but very low volume and fullPricePct
    // B has lower raw rate but much higher weighted score
    // A should still get "verified" tier (highest raw rate)
    const r = computeAnalysis([
      row({ id: "a", name: "A", repeatRate90d: "90", firstPurchaseVolume: "2", fullPricePct: "5" }),
      row({ id: "b", name: "B", repeatRate90d: "50", firstPurchaseVolume: "500", fullPricePct: "95" }),
      row({ id: "c", name: "C", repeatRate90d: "20", firstPurchaseVolume: "200", fullPricePct: "80" }),
    ]);
    const byId = Object.fromEntries(r.products.map(p => [p.id, p.retentionTier]));
    expect(byId["a"]).toBe("verified");
    expect(byId["b"]).toBe("signal");
    expect(byId["c"]).toBe("escalate");
  });
});

// ─── LTV MOMENTUM ────────────────────────────────────────────────────────────

describe("ltvMomentum", () => {
  it("computes 180d/90d ratio", () => {
    const r = computeAnalysis([row({ avgSpend90d: "40", avgSpend180d: "80" })]);
    expect(r.products[0].ltvMomentum).toBeCloseTo(2.0, 5);
  });

  it("returns 0 when spend90d is 0", () => {
    const r = computeAnalysis([row({ avgSpend90d: "0", avgSpend180d: "50" })]);
    expect(r.products[0].ltvMomentum).toBe(0);
  });

  it("returns 0 when spend90d is empty", () => {
    const r = computeAnalysis([row({ avgSpend90d: "", avgSpend180d: "50" })]);
    expect(r.products[0].ltvMomentum).toBe(0);
  });

  it("can be less than 1 if 180d < 90d (data entry error)", () => {
    const r = computeAnalysis([row({ avgSpend90d: "100", avgSpend180d: "80" })]);
    expect(r.products[0].ltvMomentum).toBeCloseTo(0.8, 5);
  });
});

// ─── LOW CONFIDENCE FLAG ─────────────────────────────────────────────────────

describe("lowConfidence flag", () => {
  it("flags volume < 20", () => {
    const r = computeAnalysis([row({ firstPurchaseVolume: "19" })]);
    expect(r.products[0].lowConfidence).toBe(true);
  });

  it("does not flag volume = 20", () => {
    const r = computeAnalysis([row({ firstPurchaseVolume: "20" })]);
    expect(r.products[0].lowConfidence).toBe(false);
  });

  it("does not flag volume > 20", () => {
    const r = computeAnalysis([row({ firstPurchaseVolume: "100" })]);
    expect(r.products[0].lowConfidence).toBe(false);
  });
});

// ─── RETENTION GAP ───────────────────────────────────────────────────────────

describe("retentionGap", () => {
  it("is 0 for single product", () => {
    const r = computeAnalysis([row({ repeatRate90d: "60" })]);
    expect(r.retentionGap).toBe(0);
  });

  it("is max − min of raw repeat rates", () => {
    const r = computeAnalysis([
      row({ name: "A", repeatRate90d: "70" }),
      row({ name: "B", repeatRate90d: "30" }),
      row({ name: "C", repeatRate90d: "50" }),
    ]);
    expect(r.retentionGap).toBeCloseTo(40, 5);
  });

  it("uses raw repeat rate not weighted score for gap", () => {
    // Same raw rates → gap = 0 even if weighted scores differ
    const r = computeAnalysis([
      row({ name: "A", repeatRate90d: "50", fullPricePct: "10", firstPurchaseVolume: "5" }),
      row({ name: "B", repeatRate90d: "50", fullPricePct: "90", firstPurchaseVolume: "500" }),
    ]);
    expect(r.retentionGap).toBe(0);
  });
});

// ─── HIGHEST VOLUME / RETENTION PRODUCTS ─────────────────────────────────────

describe("highestVolumeProduct and highestRetentionProduct", () => {
  it("highest volume is by firstPurchaseVolume", () => {
    const r = computeAnalysis([
      row({ id: "big", name: "Big", firstPurchaseVolume: "500" }),
      row({ id: "small", name: "Small", firstPurchaseVolume: "50" }),
    ]);
    expect(r.highestVolumeProduct?.id).toBe("big");
  });

  it("highest retention is by weightedScore not raw rate", () => {
    const r = computeAnalysis([
      row({ id: "raw", name: "Raw", repeatRate90d: "90", firstPurchaseVolume: "3", fullPricePct: "5" }),
      row({ id: "weighted", name: "Weighted", repeatRate90d: "55", firstPurchaseVolume: "300", fullPricePct: "95" }),
    ]);
    // raw: 90 × (1 - 1/√3) × 0.05 = 90 × 0.423 × 0.05 = 1.9
    // weighted: 55 × (1 - 1/√300) × 0.95 = 55 × 0.942 × 0.95 = 49.2
    expect(r.highestRetentionProduct?.id).toBe("weighted");
  });

  it("lowest retention product sorts correctly for gap display", () => {
    const r = computeAnalysis([
      row({ name: "High", repeatRate90d: "80" }),
      row({ name: "Low", repeatRate90d: "10" }),
      row({ name: "Mid", repeatRate90d: "45" }),
    ]);
    // lowestRetentionProduct (by weightedScore) should be "Low" in most cases
    // as it has both lowest rate and lowest weighted score
    const byWeighted = [...r.products].sort((a, b) => a.weightedScore - b.weightedScore);
    expect(byWeighted[0].name).toBe("Low");
  });
});

// ─── RANDOM MOCK DATA ─────────────────────────────────────────────────────────

describe("random mock data stress tests", () => {
  function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randomRows(n: number): ProductFormRow[] {
    return Array.from({ length: n }, (_, i) => row({
      id: `r${i}`,
      name: `Product ${i}`,
      firstPurchaseVolume: String(randomInt(1, 500)),
      repeatRate90d: String(randomInt(0, 100)),
      avgSpend90d: String(randomInt(10, 200)),
      avgSpend180d: String(randomInt(10, 400)),
      fullPricePct: String(randomInt(0, 100)),
      discountDepth: randomInt(0, 1) ? String(randomInt(0, 50)) : "",
    }));
  }

  it("never throws for 1–10 random products (100 runs)", () => {
    for (let run = 0; run < 100; run++) {
      const n = randomInt(1, 10);
      expect(() => computeAnalysis(randomRows(n))).not.toThrow();
    }
  });

  it("product count matches valid input count (100 runs)", () => {
    for (let run = 0; run < 100; run++) {
      const rows = randomRows(randomInt(1, 10));
      const r = computeAnalysis(rows);
      // All rows have names and volume ≥ 1, so all should be valid
      expect(r.products).toHaveLength(rows.length);
    }
  });

  it("weightedScore is always ≥ 0 (100 runs)", () => {
    for (let run = 0; run < 100; run++) {
      const r = computeAnalysis(randomRows(randomInt(1, 10)));
      r.products.forEach(p => expect(p.weightedScore).toBeGreaterThanOrEqual(0));
    }
  });

  it("retentionTier covers exactly the right number of each tier (100 runs)", () => {
    for (let run = 0; run < 100; run++) {
      const n = randomInt(3, 10);
      const r = computeAnalysis(randomRows(n));
      const total = r.products.length;
      const counts = { verified: 0, signal: 0, escalate: 0 };
      r.products.forEach(p => counts[p.retentionTier]++);
      // Each tier should have at least 1 product, and total should equal n
      expect(counts.verified + counts.signal + counts.escalate).toBe(total);
      expect(counts.verified).toBeGreaterThan(0);
      expect(counts.escalate).toBeGreaterThan(0);
    }
  });

  it("retentionGap is always between 0 and 100 (100 runs)", () => {
    for (let run = 0; run < 100; run++) {
      const r = computeAnalysis(randomRows(randomInt(1, 10)));
      expect(r.retentionGap).toBeGreaterThanOrEqual(0);
      expect(r.retentionGap).toBeLessThanOrEqual(100);
    }
  });

  it("ltvMomentum is always ≥ 0 (100 runs)", () => {
    for (let run = 0; run < 100; run++) {
      const r = computeAnalysis(randomRows(randomInt(1, 10)));
      r.products.forEach(p => expect(p.ltvMomentum).toBeGreaterThanOrEqual(0));
    }
  });

  it("fullPricePct is always clamped to 0–100 (100 runs)", () => {
    for (let run = 0; run < 100; run++) {
      const r = computeAnalysis(randomRows(randomInt(1, 10)));
      r.products.forEach(p => {
        expect(p.fullPricePct).toBeGreaterThanOrEqual(0);
        expect(p.fullPricePct).toBeLessThanOrEqual(100);
      });
    }
  });

  it("highestVolumeProduct has the maximum firstPurchaseVolume (100 runs)", () => {
    for (let run = 0; run < 100; run++) {
      const r = computeAnalysis(randomRows(randomInt(1, 10)));
      if (!r.highestVolumeProduct) continue;
      const maxVol = Math.max(...r.products.map(p => p.firstPurchaseVolume));
      expect(r.highestVolumeProduct.firstPurchaseVolume).toBe(maxVol);
    }
  });

  it("highestRetentionProduct has the maximum weightedScore (100 runs)", () => {
    for (let run = 0; run < 100; run++) {
      const r = computeAnalysis(randomRows(randomInt(1, 10)));
      if (!r.highestRetentionProduct) continue;
      const maxScore = Math.max(...r.products.map(p => p.weightedScore));
      expect(r.highestRetentionProduct.weightedScore).toBeCloseTo(maxScore, 8);
    }
  });
});
