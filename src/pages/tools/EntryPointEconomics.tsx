import { useState, useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import { ToolLayout } from '@/components/ToolLayout';
import { SectionLabel } from '@/components/SectionLabel';
import { cn } from '@/lib/utils';
import { computeBlended, discountTiersValid } from '@/utils/epeScore';
import type { EpeProductInput } from '@/utils/epeScore';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const MAX_PRODUCTS = 10;

// ─── FORM TYPES ───────────────────────────────────────────────────────────────

interface EpeFormRow {
  id: string;
  name: string;
  volume: string;
  rpr90d: string;
  fullPricePct: string;
  emailExchangePct: string;
  promotionalPct: string;
  markdownPct: string;
  ltv90d: string;
  ltv180d: string;
  cac: string;
  grossMarginPct: string;
}

function emptyRow(): EpeFormRow {
  return {
    id: crypto.randomUUID(),
    name: '',
    volume: '',
    rpr90d: '',
    fullPricePct: '',
    emailExchangePct: '',
    promotionalPct: '',
    markdownPct: '',
    ltv90d: '',
    ltv180d: '',
    cac: '',
    grossMarginPct: '',
  };
}

// ─── RESULT TYPES ─────────────────────────────────────────────────────────────

interface PaybackInfo {
  days: number;
  type: 'contribution' | 'revenue';
  exceeds180d: boolean;
}

interface ResultRow {
  name: string;
  volume: number;
  rpr90d: number;
  fullPricePct: number;
  emailExchangePct: number;
  promotionalPct: number;
  markdownPct: number;
  ltv90d: number;
  cac: number | undefined;
  grossMarginPct: number | undefined;
  epeScore: number;
  discountQualityScore: number;
  ltvVelocity: number;
  payback: PaybackInfo | null;
}

interface EpeResults {
  blendedEpeScore: number;
  products: ResultRow[]; // sorted high to low by epeScore
  totalVolume: number;
}

// ─── VALIDATION (form layer) ──────────────────────────────────────────────────

const DISCOUNT_FIELDS: (keyof EpeFormRow)[] = [
  'fullPricePct',
  'emailExchangePct',
  'promotionalPct',
  'markdownPct',
];

function discountTierError(row: EpeFormRow): string | null {
  const hasAny = DISCOUNT_FIELDS.some((f) => (row[f] as string).trim() !== '');
  if (!hasAny) return null;
  const sum = DISCOUNT_FIELDS.map((f) => parseFloat(row[f] as string) || 0).reduce(
    (a, b) => a + b,
    0
  );
  if (Math.round(sum) !== 100) {
    return `Discount mix sums to ${Number.isInteger(sum) ? sum : sum.toFixed(1)}% — must equal 100%`;
  }
  return null;
}

// ─── CALCULATE ────────────────────────────────────────────────────────────────

interface NamedInput extends EpeProductInput {
  name: string;
}

function parseRow(row: EpeFormRow): NamedInput | null {
  const name = row.name.trim();
  const volume = parseFloat(row.volume);
  if (!name || !(volume > 0)) return null;
  return {
    name,
    volume: Math.round(volume),
    rpr90d: parseFloat(row.rpr90d) || 0,
    fullPricePct: parseFloat(row.fullPricePct) || 0,
    emailExchangePct: parseFloat(row.emailExchangePct) || 0,
    promotionalPct: parseFloat(row.promotionalPct) || 0,
    markdownPct: parseFloat(row.markdownPct) || 0,
    ltv90d: parseFloat(row.ltv90d) || 0,
    ltv180d: parseFloat(row.ltv180d) || 0,
    cac: row.cac.trim() ? parseFloat(row.cac) : undefined,
    grossMarginPct: row.grossMarginPct.trim() ? parseFloat(row.grossMarginPct) : undefined,
  };
}

function buildPayback(input: NamedInput): PaybackInfo | null {
  if (input.cac == null || !(input.ltv90d > 0)) return null;
  const dailyRevenue = input.ltv90d / 90;
  if (input.grossMarginPct != null && input.grossMarginPct > 0) {
    const days = input.cac / (dailyRevenue * (input.grossMarginPct / 100));
    return { days, type: 'contribution', exceeds180d: days > 180 };
  }
  const days = input.cac / dailyRevenue;
  return { days, type: 'revenue', exceeds180d: days > 180 };
}

function calculate(rows: EpeFormRow[]): EpeResults | null {
  const named = rows.flatMap((r) => { const p = parseRow(r); return p ? [p] : []; });
  const blended = computeBlended(named);
  if (blended.blendedEpeScore === null) return null;

  // Reconstruct set using the same filter computeBlended applies
  const validNamed = named.filter((i) =>
    discountTiersValid(i.fullPricePct, i.emailExchangePct, i.promotionalPct, i.markdownPct)
  );

  const totalVolume = validNamed.reduce((s, i) => s + i.volume, 0);

  const products: ResultRow[] = validNamed.map((input, idx) => ({
    name: input.name,
    volume: input.volume,
    rpr90d: input.rpr90d,
    fullPricePct: input.fullPricePct,
    emailExchangePct: input.emailExchangePct,
    promotionalPct: input.promotionalPct,
    markdownPct: input.markdownPct,
    ltv90d: input.ltv90d,
    cac: input.cac,
    grossMarginPct: input.grossMarginPct,
    epeScore: blended.products[idx].epeScore,
    discountQualityScore: blended.products[idx].discountQualityScore,
    ltvVelocity: blended.products[idx].ltvVelocity,
    payback: buildPayback(input),
  }));

  const sorted = [...products].sort((a, b) => b.epeScore - a.epeScore);
  return { blendedEpeScore: blended.blendedEpeScore, products: sorted, totalVolume };
}

// ─── EPE DISPLAY HELPERS ──────────────────────────────────────────────────────

function epeBand(score: number): {
  label: string;
  text: string;
  border: string;
  bg: string;
} {
  if (score >= 70)
    return {
      label: 'Strong entry point economics',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      bg: 'bg-emerald-50',
    };
  if (score >= 50)
    return {
      label: 'Watch list — review acquisition mix',
      text: 'text-amber-700',
      border: 'border-amber-200',
      bg: 'bg-amber-50',
    };
  return {
    label: 'Structural problem — entry point economics working against CAC',
    text: 'text-red-700',
    border: 'border-red-200',
    bg: 'bg-red-50',
  };
}

// ─── RESULT SECTIONS ─────────────────────────────────────────────────────────

function BlendedScore({ score }: { score: number }) {
  const band = epeBand(score);
  return (
    <div className={cn('rounded-lg border p-6', band.border, band.bg)}>
      <div className="flex items-baseline gap-2">
        <span className={cn('text-7xl font-bold tabular-nums leading-none', band.text)}>
          {score.toFixed(0)}
        </span>
        <span className="text-xl text-slate-400 font-normal">/ 100</span>
      </div>
      <p className={cn('mt-2 text-sm font-medium', band.text)}>{band.label}</p>
    </div>
  );
}

function ProductTable({ products }: { products: ResultRow[] }) {
  return (
    <div className="border border-slate-200 rounded-lg overflow-x-auto shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-white border-b border-slate-200">
            <tr>
              {['Product', 'EPE score', '90D RPR', 'Disc. quality', 'LTV velocity'].map((h, i) => (
                <th
                  key={h}
                  className={cn(
                    'py-2.5 px-3 text-xs uppercase tracking-widest font-semibold text-slate-400 whitespace-nowrap',
                    i === 0 ? 'text-left' : 'text-right'
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((p) => {
              const band = epeBand(p.epeScore);
              return (
                <tr key={p.name} className="bg-white hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-3 font-medium text-slate-900 max-w-[160px] truncate" title={p.name}>
                    {p.name}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className={cn('text-xl font-bold tabular-nums', band.text)}>
                      {p.epeScore.toFixed(0)}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-slate-700">
                    {p.rpr90d.toFixed(1)}%
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-slate-700">
                    {p.discountQualityScore.toFixed(0)}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-slate-700">
                    {p.ltvVelocity.toFixed(0)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
    </div>
  );
}

function PaybackTable({ products }: { products: ResultRow[] }) {
  const withCac = products.filter((p) => p.cac != null);
  if (withCac.length === 0) return null;

  return (
    <div>
      <SectionLabel>Payback period</SectionLabel>
      <div className="border border-slate-200 rounded-lg overflow-x-auto shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-white border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 text-left text-xs uppercase tracking-widest font-semibold text-slate-400">
                  Product
                </th>
                <th className="py-2.5 px-3 text-right text-xs uppercase tracking-widest font-semibold text-slate-400 whitespace-nowrap">
                  Days
                </th>
                <th className="py-2.5 px-3 text-left text-xs uppercase tracking-widest font-semibold text-slate-400">
                  Type
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {withCac.map((p) => {
                const pb = p.payback;
                return (
                  <tr key={p.name} className="bg-white hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-medium text-slate-900 max-w-[150px] truncate" title={p.name}>
                      {p.name}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {pb === null ? (
                        <span className="text-slate-400 tabular-nums">—</span>
                      ) : (
                        <span
                          className={cn(
                            'font-semibold tabular-nums',
                            pb.exceeds180d ? 'text-red-700' : 'text-slate-900'
                          )}
                        >
                          {Math.round(pb.days)}
                          {pb.exceeds180d && (
                            <span className="ml-1.5 text-xs font-normal text-red-600">
                              &gt;180d
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {pb === null ? (
                        <span className="text-xs text-slate-400">LTV 90D is 0</span>
                      ) : pb.type === 'contribution' ? (
                        <span className="text-xs text-slate-500">Contribution payback</span>
                      ) : (
                        <span className="text-xs text-slate-500">
                          Revenue payback
                          <span className="block text-slate-400 mt-0.5">
                            Add gross margin % for contribution payback.
                          </span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
      </div>
    </div>
  );
}

function InsightsBlock({
  products,
  totalVolume,
}: {
  products: ResultRow[];
  totalVolume: number;
}) {
  const w = (field: keyof Pick<ResultRow, 'fullPricePct' | 'emailExchangePct' | 'promotionalPct' | 'markdownPct'>) =>
    totalVolume > 0 ? products.reduce((s, p) => s + p[field] * p.volume, 0) / totalVolume : 0;

  const promotional = w('promotionalPct');
  const markdown = w('markdownPct');
  const promoAndMarkdown = promotional + markdown;

  const highestVol = products.length > 0
    ? products.reduce((max, p) => (p.volume > max.volume ? p : max), products[0])
    : null;

  const volPct = highestVol && totalVolume > 0
    ? Math.round((highestVol.volume / totalVolume) * 100)
    : 0;

  const amberPayback = products.find(
    (p) => p.payback !== null && p.payback.days >= 120 && p.payback.days < 180
  );

  const insights: string[] = [];

  // Insight 1 — flagged product
  if (products.length >= 2 && highestVol) {
    insights.push(
      `${highestVol.name} drives ${volPct}% of your first purchase volume but has your lowest EPE score at ${highestVol.epeScore.toFixed(0)}. Is this driven by discount depth, low repeat rate, or both? Check the per product breakdown below.`
    );
  }

  // Insight 2A — discount mix 50%+
  if (promoAndMarkdown >= 50) {
    insights.push(
      'More than half your acquisition volume is promotion-driven. You may be training customers to wait for the next sale rather than buying at full price. Review promotional frequency and check whether repeat purchases are happening at full price or only during promotions.'
    );
  } else if (promoAndMarkdown >= 30) {
    // Insight 2B — 30–49%
    insights.push(
      'A significant share of your acquisition volume is promotion-driven. Monitor whether repeat purchases are occurring at full price or clustering around promotional windows — the pattern will tell you whether discounting is acquiring customers or just renting them.'
    );
  }

  // Insight 2C — markdown > 20% (independent of 2A/2B)
  if (markdown > 20) {
    insights.push(
      'Your markdown volume is material. Before drawing conclusions, segment these buyers by product mix. A markdown first-purchaser who cross-sells into full price product is a different customer to one who only ever buys on sale.'
    );
  }

  // Insight 3 — RPR drag on highest volume product
  if (highestVol && highestVol.rpr90d < 35) {
    insights.push(
      `${highestVol.name} is your highest volume entry point but only ${highestVol.rpr90d.toFixed(1)}% of first-time buyers return within 90 days. At this repeat rate your blended CAC is working harder than it needs to. Investigate whether the post-purchase experience matches the acquisition promise.`
    );
  }

  // Insight 4 — amber payback (120–179 days)
  if (amberPayback) {
    insights.push(
      `${amberPayback.name} has a ${Math.round(amberPayback.payback!.days)}-day payback period. Not critical yet but worth monitoring — any increase in CAC or softening of early LTV will push this into problem territory.`
    );
  }

  return (
    <div>
      <SectionLabel>Insights</SectionLabel>
      <div className="space-y-3">
        {insights.length === 0 ? (
          <div className="border-l-2 border-emerald-400 bg-emerald-50 rounded-r-lg px-4 py-3">
            <p className="text-sm text-slate-700">
              Your entry point economics are working. Monitor discount tier mix and repeat rates as
              you scale acquisition volume.
            </p>
          </div>
        ) : (
          insights.map((text, i) => (
            <div key={i} className="border-l-2 border-amber-400 bg-amber-50 rounded-r-lg px-4 py-3">
              <p className="text-sm text-slate-700">{text}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function TierSummary({
  products,
  totalVolume,
}: {
  products: ResultRow[];
  totalVolume: number;
}) {
  if (totalVolume === 0) return null;

  const w = (field: keyof Pick<ResultRow, 'fullPricePct' | 'emailExchangePct' | 'promotionalPct' | 'markdownPct'>) =>
    products.reduce((s, p) => s + p[field] * p.volume, 0) / totalVolume;

  const fullPrice = w('fullPricePct');
  const emailExchange = w('emailExchangePct');
  const promotional = w('promotionalPct');
  const markdown = w('markdownPct');

  const tiers = [
    { label: 'Full price', value: fullPrice },
    { label: 'Email exchange 10–15%', value: emailExchange },
    { label: 'Promotional 20–25%', value: promotional },
    { label: 'Markdown 30%+', value: markdown },
  ];

  return (
    <div>
      <SectionLabel>Discount tier summary</SectionLabel>
      <div className="border border-slate-200 rounded-lg bg-white shadow-card divide-y divide-slate-100">
        {tiers.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between px-4 py-2.5">
            <span className="text-sm text-slate-600">{label}</span>
            <span className="text-sm font-semibold tabular-nums text-slate-900">
              {value.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CELL INPUT ───────────────────────────────────────────────────────────────

function CellInput({
  value,
  onChange,
  placeholder,
  prefix,
  suffix,
  type = 'number',
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  type?: 'number' | 'text';
  error?: boolean;
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
          'w-full border rounded bg-white text-sm text-slate-900 outline-none transition-colors py-1.5',
          error
            ? 'border-red-300 focus:border-red-400'
            : 'border-slate-200 focus:border-slate-400',
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

// ─── DESKTOP GRID ─────────────────────────────────────────────────────────────

// name | vol | rpr | FP% | EM% | PR% | MK% | ltv90 | ltv180 | cac | gm% | ×
const GRID_COLS = '1fr 4rem 5rem 3.5rem 3.5rem 3.5rem 3.5rem 5rem 5rem 4rem 4rem 2rem';
const GRID_COL_COUNT = GRID_COLS.split(' ').length;

const COLUMN_HEADERS: { label: string; align: 'left' | 'right' }[] = [
  { label: 'Product name', align: 'left' },
  { label: 'Volume', align: 'right' },
  { label: '90d RPR', align: 'right' },
  { label: 'FP%', align: 'right' },
  { label: 'EM%', align: 'right' },
  { label: 'PR%', align: 'right' },
  { label: 'MK%', align: 'right' },
  { label: 'LTV 90d', align: 'right' },
  { label: 'LTV 180d', align: 'right' },
  { label: 'CAC *', align: 'right' },
  { label: 'GM % *', align: 'right' },
  { label: '', align: 'right' },
];

if (COLUMN_HEADERS.length !== GRID_COL_COUNT) {
  throw new Error(
    `COLUMN_HEADERS length (${COLUMN_HEADERS.length}) must match GRID_COLS column count (${GRID_COL_COUNT})`
  );
}

// ─── INPUT FORM ───────────────────────────────────────────────────────────────

function fieldLabel(text: string) {
  return (
    <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">{text}</p>
  );
}

interface InputFormProps {
  rows: EpeFormRow[];
  onChange: (rows: EpeFormRow[]) => void;
}

function InputForm({ rows, onChange }: InputFormProps) {
  const update = useCallback(
    (id: string, field: keyof EpeFormRow, value: string) => {
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
      {/* ── Mobile card layout ── */}
      <div className="sm:hidden space-y-3">
        {rows.map((row, idx) => {
          const tierError = discountTierError(row);
          return (
            <div
              key={row.id}
              className="border border-slate-200 rounded-lg p-3 space-y-3 bg-white"
            >
              {/* Name + remove */}
              <div className="flex gap-2 items-start">
                <div className="flex-1">
                  {fieldLabel('Product name')}
                  <CellInput
                    type="text"
                    value={row.name}
                    onChange={(v) => update(row.id, 'name', v)}
                    placeholder={`Product ${idx + 1}`}
                  />
                </div>
                <button
                  onClick={() => remove(row.id)}
                  disabled={rows.length <= 1}
                  className="mt-5 h-7 w-7 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Remove product"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Volume + RPR */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  {fieldLabel('Volume')}
                  <CellInput
                    value={row.volume}
                    onChange={(v) => update(row.id, 'volume', v)}
                    placeholder="0"
                  />
                </div>
                <div>
                  {fieldLabel('90d RPR %')}
                  <CellInput
                    value={row.rpr90d}
                    onChange={(v) => update(row.id, 'rpr90d', v)}
                    suffix="%"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Discount mix */}
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1.5">
                  Discount mix
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    {fieldLabel('Full price %')}
                    <CellInput
                      value={row.fullPricePct}
                      onChange={(v) => update(row.id, 'fullPricePct', v)}
                      suffix="%"
                      placeholder="0"
                      error={!!tierError}
                    />
                  </div>
                  <div>
                    {fieldLabel('Email 10–15%')}
                    <CellInput
                      value={row.emailExchangePct}
                      onChange={(v) => update(row.id, 'emailExchangePct', v)}
                      suffix="%"
                      placeholder="0"
                      error={!!tierError}
                    />
                  </div>
                  <div>
                    {fieldLabel('Promo 20–25%')}
                    <CellInput
                      value={row.promotionalPct}
                      onChange={(v) => update(row.id, 'promotionalPct', v)}
                      suffix="%"
                      placeholder="0"
                      error={!!tierError}
                    />
                  </div>
                  <div>
                    {fieldLabel('Mkdn 30%+')}
                    <CellInput
                      value={row.markdownPct}
                      onChange={(v) => update(row.id, 'markdownPct', v)}
                      suffix="%"
                      placeholder="0"
                      error={!!tierError}
                    />
                  </div>
                </div>
                {tierError && (
                  <p className="mt-1.5 text-xs text-red-600">{tierError}</p>
                )}
              </div>

              {/* LTV */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  {fieldLabel('LTV 90d')}
                  <CellInput
                    value={row.ltv90d}
                    onChange={(v) => update(row.id, 'ltv90d', v)}
                    prefix="£"
                    placeholder="0"
                  />
                </div>
                <div>
                  {fieldLabel('LTV 180d')}
                  <CellInput
                    value={row.ltv180d}
                    onChange={(v) => update(row.id, 'ltv180d', v)}
                    prefix="£"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* CAC + GM (optional) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  {fieldLabel('CAC (optional)')}
                  <CellInput
                    value={row.cac}
                    onChange={(v) => update(row.id, 'cac', v)}
                    prefix="£"
                    placeholder="—"
                  />
                </div>
                <div>
                  {fieldLabel('GM % (optional)')}
                  <CellInput
                    value={row.grossMarginPct}
                    onChange={(v) => update(row.id, 'grossMarginPct', v)}
                    suffix="%"
                    placeholder="—"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Desktop grid layout ── */}
      <div className="hidden sm:block overflow-x-auto">
        <div
          className="grid gap-2 mb-2"
          style={{ gridTemplateColumns: GRID_COLS, minWidth: '880px' }}
        >
          {COLUMN_HEADERS.map((h, i) => (
            <span
              key={i}
              className={cn(
                'text-xs uppercase tracking-widest text-slate-400 font-semibold',
                h.align === 'right' ? 'text-right' : 'text-left'
              )}
            >
              {h.label}
            </span>
          ))}
        </div>

        <div className="space-y-1" style={{ minWidth: '880px' }}>
          {rows.map((row, idx) => {
            const tierError = discountTierError(row);
            return (
              <div key={row.id}>
                <div
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
                    value={row.volume}
                    onChange={(v) => update(row.id, 'volume', v)}
                    placeholder="0"
                  />
                  <CellInput
                    value={row.rpr90d}
                    onChange={(v) => update(row.id, 'rpr90d', v)}
                    suffix="%"
                    placeholder="0"
                  />
                  <CellInput
                    value={row.fullPricePct}
                    onChange={(v) => update(row.id, 'fullPricePct', v)}
                    suffix="%"
                    placeholder="0"
                    error={!!tierError}
                  />
                  <CellInput
                    value={row.emailExchangePct}
                    onChange={(v) => update(row.id, 'emailExchangePct', v)}
                    suffix="%"
                    placeholder="0"
                    error={!!tierError}
                  />
                  <CellInput
                    value={row.promotionalPct}
                    onChange={(v) => update(row.id, 'promotionalPct', v)}
                    suffix="%"
                    placeholder="0"
                    error={!!tierError}
                  />
                  <CellInput
                    value={row.markdownPct}
                    onChange={(v) => update(row.id, 'markdownPct', v)}
                    suffix="%"
                    placeholder="0"
                    error={!!tierError}
                  />
                  <CellInput
                    value={row.ltv90d}
                    onChange={(v) => update(row.id, 'ltv90d', v)}
                    prefix="£"
                    placeholder="0"
                  />
                  <CellInput
                    value={row.ltv180d}
                    onChange={(v) => update(row.id, 'ltv180d', v)}
                    prefix="£"
                    placeholder="0"
                  />
                  <CellInput
                    value={row.cac}
                    onChange={(v) => update(row.id, 'cac', v)}
                    prefix="£"
                    placeholder="—"
                  />
                  <CellInput
                    value={row.grossMarginPct}
                    onChange={(v) => update(row.id, 'grossMarginPct', v)}
                    suffix="%"
                    placeholder="—"
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
                {tierError && (
                  <p className="text-xs text-red-600 pt-0.5 pb-1">{tierError}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add product button */}
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

// ─── PAGE ─────────────────────────────────────────────────────────────────────

type ViewState = { view: 'input' } | { view: 'results'; results: EpeResults };

export function EntryPointEconomics() {
  const [rows, setRows] = useState<EpeFormRow[]>(() =>
    Array.from({ length: 3 }, emptyRow)
  );
  const [viewState, setViewState] = useState<ViewState>({ view: 'input' });

  const handleCalculate = () => {
    const results = calculate(rows);
    if (results) setViewState({ view: 'results', results });
  };

  const handleRecalculate = () => {
    setViewState({ view: 'input' });
  };

  return (
    <ToolLayout
      title="Entry Point Economics (EPE)"
      description="Understand which products are building your business and which are building a leaky funnel."
      metaDescription="Diagnose which first purchases are building long-term value and which are filling a leaky funnel. Free tool for DTC operators."
      wide
    >
      {viewState.view === 'input' ? (
        <div className="space-y-4">
          <div className="hidden sm:block -mb-1">
            <p className="text-xs text-slate-500">
              <span className="font-semibold text-slate-400 uppercase tracking-widest mr-2">Column key</span>
              FP% = Full price · EM% = Email exchange 10–15% · PR% = Promotional 20–25% · MK% = Markdown 30%+
            </p>
          </div>
          <InputForm rows={rows} onChange={setRows} />
          <p className="text-xs text-slate-400">
            Rows without a product name and volume are excluded from analysis.
            * CAC and GM % are optional — rows missing these fields are included with partial
            scoring.
          </p>
          <div className="flex justify-end">
            <button
              onClick={handleCalculate}
              className="bg-slate-900 text-white px-6 py-2.5 rounded text-sm font-medium hover:bg-slate-800 transition-colors min-w-[160px]"
            >
              Calculate
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          {/* 1 — Blended EPE score */}
          <div>
            <SectionLabel>Blended EPE score</SectionLabel>
            <BlendedScore score={viewState.results.blendedEpeScore} />
          </div>

          {/* 2 — Insights */}
          <InsightsBlock
            products={viewState.results.products}
            totalVolume={viewState.results.totalVolume}
          />

          {/* 3 — Per product EPE scores */}
          <div>
            <SectionLabel>Per product EPE scores</SectionLabel>
            <ProductTable products={viewState.results.products} />
          </div>

          {/* 4 — Payback period */}
          <PaybackTable products={viewState.results.products} />

          {/* 5 — Discount tier summary */}
          <TierSummary
            products={viewState.results.products}
            totalVolume={viewState.results.totalVolume}
          />

          {/* Recalculate */}
          <div className="flex sm:justify-end pt-4 border-t border-slate-200">
            <button
              onClick={handleRecalculate}
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
