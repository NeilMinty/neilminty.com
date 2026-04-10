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
  type?: string;
}) {
  return (
    <div className="relative flex items-center">
      {prefix && (
        <span className="absolute left-2 text-xs text-slate-400 font-mono pointer-events-none select-none">
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
        <span className="absolute right-2 text-xs text-slate-400 font-mono pointer-events-none select-none">
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

  return (
    <div>
      <div className="overflow-x-auto">
        <div
          className="hidden sm:grid gap-2 mb-2"
          style={{ gridTemplateColumns: GRID_COLS, minWidth: '640px' }}
        >
          {COLUMN_HEADERS.map((h, i) => (
            <span
              key={i}
              className={cn(
                'text-[10px] uppercase tracking-wide text-slate-400 font-semibold',
                h.align === 'right' ? 'text-right' : 'text-left'
              )}
            >
              {h.label}
            </span>
          ))}
        </div>

        <div className="space-y-2" style={{ minWidth: '640px' }}>
          {rows.map((row, idx) => (
            <div
              key={row.id}
              className="grid gap-2 items-center"
              style={{ gridTemplateColumns: GRID_COLS }}
            >
              <CellInput
                type="text"
                value={row.name}
                onChange={(v) => update(row.id, 'name', v)}
                placeholder={`Product ${idx + 1}`}
              />
              <CellInput
                value={row.firstPurchaseVolume}
                onChange={(v) => update(row.id, 'firstPurchaseVolume', v)}
                placeholder="0"
              />
              <CellInput
                value={row.repeatRate90d}
                onChange={(v) => update(row.id, 'repeatRate90d', v)}
                suffix="%"
                placeholder="0"
              />
              <CellInput
                value={row.fullPricePct}
                onChange={(v) => update(row.id, 'fullPricePct', v)}
                suffix="%"
                placeholder="100"
              />
              <CellInput
                value={row.discountDepth}
                onChange={(v) => update(row.id, 'discountDepth', v)}
                suffix="%"
                placeholder="—"
              />
              <CellInput
                value={row.avgSpend90d}
                onChange={(v) => update(row.id, 'avgSpend90d', v)}
                prefix="£"
                placeholder="0"
              />
              <CellInput
                value={row.avgSpend180d}
                onChange={(v) => update(row.id, 'avgSpend180d', v)}
                prefix="£"
                placeholder="0"
              />
              <button
                onClick={() => remove(row.id)}
                disabled={rows.length <= 1}
                className="h-7 w-7 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Remove product"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <button
          onClick={add}
          disabled={rows.length >= MAX_PRODUCTS}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Plus size={14} />
          Add product
          {rows.length >= MAX_PRODUCTS && (
            <span className="text-slate-400">(max {MAX_PRODUCTS})</span>
          )}
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
        'inline-block border rounded text-[9px] font-mono px-1 leading-4 shrink-0',
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
        'inline-block border rounded text-[10px] px-1.5 py-0.5 whitespace-nowrap',
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
          'inline-block border rounded text-[10px] px-1.5 py-0.5 whitespace-nowrap',
          badgeClass
        )}
      >
        {fullPricePct.toFixed(0)}% full price
      </span>
      {discountDepth > 30 && (
        <p className="text-[10px] text-slate-400 font-mono">
          avg −{discountDepth.toFixed(0)}% off
        </p>
      )}
    </div>
  );
}

// ─── LTV MOMENTUM CELL ────────────────────────────────────────────────────────

function MomentumCell({ ratio }: { ratio: number }) {
  if (ratio <= 0) return <span className="font-mono text-slate-400">—</span>;
  const colorClass =
    ratio >= 2.0
      ? 'text-slate-900 font-semibold'
      : ratio < 1.3
        ? 'text-amber-600'
        : 'text-slate-700';
  return (
    <span className={cn('font-mono tabular-nums', colorClass)}>{ratio.toFixed(1)}×</span>
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
          'py-2.5 px-3 text-[10px] uppercase tracking-wide font-semibold cursor-pointer select-none whitespace-nowrap transition-colors',
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
              <th className="py-2.5 px-3 text-[10px] uppercase tracking-wide font-semibold text-slate-400 text-left whitespace-nowrap">
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
                      <span className="inline-block border border-slate-200 rounded bg-slate-100 text-slate-400 text-[9px] px-1.5 py-0 whitespace-nowrap">
                        Low confidence
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                  {p.firstPurchaseVolume.toLocaleString()}
                </td>
                <td className="py-3 px-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="font-mono tabular-nums text-slate-700">
                      {p.repeatRate90d.toFixed(1)}%
                    </span>
                    <ZBadge zScore={p.zScore} classification={p.zClassification} />
                  </div>
                </td>
                <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                  {formatCurrency(p.avgSpend90d)}
                </td>
                <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
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
        <p className="text-[11px] text-slate-400 px-3 py-2 border-t border-slate-100">
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
        <span className="font-mono font-medium">{highestRetention.firstPurchaseVolume}</span>{' '}
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
      <p className="text-[11px] text-slate-400 mt-2">
        Note: {highestRetention.fullPricePct.toFixed(0)}% of{' '}
        <span className="font-medium text-slate-600">{highestRetention.name}</span>&apos;s
        first purchases were discounted. Validate whether retention holds for full-price
        acquirees before shifting acquisition spend.
      </p>
    ) : null;

  const volumeCaveat =
    highestVolume.fullPricePct < 50 && highestVolume.id !== highestRetention.id ? (
      <p className="text-[11px] text-slate-400 mt-2">
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

  const canCalculate = products.length >= 1;

  return (
    <ToolLayout
      title="First Purchase Predictor"
      description="Which product a customer buys first predicts whether they come back. Enter up to ten products to surface which drive repeat buyers and which produce one-time purchasers."
    >
      {view === 'input' ? (
        <div className="space-y-6">
          <div>
            <SectionLabel>Products</SectionLabel>
            <InputForm rows={rows} onChange={setRows} />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs text-slate-400">
              Rows without a product name and volume are excluded from analysis.
            </p>
            <button
              onClick={() => setView('results')}
              disabled={!canCalculate}
              className="w-full sm:w-auto bg-slate-900 text-white px-6 py-2.5 rounded text-sm font-medium hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
    </ToolLayout>
  );
}
