import { useState, useMemo, useCallback } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Plus, X } from 'lucide-react';
import { ToolLayout } from '@/components/ToolLayout';
import { ResultCard } from '@/components/ResultCard';
import { SectionLabel } from '@/components/SectionLabel';
import { computeAnalysis } from '@/hooks/use-analysis';
import type { ProductFormRow, ProductAnalysis, RetentionTier } from '@/hooks/use-analysis';
import type { ZClassification } from '@/lib/z-score';
import { cn, formatCurrency } from '@/lib/utils';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const MAX_PRODUCTS = 10;

function emptyRow(): ProductFormRow {
  return {
    id: crypto.randomUUID(),
    name: '',
    firstPurchaseVolume: '',
    repeatRate90d: '',
    avgSpend90d: '',
    avgSpend180d: '',
    fullPricePct: '',
    discountDepth: '',
  };
}

// ─── INPUT GRID ───────────────────────────────────────────────────────────────

const GRID_COLS = '1fr 5rem 6.5rem 6rem 6.5rem 5.5rem 5.5rem 2rem';
const GRID_COL_COUNT = GRID_COLS.split(' ').length;

const COLUMN_HEADERS = [
  { label: 'Product name', align: 'left' as const },
  { label: 'Volume', align: 'right' as const },
  { label: '90d repeat %', align: 'right' as const },
  { label: 'Full price %', align: 'right' as const },
  { label: 'Disc. depth %', align: 'right' as const },
  { label: 'LTV 90d', align: 'right' as const },
  { label: 'LTV 180d', align: 'right' as const },
  { label: '', align: 'right' as const },
];

if (COLUMN_HEADERS.length !== GRID_COL_COUNT) {
  throw new Error(`COLUMN_HEADERS length (${COLUMN_HEADERS.length}) must match GRID_COLS column count (${GRID_COL_COUNT})`);
}

function CellInput({
  value,
  onChange,
  placeholder,
  prefix,
  suffix,
  type = 'number',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  type?: 'number' | 'text' | 'email';
}) {
  return (
    <div className="relative flex items-center">
      {prefix && (
        <span className="absolute left-2 text-xs text-slate-400 pointer-events-none select-none">
          {prefix}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? ''}
        className={cn(
          'w-full border border-slate-200 rounded bg-white text-sm text-slate-900 outline-none focus:border-slate-400 transition-colors py-1.5',
          prefix ? 'pl-5 pr-2' : 'px-2',
          suffix ? 'pr-6' : ''
        )}
      />
      {suffix && (
        <span className="absolute right-2 text-xs text-slate-400 pointer-events-none select-none">
          {suffix}
        </span>
      )}
    </div>
  );
}

interface InputFormProps {
  rows: ProductFormRow[];
  onChange: (rows: ProductFormRow[]) => void;
}

function InputForm({ rows, onChange }: InputFormProps) {
  const update = useCallback(
    (id: string, field: keyof ProductFormRow, value: string) => {
      onChange(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    },
    [rows, onChange]
  );

  const remove = useCallback(
    (id: string) => {
      if (rows.length <= 1) return;
      onChange(rows.filter((r) => r.id !== id));
    },
    [rows, onChange]
  );

  const add = useCallback(() => {
    if (rows.length >= MAX_PRODUCTS) return;
    onChange([...rows, emptyRow()]);
  }, [rows, onChange]);

  const fieldLabel = (text: string) => (
    <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">{text}</p>
  );

  return (
    <div>
      {/* ── Mobile card layout ── */}
      <div className="sm:hidden space-y-3">
        {rows.map((row, idx) => (
          <div key={row.id} className="border border-slate-200 rounded-lg p-3 space-y-2.5 bg-white">
            <div className="flex gap-2 items-start">
              <div className="flex-1">
                {fieldLabel('Product name')}
                <CellInput type="text" value={row.name} onChange={(v) => update(row.id, 'name', v)} placeholder={`Product ${idx + 1}`} />
              </div>
              <button onClick={() => remove(row.id)} disabled={rows.length <= 1} className="mt-5 h-7 w-7 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" aria-label="Remove product">
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>{fieldLabel('Volume')}<CellInput value={row.firstPurchaseVolume} onChange={(v) => update(row.id, 'firstPurchaseVolume', v)} placeholder="0" /></div>
              <div>{fieldLabel('90d repeat %')}<CellInput value={row.repeatRate90d} onChange={(v) => update(row.id, 'repeatRate90d', v)} suffix="%" placeholder="0" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>{fieldLabel('Full price %')}<CellInput value={row.fullPricePct} onChange={(v) => update(row.id, 'fullPricePct', v)} suffix="%" placeholder="100" /></div>
              <div>{fieldLabel('Disc. depth %')}<CellInput value={row.discountDepth} onChange={(v) => update(row.id, 'discountDepth', v)} suffix="%" placeholder="—" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>{fieldLabel('LTV 90d')}<CellInput value={row.avgSpend90d} onChange={(v) => update(row.id, 'avgSpend90d', v)} prefix="£" placeholder="0" /></div>
              <div>{fieldLabel('LTV 180d')}<CellInput value={row.avgSpend180d} onChange={(v) => update(row.id, 'avgSpend180d', v)} prefix="£" placeholder="0" /></div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Desktop grid layout ── */}
      <div className="hidden sm:block overflow-x-auto">
        <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: GRID_COLS, minWidth: '640px' }}>
          {COLUMN_HEADERS.map((h, i) => (
            <span key={i} className={cn('text-xs uppercase tracking-widest text-slate-400 font-semibold', h.align === 'right' ? 'text-right' : 'text-left')}>
              {h.label}
            </span>
          ))}
        </div>
        <div className="space-y-2" style={{ minWidth: '640px' }}>
          {rows.map((row, idx) => (
            <div key={row.id} className="grid gap-2 items-center" style={{ gridTemplateColumns: GRID_COLS }}>
              <CellInput type="text" value={row.name} onChange={(v) => update(row.id, 'name', v)} placeholder={`Product ${idx + 1}`} />
              <CellInput value={row.firstPurchaseVolume} onChange={(v) => update(row.id, 'firstPurchaseVolume', v)} placeholder="0" />
              <CellInput value={row.repeatRate90d} onChange={(v) => update(row.id, 'repeatRate90d', v)} suffix="%" placeholder="0" />
              <CellInput value={row.fullPricePct} onChange={(v) => update(row.id, 'fullPricePct', v)} suffix="%" placeholder="100" />
              <CellInput value={row.discountDepth} onChange={(v) => update(row.id, 'discountDepth', v)} suffix="%" placeholder="—" />
              <CellInput value={row.avgSpend90d} onChange={(v) => update(row.id, 'avgSpend90d', v)} prefix="£" placeholder="0" />
              <CellInput value={row.avgSpend180d} onChange={(v) => update(row.id, 'avgSpend180d', v)} prefix="£" placeholder="0" />
              <button onClick={() => remove(row.id)} disabled={rows.length <= 1} className="h-7 w-7 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" aria-label="Remove product">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <button onClick={add} disabled={rows.length >= MAX_PRODUCTS} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <Plus size={14} />
          Add product
          {rows.length >= MAX_PRODUCTS && <span className="text-slate-400">(max {MAX_PRODUCTS})</span>}
        </button>
      </div>
    </div>
  );
}

// ─── Z-SCORE BADGE ────────────────────────────────────────────────────────────

const Z_BADGE_STYLES: Record<ZClassification, string> = {
  outlier: 'bg-red-50 text-red-600 border-red-200',
  mild_outlier: 'bg-amber-50 text-amber-600 border-amber-200',
  normal: 'bg-slate-100 text-slate-400 border-slate-200',
};

function ZBadge({
  zScore,
  classification,
}: {
  zScore: number;
  classification: ZClassification;
}) {
  const sign = zScore > 0 ? '+' : '';
  return (
    <span
      className={cn(
        'inline-block border rounded text-xs px-1 leading-4 shrink-0',
        Z_BADGE_STYLES[classification]
      )}
    >
      {sign}
      {zScore.toFixed(1)}σ
    </span>
  );
}

// ─── TIER BADGE ───────────────────────────────────────────────────────────────

const TIER_CONFIG: Record<RetentionTier, { label: string; className: string }> = {
  verified: {
    label: 'Strong retention',
    className: 'bg-slate-100 text-slate-800 border-slate-300',
  },
  signal: {
    label: 'Moderate retention',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  escalate: {
    label: 'One-and-done risk',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
};

function TierBadge({ tier }: { tier: RetentionTier }) {
  const config = TIER_CONFIG[tier];
  return (
    <span
      className={cn(
        'inline-block border rounded text-xs px-1.5 py-0.5 whitespace-nowrap',
        config.className
      )}
    >
      {config.label}
    </span>
  );
}

// ─── ACQUISITION QUALITY CELL ─────────────────────────────────────────────────

function AcqQualityCell({
  fullPricePct,
  discountDepth,
}: {
  fullPricePct: number;
  discountDepth: number;
}) {
  const badgeClass =
    fullPricePct < 50
      ? 'bg-red-50 text-red-700 border-red-200'
      : fullPricePct < 80
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <div className="space-y-0.5">
      <span
        className={cn(
          'inline-block border rounded text-xs px-1.5 py-0.5 whitespace-nowrap',
          badgeClass
        )}
      >
        {fullPricePct.toFixed(0)}% full price
      </span>
      {discountDepth > 30 && (
        <p className="text-xs text-slate-400">
          avg −{discountDepth.toFixed(0)}% off
        </p>
      )}
    </div>
  );
}

// ─── LTV MOMENTUM CELL ────────────────────────────────────────────────────────

function MomentumCell({ ratio }: { ratio: number }) {
  if (ratio <= 0) return <span className="text-slate-400">—</span>;
  const colorClass =
    ratio >= 2.0
      ? 'text-slate-900 font-semibold'
      : ratio < 1.3
        ? 'text-amber-600'
        : 'text-slate-700';
  return (
    <span className={cn('tabular-nums', colorClass)}>{ratio.toFixed(1)}×</span>
  );
}

// ─── SORTABLE RESULTS TABLE ───────────────────────────────────────────────────

type SortKey =
  | 'name'
  | 'firstPurchaseVolume'
  | 'weightedScore'
  | 'avgSpend90d'
  | 'avgSpend180d'
  | 'ltvMomentum'
  | 'fullPricePct';
type SortDir = 'asc' | 'desc';

const LOW_CONFIDENCE_THRESHOLD = 20;

const REPEAT_RATE_SORT_TOOLTIP =
  'Sorted by repeat rate adjusted for sample size and acquisition quality — discounted first purchases are down-weighted.';

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown size={12} className="text-slate-300 shrink-0" />;
  return dir === 'asc' ? (
    <ChevronUp size={12} className="text-slate-700 shrink-0" />
  ) : (
    <ChevronDown size={12} className="text-slate-700 shrink-0" />
  );
}

function ResultsTable({ products }: { products: ProductAnalysis[] }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: 'weightedScore',
    dir: 'desc',
  });

  const toggleSort = (key: SortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'name' ? 'asc' : 'desc' }
    );
  };

  const sorted = useMemo(() => {
    return [...products].sort((a, b) => {
      const cmp =
        sort.key === 'name' ? a.name.localeCompare(b.name) : a[sort.key] - b[sort.key];
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [products, sort]);

  const hasLowConfidence = products.some((p) => p.lowConfidence);

  function SortHead({
    label,
    sortKey,
    align = 'right',
    tooltip,
  }: {
    label: string;
    sortKey: SortKey;
    align?: 'left' | 'right';
    tooltip?: string;
  }) {
    const active = sort.key === sortKey;
    return (
      <th
        className={cn(
          'py-2.5 px-3 text-xs uppercase tracking-widest font-semibold cursor-pointer select-none whitespace-nowrap transition-colors',
          align === 'right' ? 'text-right' : 'text-left',
          active ? 'text-slate-700' : 'text-slate-400 hover:text-slate-600'
        )}
        onClick={() => toggleSort(sortKey)}
        title={tooltip}
      >
        <span
          className={cn(
            'flex items-center gap-1',
            align === 'right' ? 'justify-end' : 'justify-start'
          )}
        >
          {label}
          <SortIcon active={active} dir={sort.dir} />
        </span>
      </th>
    );
  }

  return (
    <div
      className="border border-slate-200 rounded-lg overflow-hidden shadow-card"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white border-b border-slate-200">
            <tr>
              <SortHead label="Product" sortKey="name" align="left" />
              <SortHead label="1st purchase vol" sortKey="firstPurchaseVolume" />
              <SortHead
                label="90d repeat rate"
                sortKey="weightedScore"
                tooltip={REPEAT_RATE_SORT_TOOLTIP}
              />
              <SortHead label="LTV 90d" sortKey="avgSpend90d" />
              <SortHead label="LTV 180d" sortKey="avgSpend180d" />
              <SortHead label="LTV momentum" sortKey="ltvMomentum" />
              <SortHead label="Acquisition quality" sortKey="fullPricePct" align="left" />
              <th className="py-2.5 px-3 text-xs uppercase tracking-widest font-semibold text-slate-400 text-left whitespace-nowrap">
                Retention tier
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((p) => (
              <tr key={p.id} className="bg-white hover:bg-slate-50 transition-colors">
                <td className="py-3 px-3 max-w-[180px]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-slate-900 truncate" title={p.name}>
                      {p.name}
                    </span>
                    {p.lowConfidence && (
                      <span className="inline-block border border-slate-200 rounded bg-slate-100 text-slate-400 text-xs px-1.5 py-0 whitespace-nowrap">
                        Low confidence
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-3 text-right tabular-nums text-slate-700">
                  {p.firstPurchaseVolume.toLocaleString()}
                </td>
                <td className="py-3 px-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="tabular-nums text-slate-700">
                      {p.repeatRate90d.toFixed(1)}%
                    </span>
                    <ZBadge zScore={p.zScore} classification={p.zClassification} />
                  </div>
                </td>
                <td className="py-3 px-3 text-right tabular-nums text-slate-700">
                  {formatCurrency(p.avgSpend90d)}
                </td>
                <td className="py-3 px-3 text-right tabular-nums text-slate-700">
                  {formatCurrency(p.avgSpend180d)}
                </td>
                <td className="py-3 px-3 text-right">
                  <MomentumCell ratio={p.ltvMomentum} />
                </td>
                <td className="py-3 px-3">
                  <AcqQualityCell
                    fullPricePct={p.fullPricePct}
                    discountDepth={p.discountDepth}
                  />
                </td>
                <td className="py-3 px-3">
                  <TierBadge tier={p.retentionTier} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasLowConfidence && (
        <p className="text-xs text-slate-400 px-3 py-2 border-t border-slate-100">
          Products with fewer than {LOW_CONFIDENCE_THRESHOLD} first purchase customers are
          flagged — repeat rates at this volume are unreliable for decision-making.
        </p>
      )}
    </div>
  );
}

// ─── INSIGHT CALLOUT ──────────────────────────────────────────────────────────
// Logic ported exactly from InsightCallout.tsx in the original repo.
// Three priority cases + discount caveats are unchanged.
// Styled as slate-200 border / slate-50 background, no colour fill.

interface InsightCalloutProps {
  highestVolume: ProductAnalysis;
  highestRetention: ProductAnalysis;
  allProducts: ProductAnalysis[];
}

function InsightCallout({
  highestVolume,
  highestRetention,
  allProducts,
}: InsightCalloutProps) {
  // Priority 1: best-retention product is in the bottom third by volume
  const underPromoted = (() => {
    if (allProducts.length < 3) return false;
    const byVolume = [...allProducts].sort(
      (a, b) => b.firstPurchaseVolume - a.firstPurchaseVolume
    );
    const bottomThirdStart = Math.ceil((2 * allProducts.length) / 3);
    const bottomThirdIds = new Set(byVolume.slice(bottomThirdStart).map((p) => p.id));
    return bottomThirdIds.has(highestRetention.id);
  })();

  let mainText: React.ReactNode;

  if (underPromoted) {
    mainText = (
      <p className="text-sm text-slate-700">
        <span className="font-medium">{highestRetention.name}</span> produces your strongest
        long-term customers but only{' '}
        <span className="font-medium tabular-nums">{highestRetention.firstPurchaseVolume}</span>{' '}
        customers have started there. It may be under-promoted in acquisition — worth testing
        as a hero product.
      </p>
    );
  } else if (highestVolume.id === highestRetention.id) {
    // Priority 2: bestseller = best retention
    mainText = (
      <p className="text-sm text-slate-700">
        Your bestseller is also your best retention product —{' '}
        <span className="font-medium">{highestVolume.name}</span>. That&apos;s rare. Protect
        it in acquisition.
      </p>
    );
  } else {
    // Priority 3: volume and retention diverge
    mainText = (
      <p className="text-sm text-slate-700">
        You&apos;re acquiring most customers through{' '}
        <span className="font-medium">{highestVolume.name}</span> but your best long-term
        customers start with{' '}
        <span className="font-medium">{highestRetention.name}</span>. Consider shifting
        acquisition spend.
      </p>
    );
  }

  const retentionCaveat =
    highestRetention.fullPricePct < 50 ? (
      <p className="text-xs text-slate-400 mt-2">
        Note: {highestRetention.fullPricePct.toFixed(0)}% of{' '}
        <span className="font-medium text-slate-600">{highestRetention.name}</span>&apos;s
        first purchases were discounted. Validate whether retention holds for full-price
        acquirees before shifting acquisition spend.
      </p>
    ) : null;

  const volumeCaveat =
    highestVolume.fullPricePct < 50 && highestVolume.id !== highestRetention.id ? (
      <p className="text-xs text-slate-400 mt-2">
        <span className="font-medium text-slate-600">{highestVolume.name}</span> is your
        highest volume first purchase product but{' '}
        {(100 - highestVolume.fullPricePct).toFixed(0)}% of those customers were acquired on
        promotion — volume may be driven by discount sensitivity rather than
        product-market fit.
      </p>
    ) : null;

  return (
    <div className="border border-slate-200 bg-slate-50 rounded-lg p-4">
      {mainText}
      {retentionCaveat}
      {volumeCaveat}
    </div>
  );
}

// ─── QUICK ESTIMATE ───────────────────────────────────────────────────────────

const MAX_QUICK_PRODUCTS = 5;

interface QuickRow {
  id: string;
  name: string;
  repeatRate: string;
  volume: string;
}

interface QuickResult {
  name: string;
  score: number;
}

function quickEmptyRow(): QuickRow {
  return { id: crypto.randomUUID(), name: '', repeatRate: '', volume: '' };
}

function QuickEstimate() {
  const [rows, setRows] = useState<QuickRow[]>(() => Array.from({ length: 3 }, quickEmptyRow));
  const [results, setResults] = useState<QuickResult[] | null>(null);

  const updateRow = (id: string, field: keyof Omit<QuickRow, 'id'>, value: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    setResults(null);
  };

  const addRow = () => {
    if (rows.length >= MAX_QUICK_PRODUCTS) return;
    setRows((prev) => [...prev, quickEmptyRow()]);
  };

  const removeRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
    setResults(null);
  };

  const calculate = () => {
    const valid = rows
      .filter((r) => r.name.trim() && parseFloat(r.volume) > 0)
      .map((r) => {
        const rate = parseFloat(r.repeatRate) || 0;
        const vol = parseFloat(r.volume);
        const score = vol >= 1 ? rate * (vol / (vol + 100)) : 0;
        return { name: r.name.trim(), score };
      })
      .sort((a, b) => b.score - a.score);
    setResults(valid);
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Quick Estimate</h2>
          <span className="text-xs uppercase tracking-widest font-semibold text-slate-400 border border-slate-200 rounded px-2 py-0.5">Start here</span>
        </div>
        <p className="text-slate-500 leading-relaxed">
          Two inputs per product. Enter your 90-day repeat rate and order volume and the tool ranks your catalogue by retention strength, adjusted so high-volume products don't automatically win.
        </p>
      </div>

      <div className="space-y-3">
        <div className="hidden sm:grid gap-3 mb-1" style={{ gridTemplateColumns: '1fr 7.5rem 7.5rem 2rem' }}>
          <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Product name</span>
          <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold text-right flex items-center justify-end gap-1">
            90d repeat %
            <span
              className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-slate-200 text-slate-500 text-xs cursor-help leading-none"
              title="Of customers who bought this product, what % bought again within 90 days"
            >
              ?
            </span>
          </span>
          <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold text-right flex items-center justify-end gap-1">
            Volume
            <span
              className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-slate-200 text-slate-500 text-xs cursor-help leading-none normal-case tracking-normal font-normal"
              title="Number of customers who made this product their first purchase in your dataset. Small volumes make the score less reliable — this is reflected in the weighting."
            >
              i
            </span>
          </span>
          <span />
        </div>

        {/* Mobile card layout */}
        <div className="sm:hidden space-y-3">
          {rows.map((row, idx) => (
            <div key={row.id} className="border border-slate-200 rounded-lg p-3 space-y-2.5 bg-white">
              <div className="flex gap-2 items-start">
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">Product name</p>
                  <CellInput type="text" value={row.name} onChange={(v) => updateRow(row.id, 'name', v)} placeholder={`Product ${idx + 1}`} />
                </div>
                <button onClick={() => removeRow(row.id)} disabled={rows.length <= 1} className="mt-5 h-7 w-7 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" aria-label="Remove product">
                  <X size={14} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">90d repeat %</p>
                  <CellInput value={row.repeatRate} onChange={(v) => updateRow(row.id, 'repeatRate', v)} suffix="%" placeholder="0" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1 flex items-center gap-1">
                    Volume
                    <span
                      className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-slate-200 text-slate-500 text-xs cursor-help leading-none normal-case tracking-normal font-normal"
                      title="Number of customers who made this product their first purchase in your dataset. Small volumes make the score less reliable — this is reflected in the weighting."
                    >
                      i
                    </span>
                  </p>
                  <CellInput value={row.volume} onChange={(v) => updateRow(row.id, 'volume', v)} placeholder="0" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop grid layout */}
        <div className="hidden sm:block space-y-2">
          {rows.map((row, idx) => (
            <div key={row.id} className="grid gap-3 items-center" style={{ gridTemplateColumns: '1fr 7.5rem 7.5rem 2rem' }}>
              <CellInput
                type="text"
                value={row.name}
                onChange={(v) => updateRow(row.id, 'name', v)}
                placeholder={`Product ${idx + 1}`}
              />
              <CellInput
                value={row.repeatRate}
                onChange={(v) => updateRow(row.id, 'repeatRate', v)}
                suffix="%"
                placeholder="0"
              />
              <CellInput
                value={row.volume}
                onChange={(v) => updateRow(row.id, 'volume', v)}
                placeholder="0"
              />
              <button
                onClick={() => removeRow(row.id)}
                disabled={rows.length <= 1}
                className="h-7 w-7 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Remove product"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-1">
          <button
            onClick={addRow}
            disabled={rows.length >= MAX_QUICK_PRODUCTS}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Plus size={14} />
            Add product
            {rows.length >= MAX_QUICK_PRODUCTS && (
              <span className="text-slate-400">(max {MAX_QUICK_PRODUCTS})</span>
            )}
          </button>
          <button
            onClick={calculate}
            className="bg-slate-900 text-white px-6 py-2.5 rounded text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            Rank products
          </button>
        </div>
      </div>

      {results !== null && (
        <div className="mt-8 space-y-3">
          <SectionLabel>Ranking</SectionLabel>
          {results.length === 0 ? (
            <p className="text-sm text-slate-400">Enter at least one product with a name and volume.</p>
          ) : (
            <>
              <div className="border border-slate-200 rounded-lg overflow-hidden shadow-card">
                <table className="w-full text-sm">
                  <thead className="bg-white border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4 text-left text-xs uppercase tracking-widest font-semibold text-slate-400 w-8">#</th>
                      <th className="py-2.5 px-4 text-left text-xs uppercase tracking-widest font-semibold text-slate-400">Product</th>
                      <th className="py-2.5 px-4 text-right text-xs uppercase tracking-widest font-semibold text-slate-400">
                        <span className="flex items-center justify-end gap-1">
                          Retention score
                          <span
                            className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-slate-200 text-slate-500 text-xs cursor-help leading-none normal-case tracking-normal font-normal"
                            title="Repeat rate adjusted for volume confidence and promotional mix. A product with 80% repeat rate from 400 full-price customers scores higher than the same rate from 12 promotional buyers."
                          >
                            i
                          </span>
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {results.map((r, i) => (
                      <tr key={r.name} className="bg-white">
                        <td className="py-3 px-4 text-slate-400 tabular-nums">{i + 1}</td>
                        <td className="py-3 px-4 font-medium text-slate-900">{r.name}</td>
                        <td className="py-3 px-4 text-right tabular-nums text-slate-700">{r.score.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-400">
                Adding price mix, discount depth and LTV data gives a more accurate signal. Use the Full Analysis below.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export function FirstPurchase() {
  const [view, setView] = useState<'input' | 'results'>('input');
  const [rows, setRows] = useState<ProductFormRow[]>(() => Array.from({ length: 5 }, emptyRow));

  const analysis = useMemo(() => computeAnalysis(rows), [rows]);
  const { products, highestVolumeProduct, highestRetentionProduct, retentionGap } = analysis;

  const highestMomentumProduct = useMemo(() => {
    if (products.length === 0) return null;
    return [...products].sort((a, b) => b.ltvMomentum - a.ltvMomentum)[0];
  }, [products]);

  return (
    <ToolLayout
      title="First Purchase Predictor"
      description="Which product a customer buys first is one of the strongest predictors of whether they come back. This tool ranks your catalogue by retention strength so you know which products are building your customer base and which are producing one-time purchasers."
      metaDescription="Which product should you acquire customers on? Ranks your catalogue by retention strength, adjusted for volume and discount dependency."
    >
      <QuickEstimate />
      <div className="mt-16 pt-10 border-t border-slate-200">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight mb-2">Full Analysis</h2>
          <p className="text-slate-500 leading-relaxed">
            Add price mix, discount depth and LTV data to get a complete picture. Built for operators who already have the numbers and want them ranked in one place.
          </p>
        </div>
      {view === 'input' ? (
        <div className="space-y-6">
          <div>
            <InputForm rows={rows} onChange={setRows} />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs text-slate-400">
              Rows without a product name and volume are excluded from analysis.
            </p>
            <button
              onClick={() => setView('results')}
              className="w-full sm:w-auto bg-slate-900 text-white px-6 py-2.5 rounded text-sm font-medium hover:bg-slate-800 transition-colors"
            >
              Calculate
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {products.length >= 1 && (
            <div>
              <SectionLabel>Summary</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ResultCard
                  label="Best retention"
                  value={highestRetentionProduct?.name ?? '—'}
                  subtext={
                    highestRetentionProduct
                      ? `${highestRetentionProduct.repeatRate90d.toFixed(1)}% 90d repeat rate`
                      : undefined
                  }
                />
                <ResultCard
                  label="Retention gap"
                  value={products.length >= 2 ? `${retentionGap.toFixed(1)}%` : '—'}
                  subtext={
                    products.length >= 2
                      ? 'between highest and lowest product'
                      : 'need 2+ products'
                  }
                  variant={retentionGap >= 30 ? 'warning' : 'neutral'}
                />
                <ResultCard
                  label="Highest LTV momentum"
                  value={highestMomentumProduct?.name ?? '—'}
                  subtext={
                    highestMomentumProduct && highestMomentumProduct.ltvMomentum > 0
                      ? `${highestMomentumProduct.ltvMomentum.toFixed(1)}× 180d/90d`
                      : undefined
                  }
                />
              </div>
            </div>
          )}

          {products.length >= 1 && (
            <div>
              <SectionLabel>First-purchase products ranked</SectionLabel>
              <p className="text-xs text-slate-400 mb-3">
                Default sort adjusts repeat rate for sample size and acquisition quality —
                products with fewer customers or higher discount dependency rank lower than
                their raw rate suggests.
              </p>
              <ResultsTable products={products} />
            </div>
          )}

          {products.length >= 2 && highestVolumeProduct && highestRetentionProduct && (
            <div>
              <SectionLabel>Insight</SectionLabel>
              <InsightCallout
                highestVolume={highestVolumeProduct}
                highestRetention={highestRetentionProduct}
                allProducts={products}
              />
            </div>
          )}

          <div className="flex sm:justify-end pt-4 border-t border-slate-200">
            <button
              onClick={() => setView('input')}
              className="w-full sm:w-auto border border-slate-200 text-slate-700 px-6 py-2.5 rounded text-sm font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors"
            >
              Recalculate
            </button>
          </div>
        </div>
      )}
      </div>
      <div className="mt-16 pt-10 border-t border-slate-200">
        <p className="text-sm text-slate-500 leading-relaxed mb-4">
          This is one signal. Growth Engine tracks all of them — connected to your Shopify and Klaviyo data, updated continuously.
        </p>
        <div className="flex justify-end">
          <a
            href="https://demo.neilminty.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-2.5 bg-slate-900 text-white text-sm font-medium rounded hover:bg-slate-800 transition-colors"
          >
            Explore the demo →
          </a>
        </div>
      </div>
    </ToolLayout>
  );
}
