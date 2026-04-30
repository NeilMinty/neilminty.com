import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { ToolLayout } from '@/components/ToolLayout';
import { SectionLabel } from '@/components/SectionLabel';
import { InputField } from '@/components/InputField';
import { cn } from '@/lib/utils';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface CategoryRow {
  id: string;
  name: string;
  priceFrom: string;
  priceTo: string;
  margin: string;
  role: 'Entry' | 'Core' | 'Hero' | 'Premium';
}

interface DiscountRow {
  id: string;
  type: 'Sale / markdown' | 'Promotional code' | 'Bundle' | 'Loyalty / member' | 'Clearance';
  depth: string;
  frequency: string;
}

interface AuditResults {
  architectureScore: number;
  architectureSummary: string;
  cannibalisation: string;
  ladderGaps: string;
  competitivePosition: string;
  headroomAmount: string;
  headroomRationale: string;
  stackingRisk: string;
  actions: Array<{ priority: number; action: string; impact: string }>;
}

type PriceTier = 'Budget' | 'Mid-market' | 'Premium' | 'Luxury';
type StackingAnswer = 'yes' | 'no' | 'sometimes';

interface FormState {
  brandName: string;
  sector: string;
  priceTier: PriceTier;
  competitors: string;
  categories: CategoryRow[];
  discounts: DiscountRow[];
  promoOnMarkdown: StackingAnswer;
}

type ViewState =
  | { view: 'input' }
  | { view: 'loading'; loadingMsg: string }
  | { view: 'results'; results: AuditResults; promoOnMarkdown: StackingAnswer }
  | { view: 'error'; message: string };

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://vktjzvrznkwhppbkslaf.supabase.co';
const CATEGORY_ROLES = ['Entry', 'Core', 'Hero', 'Premium'] as const;
const DISCOUNT_TYPES = ['Sale / markdown', 'Promotional code', 'Bundle', 'Loyalty / member', 'Clearance'] as const;

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function emptyCategoryRow(): CategoryRow {
  return { id: crypto.randomUUID(), name: '', priceFrom: '', priceTo: '', margin: '', role: 'Core' };
}

function emptyDiscountRow(): DiscountRow {
  return { id: crypto.randomUUID(), type: 'Promotional code', depth: '', frequency: '' };
}

function generateSessionId(): string {
  return `pa_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ─── INLINE CELL INPUT ────────────────────────────────────────────────────────

function CellInput({
  value, onChange, placeholder, prefix, suffix, type = 'text',
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  prefix?: string; suffix?: string; type?: 'number' | 'text';
}) {
  return (
    <div className="relative flex items-center">
      {prefix && (
        <span className="absolute left-2 text-xs text-slate-400 pointer-events-none select-none">{prefix}</span>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? ''}
        className={cn(
          'w-full border border-slate-200 rounded bg-white text-sm text-slate-900 outline-none focus:border-slate-400 transition-colors py-1.5',
          prefix ? 'pl-5 pr-2' : 'px-2',
          suffix ? 'pr-6' : '',
        )}
      />
      {suffix && (
        <span className="absolute right-2 text-xs text-slate-400 pointer-events-none select-none">{suffix}</span>
      )}
    </div>
  );
}

// ─── CATEGORY ROWS ────────────────────────────────────────────────────────────

const CAT_COLS = '1fr 5.5rem 5.5rem 5rem 6.5rem 2rem';
const CAT_COL_HEADERS = ['Category', 'From', 'To', 'Margin', 'Role', ''];

function CategoryRows({ rows, onChange }: { rows: CategoryRow[]; onChange: (r: CategoryRow[]) => void }) {
  const update = (id: string, field: keyof CategoryRow, value: string) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  const remove = (id: string) => { if (rows.length > 1) onChange(rows.filter((r) => r.id !== id)); };
  const add = () => onChange([...rows, emptyCategoryRow()]);

  const fieldLabel = (text: string) => (
    <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">{text}</p>
  );

  return (
    <div>
      {/* Mobile */}
      <div className="sm:hidden space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="border border-slate-200 rounded-lg p-3 space-y-2.5 bg-white">
            <div className="flex gap-2 items-start">
              <div className="flex-1">
                {fieldLabel('Category name')}
                <CellInput type="text" value={row.name} onChange={(v) => update(row.id, 'name', v)} placeholder="e.g. Outerwear" />
              </div>
              <button onClick={() => remove(row.id)} disabled={rows.length <= 1} className="mt-5 h-7 w-7 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" aria-label="Remove category">
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>{fieldLabel('From')}<CellInput type="number" value={row.priceFrom} onChange={(v) => update(row.id, 'priceFrom', v)} prefix="£" placeholder="0" /></div>
              <div>{fieldLabel('To')}<CellInput type="number" value={row.priceTo} onChange={(v) => update(row.id, 'priceTo', v)} prefix="£" placeholder="0" /></div>
              <div>{fieldLabel('Margin')}<CellInput type="number" value={row.margin} onChange={(v) => update(row.id, 'margin', v)} suffix="%" placeholder="0" /></div>
            </div>
            <div>
              {fieldLabel('Role')}
              <select value={row.role} onChange={(e) => update(row.id, 'role', e.target.value)}
                className="w-full border border-slate-200 rounded bg-white text-sm text-slate-900 px-2 py-1.5 outline-none focus:border-slate-400 transition-colors">
                {CATEGORY_ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop */}
      <div className="hidden sm:block overflow-x-auto">
        <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: CAT_COLS, minWidth: '520px' }}>
          {CAT_COL_HEADERS.map((h, i) => (
            <span key={i} className="text-xs uppercase tracking-widest text-slate-400 font-semibold">{h}</span>
          ))}
        </div>
        <div className="space-y-2" style={{ minWidth: '520px' }}>
          {rows.map((row) => (
            <div key={row.id} className="grid gap-2 items-center" style={{ gridTemplateColumns: CAT_COLS }}>
              <CellInput type="text" value={row.name} onChange={(v) => update(row.id, 'name', v)} placeholder="e.g. Outerwear" />
              <CellInput type="number" value={row.priceFrom} onChange={(v) => update(row.id, 'priceFrom', v)} prefix="£" placeholder="0" />
              <CellInput type="number" value={row.priceTo} onChange={(v) => update(row.id, 'priceTo', v)} prefix="£" placeholder="0" />
              <CellInput type="number" value={row.margin} onChange={(v) => update(row.id, 'margin', v)} suffix="%" placeholder="0" />
              <select value={row.role} onChange={(e) => update(row.id, 'role', e.target.value)}
                className="border border-slate-200 rounded bg-white text-sm text-slate-900 px-2 py-1.5 outline-none focus:border-slate-400 transition-colors">
                {CATEGORY_ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
              <button onClick={() => remove(row.id)} disabled={rows.length <= 1} className="h-7 w-7 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" aria-label="Remove category">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <button onClick={add} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
          <Plus size={14} />Add category
        </button>
      </div>
    </div>
  );
}

// ─── DISCOUNT ROWS ────────────────────────────────────────────────────────────

const DISC_COLS = '10rem 5rem 1fr 2rem';
const DISC_COL_HEADERS = ['Type', 'Depth', 'Frequency', ''];

function DiscountRows({ rows, onChange }: { rows: DiscountRow[]; onChange: (r: DiscountRow[]) => void }) {
  const update = (id: string, field: keyof DiscountRow, value: string) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  const remove = (id: string) => { if (rows.length > 1) onChange(rows.filter((r) => r.id !== id)); };
  const add = () => onChange([...rows, emptyDiscountRow()]);

  const fieldLabel = (text: string) => (
    <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">{text}</p>
  );

  return (
    <div>
      {/* Mobile */}
      <div className="sm:hidden space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="border border-slate-200 rounded-lg p-3 space-y-2.5 bg-white">
            <div className="flex gap-2 items-start">
              <div className="flex-1">
                {fieldLabel('Type')}
                <select value={row.type} onChange={(e) => update(row.id, 'type', e.target.value)}
                  className="w-full border border-slate-200 rounded bg-white text-sm text-slate-900 px-2 py-1.5 outline-none focus:border-slate-400 transition-colors">
                  {DISCOUNT_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <button onClick={() => remove(row.id)} disabled={rows.length <= 1} className="mt-5 h-7 w-7 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" aria-label="Remove discount">
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>{fieldLabel('Depth')}<CellInput type="number" value={row.depth} onChange={(v) => update(row.id, 'depth', v)} suffix="%" placeholder="0" /></div>
              <div>{fieldLabel('Frequency')}<CellInput type="text" value={row.frequency} onChange={(v) => update(row.id, 'frequency', v)} placeholder="e.g. quarterly" /></div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop */}
      <div className="hidden sm:block overflow-x-auto">
        <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: DISC_COLS, minWidth: '420px' }}>
          {DISC_COL_HEADERS.map((h, i) => (
            <span key={i} className="text-xs uppercase tracking-widest text-slate-400 font-semibold">{h}</span>
          ))}
        </div>
        <div className="space-y-2" style={{ minWidth: '420px' }}>
          {rows.map((row) => (
            <div key={row.id} className="grid gap-2 items-center" style={{ gridTemplateColumns: DISC_COLS }}>
              <select value={row.type} onChange={(e) => update(row.id, 'type', e.target.value)}
                className="border border-slate-200 rounded bg-white text-sm text-slate-900 px-2 py-1.5 outline-none focus:border-slate-400 transition-colors">
                {DISCOUNT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
              <CellInput type="number" value={row.depth} onChange={(v) => update(row.id, 'depth', v)} suffix="%" placeholder="0" />
              <CellInput type="text" value={row.frequency} onChange={(v) => update(row.id, 'frequency', v)} placeholder="e.g. quarterly" />
              <button onClick={() => remove(row.id)} disabled={rows.length <= 1} className="h-7 w-7 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" aria-label="Remove discount">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <button onClick={add} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
          <Plus size={14} />Add discount type
        </button>
      </div>
    </div>
  );
}

// ─── SCORE DISPLAY ────────────────────────────────────────────────────────────

function ScoreDisplay({ score }: { score: number }) {
  const config =
    score >= 7
      ? { color: 'text-green-600', border: 'border-green-200', bg: 'bg-green-50', label: 'Healthy' }
      : score >= 4
      ? { color: 'text-amber-600', border: 'border-amber-200', bg: 'bg-amber-50', label: 'At risk' }
      : { color: 'text-red-600', border: 'border-red-200', bg: 'bg-red-50', label: 'Critical' };

  return (
    <div className={cn('border rounded-lg px-6 py-5 flex items-center gap-5 shadow-card', config.border, config.bg)}>
      <span className={cn('text-6xl font-semibold tabular-nums leading-none', config.color)}>{score}</span>
      <div>
        <p className={cn('text-lg font-semibold', config.color)}>{config.label}</p>
        <p className="text-xs text-slate-500 mt-0.5">Architecture score out of 10</p>
      </div>
    </div>
  );
}

// ─── FINDING CARD ─────────────────────────────────────────────────────────────

function FindingCard({ label, content, highlight }: { label: string; content: string; highlight?: boolean }) {
  return (
    <div className={cn('bg-white border rounded-lg px-5 py-4 shadow-card', highlight ? 'border-red-200' : 'border-slate-200')}>
      <p className={cn('text-xs font-semibold uppercase tracking-widest mb-2', highlight ? 'text-red-500' : 'text-slate-400')}>
        {label}
      </p>
      <p className="text-sm text-slate-700 leading-relaxed">{content}</p>
    </div>
  );
}

// ─── RESULTS VIEW ─────────────────────────────────────────────────────────────

function ResultsView({
  results,
  promoOnMarkdown,
  onRecalculate,
}: {
  results: AuditResults;
  promoOnMarkdown: StackingAnswer;
  onRecalculate: () => void;
}) {
  return (
    <div className="space-y-8">
      <div>
        <SectionLabel>Architecture score</SectionLabel>
        <ScoreDisplay score={results.architectureScore} />
      </div>

      <div>
        <SectionLabel>Summary</SectionLabel>
        <div className="border border-slate-200 bg-slate-50 rounded-lg p-4">
          <p className="text-sm text-slate-700 leading-relaxed">{results.architectureSummary}</p>
        </div>
      </div>

      <div>
        <SectionLabel>Price headroom</SectionLabel>
        <div className="bg-white border border-slate-200 rounded-lg px-5 py-4 shadow-card">
          <p className="text-2xl font-semibold text-slate-900 tracking-tight">{results.headroomAmount}</p>
          <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{results.headroomRationale}</p>
        </div>
      </div>

      <div>
        <SectionLabel>Findings</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FindingCard label="Cannibalisation" content={results.cannibalisation} />
          <FindingCard label="Ladder gaps" content={results.ladderGaps} />
          <FindingCard label="Competitive position" content={results.competitivePosition} />
          <FindingCard label="Stacking risk" content={results.stackingRisk} highlight={promoOnMarkdown === 'yes'} />
        </div>
      </div>

      <div>
        <SectionLabel>Actions</SectionLabel>
        <div className="space-y-3">
          {results.actions.map((a) => (
            <div key={a.priority} className="bg-white border border-slate-200 rounded-lg px-5 py-4 shadow-card flex gap-4">
              <span className="text-sm font-semibold text-slate-400 shrink-0 w-4">{a.priority}.</span>
              <div>
                <p className="text-sm font-medium text-slate-900">{a.action}</p>
                <p className="text-xs text-slate-400 mt-1">{a.impact}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex sm:justify-end pt-4 border-t border-slate-200">
        <button
          onClick={onRecalculate}
          className="w-full sm:w-auto border border-slate-200 text-slate-700 px-6 py-2.5 rounded text-sm font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors"
        >
          Recalculate
        </button>
      </div>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

const DEFAULT_FORM: FormState = {
  brandName: '',
  sector: '',
  priceTier: 'Premium',
  competitors: '',
  categories: [emptyCategoryRow()],
  discounts: [emptyDiscountRow()],
  promoOnMarkdown: 'no',
};

export function PricingAudit() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [pageState, setPageState] = useState<ViewState>({ view: 'input' });
  const [errors, setErrors] = useState<string[]>([]);

  const set = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    const errs: string[] = [];
    if (!form.brandName.trim()) errs.push('Brand name is required');
    if (!form.sector.trim()) errs.push('Sector is required');
    if (!form.categories.some((c) => c.name.trim())) errs.push('At least one category with a name is required');
    if (errs.length > 0) { setErrors(errs); return; }
    setErrors([]);

    const sessionId = generateSessionId();
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
    const anthropicKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;

    if (!anthropicKey) {
      setPageState({ view: 'error', message: 'VITE_ANTHROPIC_API_KEY is not configured.' });
      return;
    }

    // ── Step 1 — Perplexity competitive sweep ────────────────────────────────
    setPageState({ view: 'loading', loadingMsg: 'Gathering market intelligence...' });

    let marketIntel = 'Market intelligence unavailable — analysis based on inputs only.';
    try {
      const categoryNames = form.categories
        .filter((c) => c.name.trim())
        .map((c) => c.name.trim())
        .join(', ');
      const competitorSentence = form.competitors.trim()
        ? `Known competitors: ${form.competitors.trim()}.`
        : '';

      const perplexityRes = await fetch(`${SUPABASE_URL}/functions/v1/perplexity-research`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(anonKey ? { Authorization: `Bearer ${anonKey}` } : {}),
        },
        body: JSON.stringify({
          query: `Current retail pricing in the UK ${form.sector} market for ${form.priceTier} positioning. Categories: ${categoryNames}. Typical price points, discount practices and promotional norms. ${competitorSentence}`,
          context: `${form.priceTier} ${form.sector} brand pricing analysis`,
          sessionId,
          toolName: 'pricing_audit',
        }),
      });

      if (perplexityRes.ok) {
        const perplexityData = await perplexityRes.json();
        if (Array.isArray(perplexityData.insights) && perplexityData.insights.length > 0) {
          marketIntel = perplexityData.insights
            .map((i: { title: string; summary: string }) => `${i.title}: ${i.summary}`)
            .join('\n\n');
        } else if (typeof perplexityData.summary === 'string') {
          marketIntel = perplexityData.summary;
        }
      }
    } catch {
      // Non-blocking — continue with fallback message
    }

    // ── Step 2 — Claude analysis ─────────────────────────────────────────────
    setPageState({ view: 'loading', loadingMsg: 'Analysing your pricing architecture...' });

    try {
      const validCategories = form.categories.filter((c) => c.name.trim());
      const categoryBlock = validCategories
        .map((c) => `- ${c.name}: £${c.priceFrom || '?'}–£${c.priceTo || '?'}, margin ${c.margin || '?'}%, role: ${c.role}`)
        .join('\n');

      const validDiscounts = form.discounts.filter((d) => d.depth.trim() || d.frequency.trim());
      const discountBlock =
        validDiscounts.length > 0
          ? validDiscounts
              .map((d) => `- ${d.type}: ${d.depth ? d.depth + '% depth' : 'depth not specified'}, frequency: ${d.frequency || 'not specified'}`)
              .join('\n')
          : 'No discount structure provided.';

      const stackingNote =
        form.promoOnMarkdown === 'yes'
          ? 'YES — this brand stacks promotional codes on already-marked-down product. Flag the margin compression explicitly in stackingRisk.'
          : form.promoOnMarkdown === 'sometimes'
          ? 'SOMETIMES — occasional promotional stacking occurs.'
          : 'NO — no stacking.';

      const userMessage = `Analyse this brand's pricing architecture and return a JSON object only.

BRAND:
- Name: ${form.brandName}
- Sector: ${form.sector}
- Price tier positioning: ${form.priceTier}
- Known competitors: ${form.competitors.trim() || 'Not specified'}

CATEGORY PRICE ARCHITECTURE:
${categoryBlock}

DISCOUNT STRUCTURE:
${discountBlock}

PROMOTIONAL STACKING:
${stackingNote}

MARKET INTELLIGENCE:
${marketIntel}

Return ONLY valid JSON with this exact schema — no preamble, no markdown, no code fences:
{
  "architectureScore": <integer 1-10>,
  "architectureSummary": "<2-3 sentences, specific and commercially grounded>",
  "cannibalisation": "<Is there price overlap between categories that undermines tier distinction? Be specific.>",
  "ladderGaps": "<Are there missing rungs in the price ladder? Where and what is the commercial impact?>",
  "competitivePosition": "<How does this architecture sit relative to the market intelligence provided?>",
  "headroomAmount": "<A specific price point or range, e.g. '£5–£8 on Hero SKUs'>",
  "headroomRationale": "<Why that headroom exists — reference competitor data or margin inputs>",
  "stackingRisk": "<Specific margin impact of current stacking behaviour, or 'No stacking detected' if clean>",
  "actions": [
    { "priority": 1, "action": "<specific action>", "impact": "<commercial impact>" },
    { "priority": 2, "action": "<specific action>", "impact": "<commercial impact>" },
    { "priority": 3, "action": "<specific action>", "impact": "<commercial impact>" }
  ]
}

Scoring: 7–10 = Healthy. 4–6 = At risk. 1–3 = Critical. Be commercially precise. No filler.`;

      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: userMessage }],
        }),
      });

      if (!claudeRes.ok) {
        const errData = await claudeRes.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(errData.error?.message ?? `Claude API error ${claudeRes.status}`);
      }

      const claudeData = await claudeRes.json() as { content?: Array<{ text?: string }> };
      const rawText = (claudeData.content?.[0]?.text ?? '').trim();

      const start = rawText.indexOf('{');
      const end = rawText.lastIndexOf('}');
      const jsonText = start !== -1 && end !== -1 ? rawText.slice(start, end + 1) : rawText;

      const results = JSON.parse(jsonText) as AuditResults;

      if (typeof results.architectureScore !== 'number' || !results.architectureSummary) {
        throw new Error('Response missing required fields');
      }

      setPageState({ view: 'results', results, promoOnMarkdown: form.promoOnMarkdown });
    } catch (err) {
      setPageState({
        view: 'error',
        message: err instanceof Error ? err.message : 'Analysis failed. Please try again.',
      });
    }
  };

  return (
    <ToolLayout
      title="Pricing Architecture Audit"
      description="Map your price ladder, discount structure, and market positioning. The audit identifies cannibalisation, ladder gaps, stacking risk, and headroom — and outputs a prioritised action list."
      metaDescription="Audit your pricing architecture. Identify cannibalisation, price ladder gaps, stacking risk, and headroom against market benchmarks."
    >
      {/* ── Input ── */}
      {pageState.view === 'input' && (
        <div className="space-y-8">
          <div>
            <SectionLabel>Brand</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <InputField
                label="Brand name"
                value={form.brandName}
                onChange={set('brandName')}
                type="text"
                placeholder="e.g. Leapfrog Remedies"
              />
              <InputField
                label="Sector"
                value={form.sector}
                onChange={set('sector')}
                type="text"
                placeholder="e.g. natural remedies, premium olive oil"
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Price tier positioning</label>
                <select
                  value={form.priceTier}
                  onChange={(e) => setForm((prev) => ({ ...prev, priceTier: e.target.value as PriceTier }))}
                  className="border border-slate-200 rounded bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 transition-colors"
                >
                  {(['Budget', 'Mid-market', 'Premium', 'Luxury'] as PriceTier[]).map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <InputField
                label="Known competitors"
                value={form.competitors}
                onChange={set('competitors')}
                type="text"
                placeholder="Optional — comma separated"
                hint="Used to contextualise market intelligence"
              />
            </div>
          </div>

          <div>
            <SectionLabel>Category price architecture</SectionLabel>
            <CategoryRows rows={form.categories} onChange={(r) => setForm((prev) => ({ ...prev, categories: r }))} />
          </div>

          <div>
            <SectionLabel>Discount structure</SectionLabel>
            <DiscountRows rows={form.discounts} onChange={(r) => setForm((prev) => ({ ...prev, discounts: r }))} />
          </div>

          <div>
            <SectionLabel>Promotional stacking</SectionLabel>
            <div className="space-y-3">
              <p className="text-sm text-slate-700">Do you run promotional codes on already-marked-down product?</p>
              <div className="flex gap-2">
                {(['yes', 'no', 'sometimes'] as StackingAnswer[]).map((val) => (
                  <button
                    key={val}
                    onClick={() => setForm((prev) => ({ ...prev, promoOnMarkdown: val }))}
                    className={cn(
                      'px-4 py-2 rounded text-sm font-medium border transition-colors capitalize',
                      form.promoOnMarkdown === val
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400',
                    )}
                  >
                    {val === 'yes' ? 'Yes' : val === 'no' ? 'No' : 'Sometimes'}
                  </button>
                ))}
              </div>
              {form.promoOnMarkdown === 'yes' && (
                <div className="border border-red-200 bg-red-50 rounded-lg px-4 py-3">
                  <p className="text-sm text-red-700">
                    This is a stacking risk. The audit will flag the margin impact.
                  </p>
                </div>
              )}
            </div>
          </div>

          {errors.length > 0 && (
            <div className="border border-red-200 bg-red-50 rounded-lg px-4 py-3">
              <ul className="space-y-1">
                {errors.map((err) => (
                  <li key={err} className="text-sm text-red-700">{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              className="bg-slate-900 text-white px-6 py-2.5 rounded text-sm font-medium hover:bg-slate-800 transition-colors min-w-[160px]"
            >
              Run audit
            </button>
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {pageState.view === 'loading' && (
        <div className="py-16 text-center space-y-3">
          <div className="inline-block w-6 h-6 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">{pageState.loadingMsg}</p>
          <p className="text-xs text-slate-400">This takes about 15–20 seconds.</p>
        </div>
      )}

      {/* ── Error ── */}
      {pageState.view === 'error' && (
        <div className="space-y-6">
          <div className="border border-red-200 bg-red-50 rounded-lg px-4 py-3">
            <p className="text-sm text-red-700">{pageState.message}</p>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setPageState({ view: 'input' })}
              className="border border-slate-200 text-slate-700 px-6 py-2.5 rounded text-sm font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors"
            >
              Back to inputs
            </button>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {pageState.view === 'results' && (
        <ResultsView
          results={pageState.results}
          promoOnMarkdown={pageState.promoOnMarkdown}
          onRecalculate={() => setPageState({ view: 'input' })}
        />
      )}

      {/* ── Growth Engine CTA ── */}
      <div className="mt-16 pt-10 border-t border-slate-200">
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

      {/* ── Try this next ── */}
      <div className="mt-8 pt-8 border-t border-slate-200">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Try this next</p>
        <Link
          to="/tools/promotions"
          className="group flex items-start justify-between gap-4 bg-white border border-slate-200 rounded-lg px-5 py-4 hover:border-slate-300 transition-colors shadow-card"
        >
          <div>
            <p className="text-sm font-semibold text-slate-900 mb-1 group-hover:text-slate-700 transition-colors">Promotions Profitability</p>
            <p className="text-sm text-slate-500">You've audited your pricing architecture. Now test whether the promotions running on top of it can earn their margin.</p>
          </div>
          <span className="text-sm text-slate-400 group-hover:text-slate-900 transition-colors whitespace-nowrap mt-0.5">Open →</span>
        </Link>
      </div>
    </ToolLayout>
  );
}
