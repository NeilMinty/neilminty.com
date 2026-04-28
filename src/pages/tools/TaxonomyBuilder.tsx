import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronRight, X, Plus } from 'lucide-react';
import { ToolLayout } from '@/components/ToolLayout';
import { SectionLabel } from '@/components/SectionLabel';


// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Dimension {
  id: string;
  name: string;
  value: string;
}

// ─── DEFAULTS ─────────────────────────────────────────────────────────────────

type HierarchyOrder = 'analysis' | 'setup';

const MAX_DIMENSIONS = 12;

const ANALYSIS_NAMES = [
  'Campaign type', 'Offer type', 'Product', 'Platform',
  'Format', 'Creative type', 'CTA', 'Version',
  'Hook', 'Talent type', 'Narrative structure',
];

const SETUP_NAMES = [
  'Platform', 'Format', 'Creative type', 'Campaign type',
  'Offer type', 'Product', 'CTA', 'Version',
  'Hook', 'Talent type', 'Narrative structure',
];

function makeDimensions(names: string[]): Dimension[] {
  return names.map((name, i) => ({ id: String(i + 1), name, value: '' }));
}

const DEFAULT_DIMENSIONS = makeDimensions(ANALYSIS_NAMES);

const VALUE_HINTS: Record<string, string> = {
  'Campaign type':      'e.g. PROS, RETARG, BRAND',
  'Offer type':         'e.g. FULLPRICE, PROMO, TRIAL, BOGO',
  'Product':            'e.g. HERO, STARTER, CORE, BUNDLE',
  'Platform':           'e.g. META, GOOGLE, TIKTOK, EMAIL',
  'Format':             'e.g. VID, STATIC, CAROUSEL, REEL',
  'Creative type':      'e.g. UGC, LIFESTYLE, BRAND, INFLUENCER',
  'CTA':                'e.g. SHOP, LEARN, TRIAL, GETSTARTED',
  'Version':            'e.g. V1, V2, V3',
  'Hook':               'e.g. PROBLEM, SOCIAL-PROOF, CURIOSITY',
  'Talent type':        'e.g. FOUNDER, CUSTOMER, NO-TALENT',
  'Narrative structure': 'e.g. TESTIMONIAL, DEMO, BEFORE-AFTER',
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function makeId() {
  return crypto.randomUUID();
}

function buildPreview(dimensions: Dimension[]): string {
  const parts = dimensions
    .map((d) => d.value.trim().toUpperCase())
    .filter(Boolean);
  return parts.join('_');
}

// ─── SESSION & CSV ────────────────────────────────────────────────────────────

interface SavedTaxonomy {
  id: string;
  name: string;
  fullString: string;
  dimensions: Array<{ position: number; name: string; value: string }>;
}

function downloadCsv(filename: string, rows: string[][]): void {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = rows.map((r) => r.map(escape).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportCurrentCsv(dims: Dimension[], fullString: string): void {
  const rows: string[][] = [['Position', 'Dimension Name', 'Value']];
  dims.forEach((d, i) => {
    rows.push([String(i + 1), d.name, d.value]);
  });
  rows.push(['Full String', '', fullString]);
  downloadCsv('taxonomy.csv', rows);
}

function exportAllCsv(saved: SavedTaxonomy[]): void {
  const maxDims = Math.max(...saved.map((s) => s.dimensions.length), 0);
  const dimHeaders: string[] = [];
  for (let i = 1; i <= maxDims; i++) {
    dimHeaders.push(`Dim ${i} Name`, `Dim ${i} Value`);
  }
  const rows: string[][] = [['Name', 'Full String', ...dimHeaders]];
  for (const s of saved) {
    const dimCells: string[] = [];
    for (let i = 0; i < maxDims; i++) {
      const d = s.dimensions[i];
      dimCells.push(d ? d.name : '', d ? d.value : '');
    }
    rows.push([s.name, s.fullString, ...dimCells]);
  }
  downloadCsv('taxonomies.csv', rows);
}

// ─── DRAG HANDLE ICON ─────────────────────────────────────────────────────────

function DragHandleIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="4.5" cy="2.5" r="1.25" />
      <circle cx="9.5" cy="2.5" r="1.25" />
      <circle cx="4.5" cy="7"   r="1.25" />
      <circle cx="9.5" cy="7"   r="1.25" />
      <circle cx="4.5" cy="11.5" r="1.25" />
      <circle cx="9.5" cy="11.5" r="1.25" />
    </svg>
  );
}

// ─── SORTABLE DIMENSION ROW ───────────────────────────────────────────────────

function DimensionRow({
  dim,
  index,
  onNameChange,
  onValueChange,
  onRemoveDimension,
}: {
  dim: Dimension;
  index: number;
  onNameChange: (v: string) => void;
  onValueChange: (v: string) => void;
  onRemoveDimension: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: dim.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hint = VALUE_HINTS[dim.name];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border border-slate-200 rounded-lg bg-white p-4 transition-shadow ${
        isDragging
          ? 'opacity-50 shadow-lg'
          : 'shadow-card'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Drag handle */}
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="mt-1 h-7 w-5 flex items-center justify-center text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing transition-colors shrink-0 touch-none"
          aria-label="Drag to reorder"
          tabIndex={0}
        >
          <DragHandleIcon />
        </button>

        {/* Position number */}
        <span className="mt-2 text-[10px] font-semibold text-slate-300 tabular-nums leading-none shrink-0 w-3 text-center">
          {index + 1}
        </span>

        {/* Name + value */}
        <div className="flex-1 grid grid-cols-1 sm:[grid-template-columns:2fr_3fr] gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-700">Dimension name</label>
            <div className="flex items-stretch border border-slate-200 rounded bg-white focus-within:border-slate-400 transition-colors">
              <input
                type="text"
                value={dim.name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="e.g. Campaign type"
                className="flex-1 px-2.5 py-1.5 text-xs text-slate-900 bg-transparent outline-none min-w-0"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-700">Value</label>
            <div className="flex items-stretch border border-slate-200 rounded bg-white focus-within:border-slate-400 transition-colors">
              <input
                type="text"
                value={dim.value}
                onChange={(e) => onValueChange(e.target.value.toUpperCase())}
                placeholder={hint ?? 'e.g. PROS'}
                className="flex-1 px-2.5 py-1.5 text-xs text-slate-900 bg-transparent outline-none min-w-0"
              />
            </div>
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
    </div>
  );
}

// ─── DROP LINE OVERLAY ────────────────────────────────────────────────────────
// dnd-kit handles insertion visually via the transform on the dragged item.
// We add a subtle overlay line by styling the gap between items when dragging.

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
    id: 'meta-retargeting',
    channel: 'Meta retargeting',
    taxonomy: 'RETARG_PROMO_HERO_META_VID_UGC_SHOP_V1',
    rows: [
      { position: 1, dimension: 'Campaign type', value: 'RETARG',  reason: 'Retargeting — warm audiences who visited the site or engaged with prior content' },
      { position: 2, dimension: 'Offer type',    value: 'PROMO',   reason: 'Promotional — discount incentive used to convert site visitors who did not purchase' },
      { position: 3, dimension: 'Product',       value: 'HERO',    reason: 'Hero SKU — highest-volume product; familiar to the warm audience from prior browsing' },
      { position: 4, dimension: 'Platform',      value: 'META',    reason: 'Meta (Facebook / Instagram) — primary retargeting channel via pixel-based audiences' },
      { position: 5, dimension: 'Format',        value: 'VID',     reason: 'Video — higher completion rate on warm audiences with prior brand familiarity' },
      { position: 6, dimension: 'Creative type', value: 'UGC',     reason: 'User-generated content — social proof from existing customers; effective at overcoming purchase hesitation' },
      { position: 7, dimension: 'CTA',           value: 'SHOP',    reason: 'Shop now — warm audience familiar with the brand; direct conversion CTA appropriate' },
      { position: 8, dimension: 'Version',       value: 'V1',      reason: 'First iteration — test against static creative to validate video performance on retargeting' },
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setDimensions((prev) => {
        const oldIndex = prev.findIndex((d) => d.id === active.id);
        const newIndex = prev.findIndex((d) => d.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const switchOrder = (next: HierarchyOrder) => {
    if (next === order) return;
    const hasValues = dimensions.some((d) => d.value);
    if (hasValues) {
      const confirmed = window.confirm('Switching order will clear all values you have entered. Continue?');
      if (!confirmed) return;
    }
    setOrder(next);
    setDimensions(makeDimensions(next === 'analysis' ? ANALYSIS_NAMES : SETUP_NAMES));
  };

  const update = (id: string, patch: Partial<Dimension>) =>
    setDimensions((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  const removeDimension = (id: string) =>
    setDimensions((prev) => prev.filter((d) => d.id !== id));

  const addDimension = () =>
    setDimensions((prev) => [...prev, { id: makeId(), name: '', value: '' }]);

  const [session, setSession] = useState<SavedTaxonomy[]>([]);
  const [pendingSaveName, setPendingSaveName] = useState<string | null>(null);

  const preview = buildPreview(dimensions);

  const confirmSave = () => {
    if (!pendingSaveName?.trim() || !preview) return;
    setSession((prev) => [
      ...prev,
      {
        id: makeId(),
        name: pendingSaveName.trim(),
        fullString: preview,
        dimensions: dimensions.map((d, i) => ({ position: i + 1, name: d.name, value: d.value })),
      },
    ]);
    setPendingSaveName(null);
  };

  return (
    <ToolLayout
      title="Campaign Taxonomy Builder"
      description="Build a consistent naming convention for Meta and Google paid campaigns. Define your dimensions, add values, and preview the naming string as you build."
      metaDescription="Build a consistent naming convention for Meta and Google paid media. Define dimensions, add values, and preview the naming string."
    >
      <div className="space-y-8">
        {/* Order toggle */}
        <div>
          <div className="inline-flex rounded border border-slate-200 bg-slate-50 p-0.5">
            {(['analysis', 'setup'] as HierarchyOrder[]).map((o) => (
              <button
                key={o}
                onClick={() => switchOrder(o)}
                className={`px-4 py-1.5 rounded text-xs font-medium transition-colors ${
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
            Starting order built for analysis, not setup. Drag to reorder to match your own convention.
          </SectionLabel>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={dimensions.map((d) => d.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {dimensions.map((dim, i) => (
                  <DimensionRow
                    key={dim.id}
                    dim={dim}
                    index={i}
                    onNameChange={(v) => update(dim.id, { name: v })}
                    onValueChange={(v) => update(dim.id, { value: v })}
                    onRemoveDimension={() => removeDimension(dim.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {dimensions.length < MAX_DIMENSIONS ? (
            <button
              onClick={addDimension}
              className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
            >
              <Plus size={14} />
              Add dimension
            </button>
          ) : (
            <p className="mt-3 text-xs text-slate-400">
              12 dimensions is the practical limit for a naming string that stays readable and parseable across teams and agencies.
            </p>
          )}
        </div>

        {/* Preview */}
        <div>
          <SectionLabel>Preview</SectionLabel>
          <div className="border border-slate-200 rounded-lg bg-white shadow-card px-4 py-4">
            {preview ? (
              <p className="text-xs font-mono text-slate-900 break-all">{preview}</p>
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
          <p className="mt-3 text-xs text-slate-400">
            Build one taxonomy per channel or campaign type, then save each before changing values.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              onClick={() => exportCurrentCsv(dimensions, preview)}
              disabled={!preview}
              className="bg-slate-900 text-white px-4 py-2 rounded text-xs font-medium hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              Export CSV
            </button>
            {pendingSaveName === null ? (
              <button
                onClick={() => setPendingSaveName(`Taxonomy ${session.length + 1}`)}
                disabled={!preview}
                className="border border-slate-200 text-slate-700 px-4 py-2 rounded text-xs font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                Save to session
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={pendingSaveName}
                  onChange={(e) => setPendingSaveName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmSave();
                    if (e.key === 'Escape') setPendingSaveName(null);
                  }}
                  autoFocus
                  className="border border-slate-200 rounded px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-400 transition-colors w-48"
                />
                <button
                  onClick={confirmSave}
                  className="bg-slate-900 text-white px-3 py-2 rounded text-xs font-medium hover:bg-slate-800 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => setPendingSaveName(null)}
                  className="h-8 w-8 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 transition-colors"
                  aria-label="Cancel"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
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
        {dimensions.some((d) => d.value) && (
          <div>
            <SectionLabel>Structure reference</SectionLabel>
            <div className="border border-slate-200 rounded-lg overflow-hidden shadow-card">
              <table className="w-full text-sm">
                <thead className="bg-white border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 text-left text-xs uppercase tracking-widest font-semibold text-slate-400 w-8">#</th>
                    <th className="py-2.5 px-4 text-left text-xs uppercase tracking-widest font-semibold text-slate-400">Dimension</th>
                    <th className="py-2.5 px-4 text-left text-xs uppercase tracking-widest font-semibold text-slate-400">Value</th>
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
                        {dim.value ? (
                          <span className="font-mono text-xs text-slate-600">{dim.value}</span>
                        ) : (
                          <span className="text-xs text-slate-300 italic">No value yet</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Session list */}
        {session.length > 0 && (
          <div>
            <SectionLabel>Saved taxonomies</SectionLabel>
            <div className="border border-slate-200 rounded-lg overflow-hidden shadow-card">
              <table className="w-full text-sm">
                <thead className="bg-white border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 text-left text-xs uppercase tracking-widest font-semibold text-slate-400">Name</th>
                    <th className="py-2.5 px-4 text-left text-xs uppercase tracking-widest font-semibold text-slate-400">Full string</th>
                    <th className="py-2.5 px-4 w-16" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {session.map((s) => (
                    <tr key={s.id} className="bg-white">
                      <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">{s.name}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600 break-all">{s.fullString}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setSession((prev) => prev.filter((x) => x.id !== s.id))}
                          className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center justify-between gap-4">
              <p className="text-xs text-slate-400">Saved taxonomies are cleared when you leave this page.</p>
              <button
                onClick={() => exportAllCsv(session)}
                className="shrink-0 border border-slate-200 text-slate-700 px-4 py-2 rounded text-xs font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors"
              >
                Export all
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="mt-12 pt-8 border-t border-slate-200">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Try this next</p>
        <Link
          to="/tools/promotions"
          className="group flex items-start justify-between gap-4 bg-white border border-slate-200 rounded-lg px-5 py-4 hover:border-slate-300 transition-colors shadow-card"
        >
          <div>
            <p className="text-sm font-semibold text-slate-900 mb-1 group-hover:text-slate-700 transition-colors">Promotions Profitability</p>
            <p className="text-sm text-slate-500">Consistent campaign naming makes promotion analysis easier. Test your next promotion's profitability before you run it.</p>
          </div>
          <span className="text-sm text-slate-400 group-hover:text-slate-900 transition-colors whitespace-nowrap mt-0.5">Open →</span>
        </Link>
      </div>
    </ToolLayout>
  );
}
