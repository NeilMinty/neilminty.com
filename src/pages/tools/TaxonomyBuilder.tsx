import { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronRight, X, Plus } from 'lucide-react';
import { ToolLayout } from '@/components/ToolLayout';
import { SectionLabel } from '@/components/SectionLabel';
import { InputField } from '@/components/InputField';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Dimension {
  id: string;
  name: string;
  values: string[];
  addInput: string;
}

// ─── DEFAULTS ─────────────────────────────────────────────────────────────────

type HierarchyOrder = 'analysis' | 'setup';

const ANALYSIS_NAMES = [
  'Campaign type', 'Offer type', 'Product', 'Platform',
  'Format', 'Creative type', 'CTA', 'Version',
];

const SETUP_NAMES = [
  'Platform', 'Format', 'Creative type', 'Campaign type',
  'Offer type', 'Product', 'CTA', 'Version',
];

function makeDimensions(names: string[]): Dimension[] {
  return names.map((name, i) => ({ id: String(i + 1), name, values: [], addInput: '' }));
}

const DEFAULT_DIMENSIONS = makeDimensions(ANALYSIS_NAMES);

const VALUE_HINTS: Record<string, string> = {
  'Campaign type':  'e.g. PROS, RETARG',
  'Offer type':     'e.g. FULLPRICE, PROMO',
  'Product':        'e.g. STARTER, CORE',
  'Platform':       'e.g. META, GOOGLE',
  'Format':         'e.g. VID, STATIC, CAROUSEL',
  'Creative type':  'e.g. UGC, LIFESTYLE, BRAND',
  'CTA':            'e.g. SHOP, LEARN, TRIAL',
  'Version':        'e.g. V1, V2',
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function makeId() {
  return crypto.randomUUID();
}

function buildPreview(dimensions: Dimension[]): string {
  const parts = dimensions
    .filter((d) => d.values.length > 0)
    .map((d) => d.values[0]);
  return parts.length > 0 ? parts.join('_') : '';
}

// ─── VALUE TAG ────────────────────────────────────────────────────────────────

function ValueTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 text-slate-700 text-xs font-medium">
      {label}
      <button
        onClick={onRemove}
        className="text-slate-400 hover:text-slate-700 transition-colors"
        aria-label={`Remove ${label}`}
      >
        <X size={11} />
      </button>
    </span>
  );
}

// ─── ADD VALUE INPUT ──────────────────────────────────────────────────────────

function AddValueInput({
  value,
  placeholder,
  onChange,
  onAdd,
}: {
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-stretch border border-slate-200 rounded bg-white focus-within:border-slate-400 transition-colors">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); onAdd(); }
        }}
        placeholder={placeholder ?? 'Add value, press Enter'}
        className="flex-1 px-3 py-2 text-sm text-slate-900 bg-transparent outline-none min-w-0"
      />
      <button
        onClick={onAdd}
        className="px-3 border-l border-slate-200 text-slate-400 hover:text-slate-700 transition-colors rounded-r bg-slate-50"
        aria-label="Add value"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

// ─── DIMENSION ROW ────────────────────────────────────────────────────────────

function DimensionRow({
  dim,
  index,
  total,
  onNameChange,
  onAddInput,
  onAddValue,
  onRemoveValue,
  onMoveUp,
  onMoveDown,
  onRemoveDimension,
}: {
  dim: Dimension;
  index: number;
  total: number;
  onNameChange: (v: string) => void;
  onAddInput: (v: string) => void;
  onAddValue: () => void;
  onRemoveValue: (val: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemoveDimension: () => void;
}) {
  const hint = VALUE_HINTS[dim.name] ?? 'Add value, press Enter';

  return (
    <div className="border border-slate-200 rounded-lg bg-white shadow-card p-4 space-y-3">
      <div className="flex items-start gap-3">
        {/* Reorder controls */}
        <div className="flex flex-col items-center gap-0.5 pt-1 shrink-0">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="h-5 w-5 flex items-center justify-center rounded text-slate-300 hover:text-slate-600 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            aria-label="Move up"
          >
            <ChevronUp size={13} />
          </button>
          <span className="text-[10px] font-semibold text-slate-300 tabular-nums leading-none">
            {index + 1}
          </span>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="h-5 w-5 flex items-center justify-center rounded text-slate-300 hover:text-slate-600 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            aria-label="Move down"
          >
            <ChevronDown size={13} />
          </button>
        </div>

        {/* Name + add value */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InputField
            label="Dimension name"
            value={dim.name}
            onChange={onNameChange}
            type="text"
            placeholder="e.g. Campaign type"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Values</label>
            <AddValueInput
              value={dim.addInput}
              placeholder={hint}
              onChange={onAddInput}
              onAdd={onAddValue}
            />
          </div>
        </div>

        {/* Remove dimension */}
        <button
          onClick={onRemoveDimension}
          className="mt-1 h-7 w-7 flex items-center justify-center rounded text-slate-300 hover:text-red-400 transition-colors shrink-0"
          aria-label="Remove dimension"
        >
          <X size={14} />
        </button>
      </div>

      {/* Value tags */}
      {dim.values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pl-10">
          {dim.values.map((v) => (
            <ValueTag key={v} label={v} onRemove={() => onRemoveValue(v)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── EXAMPLES ─────────────────────────────────────────────────────────────────

interface ExampleRow {
  position: number;
  dimension: string;
  value: string;
  reason: string;
}

interface Example {
  id: string;
  channel: string;
  taxonomy: string;
  rows: ExampleRow[];
}

const EXAMPLES: Example[] = [
  {
    id: 'meta-paid-social',
    channel: 'Meta paid social',
    taxonomy: 'PROS_FULLPRICE_HERO_META_VID_UGC_SHOP_V1',
    rows: [
      { position: 1, dimension: 'Campaign type', value: 'PROS',      reason: 'Prospecting — targeting cold audiences with no prior brand exposure' },
      { position: 2, dimension: 'Offer type',    value: 'FULLPRICE', reason: 'Full price — no discount applied; tests willingness to pay at margin' },
      { position: 3, dimension: 'Product',       value: 'HERO',      reason: 'Hero SKU — highest-volume acquisition product used as the entry point' },
      { position: 4, dimension: 'Platform',      value: 'META',      reason: 'Meta (Facebook / Instagram) — primary paid social channel' },
      { position: 5, dimension: 'Format',        value: 'VID',       reason: 'Video — native feed format; higher engagement on Meta than static' },
      { position: 6, dimension: 'Creative type', value: 'UGC',       reason: 'User-generated content — authentic social proof, lower production cost' },
      { position: 7, dimension: 'CTA',           value: 'SHOP',      reason: 'Shop now — direct purchase intent; sends to product or collection page' },
      { position: 8, dimension: 'Version',       value: 'V1',        reason: 'First creative iteration — baseline to measure against variants' },
    ],
  },
  {
    id: 'google-search',
    channel: 'Google Search',
    taxonomy: 'PROS_FULLPRICE_CORE_GOOGLE_TEXT_BRAND_SHOP_V1',
    rows: [
      { position: 1, dimension: 'Campaign type', value: 'PROS',      reason: 'Prospecting — high-intent search audience discovering the brand' },
      { position: 2, dimension: 'Offer type',    value: 'FULLPRICE', reason: 'Full price — search intent implies purchase readiness; discount not needed to convert' },
      { position: 3, dimension: 'Product',       value: 'CORE',      reason: 'Core product — maps directly to high-volume, high-commercial search terms' },
      { position: 4, dimension: 'Platform',      value: 'GOOGLE',    reason: 'Google Ads — search network placement' },
      { position: 5, dimension: 'Format',        value: 'TEXT',      reason: 'Text ad — standard responsive search ad unit; no creative asset required' },
      { position: 6, dimension: 'Creative type', value: 'BRAND',     reason: 'Brand-led copy — leads with brand name and positioning, not offer' },
      { position: 7, dimension: 'CTA',           value: 'SHOP',      reason: 'Shop now — sends to product page; aligns with commercial keyword intent' },
      { position: 8, dimension: 'Version',       value: 'V1',        reason: 'First copy iteration — headline and description baseline for ad rotation testing' },
    ],
  },
  {
    id: 'email-acquisition',
    channel: 'Email acquisition',
    taxonomy: 'PROS_PROMO_STARTER_EMAIL_STATIC_OFFER_SIGNUP_V1',
    rows: [
      { position: 1, dimension: 'Campaign type', value: 'PROS',    reason: 'Prospecting — targeting new subscribers who have not yet purchased' },
      { position: 2, dimension: 'Offer type',    value: 'PROMO',   reason: 'Promotional — incentive (discount or gift) used to convert cold list to first purchase' },
      { position: 3, dimension: 'Product',       value: 'STARTER', reason: 'Starter product — lower price point reduces barrier to first purchase' },
      { position: 4, dimension: 'Platform',      value: 'EMAIL',   reason: 'Email channel — owned list, typically via Klaviyo welcome or nurture flow' },
      { position: 5, dimension: 'Format',        value: 'STATIC',  reason: 'Static — HTML email layout; no video playback in most email clients' },
      { position: 6, dimension: 'Creative type', value: 'OFFER',   reason: 'Offer-led creative — discount or incentive is the primary message hierarchy' },
      { position: 7, dimension: 'CTA',           value: 'SIGNUP',  reason: 'Sign up — captures email address before driving to purchase; top of funnel' },
      { position: 8, dimension: 'Version',       value: 'V1',      reason: 'First send iteration — subject line and layout baseline for A/B testing' },
    ],
  },
  {
    id: 'influencer-paid-social',
    channel: 'Influencer / paid social',
    taxonomy: 'PROS_PROMO_HERO_META_VID_INFLUENCER_SHOP_V1',
    rows: [
      { position: 1, dimension: 'Campaign type', value: 'PROS',       reason: "Prospecting — cold audience reached through the influencer's existing following" },
      { position: 2, dimension: 'Offer type',    value: 'PROMO',      reason: 'Promotional — influencer-linked discount code drives attribution and conversion' },
      { position: 3, dimension: 'Product',       value: 'HERO',       reason: 'Hero SKU — highest brand recognition product; simplest message for cold audiences' },
      { position: 4, dimension: 'Platform',      value: 'META',       reason: 'Meta — influencer content boosted as paid dark post via whitelisting' },
      { position: 5, dimension: 'Format',        value: 'VID',        reason: 'Video — native influencer content format; longer dwell time than static' },
      { position: 6, dimension: 'Creative type', value: 'INFLUENCER', reason: 'Influencer creative — third-party creator; distinct from brand or UGC assets' },
      { position: 7, dimension: 'CTA',           value: 'SHOP',       reason: 'Shop now — direct to product page; influencer pre-sells so purchase intent is warm' },
      { position: 8, dimension: 'Version',       value: 'V1',         reason: 'First creative iteration — baseline before testing alternative influencer or scripts' },
    ],
  },
];

// ─── EXAMPLE CARD ─────────────────────────────────────────────────────────────

function ExampleCard({ example }: { example: Example }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-slate-200 rounded-lg bg-white shadow-card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-medium text-slate-700 shrink-0">{example.channel}</span>
          <span className="font-mono text-xs text-slate-400 truncate">{example.taxonomy}</span>
        </div>
        <ChevronRight
          size={14}
          className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`}
        />
      </button>

      {open && (
        <div className="border-t border-slate-100">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="py-2 px-4 text-left text-xs uppercase tracking-widest font-semibold text-slate-400 w-8">#</th>
                <th className="py-2 px-4 text-left text-xs uppercase tracking-widest font-semibold text-slate-400">Dimension</th>
                <th className="py-2 px-4 text-left text-xs uppercase tracking-widest font-semibold text-slate-400">Value</th>
                <th className="py-2 px-4 text-left text-xs uppercase tracking-widest font-semibold text-slate-400">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {example.rows.map((row) => (
                <tr key={row.position} className="bg-white">
                  <td className="py-2.5 px-4 text-xs text-slate-400 tabular-nums">{row.position}</td>
                  <td className="py-2.5 px-4 text-slate-600">{row.dimension}</td>
                  <td className="py-2.5 px-4 font-mono text-xs font-medium text-slate-900 whitespace-nowrap">{row.value}</td>
                  <td className="py-2.5 px-4 text-slate-500 text-xs leading-relaxed">{row.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export function TaxonomyBuilder() {
  const [dimensions, setDimensions] = useState<Dimension[]>(DEFAULT_DIMENSIONS);
  const [order, setOrder] = useState<HierarchyOrder>('analysis');

  const switchOrder = (next: HierarchyOrder) => {
    if (next === order) return;
    const hasValues = dimensions.some((d) => d.values.length > 0);
    if (hasValues) {
      const confirmed = window.confirm('Switching order will clear all values you have entered. Continue?');
      if (!confirmed) return;
    }
    setOrder(next);
    setDimensions(makeDimensions(next === 'analysis' ? ANALYSIS_NAMES : SETUP_NAMES));
  };

  const update = (id: string, patch: Partial<Dimension>) =>
    setDimensions((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  const addValue = (id: string) => {
    setDimensions((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const raw = d.addInput.trim().toUpperCase();
        if (!raw || d.values.includes(raw)) return { ...d, addInput: '' };
        return { ...d, values: [...d.values, raw], addInput: '' };
      })
    );
  };

  const removeValue = (id: string, val: string) =>
    setDimensions((prev) =>
      prev.map((d) => (d.id === id ? { ...d, values: d.values.filter((v) => v !== val) } : d))
    );

  const moveUp = (index: number) => {
    if (index === 0) return;
    setDimensions((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const moveDown = (index: number) => {
    setDimensions((prev) => {
      if (index === prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  const removeDimension = (id: string) =>
    setDimensions((prev) => prev.filter((d) => d.id !== id));

  const addDimension = () =>
    setDimensions((prev) => [...prev, { id: makeId(), name: '', values: [], addInput: '' }]);

  const preview = buildPreview(dimensions);

  return (
    <ToolLayout
      title="Campaign Taxonomy Builder"
      description="Define the dimensions of your campaign naming convention, add allowed values, and preview the structure. Add values to see a sample name build in real time."
      metaDescription="Build a consistent campaign naming taxonomy for paid acquisition. Define dimensions, add values, and preview the naming structure."
    >
      <div className="space-y-8">
        {/* Order toggle */}
        <div>
          <div className="inline-flex rounded border border-slate-200 bg-slate-50 p-0.5">
            {(['analysis', 'setup'] as HierarchyOrder[]).map((o) => (
              <button
                key={o}
                onClick={() => switchOrder(o)}
                className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                  order === o
                    ? 'bg-white text-slate-900 shadow-card border border-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {o === 'analysis' ? 'Analysis order' : 'Setup order'}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Analysis order surfaces the most decision-relevant dimensions first. Setup order follows how campaigns are structured in-platform.
          </p>
        </div>

        {/* Dimension list */}
        <div>
          <SectionLabel>
            Starting order built for analysis, not setup. Reorder to match your own convention.
          </SectionLabel>
          <div className="space-y-3">
            {dimensions.map((dim, i) => (
              <DimensionRow
                key={dim.id}
                dim={dim}
                index={i}
                total={dimensions.length}
                onNameChange={(v) => update(dim.id, { name: v })}
                onAddInput={(v) => update(dim.id, { addInput: v })}
                onAddValue={() => addValue(dim.id)}
                onRemoveValue={(val) => removeValue(dim.id, val)}
                onMoveUp={() => moveUp(i)}
                onMoveDown={() => moveDown(i)}
                onRemoveDimension={() => removeDimension(dim.id)}
              />
            ))}
          </div>

          <button
            onClick={addDimension}
            className="mt-3 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            <Plus size={14} />
            Add dimension
          </button>
        </div>

        {/* Preview */}
        <div>
          <SectionLabel>Preview</SectionLabel>
          <div className="border border-slate-200 rounded-lg bg-white shadow-card px-4 py-4">
            {preview ? (
              <p className="text-sm font-mono text-slate-900 break-all">{preview}</p>
            ) : (
              <p className="text-sm text-slate-400 italic">
                Add values to dimensions above to see a sample name here.
              </p>
            )}
          </div>
          {preview && (
            <p className="mt-2 text-xs text-slate-400">
              Built from the first value of each dimension that has values defined.
            </p>
          )}
        </div>

        {/* Examples */}
        <div>
          <SectionLabel>Examples</SectionLabel>
          <div className="space-y-2">
            {EXAMPLES.map((ex) => (
              <ExampleCard key={ex.id} example={ex} />
            ))}
          </div>
        </div>

        {/* Structure reference */}
        {dimensions.some((d) => d.values.length > 0) && (
          <div>
            <SectionLabel>Structure reference</SectionLabel>
            <div className="border border-slate-200 rounded-lg overflow-hidden shadow-card">
              <table className="w-full text-sm">
                <thead className="bg-white border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 text-left text-xs uppercase tracking-widest font-semibold text-slate-400 w-8">#</th>
                    <th className="py-2.5 px-4 text-left text-xs uppercase tracking-widest font-semibold text-slate-400">Dimension</th>
                    <th className="py-2.5 px-4 text-left text-xs uppercase tracking-widest font-semibold text-slate-400">Allowed values</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dimensions.map((dim, i) => (
                    <tr key={dim.id} className="bg-white">
                      <td className="py-3 px-4 text-slate-400 text-xs tabular-nums">{i + 1}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {dim.name || <span className="text-slate-400 italic">Unnamed</span>}
                      </td>
                      <td className="py-3 px-4">
                        {dim.values.length > 0 ? (
                          <span className="font-mono text-xs text-slate-600">
                            {dim.values.join(', ')}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300 italic">No values yet</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
