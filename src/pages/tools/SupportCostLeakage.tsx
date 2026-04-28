import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ToolLayout } from '@/components/ToolLayout';
import { ResultCard } from '@/components/ResultCard';
import { SectionLabel } from '@/components/SectionLabel';
import { InputField } from '@/components/InputField';
import { calculateSupportCost } from '@/logic/supportCostLogic';
import type { SupportCostInputs } from '@/logic/supportCostTypes';
import { formatCurrency } from '@/lib/utils';

// ─── PLATFORM PRESETS ─────────────────────────────────────────────────────────

const PLATFORM_PRESETS: Record<string, number> = {
  gorgias: 120,
  zendesk: 150,
  reamaze: 60,
  freshdesk: 80,
  other: 0,
};

// ─── COMPLAINT INSIGHTS ───────────────────────────────────────────────────────

const COMPLAINT_INSIGHTS: Record<string, string> = {
  'sizing-fit':
    'Sizing and fit complaints are typically a PDP or size guide gap, not a product problem. The fix is upstream of the warehouse.',
  'delivery-shipping':
    'Delivery complaints often reflect an expectation gap set at checkout or on the PDP — not always a carrier problem.',
  'product-fault':
    'Fault complaints need SKU-level isolation to distinguish a quality issue from a fulfilment or storage problem.',
  'doesnt-match':
    "Description mismatch is a PDP accuracy problem. It also puts you at risk of being cited inaccurately by AI search engines — the same copy that confuses customers confuses LLMs.",
  'returns-process':
    "Returns process complaints usually mean your policy or post-purchase comms aren't clear enough — not that the policy itself is wrong.",
};

const PLATFORM_LABELS: Record<string, string> = {
  gorgias: 'Gorgias',
  zendesk: 'Zendesk',
  reamaze: 'Re:amaze',
  freshdesk: 'Freshdesk',
};

function platformDisplayName(platform: string): string {
  return PLATFORM_LABELS[platform] ?? 'your customer service platform';
}

function otherComplaintInsight(platform: string): string {
  const name = platformDisplayName(platform);
  const ref = name === 'your customer service platform' ? name : `your ${name}`;
  return `Without structured ticket analysis it's hard to diagnose further. Growth Engine reads the unstructured text of ${ref} tickets and derives structured complaint themes automatically — no manual tagging required. The pattern is in there. You just need the right layer to surface it.`;
}

// ─── FORM STATE ───────────────────────────────────────────────────────────────

interface FormState {
  monthlyOrders: string;
  aov: string;
  monthlyTickets: string;
  avgHandleTimeMinutes: string;
  teamSize: string;
  annualSalaryPerAgent: string;
  platform: string;
  monthlyPlatformCost: string;
  otherToolingMonthly: string;
  refundRate: string;
  avgRefundValue: string;
  complaintReason: string;
}

const DEFAULT_FORM: FormState = {
  monthlyOrders: '',
  aov: '',
  monthlyTickets: '',
  avgHandleTimeMinutes: '8',
  teamSize: '',
  annualSalaryPerAgent: '28000',
  platform: '',
  monthlyPlatformCost: '',
  otherToolingMonthly: '',
  refundRate: '15',
  avgRefundValue: '',
  complaintReason: '',
};

function toInputs(form: FormState): SupportCostInputs {
  const p = (s: string) => parseFloat(s) || 0;
  return {
    monthlyOrders: p(form.monthlyOrders),
    aov: p(form.aov),
    monthlyTickets: p(form.monthlyTickets),
    avgHandleTimeMinutes: p(form.avgHandleTimeMinutes),
    teamSize: p(form.teamSize),
    annualSalaryPerAgent: p(form.annualSalaryPerAgent),
    monthlyPlatformCost: p(form.monthlyPlatformCost),
    otherToolingMonthly: p(form.otherToolingMonthly),
    refundRate: p(form.refundRate),
    avgRefundValue: p(form.avgRefundValue) || p(form.aov),
  };
}

// ─── LOCAL COMPONENTS ─────────────────────────────────────────────────────────

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="flex items-stretch border border-slate-200 rounded bg-white focus-within:border-slate-400 transition-colors">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 text-sm text-slate-900 bg-transparent outline-none min-w-0 cursor-pointer"
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <span className="text-sm font-semibold text-slate-900 tabular-nums">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full accent-slate-900 cursor-pointer"
      />
      <div className="flex justify-between text-xs text-slate-400">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export function SupportCostLeakage() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [platformManuallyEdited, setPlatformManuallyEdited] = useState(false);
  const [refundValueManuallyEdited, setRefundValueManuallyEdited] = useState(false);

  const set = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleAovChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      aov: value,
      avgRefundValue: refundValueManuallyEdited ? prev.avgRefundValue : value,
    }));
  };

  const handlePlatformChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      platform: value,
      monthlyPlatformCost: platformManuallyEdited
        ? prev.monthlyPlatformCost
        : value in PLATFORM_PRESETS
          ? PLATFORM_PRESETS[value].toString()
          : prev.monthlyPlatformCost,
    }));
  };

  const handlePlatformCostChange = (value: string) => {
    setPlatformManuallyEdited(true);
    set('monthlyPlatformCost')(value);
  };

  const handleRefundValueChange = (value: string) => {
    setRefundValueManuallyEdited(true);
    set('avgRefundValue')(value);
  };

  const p = (s: string) => parseFloat(s) || 0;
  const isReady =
    p(form.monthlyOrders) > 0 &&
    p(form.monthlyTickets) > 0 &&
    p(form.annualSalaryPerAgent) > 0;

  const results = isReady ? calculateSupportCost(toInputs(form)) : null;
  const dash = '—';

  const costVariant =
    results && results.supportCostAsPctOfRevenue >= 10
      ? ('critical' as const)
      : results && results.supportCostAsPctOfRevenue >= 5
        ? ('warning' as const)
        : ('neutral' as const);

  return (
    <ToolLayout
      title="Support Cost Leakage Calculator"
      description="Most brands measure ticket volume. Few know what support is actually costing per order — or how much of that cost is avoidable."
      metaDescription="Calculate your true support cost per order — people cost, platform cost, and refund attribution combined. See your annual support leakage and deflection saving."
    >
      <div className="space-y-8">
        {/* ── Section 1: Order Volume ──────────────────────────────────────── */}
        <div>
          <SectionLabel>Order Volume</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InputField
              label="Monthly orders"
              value={form.monthlyOrders}
              onChange={set('monthlyOrders')}
              placeholder="0"
            />
            <InputField
              label="Average order value"
              value={form.aov}
              onChange={handleAovChange}
              prefix="£"
              placeholder="0"
            />
          </div>
        </div>

        {/* ── Section 2: Support Operations ───────────────────────────────── */}
        <div>
          <SectionLabel>Support Operations</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InputField
              label="Monthly support tickets"
              value={form.monthlyTickets}
              onChange={set('monthlyTickets')}
              placeholder="0"
              hint="Don't know? Estimate 8–12% of monthly orders for most DTC brands"
            />
            <InputField
              label="Average handle time"
              value={form.avgHandleTimeMinutes}
              onChange={set('avgHandleTimeMinutes')}
              suffix="minutes"
              placeholder="8"
            />
            <InputField
              label="Support team size"
              value={form.teamSize}
              onChange={set('teamSize')}
              placeholder="0"
            />
            <InputField
              label="Average fully loaded annual salary per agent"
              value={form.annualSalaryPerAgent}
              onChange={set('annualSalaryPerAgent')}
              prefix="£"
              placeholder="28000"
            />
          </div>
        </div>

        {/* ── Section 3: Platform Costs ────────────────────────────────────── */}
        <div>
          <SectionLabel>Platform Costs</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <SelectField
              label="Support platform"
              value={form.platform}
              onChange={handlePlatformChange}
              placeholder="Select platform"
              options={[
                { value: 'gorgias', label: 'Gorgias' },
                { value: 'zendesk', label: 'Zendesk' },
                { value: 'reamaze', label: 'Re:amaze' },
                { value: 'freshdesk', label: 'Freshdesk' },
                { value: 'other', label: 'Other' },
              ]}
            />
            <InputField
              label="Monthly platform cost"
              value={form.monthlyPlatformCost}
              onChange={handlePlatformCostChange}
              prefix="£"
              placeholder="0"
            />
            <InputField
              label="Other support tooling"
              value={form.otherToolingMonthly}
              onChange={set('otherToolingMonthly')}
              prefix="£"
              suffix="/month"
              placeholder="0"
              hint="Optional — AI deflection tools, chatbots, etc."
            />
          </div>
        </div>

        {/* ── Section 4: Refunds and Complaint Type ───────────────────────── */}
        <div>
          <SectionLabel>Refunds and Complaint Type</SectionLabel>
          <div className="space-y-5">
            <SliderField
              label="% of tickets resulting in refund or return"
              value={form.refundRate}
              onChange={set('refundRate')}
              min={0}
              max={50}
              step={1}
              unit="%"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <InputField
                label="Average refund value"
                value={form.avgRefundValue}
                onChange={handleRefundValueChange}
                prefix="£"
                placeholder="0"
              />
              <SelectField
                label="Primary complaint reason"
                value={form.complaintReason}
                onChange={set('complaintReason')}
                placeholder="Select reason"
                options={[
                  { value: 'sizing-fit', label: 'Sizing / Fit' },
                  { value: 'delivery-shipping', label: 'Delivery / Shipping' },
                  { value: 'product-fault', label: 'Product Fault' },
                  { value: 'doesnt-match', label: "Doesn't Match Description" },
                  { value: 'returns-process', label: 'Returns Process' },
                  { value: 'other', label: 'Other' },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Results (live) ───────────────────────────────────────────────────── */}
      <div className="mt-10 pt-8 border-t border-slate-200 space-y-6">
        {/* Cost breakdown */}
        <div>
          <SectionLabel>Cost per order breakdown</SectionLabel>
          <div className="border border-slate-200 rounded-lg overflow-hidden shadow-card">
            {(
              [
                { label: 'People cost per order', value: results?.peopleCostPerOrder ?? null },
                { label: 'Platform cost per order', value: results?.platformCostPerOrder ?? null },
                { label: 'Refund-attributed cost per order', value: results?.refundAttributedCostPerOrder ?? null },
              ] as { label: string; value: number | null }[]
            ).map((item, i) => (
              <div
                key={item.label}
                className={`flex items-center justify-between px-4 py-3 text-sm bg-white${i > 0 ? ' border-t border-slate-100' : ''}`}
              >
                <span className="text-slate-600">{item.label}</span>
                <span className="font-mono tabular-nums text-slate-700">
                  {item.value !== null ? formatCurrency(item.value) : dash}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-3 text-sm bg-slate-50 border-t-2 border-slate-200">
              <span className="font-semibold text-slate-800">Total support cost per order</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {results ? formatCurrency(results.totalSupportCostPerOrder) : dash}
              </span>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ResultCard
            label="Support cost as % of revenue"
            value={results ? `${results.supportCostAsPctOfRevenue.toFixed(1)}%` : dash}
            subtext="Per order vs AOV"
            variant={costVariant}
          />
          <ResultCard
            label="Annual support leakage"
            value={results ? formatCurrency(results.annualSupportLeakage) : dash}
            variant="neutral"
          />
        </div>

        {/* Deflection callout */}
        <div className="border border-amber-200 bg-amber-50 rounded-lg px-4 py-3">
          <p className="text-sm text-amber-800 leading-relaxed">
            Reducing your contact rate by 20% would save{' '}
            <span className="font-semibold">
              {results ? formatCurrency(results.deflectionSaving) : dash}
            </span>{' '}
            per year.
          </p>
        </div>

        {/* Complaint reason insight */}
        {form.complaintReason && (
          <div className="border border-slate-200 bg-slate-50 rounded-lg px-4 py-3">
            <p className="text-sm text-slate-700 leading-relaxed">
              {form.complaintReason === 'other'
                ? otherComplaintInsight(form.platform)
                : COMPLAINT_INSIGHTS[form.complaintReason]}
            </p>
          </div>
        )}

        {/* Growth Engine CTA */}
        {(() => {
          const name = platformDisplayName(form.platform);
          const accountRef = name === 'your customer service platform'
            ? name
            : `your ${name} account`;
          return (
            <div className="border border-emerald-200 bg-emerald-50 rounded-lg px-4 py-4">
              <p className="text-sm text-slate-700 leading-relaxed mb-2">
                To see which specific products are driving your support cost, connect {accountRef} to
                Growth Engine. The ontology layer reads the unstructured text of every ticket and
                derives structured signal automatically — complaint themes by SKU, fault patterns by
                product line, and PDP gap signals from description mismatch language. No manual
                tagging. No spreadsheet exports.
              </p>
              <a
                href="https://demo.neilminty.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-slate-900 underline underline-offset-2 hover:no-underline transition-colors"
              >
                Learn more →
              </a>
            </div>
          );
        })()}
      </div>
      <div className="mt-12 pt-8 border-t border-slate-200">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Try this next</p>
        <Link
          to="/tools/margin-leakage"
          className="group flex items-start justify-between gap-4 bg-white border border-slate-200 rounded-lg px-5 py-4 hover:border-slate-300 transition-colors shadow-card"
        >
          <div>
            <p className="text-sm font-semibold text-slate-900 mb-1 group-hover:text-slate-700 transition-colors">Margin Leakage</p>
            <p className="text-sm text-slate-500">Support cost is one leakage driver. See how it compares to returns and discounting across your full P&L.</p>
          </div>
          <span className="text-sm text-slate-400 group-hover:text-slate-900 transition-colors whitespace-nowrap mt-0.5">Open →</span>
        </Link>
      </div>
    </ToolLayout>
  );
}
