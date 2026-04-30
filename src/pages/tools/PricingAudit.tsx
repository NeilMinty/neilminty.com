import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { ToolLayout } from '@/components/ToolLayout';
import { cn } from '@/lib/utils';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface CategoryRow {
  id: string;
  name: string;
  priceFrom: string;
  priceTo: string;
  margin: string;
  role: string;
}

interface DiscountRow {
  id: string;
  type: string;
  depth: string;
  frequency: string;
}

type PromoOnMarkdown = 'yes' | 'no' | 'sometimes';

type ViewState =
  | { state: 'input' }
  | { state: 'loading'; msg: string }
  | { state: 'results'; data: AuditResult }
  | { state: 'error'; message: string };

interface AuditResult {
  architectureScore: number;
  architectureSummary: string;
  cannibalisation: string | null;
  ladderGaps: string;
  competitivePosition: string;
  headroomAmount: string;
  headroomRationale: string;
  stackingRisk: string;
  actions: Array<{ priority: number; action: string; impact: string }>;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://vktjzvrznkwhppbkslaf.supabase.co';

const PRICE_TIERS = ['Budget', 'Mid-market', 'Premium', 'Luxury'] as const;
const CATEGORY_ROLES = ['Entry', 'Core', 'Hero', 'Premium'] as const;
const DISCOUNT_TYPES = [
  { value: 'sale', label: 'Sale / markdown' },
  { value: 'promo_code', label: 'Promotional code' },
  { value: 'bundle', label: 'Bundle' },
  { value: 'loyalty', label: 'Loyalty / member' },
  { value: 'clearance', label: 'Clearance' },
] as const;

const CAT_GRID = '1fr 5.5rem 5.5rem 5rem 6.5rem 2rem';
const DISC_GRID = '10rem 5rem 1fr 2rem';

const CAT_HEADERS = [
  { label: 'Category name', align: 'left' as const },
  { label: '£ from', align: 'right' as const },
  { label: '£ to', align: 'right' as const },
  { label: 'Margin %', align: 'right' as const },
  { label: 'Role', align: 'left' as const },
  { label: '', align: 'right' as const },
];

const DISC_HEADERS = [
  { label: 'Type', align: 'left' as const },
  { label: 'Depth %', align: 'right' as const },
  { label: 'Frequency', align: 'left' as const },
  { label: '', align: 'right' as const },
];

// ─── ROW FACTORIES ────────────────────────────────────────────────────────────

function emptyCategory(): CategoryRow {
  return { id: crypto.randomUUID(), name: '', priceFrom: '', priceTo: '', margin: '', role: '' };
}

function emptyDiscount(): DiscountRow {
  return { id: crypto.randomUUID(), type: '', depth: '', frequency: '' };
}

// ─── SHARED HELPERS ───────────────────────────────────────────────────────────

function FieldLabel({ text }: { text: string }) {
  return (
    <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">{text}</p>
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
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  type?: 'number' | 'text';
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

// ─── CATEGORY ROWS ────────────────────────────────────────────────────────────

function CategoryRows({
  rows,
  onChange,
}: {
  rows: CategoryRow[];
  onChange: (rows: CategoryRow[]) => void;
}) {
  const update = useCallback(
    (id: string, field: keyof CategoryRow, value: string) => {
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
    onChange([...rows, emptyCategory()]);
  }, [rows, onChange]);

  const roleSelect = (id: string, value: string) => (
    <select
      value={value}
      onChange={(e) => update(id, 'role', e.target.value)}
      className="w-full border border-slate-200 rounded bg-white text-sm text-slate-900 outline-none focus:border-slate-400 transition-colors py-1.5 px-2"
    >
      <option value="">Select</option>
      {CATEGORY_ROLES.map((r) => (
        <option key={r} value={r.toLowerCase()}>{r}</option>
      ))}
    </select>
  );

  return (
    <div>
      {/* ── Mobile card layout ── */}
      <div className="sm:hidden space-y-3">
        {rows.map((row, idx) => (
          <div key={row.id} className="border border-slate-200 rounded-lg p-3 space-y-2.5 bg-white">
            <div className="flex gap-2 items-start">
              <div className="flex-1">
                <FieldLabel text="Category name" />
                <CellInput
                  type="text"
                  value={row.name}
                  onChange={(v) => update(row.id, 'name', v)}
                  placeholder={`Category ${idx + 1}`}
                />
              </div>
              <button
                onClick={() => remove(row.id)}
                disabled={rows.length <= 1}
                className="mt-5 h-7 w-7 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Remove category"
              >
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <FieldLabel text="£ from" />
                <CellInput value={row.priceFrom} onChange={(v) => update(row.id, 'priceFrom', v)} prefix="£" placeholder="0" />
              </div>
              <div>
                <FieldLabel text="£ to" />
                <CellInput value={row.priceTo} onChange={(v) => update(row.id, 'priceTo', v)} prefix="£" placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <FieldLabel text="Margin %" />
                <CellInput value={row.margin} onChange={(v) => update(row.id, 'margin', v)} suffix="%" placeholder="0" />
              </div>
              <div>
                <FieldLabel text="Role" />
                {roleSelect(row.id, row.role)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Desktop grid layout ── */}
      <div className="hidden sm:block overflow-x-auto">
        <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: CAT_GRID, minWidth: '560px' }}>
          {CAT_HEADERS.map((h, i) => (
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
        <div className="space-y-2" style={{ minWidth: '560px' }}>
          {rows.map((row, idx) => (
            <div key={row.id} className="grid gap-2 items-center" style={{ gridTemplateColumns: CAT_GRID }}>
              <CellInput
                type="text"
                value={row.name}
                onChange={(v) => update(row.id, 'name', v)}
                placeholder={`Category ${idx + 1}`}
              />
              <CellInput value={row.priceFrom} onChange={(v) => update(row.id, 'priceFrom', v)} prefix="£" placeholder="0" />
              <CellInput value={row.priceTo} onChange={(v) => update(row.id, 'priceTo', v)} prefix="£" placeholder="0" />
              <CellInput value={row.margin} onChange={(v) => update(row.id, 'margin', v)} suffix="%" placeholder="0" />
              {roleSelect(row.id, row.role)}
              <button
                onClick={() => remove(row.id)}
                disabled={rows.length <= 1}
                className="h-7 w-7 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Remove category"
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
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <Plus size={14} />
          Add category
        </button>
      </div>
    </div>
  );
}

// ─── DISCOUNT ROWS ────────────────────────────────────────────────────────────

function DiscountRows({
  rows,
  onChange,
}: {
  rows: DiscountRow[];
  onChange: (rows: DiscountRow[]) => void;
}) {
  const update = useCallback(
    (id: string, field: keyof DiscountRow, value: string) => {
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
    onChange([...rows, emptyDiscount()]);
  }, [rows, onChange]);

  const typeSelect = (id: string, value: string) => (
    <select
      value={value}
      onChange={(e) => update(id, 'type', e.target.value)}
      className="w-full border border-slate-200 rounded bg-white text-sm text-slate-900 outline-none focus:border-slate-400 transition-colors py-1.5 px-2"
    >
      <option value="">Select type</option>
      {DISCOUNT_TYPES.map((t) => (
        <option key={t.value} value={t.value}>{t.label}</option>
      ))}
    </select>
  );

  return (
    <div>
      {/* ── Mobile card layout ── */}
      <div className="sm:hidden space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="border border-slate-200 rounded-lg p-3 space-y-2.5 bg-white">
            <div className="flex gap-2 items-start">
              <div className="flex-1">
                <FieldLabel text="Type" />
                {typeSelect(row.id, row.type)}
              </div>
              <button
                onClick={() => remove(row.id)}
                disabled={rows.length <= 1}
                className="mt-5 h-7 w-7 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Remove discount"
              >
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <FieldLabel text="Depth %" />
                <CellInput value={row.depth} onChange={(v) => update(row.id, 'depth', v)} suffix="%" placeholder="0" />
              </div>
              <div>
                <FieldLabel text="Frequency" />
                <CellInput
                  type="text"
                  value={row.frequency}
                  onChange={(v) => update(row.id, 'frequency', v)}
                  placeholder="e.g. quarterly"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Desktop grid layout ── */}
      <div className="hidden sm:block overflow-x-auto">
        <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: DISC_GRID, minWidth: '480px' }}>
          {DISC_HEADERS.map((h, i) => (
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
        <div className="space-y-2" style={{ minWidth: '480px' }}>
          {rows.map((row) => (
            <div key={row.id} className="grid gap-2 items-center" style={{ gridTemplateColumns: DISC_GRID }}>
              {typeSelect(row.id, row.type)}
              <CellInput value={row.depth} onChange={(v) => update(row.id, 'depth', v)} suffix="%" placeholder="0" />
              <CellInput
                type="text"
                value={row.frequency}
                onChange={(v) => update(row.id, 'frequency', v)}
                placeholder="e.g. quarterly"
              />
              <button
                onClick={() => remove(row.id)}
                disabled={rows.length <= 1}
                className="h-7 w-7 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Remove discount"
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
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <Plus size={14} />
          Add discount type
        </button>
      </div>
    </div>
  );
}

// ─── SCORE DISPLAY ────────────────────────────────────────────────────────────

function ScoreDisplay({ score }: { score: number }) {
  const { color, label } =
    score >= 7
      ? { color: '#2d6a4f', label: 'Healthy' }
      : score >= 4
        ? { color: '#b45309', label: 'At risk' }
        : { color: '#991b1b', label: 'Critical' };

  return (
    <div className="flex items-baseline gap-3">
      <span className="text-5xl font-bold tabular-nums leading-none" style={{ color }}>
        {score}
        <span className="text-2xl font-medium text-slate-300">/10</span>
      </span>
      <span
        className="text-sm font-semibold px-2 py-0.5 rounded border"
        style={{ color, borderColor: color, background: `${color}18` }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── FINDING CARD ─────────────────────────────────────────────────────────────

function FindingCard({
  label,
  text,
  highlight = false,
}: {
  label: string;
  text: string | null;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'border rounded-lg p-4',
        highlight ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'
      )}
    >
      <p
        className={cn(
          'text-xs uppercase tracking-widest font-semibold mb-2',
          highlight ? 'text-red-400' : 'text-slate-400'
        )}
      >
        {label}
      </p>
      <p className="text-sm text-slate-700 leading-relaxed">
        {text ?? 'No issues identified.'}
      </p>
    </div>
  );
}

// ─── API HELPERS ──────────────────────────────────────────────────────────────

async function runPerplexity(
  brandName: string,
  sector: string,
  priceTier: string,
  categories: CategoryRow[],
  competitors: string,
  sessionId: string
): Promise<string> {
  const categoryNames = categories
    .filter((c) => c.name.trim())
    .map((c) => c.name.trim())
    .join(', ');
  const competitorSentence = competitors.trim()
    ? `Key competitors: ${competitors.trim()}.`
    : '';

  const query = (
    `Current retail pricing in the UK ${sector} market for ${priceTier.toLowerCase()} positioning. ` +
    `Brand: ${brandName}. Categories: ${categoryNames}. ` +
    `Typical price points, discount practices and promotional norms. ` +
    competitorSentence
  ).trim();

  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!supabaseKey) throw new Error('Supabase key not configured');

  const res = await fetch(`${SUPABASE_URL}/functions/v1/perplexity-research`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      query,
      context: `${priceTier} ${sector} brand pricing analysis`,
      sessionId,
    }),
  });

  if (!res.ok) throw new Error(`Perplexity request failed (${res.status})`);
  const data = await res.json();

  if (data.success && Array.isArray(data.insights) && data.insights.length > 0) {
    return data.insights
      .map((i: { title: string; summary: string }) => `${i.title}: ${i.summary}`)
      .join('\n');
  }
  if (typeof data.summary === 'string') return data.summary;
  return 'Market intelligence unavailable — analysis based on inputs only.';
}

function buildPrompt(
  brandName: string,
  sector: string,
  priceTier: string,
  categories: CategoryRow[],
  discounts: DiscountRow[],
  promoOnMarkdown: PromoOnMarkdown,
  marketIntel: string
): string {
  const catLines = categories
    .filter((c) => c.name.trim())
    .map(
      (c) =>
        `  - ${c.name}: £${c.priceFrom || '?'}–£${c.priceTo || '?'}, margin ${c.margin || 'unknown'}%, role: ${c.role || 'unspecified'}`
    )
    .join('\n');

  const discLines = discounts
    .filter((d) => d.type)
    .map(
      (d) =>
        `  - ${d.type}: ${d.depth || '?'}% depth, frequency: ${d.frequency || 'unspecified'}`
    )
    .join('\n');

  const stackingNote =
    promoOnMarkdown === 'yes'
      ? 'IMPORTANT: This brand runs promotional codes on already-marked-down product. This is a stacking risk — flag the margin impact clearly in stackingRisk.'
      : promoOnMarkdown === 'sometimes'
        ? 'Note: This brand sometimes runs promotional codes on marked-down product — flag as a potential stacking risk in stackingRisk.'
        : '';

  return `You are a pricing strategy analyst. Analyse this brand's pricing architecture and return JSON only — no markdown, no preamble, no explanation.

Brand: ${brandName}
Sector: ${sector}
Price tier positioning: ${priceTier}

Category architecture:
${catLines || '  (none provided)'}

Discount structure:
${discLines || '  (none provided)'}

Promotional stacking: ${promoOnMarkdown}
${stackingNote}

Market intelligence:
${marketIntel}

Return ONLY this exact JSON schema:
{
  "architectureScore": <integer 1-10>,
  "architectureSummary": "<2-3 sentences summarising the overall architecture health>",
  "cannibalisation": "<finding, or null if none identified>",
  "ladderGaps": "<finding>",
  "competitivePosition": "<finding>",
  "headroomAmount": "<£ range or % estimate of available headroom>",
  "headroomRationale": "<1-2 sentences>",
  "stackingRisk": "<finding — flag clearly if stacking is occurring>",
  "actions": [
    { "priority": 1, "action": "<string>", "impact": "<commercial impact string>" },
    { "priority": 2, "action": "<string>", "impact": "<commercial impact string>" },
    { "priority": 3, "action": "<string>", "impact": "<commercial impact string>" }
  ]
}`;
}

async function runClaude(prompt: string): Promise<AuditResult> {
  const anthropicKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
  if (!anthropicKey) throw new Error('Anthropic key not configured');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Analysis request failed (${res.status})`);
  const data = await res.json();

  const rawText: string = data.content?.[0]?.text ?? '';
  const start = rawText.indexOf('{');
  const end = rawText.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('Analysis failed. Check your inputs and try again.');
  }

  try {
    return JSON.parse(rawText.slice(start, end + 1)) as AuditResult;
  } catch {
    throw new Error('Analysis failed. Check your inputs and try again.');
  }
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export function PricingAudit() {
  const [brandName, setBrandName] = useState('');
  const [sector, setSector] = useState('');
  const [priceTier, setPriceTier] = useState('Mid-market');
  const [competitors, setCompetitors] = useState('');
  const [categories, setCategories] = useState<CategoryRow[]>(() => [emptyCategory()]);
  const [discounts, setDiscounts] = useState<DiscountRow[]>(() => [emptyDiscount()]);
  const [promoOnMarkdown, setPromoOnMarkdown] = useState<PromoOnMarkdown>('no');
  const [view, setView] = useState<ViewState>({ state: 'input' });

  const canSubmit =
    brandName.trim() !== '' &&
    sector.trim() !== '' &&
    categories.some((c) => c.name.trim() !== '' && c.priceFrom.trim() !== '');

  const isSubmitting = view.state === 'loading';

  const handleSubmit = async () => {
    const sessionId = `pa_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    setView({ state: 'loading', msg: 'Running competitive market sweep…' });

    let marketIntel = 'Market intelligence unavailable — analysis based on inputs only.';
    try {
      marketIntel = await runPerplexity(brandName, sector, priceTier, categories, competitors, sessionId);
    } catch {
      // non-blocking — continue with fallback string
    }

    setView({ state: 'loading', msg: 'Analysing pricing architecture…' });

    try {
      const prompt = buildPrompt(
        brandName, sector, priceTier, categories, discounts, promoOnMarkdown, marketIntel
      );
      const result = await runClaude(prompt);
      setView({ state: 'results', data: result });
    } catch (err) {
      setView({
        state: 'error',
        message: err instanceof Error ? err.message : 'Analysis failed. Check your inputs and try again.',
      });
    }
  };

  // ── Results view ──────────────────────────────────────────────────────────

  if (view.state === 'results') {
    const d = view.data;
    const stackingHighlight = promoOnMarkdown === 'yes';

    return (
      <ToolLayout
        title="Pricing Architecture Audit"
        description="Enter your category price architecture and discount structure. The tool runs a live competitive sweep and returns your pricing health score, cannibalisation risks, and the headroom your brand is leaving."
        metaDescription="Find out where your discount structure is eroding margin and how much headroom your pricing is leaving."
      >
        <div className="space-y-8">

          {/* Architecture score */}
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-3">
              Architecture score
            </p>
            <ScoreDisplay score={d.architectureScore} />
            <p className="mt-4 text-sm text-slate-700 leading-relaxed">{d.architectureSummary}</p>
          </div>

          {/* Headroom callout */}
          <div className="border-l-4 border-slate-900 bg-slate-50 rounded-r-lg px-5 py-4">
            <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">
              Pricing headroom
            </p>
            <p className="text-2xl font-bold text-slate-900 mb-2">{d.headroomAmount}</p>
            <p className="text-sm text-slate-600 leading-relaxed">{d.headroomRationale}</p>
          </div>

          {/* Findings grid */}
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-3">
              Findings
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FindingCard label="Cannibalisation" text={d.cannibalisation} />
              <FindingCard label="Ladder gaps" text={d.ladderGaps} />
              <FindingCard label="Competitive position" text={d.competitivePosition} />
              <FindingCard
                label="Stacking risk"
                text={d.stackingRisk}
                highlight={stackingHighlight}
              />
            </div>
          </div>

          {/* Priority actions */}
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-3">
              Priority actions
            </p>
            <div className="space-y-3">
              {d.actions.map((a) => (
                <div key={a.priority} className="border border-slate-200 rounded-lg px-4 py-4 bg-white">
                  <div className="flex gap-3 items-start">
                    <span className="text-xs font-bold text-slate-400 bg-slate-100 rounded w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                      {a.priority}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 mb-0.5">{a.action}</p>
                      <p className="text-xs text-slate-500">{a.impact}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Edit inputs */}
          <div className="flex sm:justify-end pt-4 border-t border-slate-200">
            <button
              onClick={() => setView({ state: 'input' })}
              className="w-full sm:w-auto border border-slate-200 text-slate-700 px-6 py-2.5 rounded text-sm font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors"
            >
              Edit inputs
            </button>
          </div>

          {/* Growth Engine CTA */}
          <div className="mt-8 pt-10 border-t border-slate-200">
            <p className="text-sm text-slate-500 leading-relaxed mb-4">
              This is one signal. Growth Engine tracks all of them — connected to your Shopify and Klaviyo data, updated continuously.
            </p>
            <div className="flex justify-end">
              <a
                href="https://demo.neilminty.com"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-slate-900 text-white px-6 py-2.5 rounded text-sm font-medium hover:bg-slate-800 transition-colors min-w-[160px]"
              >
                Explore the demo →
              </a>
            </div>
          </div>

          {/* Try this next */}
          <div className="pt-8 border-t border-slate-200">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
              Try this next
            </p>
            <Link
              to="/tools/first-purchase"
              className="group flex items-start justify-between gap-4 bg-white border border-slate-200 rounded-lg px-5 py-4 hover:border-slate-300 transition-colors shadow-card"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900 mb-1 group-hover:text-slate-700 transition-colors">
                  First Purchase Predictor
                </p>
                <p className="text-sm text-slate-500">
                  Your pricing architecture shapes which products you can acquire on. See which first purchase is building your customer base.
                </p>
              </div>
              <span className="text-sm text-slate-400 group-hover:text-slate-900 transition-colors whitespace-nowrap mt-0.5">
                Open →
              </span>
            </Link>
          </div>

        </div>
      </ToolLayout>
    );
  }

  // ── Input / loading / error view ─────────────────────────────────────────

  return (
    <ToolLayout
      title="Pricing Architecture Audit"
      description="Enter your category price architecture and discount structure. The tool runs a live competitive sweep and returns your pricing health score, cannibalisation risks, and the headroom your brand is leaving."
      metaDescription="Find out where your discount structure is eroding margin and how much headroom your pricing is leaving."
    >
      <div className="space-y-8">

        {/* Brand details */}
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-4">
            Brand details
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel text="Brand name" />
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g. Meridian"
                className="w-full border border-slate-200 rounded bg-white text-sm text-slate-900 outline-none focus:border-slate-400 transition-colors py-1.5 px-2"
              />
            </div>
            <div>
              <FieldLabel text="Sector" />
              <input
                type="text"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                placeholder="e.g. womenswear, outdoor apparel"
                className="w-full border border-slate-200 rounded bg-white text-sm text-slate-900 outline-none focus:border-slate-400 transition-colors py-1.5 px-2"
              />
            </div>
            <div>
              <FieldLabel text="Price tier positioning" />
              <select
                value={priceTier}
                onChange={(e) => setPriceTier(e.target.value)}
                className="w-full border border-slate-200 rounded bg-white text-sm text-slate-900 outline-none focus:border-slate-400 transition-colors py-1.5 px-2"
              >
                {PRICE_TIERS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">
                Known competitors{' '}
                <span className="normal-case tracking-normal font-normal">(optional)</span>
              </p>
              <input
                type="text"
                value={competitors}
                onChange={(e) => setCompetitors(e.target.value)}
                placeholder="Comma separated"
                className="w-full border border-slate-200 rounded bg-white text-sm text-slate-900 outline-none focus:border-slate-400 transition-colors py-1.5 px-2"
              />
            </div>
          </div>
        </div>

        {/* Category price architecture */}
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-4">
            Category price architecture
          </p>
          <CategoryRows rows={categories} onChange={setCategories} />
        </div>

        {/* Discount structure */}
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-4">
            Discount structure
          </p>
          <DiscountRows rows={discounts} onChange={setDiscounts} />
        </div>

        {/* Stacking toggle */}
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-2">
            Do you run promotional codes on already-marked-down product?
          </p>
          <div className="inline-flex rounded border border-slate-200 overflow-hidden">
            {(['yes', 'no', 'sometimes'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setPromoOnMarkdown(opt)}
                className={cn(
                  'px-4 py-1.5 text-sm font-medium transition-colors border-r border-slate-200 last:border-r-0',
                  promoOnMarkdown === opt
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-500 hover:bg-slate-50'
                )}
              >
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </button>
            ))}
          </div>
          {promoOnMarkdown === 'yes' && (
            <p className="mt-2 text-sm text-red-600">
              This is a stacking risk. The audit will flag the margin impact.
            </p>
          )}
        </div>

        {/* Submit */}
        <div>
          {view.state === 'error' && (
            <p className="text-sm text-red-600 mb-3">{view.message}</p>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {!canSubmit && (
              <p className="text-xs text-slate-400">
                Enter brand name, sector, and at least one category with a name and starting price.
              </p>
            )}
            <div className={cn('flex', canSubmit ? 'w-full sm:justify-end' : 'sm:justify-end')}>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || isSubmitting}
                className="w-full sm:w-auto bg-slate-900 text-white px-6 py-2.5 rounded text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[240px] text-center"
              >
                {isSubmitting && view.state === 'loading' ? view.msg : 'Run pricing audit'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </ToolLayout>
  );
}
