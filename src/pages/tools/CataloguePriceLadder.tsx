import { useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import type { CatalogueResult, PriceTier } from '@/logic/cataloguePriceLadderTypes';

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

// ─── PAGE ─────────────────────────────────────────────────────────────────────

type ViewState =
  | { view: 'input' }
  | { view: 'loading' }
  | { view: 'results'; data: CatalogueResult };

export function CataloguePriceLadder() {
  const [state, setState] = useState<ViewState>({ view: 'input' });
  const [urlInput, setUrlInput] = useState('');
  const [error, setError]       = useState<string | null>(null);

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

  const reset = () => {
    setState({ view: 'input' });
    setError(null);
  };

  return (
    <ToolLayout
      title="Catalogue Price Ladder"
      description="Paste a competitor's Shopify URL. Get their price ladder and product mix back in seconds — no manual click-through."
      metaDescription="Analyse a competitor's Shopify catalogue. See their price ladder, product mix, and get a short strategic brief — from a single URL."
      wide
    >
      <div className="space-y-8">

        {/* ── Input ────────────────────────────────────────────────────────── */}
        {(state.view === 'input' || state.view === 'loading') && (
          <div className="max-w-2xl space-y-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="competitor.com"
                disabled={state.view === 'loading'}
                className="flex-1 border border-slate-200 rounded px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-50 disabled:bg-slate-50"
              />
              <button
                type="submit"
                disabled={state.view === 'loading' || !urlInput.trim()}
                className="bg-slate-900 text-white px-5 py-2 rounded text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {state.view === 'loading' ? 'Analysing…' : 'Analyse →'}
              </button>
            </form>

            {error && (
              <p className="text-sm text-red-600 border border-red-200 bg-red-50 rounded px-3 py-2">
                {error}
              </p>
            )}

            {state.view === 'loading' && (
              <p className="text-sm text-slate-400">
                Fetching catalogue and generating brief — usually under 15 seconds.
              </p>
            )}

            <p className="text-xs text-slate-400">
              Works with public Shopify stores only. Password-protected and non-Shopify stores are not supported.
            </p>
          </div>
        )}

        {/* ── Results ──────────────────────────────────────────────────────── */}
        {state.view === 'results' && (
          <div className="space-y-6">

            {/* Header */}
            <div>
              <p className="text-base font-semibold text-slate-900">{state.data.storeDomain}</p>
              <p className="text-sm text-slate-500">{state.data.productCount} products in catalogue</p>
            </div>

            {/* Price ladder */}
            <PriceLadderPanel priceLadder={state.data.priceLadder} />

            {/* Brief */}
            <div className="border border-slate-200 rounded-lg shadow-card px-5 pt-5 pb-4 space-y-5">
              <p className="text-sm font-semibold text-slate-900">Brief</p>
              {state.data.brief.map((section) => (
                <div key={section.title} className="border-t border-slate-100 pt-4 first:border-0 first:pt-0">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{section.title}</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{section.body}</p>
                </div>
              ))}
            </div>

            {/* Reset */}
            <p className="text-sm">
              <button
                onClick={reset}
                className="text-slate-400 hover:text-slate-700 transition-colors underline underline-offset-2"
              >
                Analyse another store
              </button>
            </p>

            {/* Footer */}
            <p className="text-xs text-slate-400 text-center pb-2">
              Data is pulled live from the store's public product catalogue and not stored. Does not work for password-protected or non-Shopify stores.
            </p>
          </div>
        )}

      </div>
    </ToolLayout>
  );
}
