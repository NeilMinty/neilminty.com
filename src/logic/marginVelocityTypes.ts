export type BucketKey = 'scale' | 'hold' | 'fix' | 'kill';

export type VelocityMode = 'units' | 'revenue';

export interface RawRow {
  sku: string;
  units: number;
  revenue: number;
  cost: number;
}

export interface ProcessedSKU extends RawRow {
  id: number;
  margin: number;
  deviation: number;
  velocityUnits: number;
  velocityRevenue: number;
  velocity: number;
  bucket: BucketKey;
}

export interface BucketSummary {
  count: number;
  revenue: number;
  cost: number;
}

export type MatrixSummary = Record<BucketKey, BucketSummary>;

export interface ParseResult {
  rows: RawRow[];
  error: string | null;
}

export interface MatrixResult {
  plotted: ProcessedSKU[];
  medianVel: number;
  meanMargin: number;
  summary: MatrixSummary;
  xMax: number;
  yAbsMax: number;
}
