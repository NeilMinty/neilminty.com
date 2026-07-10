import { useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import type {
  CatalogueResult, CategoryPriceRow, PriceTier,
  ComparisonResult, CategoryOverlapRow, ComparisonDeltas,
} from '@/logic/cataloguePriceLadderTypes';

const FUNCTIONS_URL = `${import.meta.env.VITE_NEILMINTY_SUPABASE_URL as string}/functions/v1`;

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function fmtPrice(n: number): string {
  return new Intl.NumberFormat('en', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

// ─── PRICE LADDER ─────────────────────────────────────────────────────────────

const TIERS: Array<{
  key:    keyof CatalogueResult['priceLadder'];
  label:  string;
  border: string;
  text:   string;
  sub:    string;
}> = [
  { key: 'entry',   label: 'Entry',   border: 'border-slate-400', text: 'text-slate-700', sub: 'text-slate-500' },
  { key: 'core',    label: 'Core',    border: 'border-blue-500',  text: 'text-blue-800',  sub: 'text-blue-600'  },
  { key: 'premium', label: 'Premium', border: 'border-amber-500', text: 'text-amber-800', sub: 'text-amber-600' },
];

function PriceLadderPanel({ priceLadder }: { priceLadder: CatalogueResult['priceLadder'] }) {
  return (
    <div className="border border-slate-200 rounded-lg shadow-card px-5 pt-5 pb-4">
      <p className="text-sm font-semibold text-slate-900 mb-1">Price ladder</p>
      <p className="text-xs text-slate-400 mb-4">Prices in store currency. Tiers split by product count — bottom third, middle third, top third.</p>
      <div className="grid grid-cols-3 gap-3">
        {TIERS.map(({ key, label, border, text, sub }) => {
          const tier = priceLadder[key] as PriceTier | null;
          return (
            <div key={key} className={`border-l-4 ${border} pl-3 py-1`}>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${sub}`}>{label}</p>
              {tier ? (
                <>
                  <p className={`text-base font-semibold font-mono ${text}`}>{fmtPrice(tier.min)}</p>
                  {tier.max !== tier.min && (
                    <p className={`text-xs ${sub}`}>up to {fmtPrice(tier.max)}</p>
                  )}
                </>
              ) : (
                <p className="text-xs text-slate-400">—</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── CATEGORY PRICE TABLE ─────────────────────────────────────────────────────

function CategoryPriceTable({ rows }: { rows: CategoryPriceRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="border border-slate-200 rounded-lg shadow-card px-5 pt-5 pb-4">
      <p className="text-sm font-semibold text-slate-900 mb-1">By category</p>
      <p className="text-xs text-slate-400 mb-4">Min – max price per category, sorted by product count.</p>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-slate-400 border-b border-slate-100">
            <th className="pb-2 font-medium">Category</th>
            <th className="pb-2 font-medium text-right">Products</th>
            <th className="pb-2 font-medium text-right">Range</th>
            <th className="pb-2 font-medium text-right">Median</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.type} className="border-b border-slate-50 last:border-0">
              <td className="py-2 text-slate-700 pr-4 truncate max-w-[180px]">{row.type}</td>
              <td className="py-2 text-slate-500 text-right tabular-nums">{row.count}</td>
              <td className="py-2 text-slate-700 text-right font-mono tabular-nums whitespace-nowrap">
                {fmtPrice(row.min)}{row.max !== row.min ? `–${fmtPrice(row.max)}` : ''}
              </td>
              <td className="py-2 text-slate-500 text-right font-mono tabular-nums">{fmtPrice(row.median)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── COMPARE: PRICE LADDER ────────────────────────────────────────────────────

function ComparePriceLadderPanel({
  dataA, dataB, domainA, domainB,
}: { dataA: CatalogueResult; dataB: CatalogueResult; domainA: string; domainB: string }) {
  return (
    <div className="border border-slate-200 rounded-lg shadow-card px-5 pt-5 pb-4">
      <p className="text-sm font-semibold text-slate-900 mb-4">Price ladder</p>
      <div className="grid grid-cols-[80px_1fr_1fr] gap-x-4 gap-y-2 text-sm">
        <div />
        <p className="text-xs font-medium text-slate-500 truncate">{domainA}</p>
        <p className="text-xs font-medium text-slate-500 truncate">{domainB}</p>
        {TIERS.map(({ key, label, border, text, sub }) => {
          const tA = dataA.priceLadder[key] as PriceTier | null;
          const tB = dataB.priceLadder[key] as PriceTier | null;
          return [
            <p key={`${key}-label`} className={`text-xs font-semibold uppercase tracking-wide self-center ${sub}`}>{label}</p>,
            <div key={`${key}-a`} className={`border-l-4 ${border} pl-3 py-1`}>
              {tA ? (
                <>
                  <p className={`text-sm font-semibold font-mono ${text}`}>{fmtPrice(tA.min)}</p>
                  {tA.max !== tA.min && <p className={`text-xs ${sub}`}>up to {fmtPrice(tA.max)}</p>}
                </>
              ) : <p className="text-xs text-slate-400">—</p>}
            </div>,
            <div key={`${key}-b`} className={`border-l-4 ${border} pl-3 py-1`}>
              {tB ? (
                <>
                  <p className={`text-sm font-semibold font-mono ${text}`}>{fmtPrice(tB.min)}</p>
                  {tB.max !== tB.min && <p className={`text-xs ${sub}`}>up to {fmtPrice(tB.max)}</p>}
                </>
              ) : <p className="text-xs text-slate-400">—</p>}
            </div>,
          ];
        })}
      </div>
    </div>
  );
}

// ─── COMPARE: DELTA STRIP ─────────────────────────────────────────────────────

function DeltaItem({ label, a, b, note }: { label: string; a: string; b: string; note: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-mono text-slate-900">{a} <span className="text-slate-400">·</span> {b}</p>
      <p className="text-xs text-slate-500">{note}</p>
    </div>
  );
}

function DeltaStrip({ deltas, dataA, dataB, domainA, domainB }: {
  deltas: ComparisonDeltas;
  dataA:  CatalogueResult;
  dataB:  CatalogueResult;
  domainA: string;
  domainB: string;
}) {
  const medianNote = deltas.medianPriceGapAbs === 0
    ? 'Same median'
    : deltas.medianPriceGapAbs > 0
      ? `${domainB} higher by ${fmtPrice(Math.abs(deltas.medianPriceGapAbs))}`
      : `${domainA} higher by ${fmtPrice(Math.abs(deltas.medianPriceGapAbs))}`;

  const discGap = Math.abs(deltas.discountRateGap);
  const discNote = discGap < 0.5
    ? 'Same discount rate'
    : deltas.discountRateGap > 0
      ? `${domainB} discounts ${discGap.toFixed(1)}pp more`
      : `${domainA} discounts ${discGap.toFixed(1)}pp more`;

  const twA = deltas.tierWidthRatioA;
  const twB = deltas.tierWidthRatioB;
  const ladderNote = twA === twB ? 'Same span' : twA < twB ? `${domainA} has tighter ladder` : `${domainB} has tighter ladder`;

  const shared  = deltas.sharedCategories.length;
  const uA      = deltas.uniqueToA.length;
  const uB      = deltas.uniqueToB.length;
  const overlapNote = `${shared} shared · ${uA} only ${domainA} · ${uB} only ${domainB}`;

  return (
    <div className="border border-slate-200 rounded-lg shadow-card px-5 py-4 bg-slate-50 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
      <DeltaItem
        label="Median price"
        a={fmtPrice(dataA.medianPrice ?? 0)}
        b={fmtPrice(dataB.medianPrice ?? 0)}
        note={medianNote}
      />
      <DeltaItem
        label="Discount rate"
        a={`${dataA.discountIntensity.pctDiscounted}%`}
        b={`${dataB.discountIntensity.pctDiscounted}%`}
        note={discNote}
      />
      <DeltaItem
        label="Ladder span"
        a={String(twA)}
        b={String(twB)}
        note={ladderNote}
      />
      <DeltaItem
        label="Categories"
        a={`${dataA.categoryPriceLadder.length} types`}
        b={`${dataB.categoryPriceLadder.length} types`}
        note={overlapNote}
      />
    </div>
  );
}

// ─── COMPARE: CATEGORY GRID ───────────────────────────────────────────────────

function MergedCategoryGrid({ rows, domainA, domainB }: {
  rows:    CategoryOverlapRow[];
  domainA: string;
  domainB: string;
}) {
  if (rows.length === 0) return null;

  const sharedRows = rows.filter(r => r.onlyIn === null);
  const onlyARows  = rows.filter(r => r.onlyIn === 'a');
  const onlyBRows  = rows.filter(r => r.onlyIn === 'b');

  const Cell = ({ d }: { d: CategoryOverlapRow['a'] }) =>
    d ? (
      <span className="font-mono">{d.count} · {fmtPrice(d.min)}–{fmtPrice(d.max)}<span className="text-slate-400"> ({fmtPrice(d.median)})</span></span>
    ) : (
      <span className="text-slate-300">—</span>
    );

  const Row = ({ r, flag }: { r: CategoryOverlapRow; flag?: string }) => (
    <tr className="border-b border-slate-50 last:border-0">
      <td className="py-2 pr-4 text-slate-700 truncate max-w-[140px]">
        {r.type}{flag ? <span className="ml-1.5 text-xs text-slate-400">{flag}</span> : null}
      </td>
      <td className="py-2 pr-4 text-xs text-slate-600"><Cell d={r.a} /></td>
      <td className="py-2 text-xs text-slate-600"><Cell d={r.b} /></td>
    </tr>
  );

  return (
    <div className="border border-slate-200 rounded-lg shadow-card px-5 pt-5 pb-4">
      <p className="text-sm font-semibold text-slate-900 mb-1">By category</p>
      <p className="text-xs text-slate-400 mb-4">Count · min–max (median). Shared categories first, sorted by combined count.</p>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-slate-400 border-b border-slate-100">
            <th className="pb-2 font-medium">Category</th>
            <th className="pb-2 font-medium">{domainA}</th>
            <th className="pb-2 font-medium">{domainB}</th>
          </tr>
        </thead>
        <tbody>
          {sharedRows.map(r => <Row key={r.type} r={r} />)}
          {onlyARows.map(r => <Row key={r.type} r={r} flag={`only ${domainA}`} />)}
          {onlyBRows.map(r => <Row key={r.type} r={r} flag={`only ${domainB}`} />)}
        </tbody>
      </table>
    </div>
  );
}

// ─── COMPARE: BRIEF ───────────────────────────────────────────────────────────

function ComparisonBrief({ brief }: { brief: ComparisonResult['brief'] }) {
  return (
    <div className="border border-slate-200 rounded-lg shadow-card px-5 pt-5 pb-4 space-y-5">
      <p className="text-sm font-semibold text-slate-900">Brief</p>
      {brief.map((section) => {
        const isClosing = section.title === 'Closing line';
        return (
          <div key={section.title} className="border-t border-slate-100 pt-4 first:border-0 first:pt-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{section.title}</p>
            {isClosing ? (
              <p className="text-base font-medium text-slate-900 leading-relaxed border-l-4 border-slate-900 pl-4">
                {section.body}
              </p>
            ) : (
              <p className="text-sm text-slate-700 leading-relaxed">{section.body}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

type ViewState =
  | { view: 'input' }
  | { view: 'loading' }
  | { view: 'comparing' }
  | { view: 'results'; data: CatalogueResult }
  | { view: 'comparison'; data: ComparisonResult };

export function CataloguePriceLadder() {
  const [state, setState]       = useState<ViewState>({ view: 'input' });
  const [mode, setMode]         = useState<'single' | 'compare'>('single');
  const [urlInput, setUrlInput] = useState('');
  const [urlInputB, setUrlInputB] = useState('');
  const [error, setError]       = useState<string | null>(null);
  const [errorA, setErrorA]     = useState<string | null>(null);
  const [errorB, setErrorB]     = useState<string | null>(null);

  const isLoading = state.view === 'loading' || state.view === 'comparing';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = urlInput.trim();
    if (!raw) return;
    setError(null);
    setState({ view: 'loading' });

    try {
      const resp = await fetch(`${FUNCTIONS_URL}/catalogue-price-ladder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: raw }),
      });
      const data = await resp.json() as { success: boolean; error?: string } & CatalogueResult;
      if (!data.success || data.error) {
        setError(data.error ?? 'Something went wrong. Try again.');
        setState({ view: 'input' });
        return;
      }
      setState({ view: 'results', data });
    } catch {
      setError('Request failed. Check your connection and try again.');
      setState({ view: 'input' });
    }
  };

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawA = urlInput.trim();
    const rawB = urlInputB.trim();
    if (!rawA || !rawB) return;
    setError(null);
    setErrorA(null);
    setErrorB(null);
    setState({ view: 'comparing' });

    try {
      const resp = await fetch(`${FUNCTIONS_URL}/catalogue-compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urlA: rawA, urlB: rawB }),
      });
      const data = await resp.json() as {
        success: boolean;
        errorA?: string | null;
        errorB?: string | null;
        error?: string;
      } & ComparisonResult;
      if (!data.success) {
        if (data.errorA) setErrorA(data.errorA);
        if (data.errorB) setErrorB(data.errorB);
        if (!data.errorA && !data.errorB) setError(data.error ?? 'Something went wrong. Try again.');
        setState({ view: 'input' });
        return;
      }
      setState({ view: 'comparison', data });
    } catch {
      setError('Request failed. Check your connection and try again.');
      setState({ view: 'input' });
    }
  };

  const switchMode = (m: 'single' | 'compare') => {
    setMode(m);
    setError(null);
    setErrorA(null);
    setErrorB(null);
  };

  const reset = () => {
    setState({ view: 'input' });
    setError(null);
    setErrorA(null);
    setErrorB(null);
  };

  return (
    <ToolLayout
      title="Catalogue Price Ladder"
      description="Paste a competitor's Shopify URL. Get their price ladder and product mix back in seconds — no manual click-through."
      metaDescription="Analyse a competitor's Shopify catalogue. See their price ladder, product mix, and get a short strategic brief — from a single URL."
      wide
    >
      <div className="space-y-8">

        {/* ── Input / Loading ──────────────────────────────────────────────── */}
        {(state.view === 'input' || isLoading) && (
          <div className="max-w-2xl space-y-4">

            {/* Mode toggle */}
            <div className="flex rounded border border-slate-200 overflow-hidden w-fit text-sm">
              <button
                type="button"
                onClick={() => switchMode('single')}
                disabled={isLoading}
                className={`px-4 py-1.5 font-medium transition-colors disabled:opacity-50 ${mode === 'single' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:text-slate-800'}`}
              >
                Single domain
              </button>
              <button
                type="button"
                onClick={() => switchMode('compare')}
                disabled={isLoading}
                className={`px-4 py-1.5 font-medium transition-colors disabled:opacity-50 ${mode === 'compare' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:text-slate-800'}`}
              >
                Compare
              </button>
            </div>

            {mode === 'single' ? (
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="competitor.com"
                  disabled={isLoading}
                  className="flex-1 border border-slate-200 rounded px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-50 disabled:bg-slate-50"
                />
                <button
                  type="submit"
                  disabled={isLoading || !urlInput.trim()}
                  className="bg-slate-900 text-white px-5 py-2 rounded text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {isLoading ? 'Analysing…' : 'Analyse →'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleCompare} className="space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <input
                      type="text"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="store-a.com"
                      disabled={isLoading}
                      className={`w-full border rounded px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-50 disabled:bg-slate-50 ${errorA ? 'border-red-300' : 'border-slate-200'}`}
                    />
                    {errorA && <p className="text-xs text-red-600">{errorA}</p>}
                  </div>
                  <div className="flex-1 space-y-1">
                    <input
                      type="text"
                      value={urlInputB}
                      onChange={(e) => setUrlInputB(e.target.value)}
                      placeholder="store-b.com"
                      disabled={isLoading}
                      className={`w-full border rounded px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-50 disabled:bg-slate-50 ${errorB ? 'border-red-300' : 'border-slate-200'}`}
                    />
                    {errorB && <p className="text-xs text-red-600">{errorB}</p>}
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || !urlInput.trim() || !urlInputB.trim()}
                    className="bg-slate-900 text-white px-5 py-2 rounded text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {isLoading ? 'Comparing…' : 'Compare →'}
                  </button>
                </div>
              </form>
            )}

            {error && (
              <p className="text-sm text-red-600 border border-red-200 bg-red-50 rounded px-3 py-2">
                {error}
              </p>
            )}

            {isLoading && (
              <p className="text-sm text-slate-400">
                Fetching {mode === 'compare' ? 'catalogues' : 'catalogue'} and generating brief — usually under 15 seconds.
              </p>
            )}

            <p className="text-xs text-slate-400">
              Works with public Shopify stores only. Password-protected and non-Shopify stores are not supported.
            </p>
          </div>
        )}

        {/* ── Single results ───────────────────────────────────────────────── */}
        {state.view === 'results' && (
          <div className="space-y-6">

            <div>
              <p className="text-base font-semibold text-slate-900">{state.data.storeDomain}</p>
              <p className="text-sm text-slate-500">{state.data.productCount} products in catalogue</p>
            </div>

            <PriceLadderPanel priceLadder={state.data.priceLadder} />
            <CategoryPriceTable rows={state.data.categoryPriceLadder} />

            <div className="border border-slate-200 rounded-lg shadow-card px-5 pt-5 pb-4 space-y-5">
              <p className="text-sm font-semibold text-slate-900">Brief</p>
              {state.data.brief.map((section) => (
                <div key={section.title} className="border-t border-slate-100 pt-4 first:border-0 first:pt-0">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{section.title}</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{section.body}</p>
                </div>
              ))}
            </div>

            <p className="text-sm">
              <button onClick={reset} className="text-slate-400 hover:text-slate-700 transition-colors underline underline-offset-2">
                Analyse another store
              </button>
            </p>

            <p className="text-xs text-slate-400 text-center pb-2">
              Data is pulled live from the store's public product catalogue and not stored. Does not work for password-protected or non-Shopify stores.
            </p>
          </div>
        )}

        {/* ── Comparison results ───────────────────────────────────────────── */}
        {state.view === 'comparison' && (
          <div className="space-y-6">

            <div>
              <p className="text-base font-semibold text-slate-900">
                {state.data.domainA} <span className="text-slate-400 font-normal">vs</span> {state.data.domainB}
              </p>
              <p className="text-sm text-slate-500">
                {state.data.dataA.productCount} products · {state.data.dataB.productCount} products
              </p>
            </div>

            <ComparePriceLadderPanel
              dataA={state.data.dataA}
              dataB={state.data.dataB}
              domainA={state.data.domainA}
              domainB={state.data.domainB}
            />

            <DeltaStrip
              deltas={state.data.deltas}
              dataA={state.data.dataA}
              dataB={state.data.dataB}
              domainA={state.data.domainA}
              domainB={state.data.domainB}
            />

            <MergedCategoryGrid
              rows={state.data.mergedCategoryGrid}
              domainA={state.data.domainA}
              domainB={state.data.domainB}
            />

            <ComparisonBrief brief={state.data.brief} />

            <p className="text-sm">
              <button onClick={reset} className="text-slate-400 hover:text-slate-700 transition-colors underline underline-offset-2">
                Compare different stores
              </button>
            </p>

            <p className="text-xs text-slate-400 text-center pb-2">
              Data is pulled live from both stores' public product catalogues and not stored.
            </p>
          </div>
        )}

      </div>
    </ToolLayout>
  );
}
