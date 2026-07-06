import type {
  BucketKey,
  VelocityMode,
  RawRow,
  ProcessedSKU,
  BucketSummary,
  MatrixSummary,
  ParseResult,
  MatrixResult,
} from './marginVelocityTypes';

export function findColumn(fields: string[], patterns: string[]): string | undefined {
  return fields.find((f) => patterns.some((p) => f.toLowerCase().includes(p)));
}

export function parseCSV(raw: Record<string, string>[]): ParseResult {
  if (raw.length === 0) return { rows: [], error: 'File is empty.' };

  const fields = Object.keys(raw[0]);

  const skuCol = findColumn(fields, ['sku', 'product', 'name', 'title']);
  const unitsCol = findColumn(fields, ['unit', 'qty', 'quantity', 'sold']);
  const revenueCol = findColumn(fields, ['revenue', 'sales', 'turnover']);
  const costCol = findColumn(fields, ['cost', 'cogs', 'landed']);

  if (!skuCol || !unitsCol || !revenueCol || !costCol) {
    const found = fields.join(', ');
    return {
      rows: [],
      error: `Could not map columns. Found: ${found}. Need: SKU, Units, Revenue, Cost.`,
    };
  }

  const parseNum = (v: string): number => {
    const cleaned = v.replace(/[£$€,\s]/g, '');
    return parseFloat(cleaned);
  };

  const rows: RawRow[] = [];
  for (const r of raw) {
    const sku = r[skuCol]?.trim() ?? '';
    const units = parseNum(r[unitsCol] ?? '');
    const revenue = parseNum(r[revenueCol] ?? '');
    const cost = parseNum(r[costCol] ?? '');

    if (!sku) continue;
    if (!(units > 0)) continue;
    if (!(revenue > 0)) continue;

    rows.push({ sku, units, revenue, cost: isNaN(cost) ? 0 : cost });
  }

  if (rows.length === 0) {
    return { rows: [], error: 'No usable rows found after filtering. Check that Units and Revenue columns contain positive numbers.' };
  }

  return { rows, error: null };
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function processRows(rows: RawRow[], weeks: number, mode: VelocityMode): MatrixResult {
  const clampedWeeks = Math.max(0.1, weeks);

  const withMargin = rows.map((r) => ({
    ...r,
    margin: r.revenue > 0 ? ((r.revenue - r.cost) / r.revenue) * 100 : 0,
    velocityUnits: r.units / clampedWeeks,
    velocityRevenue: r.revenue / clampedWeeks,
  }));

  const meanMargin =
    withMargin.length > 0
      ? withMargin.reduce((sum, r) => sum + r.margin, 0) / withMargin.length
      : 0;

  const velocities = withMargin.map((r) =>
    mode === 'units' ? r.velocityUnits : r.velocityRevenue
  );
  const medianVel = median(velocities);

  const plotted: ProcessedSKU[] = withMargin.map((r, i) => {
    const velocity = mode === 'units' ? r.velocityUnits : r.velocityRevenue;
    const deviation = r.margin - meanMargin;

    let bucket: BucketKey;
    if (deviation >= 0 && velocity >= medianVel) bucket = 'scale';
    else if (deviation >= 0 && velocity < medianVel) bucket = 'hold';
    else if (deviation < 0 && velocity >= medianVel) bucket = 'fix';
    else bucket = 'kill';

    return {
      ...r,
      id: i,
      margin: r.margin,
      deviation,
      velocityUnits: r.velocityUnits,
      velocityRevenue: r.velocityRevenue,
      velocity,
      bucket,
    };
  });

  const emptyBucket = (): BucketSummary => ({ count: 0, revenue: 0, cost: 0 });
  const summary: MatrixSummary = {
    scale: emptyBucket(),
    hold: emptyBucket(),
    fix: emptyBucket(),
    kill: emptyBucket(),
  };

  for (const s of plotted) {
    const b = summary[s.bucket];
    b.count += 1;
    b.revenue += s.revenue;
    b.cost += s.cost;
  }

  const maxVel = plotted.length > 0 ? Math.max(...plotted.map((s) => s.velocity)) : 1;
  const maxAbsDev =
    plotted.length > 0 ? Math.max(...plotted.map((s) => Math.abs(s.deviation))) : 1;

  return {
    plotted,
    medianVel,
    meanMargin,
    summary,
    xMax: maxVel * 1.18,
    yAbsMax: maxAbsDev * 1.35 + 0.001,
  };
}

export function generateTemplateCSV(): string {
  return [
    'SKU,Units Sold,Revenue,Cost',
    'SKU-001,120,2400,1200',
    'SKU-002,45,900,630',
  ].join('\n');
}

export function exportResultsCSV(rows: ProcessedSKU[], mode: VelocityMode): string {
  const velLabel = mode === 'units' ? 'Units / week' : 'Revenue / week';
  const header = `SKU,Margin %,vs Mean (pp),${velLabel},Bucket`;
  const lines = rows.map((r) =>
    [
      r.sku,
      r.margin.toFixed(1),
      r.deviation.toFixed(1),
      r.velocity.toFixed(2),
      r.bucket,
    ].join(',')
  );
  return [header, ...lines].join('\n');
}
