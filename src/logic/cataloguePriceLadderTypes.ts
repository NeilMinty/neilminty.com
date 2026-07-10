export interface PriceTier {
  min: number;
  max: number;
}

export interface PriceLadder {
  entry:   PriceTier | null;
  core:    PriceTier | null;
  premium: PriceTier | null;
}

export interface CategoryPriceRow {
  type:   string;
  count:  number;
  min:    number;
  median: number;
  max:    number;
}

export interface DiscountIntensity {
  pctDiscounted:    number;
  avgDiscountDepth: number;
}

export interface NewArrivals {
  last30: number;
  last60: number;
  last90: number;
}

export interface BriefSection {
  title: string;
  body:  string;
}

export interface CatalogueResult {
  storeDomain:         string;
  productCount:        number;
  medianPrice:         number;
  priceLadder:         PriceLadder;
  categoryPriceLadder: CategoryPriceRow[];
  discountIntensity:   DiscountIntensity;
  newArrivals:         NewArrivals;
  sizeRange:           string[] | null;
  topTags:             Array<{ tag: string; count: number }>;
  avgVariants:         number;
  brief:               BriefSection[];
}

// ─── COMPARISON ───────────────────────────────────────────────────────────────

export interface CategoryOverlapRow {
  type:   string;
  onlyIn: 'a' | 'b' | null;
  a:      { count: number; min: number; median: number; max: number } | null;
  b:      { count: number; min: number; median: number; max: number } | null;
}

export interface ComparisonDeltas {
  medianPriceGapAbs:    number;
  medianPriceGapPct:    number;
  discountRateGap:      number;
  discountDepthGap:     number;
  variantComplexityGap: number;
  tierWidthRatioA:      number;
  tierWidthRatioB:      number;
  sharedCategories:     string[];
  uniqueToA:            string[];
  uniqueToB:            string[];
}

export interface ComparisonResult {
  domainA:            string;
  domainB:            string;
  dataA:              CatalogueResult;
  dataB:              CatalogueResult;
  deltas:             ComparisonDeltas;
  mergedCategoryGrid: CategoryOverlapRow[];
  brief:              BriefSection[];
}
