export interface PriceTier {
  min: number;
  max: number;
}

export interface PriceLadder {
  entry:   PriceTier | null;
  core:    PriceTier | null;
  premium: PriceTier | null;
}

export interface BriefSection {
  title: string;
  body:  string;
}

export interface CatalogueResult {
  storeDomain:  string;
  productCount: number;
  priceLadder:  PriceLadder;
  brief:        BriefSection[];
}
