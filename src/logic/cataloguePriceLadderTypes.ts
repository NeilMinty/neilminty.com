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
  priceLadder:         PriceLadder;
  categoryPriceLadder: CategoryPriceRow[];
  discountIntensity:   DiscountIntensity;
  newArrivals:         NewArrivals;
  sizeRange:           string[] | null;
  topTags:             Array<{ tag: string; count: number }>;
  brief:               BriefSection[];
}
