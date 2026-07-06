import { describe, it, expect } from 'vitest';
import { parseCSV, median, processRows } from './marginVelocityLogic';
import type { RawRow } from './marginVelocityTypes';

// ─── parseCSV ─────────────────────────────────────────────────────────────────

describe('parseCSV', () => {
  it('maps standard headers to RawRow[]', () => {
    const raw = [
      { SKU: 'A', 'Units Sold': '100', Revenue: '2000', Cost: '1000' },
      { SKU: 'B', 'Units Sold': '50', Revenue: '1000', Cost: '600' },
    ];
    const result = parseCSV(raw);
    expect(result.error).toBeNull();
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({ sku: 'A', units: 100, revenue: 2000, cost: 1000 });
    expect(result.rows[1]).toMatchObject({ sku: 'B', units: 50, revenue: 1000, cost: 600 });
  });

  it('returns a non-null error string when headers cannot be matched', () => {
    const raw = [{ foo: 'bar', baz: '1' }];
    const result = parseCSV(raw);
    expect(result.error).not.toBeNull();
    expect(result.rows).toHaveLength(0);
  });

  it('filters out rows with zero units', () => {
    const raw = [
      { SKU: 'A', 'Units Sold': '0', Revenue: '500', Cost: '200' },
      { SKU: 'B', 'Units Sold': '10', Revenue: '500', Cost: '200' },
    ];
    const result = parseCSV(raw);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].sku).toBe('B');
  });

  it('filters out rows with negative units', () => {
    const raw = [
      { SKU: 'A', 'Units Sold': '-5', Revenue: '500', Cost: '200' },
      { SKU: 'B', 'Units Sold': '5', Revenue: '500', Cost: '200' },
    ];
    const result = parseCSV(raw);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].sku).toBe('B');
  });

  it('strips currency symbols from revenue and cost', () => {
    const raw = [
      { SKU: 'A', 'Units Sold': '10', Revenue: '£1,200.00', Cost: '$600.00' },
    ];
    const result = parseCSV(raw);
    expect(result.error).toBeNull();
    expect(result.rows[0].revenue).toBeCloseTo(1200);
    expect(result.rows[0].cost).toBeCloseTo(600);
  });
});

// ─── median ───────────────────────────────────────────────────────────────────

describe('median', () => {
  it('returns the middle value for an odd-length array', () => {
    expect(median([3, 1, 4, 1, 5])).toBe(3);
  });

  it('returns the mean of the two middle values for an even-length array', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it('returns the single element for a one-element array', () => {
    expect(median([7])).toBe(7);
  });
});

// ─── processRows ──────────────────────────────────────────────────────────────

// Four SKUs over 4 weeks:
// A: revenue=1000, cost=400  → margin=60%, velocityUnits=25
// B: revenue=1000, cost=700  → margin=30%, velocityUnits=5
// C: revenue=2000, cost=800  → margin=60%, velocityUnits=50
// D: revenue=2000, cost=1600 → margin=20%, velocityUnits=10
// meanMargin = (60+30+60+20)/4 = 42.5%
// velocities (units): [25, 5, 50, 10], median = (10+25)/2 = 17.5
// A: dev=+17.5, vel=25 ≥ 17.5 → scale
// B: dev=-12.5, vel=5  < 17.5 → kill
// C: dev=+17.5, vel=50 ≥ 17.5 → scale
// D: dev=-22.5, vel=10 < 17.5 → kill

const BASE_ROWS: RawRow[] = [
  { sku: 'A', units: 100, revenue: 1000, cost: 400 },
  { sku: 'B', units: 20,  revenue: 1000, cost: 700 },
  { sku: 'C', units: 200, revenue: 2000, cost: 800 },
  { sku: 'D', units: 40,  revenue: 2000, cost: 1600 },
];

describe('processRows', () => {
  it('computes the correct meanMargin', () => {
    const r = processRows(BASE_ROWS, 4, 'units');
    expect(r.meanMargin).toBeCloseTo(42.5);
  });

  it('deviations sum to approximately zero across the catalogue', () => {
    const r = processRows(BASE_ROWS, 4, 'units');
    const deviationSum = r.plotted.reduce((sum, s) => sum + s.deviation, 0);
    expect(deviationSum).toBeCloseTo(0);
  });

  it('assigns scale to a SKU with above-mean margin and above-median velocity', () => {
    const r = processRows(BASE_ROWS, 4, 'units');
    const a = r.plotted.find((s) => s.sku === 'A')!;
    expect(a.deviation).toBeGreaterThan(0);
    expect(a.velocity).toBeGreaterThanOrEqual(r.medianVel);
    expect(a.bucket).toBe('scale');
  });

  it('assigns fix to a SKU with below-mean margin and above-median velocity', () => {
    // Need a SKU with low margin but high velocity — swap D to high velocity
    const rows: RawRow[] = [
      { sku: 'A', units: 100, revenue: 1000, cost: 400 },  // margin 60%, vel 25
      { sku: 'B', units: 20,  revenue: 1000, cost: 700 },  // margin 30%, vel 5
      { sku: 'C', units: 200, revenue: 2000, cost: 800 },  // margin 60%, vel 50
      { sku: 'D', units: 300, revenue: 2000, cost: 1600 }, // margin 20%, vel 75 — fix
    ];
    // velocities: [25, 5, 50, 75], median = (25+50)/2 = 37.5
    // D: dev=-22.5, vel=75 ≥ 37.5 → fix
    const r = processRows(rows, 4, 'units');
    const d = r.plotted.find((s) => s.sku === 'D')!;
    expect(d.deviation).toBeLessThan(0);
    expect(d.velocity).toBeGreaterThanOrEqual(r.medianVel);
    expect(d.bucket).toBe('fix');
  });

  it('xMax is greater than the maximum velocity', () => {
    const r = processRows(BASE_ROWS, 4, 'units');
    const maxVel = Math.max(...r.plotted.map((s) => s.velocity));
    expect(r.xMax).toBeGreaterThan(maxVel);
  });

  it('yAbsMax is greater than the maximum absolute deviation', () => {
    const r = processRows(BASE_ROWS, 4, 'units');
    const maxAbsDev = Math.max(...r.plotted.map((s) => Math.abs(s.deviation)));
    expect(r.yAbsMax).toBeGreaterThan(maxAbsDev);
  });
});
