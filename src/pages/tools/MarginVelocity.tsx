import { useState, useMemo, useRef } from 'react';
import Papa from 'papaparse';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
} from 'recharts';
import { ToolLayout } from '@/components/ToolLayout';
import { parseCSV, processRows, generateTemplateCSV, exportResultsCSV } from '@/logic/marginVelocityLogic';
import type { RawRow, ProcessedSKU, BucketKey, VelocityMode } from '@/logic/marginVelocityTypes';
import { formatCurrency } from '@/lib/utils';

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────

const BUCKET_COLORS: Record<BucketKey, string> = {
  scale: '#3B6D11',
  hold:  '#185FA5',
  fix:   '#BA7517',
  kill:  '#A32D2D',
};

const BUCKET_LABELS: Record<BucketKey, string> = {
  scale: 'Scale',
  hold:  'Hold',
  fix:   'Fix',
  kill:  'Kill',
};

const BUCKET_COPY: Record<BucketKey, string> = {
  scale: 'Above-average margin, high velocity. Put resource behind these.',
  hold:  'Above-average margin, slower mover. Protect your quiet earners.',
  fix:   'High velocity but below-average margin. The traffic is the asset — bundle with a higher-margin SKU or use as a cross-sell entry point.',
  kill:  'Below-average margin and slow. This is where margin goes to hide.',
};

const BUCKET_ORDER: Record<BucketKey, number> = { scale: 0, hold: 1, fix: 2, kill: 3 };
const BUCKET_KEYS: BucketKey[] = ['scale', 'hold', 'fix', 'kill'];

// ─── SAMPLE DATA ──────────────────────────────────────────────────────────────
// 16 fashion/apparel SKUs. At weeks=4, units mode:
// meanMargin ≈ 43.75%, medianVel = 27.5 units/wk → clean quadrant distribution.

const SAMPLE_ROWS: RawRow[] = [
  // Scale — margin ≥ 65%, velocity ≥ 45 u/wk
  { sku: 'COAT-001', units: 240, revenue: 14400, cost:  4320 },
  { sku: 'KNIT-002', units: 180, revenue:  9000, cost:  2700 },
  { sku: 'DNMS-003', units: 320, revenue:  6400, cost:  1920 },
  { sku: 'BLZE-004', units: 200, revenue: 12000, cost:  4200 },
  // Hold — margin ≥ 65%, velocity ≤ 10 u/wk
  { sku: 'SKRT-005', units:  40, revenue:  3200, cost:  1120 },
  { sku: 'SCRF-006', units:  28, revenue:  2240, cost:   784 },
  { sku: 'TRSC-007', units:  20, revenue:  3000, cost:   900 },
  { sku: 'JKTS-008', units:  32, revenue:  4800, cost:  1680 },
  // Fix — margin ≈ 20%, velocity ≥ 60 u/wk
  { sku: 'SNKR-009', units: 400, revenue: 16000, cost: 12800 },
  { sku: 'BSCL-010', units: 280, revenue:  8400, cost:  6720 },
  { sku: 'LGNG-011', units: 360, revenue:  7200, cost:  5760 },
  { sku: 'TSRT-012', units: 240, revenue:  4800, cost:  3840 },
  // Kill — margin ≈ 20%, velocity ≤ 6 u/wk
  { sku: 'BLET-013', units:  24, revenue:   960, cost:   768 },
  { sku: 'GLVS-014', units:  16, revenue:   640, cost:   512 },
  { sku: 'CAPS-015', units:  20, revenue:   400, cost:   320 },
  { sku: 'PINS-016', units:  12, revenue:   240, cost:   192 },
];

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function BucketBadge({ bucket }: { bucket: BucketKey }) {
  const color = BUCKET_COLORS[bucket];
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-xs font-semibold"
      style={{ background: `${color}20`, color }}
    >
      {BUCKET_LABELS[bucket]}
    </span>
  );
}

function CustomDot(props: any) {
  const { cx, cy, size, payload } = props;
  if (cx == null || cy == null) return null;
  const d = payload as ProcessedSKU;
  const nearZero = Math.abs(d.deviation) <= 0.005;
  const color = BUCKET_COLORS[d.bucket];
  const r = Math.max(4, Math.sqrt((size ?? 120) / Math.PI));
  if (nearZero) {
    return (
      <circle cx={cx} cy={cy} r={r}
        fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="3 2" />
    );
  }
  return (
    <circle cx={cx} cy={cy} r={r}
      fill={color} fillOpacity={0.75} stroke="none" />
  );
}

function BucketCard({ bucket, count, revenue }: { bucket: BucketKey; count: number; revenue: number }) {
  const color = BUCKET_COLORS[bucket];
  return (
    <div className="rounded-lg p-4 border" style={{ borderColor: `${color}40`, background: `${color}0A` }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
        <span className="text-sm font-semibold" style={{ color }}>{BUCKET_LABELS[bucket]}</span>
      </div>
      <p className="text-2xl font-semibold text-slate-900 tabular-nums">{count}</p>
      <p className="text-xs text-slate-400">SKU{count !== 1 ? 's' : ''}</p>
      <p className="text-sm font-medium text-slate-700 mt-2">{formatCurrency(revenue)}</p>
      <p className="text-xs text-slate-400">total revenue</p>
      <p className="mt-3 text-xs text-slate-500 leading-relaxed">{BUCKET_COPY[bucket]}</p>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

type SortCol = 'sku' | 'margin' | 'deviation' | 'velocity' | 'bucket';

export function MarginVelocity() {
  const [rawRows, setRawRows]       = useState<RawRow[]>(SAMPLE_ROWS);
  const [weeks, setWeeks]           = useState<number>(4);
  const [mode, setMode]             = useState<VelocityMode>('units');
  const [error, setError]           = useState<string | null>(null);
  const [fileName, setFileName]     = useState<string | null>(null);
  const [showCaveat, setShowCaveat] = useState(true);
  const [sortCol, setSortCol]       = useState<SortCol | null>(null);
  const [sortDir, setSortDir]       = useState<'asc' | 'desc'>('desc');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const matrixResult = useMemo(
    () => processRows(rawRows, weeks, mode),
    [rawRows, weeks, mode],
  );

  const sortedRows = useMemo(() => {
    const rows = [...matrixResult.plotted];
    rows.sort((a, b) => {
      if (sortCol === null) {
        const bd = BUCKET_ORDER[a.bucket] - BUCKET_ORDER[b.bucket];
        return bd !== 0 ? bd : a.sku.localeCompare(b.sku);
      }
      let cmp = 0;
      if      (sortCol === 'sku')       cmp = a.sku.localeCompare(b.sku);
      else if (sortCol === 'margin')    cmp = a.margin - b.margin;
      else if (sortCol === 'deviation') cmp = a.deviation - b.deviation;
      else if (sortCol === 'velocity')  cmp = a.velocity - b.velocity;
      else if (sortCol === 'bucket')    cmp = BUCKET_ORDER[a.bucket] - BUCKET_ORDER[b.bucket];
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [matrixResult, sortCol, sortDir]);

  const handleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('desc'); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = parseCSV(results.data);
        if (parsed.error) {
          setError(parsed.error);
        } else {
          setRawRows(parsed.rows);
          setError(null);
        }
      },
    });
    e.target.value = '';
  };

  const handleTemplateDownload = () => {
    const blob = new Blob([generateTemplateCSV()], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'margin-velocity-template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    const blob = new Blob([exportResultsCSV(sortedRows, mode)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'margin-velocity-results.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const { plotted, medianVel, summary, xMax, yAbsMax } = matrixResult;
  const killCount = summary.kill.count;
  const killCost  = summary.kill.cost;
  const velLabel  = mode === 'units' ? 'Units / wk' : 'Rev / wk';

  const xTickFormatter = (v: number) =>
    mode === 'units'
      ? v.toFixed(0)
      : v >= 1000 ? `£${(v / 1000).toFixed(1)}k` : `£${v.toFixed(0)}`;

  const yTickFormatter = (v: number) => {
    const sign = v > 0 ? '+' : '';
    return `${sign}${v.toFixed(0)}`;
  };

  const tooltipContent = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    const d = payload[0].payload as ProcessedSKU;
    const nearZero = Math.abs(d.deviation) <= 0.005;
    const devSign = d.deviation > 0 ? '+' : '';
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-card p-3 text-xs space-y-1 min-w-[160px]">
        <p className="font-semibold text-slate-900 text-sm truncate">{d.sku}</p>
        <p className="text-slate-500">Margin <span className="font-medium text-slate-900">{d.margin.toFixed(1)}%</span></p>
        <p className="text-slate-500">vs Mean <span className="font-medium text-slate-900">{nearZero ? '≈' : devSign}{d.deviation.toFixed(1)}pp</span></p>
        <p className="text-slate-500">{velLabel} <span className="font-medium text-slate-900">{d.velocity.toFixed(1)}</span></p>
        <p className="text-slate-500">Revenue <span className="font-medium text-slate-900">{formatCurrency(d.revenue)}</span></p>
        {nearZero && (
          <p className="text-slate-400 pt-1 border-t border-slate-100 leading-relaxed">
            Velocity is the stronger signal for this SKU.
          </p>
        )}
        <div className="pt-0.5"><BucketBadge bucket={d.bucket} /></div>
      </div>
    );
  };

  const sortArrow = (col: SortCol) =>
    sortCol === col
      ? <span className="ml-1 text-slate-700">{sortDir === 'asc' ? '↑' : '↓'}</span>
      : <span className="ml-1 text-slate-300">↕</span>;

  const devCell = (dev: number) => {
    if (Math.abs(dev) <= 0.5) return <span className="text-slate-400">≈{dev.toFixed(1)}pp</span>;
    const sign = dev > 0 ? '+' : '';
    return <span className={dev > 0 ? 'text-green-700' : 'text-red-700'}>{sign}{dev.toFixed(1)}pp</span>;
  };

  return (
    <ToolLayout
      title="SKU Margin × Velocity Matrix"
      description="Plot every SKU by margin deviation and sales velocity. See where to invest, protect, fix, or cut."
      metaDescription="Map your SKU catalogue by margin and velocity. Identify which products to scale, which to protect, which to fix, and which to cut — no spreadsheet needed."
      wide
    >
      <div className="space-y-8">

        {/* Dismissable caveat */}
        {showCaveat && (
          <div className="flex items-start gap-3 border border-amber-200 bg-amber-50 rounded-lg px-4 py-3">
            <p className="flex-1 text-sm text-amber-800 leading-relaxed">
              <span className="font-semibold">Cost column note.</span>{' '}
              Your cost column drives everything. Supplier price, landed cost, and contribution margin
              all work — but pick one definition and apply it consistently across every SKU.
              Mixed definitions distort the output.
            </p>
            <button
              onClick={() => setShowCaveat(false)}
              className="text-amber-600 hover:text-amber-800 text-lg leading-none flex-shrink-0 mt-0.5"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}

        {/* Controls bar */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-slate-900 text-white px-4 py-2 rounded text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            Upload CSV
          </button>
          <button
            onClick={handleTemplateDownload}
            className="border border-slate-200 bg-white text-slate-700 px-4 py-2 rounded text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Download template
          </button>
          <button
            onClick={() => { setRawRows(SAMPLE_ROWS); setFileName(null); setError(null); }}
            className="border border-slate-200 bg-white text-slate-500 px-4 py-2 rounded text-sm hover:bg-slate-50 transition-colors"
          >
            Reset sample
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <label className="text-sm text-slate-500">Weeks</label>
            <input
              type="number"
              min={1}
              max={52}
              value={weeks}
              onChange={(e) => setWeeks(Math.max(1, Number(e.target.value) || 1))}
              className="border border-slate-200 rounded px-2 py-1.5 text-sm w-16 text-center outline-none focus:border-slate-400"
            />
          </div>

          <div className="flex rounded border border-slate-200 overflow-hidden text-sm">
            <button
              onClick={() => setMode('units')}
              className={`px-3 py-1.5 transition-colors ${mode === 'units' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              Units / wk
            </button>
            <button
              onClick={() => setMode('revenue')}
              className={`px-3 py-1.5 transition-colors border-l border-slate-200 ${mode === 'revenue' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              Revenue / wk
            </button>
          </div>
        </div>

        {/* Upload status bar — only shown when a file is loaded */}
        {fileName && !error && (
          <div className="flex items-center gap-3 border border-slate-200 bg-slate-50 rounded-lg px-4 py-2.5 text-sm">
            <span className="w-2 h-2 rounded-full bg-green-600 flex-shrink-0" />
            <span className="text-slate-700">
              <span className="font-medium">{plotted.length} SKU{plotted.length !== 1 ? 's' : ''}</span> loaded from{' '}
              <span className="font-medium">{fileName}</span>
              {' · '}
              <span className="font-medium">{weeks}</span>-week period
            </span>
            <button
              onClick={() => { setRawRows(SAMPLE_ROWS); setFileName(null); setError(null); }}
              className="ml-auto text-slate-400 hover:text-slate-700 transition-colors underline underline-offset-2 text-xs"
            >
              Reset to sample data
            </button>
          </div>
        )}
        {error && (
          <div className="border border-red-200 bg-red-50 rounded-lg px-4 py-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Scatter chart */}
        <div className="border border-slate-200 rounded-lg shadow-card px-4 pt-4 pb-2">
          <p className="text-xs text-slate-400 mb-3">
            Y axis: margin deviation vs catalogue mean ({matrixResult.meanMargin.toFixed(1)}%).
            X axis: {velLabel.toLowerCase()}.
            Bubble size: revenue.
          </p>
          <ResponsiveContainer width="100%" height={440}>
            <ScatterChart margin={{ top: 16, right: 24, bottom: 24, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                type="number"
                dataKey="velocity"
                domain={[0, xMax]}
                stroke="#CBD5E1"
                tick={{ fill: '#64748B', fontSize: 11 }}
                tickFormatter={xTickFormatter}
                label={{ value: velLabel, position: 'insideBottom', offset: -12, fill: '#94A3B8', fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="deviation"
                domain={[-yAbsMax, yAbsMax]}
                stroke="#CBD5E1"
                tick={{ fill: '#64748B', fontSize: 11 }}
                tickFormatter={yTickFormatter}
                label={{ value: 'vs Mean (pp)', angle: -90, position: 'insideLeft', fill: '#94A3B8', fontSize: 11, dx: 12 }}
              />
              <ZAxis type="number" dataKey="revenue" range={[60, 500]} />
              <Tooltip content={tooltipContent} cursor={{ strokeDasharray: '3 3', stroke: '#CBD5E1' }} />

              {/* Quadrant tints */}
              <ReferenceArea x1={0} x2={medianVel} y1={0} y2={yAbsMax} fill={`${BUCKET_COLORS.hold}12`} />
              <ReferenceArea x1={medianVel} x2={xMax} y1={0} y2={yAbsMax} fill={`${BUCKET_COLORS.scale}12`} />
              <ReferenceArea x1={medianVel} x2={xMax} y1={-yAbsMax} y2={0} fill={`${BUCKET_COLORS.fix}12`} />
              <ReferenceArea x1={0} x2={medianVel} y1={-yAbsMax} y2={0} fill={`${BUCKET_COLORS.kill}12`} />

              {/* Axis reference lines */}
              <ReferenceLine
                y={0}
                stroke="#94A3B8"
                strokeDasharray="5 3"
                label={{ value: 'Catalogue mean', position: 'insideTopLeft', fill: '#94A3B8', fontSize: 10, dy: 4 }}
              />
              <ReferenceLine
                x={medianVel}
                stroke="#94A3B8"
                strokeDasharray="5 3"
                label={{ value: 'Median velocity', position: 'insideTopRight', fill: '#94A3B8', fontSize: 10, dy: 4 }}
              />

              <Scatter data={plotted} shape={<CustomDot />} isAnimationActive={false} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Bucket summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {BUCKET_KEYS.map((b) => (
            <BucketCard
              key={b}
              bucket={b}
              count={summary[b].count}
              revenue={summary[b].revenue}
            />
          ))}
        </div>

        {/* Kill cost callout */}
        {killCount > 0 && (
          <div className="bg-slate-900 text-white rounded-lg px-5 py-4">
            <p className="text-sm leading-relaxed">
              <span className="font-semibold">{formatCurrency(killCost)}</span> in cost sitting behind
              the {killCount} Kill SKU{killCount !== 1 ? 's' : ''}.
              That's the floor of the conversation about whether they stay in the catalogue.
            </p>
          </div>
        )}

        {/* Results table */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-slate-700">{plotted.length} SKUs</p>
            <button
              onClick={handleExport}
              className="border border-slate-200 bg-white text-slate-700 px-3 py-1.5 rounded text-sm hover:bg-slate-50 transition-colors"
            >
              Export CSV
            </button>
          </div>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {(
                    [
                      { col: 'sku' as SortCol,       label: 'SKU' },
                      { col: 'margin' as SortCol,    label: 'Margin %' },
                      { col: 'deviation' as SortCol, label: 'vs Mean' },
                      { col: 'velocity' as SortCol,  label: velLabel },
                      { col: 'bucket' as SortCol,    label: 'Bucket' },
                    ] as { col: SortCol; label: string }[]
                  ).map(({ col, label }) => (
                    <th
                      key={col}
                      onClick={() => handleSort(col)}
                      className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-700 select-none"
                    >
                      {label}{sortArrow(col)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{row.sku}</td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-700">{row.margin.toFixed(1)}%</td>
                    <td className="px-4 py-2.5 tabular-nums">{devCell(row.deviation)}</td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-700">{row.velocity.toFixed(1)}</td>
                    <td className="px-4 py-2.5"><BucketBadge bucket={row.bucket} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-slate-400 text-center pb-2">
          Runs entirely in your browser — no data is uploaded or stored anywhere.
        </p>

      </div>
    </ToolLayout>
  );
}
