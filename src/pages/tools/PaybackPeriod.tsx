import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { ToolLayout } from '@/components/ToolLayout';
import { ResultCard } from '@/components/ResultCard';
import { SectionLabel } from '@/components/SectionLabel';
import { InputField } from '@/components/InputField';
import { calculatePayback, calculateFullAnalyser } from '@/logic/paybackLogic';
import type { PaybackInputs, PaybackResults, ChannelInput, FullAnalyserResults } from '@/logic/paybackTypes';
import { formatCurrency } from '@/lib/utils';

// ─── CHANNEL DATA MODEL ───────────────────────────────────────────────────────

interface ChannelRow {
  id: string;
  label: string;
  cac: string;
  volume: string;
  isPreset: boolean;
}

const PRESET_CHANNEL_LABELS = [
  'Paid Social',
  'Paid Search',
  'Organic Search',
  'Organic Social',
  'Email/SMS',
  'Direct',
  'Affiliates',
  'Other',
];

function makePresetChannels(): ChannelRow[] {
  return PRESET_CHANNEL_LABELS.map((label) => ({
    id: label,
    label,
    cac: '',
    volume: '',
    isPreset: true,
  }));
}

function makeCustomChannel(): ChannelRow {
  return { id: crypto.randomUUID(), label: '', cac: '', volume: '', isPreset: false };
}

// ─── FORM STATE ───────────────────────────────────────────────────────────────

interface FormState {
  blendedCAC: string;
  aov: string;
  grossMarginPercent: string;
  repeatPurchaseRate: string;
  avgOrderFrequencyMonths: string;
}

const DEFAULT_FORM: FormState = {
  blendedCAC: '',
  aov: '',
  grossMarginPercent: '',
  repeatPurchaseRate: '',
  avgOrderFrequencyMonths: '',
};

function toInputs(form: FormState): PaybackInputs {
  const p = (s: string) => parseFloat(s) || 0;
  return {
    blendedCAC: p(form.blendedCAC),
    aov: p(form.aov),
    grossMarginPercent: p(form.grossMarginPercent),
    repeatPurchaseRate: p(form.repeatPurchaseRate),
    avgOrderFrequencyMonths: p(form.avgOrderFrequencyMonths),
  };
}

// ─── VIEW STATE ───────────────────────────────────────────────────────────────

type ViewState =
  | { view: 'input' }
  | { view: 'results'; inputs: PaybackInputs; results: PaybackResults; fullResults: FullAnalyserResults | null };

// ─── VERDICT CALLOUT ──────────────────────────────────────────────────────────

function verdictText(results: PaybackResults): string {
  const months = results.monthsToPayback;
  const ratio24 = results.ltvCacRatio24;

  switch (results.paybackVerdict) {
    case 'strong':
      return `CAC is recovered in ${months.toFixed(1)} months — the model works. Protect margin per order and repeat rate to maintain this position as you scale spend.`;
    case 'acceptable':
      return `CAC is recovered in ${months.toFixed(1)} months. The model is viable but whether the channel scales depends on your LTV:CAC at 24 months — currently ${ratio24.toFixed(1)}×. A ratio below 3× limits headroom to increase spend without compressing returns.`;
    case 'stretched':
      return `CAC recovery takes ${months.toFixed(1)} months. At this payback period, scaling spend creates cash flow pressure before contribution catches up. Margin per order or repeat purchase rate needs to improve before increasing acquisition spend.`;
    case 'unviable':
      return `At current CAC and margin, acquisition cost is not recovered within 18 months. Scaling spend at this unit economics profile will compound losses — restructure the model before investing further in paid acquisition.`;
  }
}

// ─── LTV:CAC VARIANT ─────────────────────────────────────────────────────────

function ltvCacVariant(ratio: number): 'positive' | 'warning' | 'critical' {
  if (ratio >= 3) return 'positive';
  if (ratio >= 1) return 'warning';
  return 'critical';
}

// ─── COMPACT CELL INPUT ───────────────────────────────────────────────────────

function CellInput({
  value,
  onChange,
  prefix,
  placeholder = '0',
  type = 'number',
}: {
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  placeholder?: string;
  type?: 'text' | 'number';
}) {
  return (
    <div className="flex items-stretch border border-slate-200 rounded bg-white focus-within:border-slate-400 transition-colors">
      {prefix && (
        <span className="px-2 text-sm text-slate-500 border-r border-slate-200 flex items-center bg-slate-50 rounded-l select-none shrink-0">
          {prefix}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 px-2.5 py-2 text-sm text-slate-900 bg-transparent outline-none min-w-0"
      />
    </div>
  );
}

// ─── RESULTS VIEW ─────────────────────────────────────────────────────────────

function ResultsView({
  results,
  inputs,
  fullResults,
  onRecalculate,
}: {
  results: PaybackResults;
  inputs: PaybackInputs;
  fullResults: FullAnalyserResults | null;
  onRecalculate: () => void;
}) {
  const paybackVariant =
    results.paybackVerdict === 'strong' ? ('positive' as const) :
    results.paybackVerdict === 'acceptable' ? ('neutral' as const) :
    results.paybackVerdict === 'stretched' ? ('warning' as const) :
    ('critical' as const);

  const monthsDisplay = isFinite(results.monthsToPayback)
    ? `${results.monthsToPayback.toFixed(1)} months`
    : '—';

  return (
    <div className="space-y-8">
      {inputs.blendedCAC > 0 && (
        <>
          {/* 2×2 primary cards */}
          <div>
            <SectionLabel>Unit economics</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ResultCard
                label="Months to payback"
                value={monthsDisplay}
                subtext={`Verdict: ${results.paybackVerdict}`}
                variant={paybackVariant}
              />
              <ResultCard
                label="Margin per order"
                value={formatCurrency(results.marginPerOrder)}
                subtext={`${results.ordersToPayback.toFixed(1)} orders to recover CAC`}
                variant="neutral"
              />
              <ResultCard
                label="LTV at 12 months"
                value={formatCurrency(results.ltv12Month)}
                variant="neutral"
              />
              <ResultCard
                label="LTV at 24 months"
                value={formatCurrency(results.ltv24Month)}
                variant="neutral"
              />
            </div>
          </div>

          {/* LTV:CAC ratios */}
          <div>
            <SectionLabel>LTV:CAC</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ResultCard
                label="LTV:CAC at 12 months"
                value={`${results.ltvCacRatio12.toFixed(1)}×`}
                subtext="Healthy ≥ 3×"
                variant={ltvCacVariant(results.ltvCacRatio12)}
              />
              <ResultCard
                label="LTV:CAC at 24 months"
                value={`${results.ltvCacRatio24.toFixed(1)}×`}
                subtext="Healthy ≥ 3×"
                variant={ltvCacVariant(results.ltvCacRatio24)}
              />
            </div>
          </div>

          {/* Verdict callout */}
          <div>
            <SectionLabel>Verdict</SectionLabel>
            <div className="border border-slate-200 bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-700 leading-relaxed">
                {verdictText(results)}
              </p>
            </div>
          </div>
        </>
      )}

      {/* ── Full Analyser results ──────────────────────────────────────────── */}
      {fullResults && fullResults.channels.length > 0 && (() => {
        const margin = Math.max(0, Math.min(1, inputs.grossMarginPercent / 100));
        const retention = Math.max(0, Math.min(1, inputs.repeatPurchaseRate / 100));
        const freq = inputs.avgOrderFrequencyMonths > 0 ? 12 / inputs.avgOrderFrequencyMonths : 0;
        const monthlyContrib = inputs.aov * margin * retention * freq / 12;
        const blendedPaybackMonths = monthlyContrib > 0 ? fullResults.blendedCAC / monthlyContrib : Infinity;
        const lifespanMonths = retention > 0 && retention < 1
          ? (1 / (1 - retention)) * inputs.avgOrderFrequencyMonths
          : Infinity;

        const flagged = fullResults.channels.filter((ch) => ch.isUnderwater || ch.isPaybackRisk);

        return (
          <div className="pt-10 border-t border-slate-200">
            <h2 className="text-2xl font-semibold text-slate-900 tracking-tight mb-6">Full Analyser</h2>

            {/* Three summary figures */}
            <div>
              <SectionLabel>Summary</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ResultCard
                  label="Blended LTV:CAC"
                  value={`${fullResults.blendedLtvCacRatio12.toFixed(1)}×`}
                  subtext="12-month horizon · Healthy ≥ 3×"
                  variant={ltvCacVariant(fullResults.blendedLtvCacRatio12)}
                />
                <ResultCard
                  label="Blended CAC"
                  value={formatCurrency(fullResults.blendedCAC)}
                  subtext="Volume-weighted across active channels"
                  variant="neutral"
                />
                <ResultCard
                  label="Total customers"
                  value={fullResults.totalVolume.toLocaleString()}
                  subtext={`Across ${fullResults.channels.length} active channel${fullResults.channels.length !== 1 ? 's' : ''}`}
                  variant="neutral"
                />
              </div>
            </div>

            {/* Channel table */}
            <div className="mt-8">
              <SectionLabel>By channel</SectionLabel>
              <div className="border border-slate-200 rounded-lg overflow-x-auto shadow-card">
                <table className="w-full text-sm min-w-[480px]">
                  <thead className="bg-white border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4 text-left text-xs uppercase tracking-widest font-semibold text-slate-400">Channel</th>
                      <th className="py-2.5 px-4 text-right text-xs uppercase tracking-widest font-semibold text-slate-400">CAC</th>
                      <th className="py-2.5 px-4 text-right text-xs uppercase tracking-widest font-semibold text-slate-400">Volume</th>
                      <th className="py-2.5 px-4 text-right text-xs uppercase tracking-widest font-semibold text-slate-400">LTV:CAC</th>
                      <th className="py-2.5 px-4 text-right text-xs uppercase tracking-widest font-semibold text-slate-400">Payback Period</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fullResults.channels.map((ch) => {
                      const isBoth = ch.isUnderwater && ch.isPaybackRisk;
                      const ltvColor = ch.isUnderwater
                        ? (isBoth ? 'text-red-700' : 'text-amber-700')
                        : 'text-slate-700';
                      const paybackColor = ch.isPaybackRisk
                        ? (isBoth ? 'text-red-700' : 'text-amber-700')
                        : 'text-slate-700';
                      return (
                        <tr key={ch.label} className="bg-white">
                          <td className="py-3 px-4 font-medium text-slate-900">{ch.label}</td>
                          <td className="py-3 px-4 text-right tabular-nums text-slate-700">{formatCurrency(ch.cac)}</td>
                          <td className="py-3 px-4 text-right tabular-nums text-slate-700">{ch.volume.toLocaleString()}</td>
                          <td className={`py-3 px-4 text-right tabular-nums font-medium ${ltvColor}`}>
                            {ch.cac > 0 ? `${ch.ltvCacRatio12.toFixed(1)}×` : '—'}
                          </td>
                          <td className={`py-3 px-4 text-right tabular-nums ${paybackColor}`}>
                            {ch.cac === 0
                              ? '—'
                              : isFinite(ch.paybackMonths)
                                ? `${ch.paybackMonths.toFixed(1)} months`
                                : '∞'}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Blended totals row */}
                    <tr className="bg-slate-50 border-t-2 border-slate-200">
                      <td className="py-3 px-4 text-xs font-semibold uppercase tracking-widest text-slate-500">Blended</td>
                      <td className="py-3 px-4 text-right tabular-nums font-medium text-slate-700">{formatCurrency(fullResults.blendedCAC)}</td>
                      <td className="py-3 px-4 text-right tabular-nums font-medium text-slate-700">{fullResults.totalVolume.toLocaleString()}</td>
                      <td className={`py-3 px-4 text-right tabular-nums font-medium ${ltvCacVariant(fullResults.blendedLtvCacRatio12) === 'critical' ? 'text-red-700' : ltvCacVariant(fullResults.blendedLtvCacRatio12) === 'warning' ? 'text-amber-700' : 'text-slate-700'}`}>
                        {fullResults.blendedCAC > 0 ? `${fullResults.blendedLtvCacRatio12.toFixed(1)}×` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-slate-700">
                        {fullResults.blendedCAC === 0
                          ? '—'
                          : isFinite(blendedPaybackMonths)
                            ? `${blendedPaybackMonths.toFixed(1)} months`
                            : '∞'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Plain-language interpretation for flagged channels */}
            {flagged.length > 0 && (
              <div className="mt-6 space-y-2">
                {flagged.map((ch) => {
                  const sentence = ch.isUnderwater
                    ? `${ch.label} is not LTV-positive at current CAC and volume.`
                    : isFinite(ch.paybackMonths) && isFinite(lifespanMonths)
                      ? `${ch.label} is recovering acquisition cost in ${ch.paybackMonths.toFixed(1)} months against an implied customer lifespan of ${lifespanMonths.toFixed(1)} months.`
                      : `${ch.label} is not recovering acquisition cost within the implied customer lifespan.`;
                  return (
                    <p key={ch.label} className="text-sm text-slate-600 leading-relaxed">
                      {sentence}
                    </p>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Recalculate */}
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

// ─── INPUT VIEW ───────────────────────────────────────────────────────────────

function InputView({
  form,
  setForm,
  channels,
  setChannels,
  onCalculateQuickEstimate,
  onCalculateFullAnalyser,
  errors,
  showSharedError,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  channels: ChannelRow[];
  setChannels: React.Dispatch<React.SetStateAction<ChannelRow[]>>;
  onCalculateQuickEstimate: () => void;
  onCalculateFullAnalyser: () => void;
  errors: string[];
  showSharedError: boolean;
}) {
  const set = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const updateChannel = (id: string, field: keyof Omit<ChannelRow, 'id' | 'isPreset'>, value: string) => {
    setChannels((prev) => prev.map((ch) => (ch.id === id ? { ...ch, [field]: value } : ch)));
  };

  const addChannel = () => {
    setChannels((prev) => [...prev, makeCustomChannel()]);
  };

  const removeChannel = (id: string) => {
    setChannels((prev) => prev.filter((ch) => ch.id !== id));
  };

  return (
    <>
      {/* ── Tier 1: Quick Estimate ─────────────────────────────────────────── */}
      <div id="quick-estimate-inputs" className="space-y-8">
        {/* Acquisition */}
        <div>
          <SectionLabel>Acquisition</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InputField
              label="Blended CAC"
              value={form.blendedCAC}
              onChange={set('blendedCAC')}
              prefix="£"
              hint="Weighted average cost to acquire one customer across all channels"
              placeholder="0"
            />
          </div>
        </div>

        {/* Order economics */}
        <div>
          <SectionLabel>Order Economics</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InputField
              label="AOV"
              value={form.aov}
              onChange={set('aov')}
              prefix="£"
              placeholder="0"
            />
            <InputField
              label="Gross Margin"
              value={form.grossMarginPercent}
              onChange={set('grossMarginPercent')}
              suffix="%"
              hint="Product margin before fulfilment and other operational costs"
              placeholder="0"
            />
          </div>
        </div>

        {/* Repeat behaviour */}
        <div>
          <SectionLabel>Repeat Behaviour</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InputField
              label="Repeat Purchase Rate"
              value={form.repeatPurchaseRate}
              onChange={set('repeatPurchaseRate')}
              suffix="%"
              hint="% of customers who make at least a second purchase"
              placeholder="0"
            />
            <InputField
              label="Avg Order Frequency"
              value={form.avgOrderFrequencyMonths}
              onChange={set('avgOrderFrequencyMonths')}
              suffix="months between orders"
              hint="Average time between purchases for repeat customers"
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {/* ── Quick Estimate validation + Calculate ──────────────────────────── */}
      {errors.length > 0 && (
        <div className="mt-8 border border-red-200 bg-red-50 rounded-lg px-4 py-3">
          <ul className="space-y-1">
            {errors.map((err) => (
              <li key={err} className="text-sm text-red-700">
                {err}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 flex justify-end">
        <button
          onClick={onCalculateQuickEstimate}
          className="bg-slate-900 text-white px-6 py-2.5 rounded text-sm font-medium hover:bg-slate-800 transition-colors min-w-[160px]"
        >
          Calculate
        </button>
      </div>

      {/* ── Tier 2: Full Analyser ──────────────────────────────────────────── */}
      <div className="mt-16 pt-10 border-t border-slate-200">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight mb-3">Full Analyser</h2>
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5">
            <p className="text-sm text-slate-600">
              <span className="text-slate-500">Calculating with: </span>
              AOV {form.aov && parseFloat(form.aov) > 0 ? `£${form.aov}` : '—'}
              {' · '}
              Margin {form.grossMarginPercent && parseFloat(form.grossMarginPercent) > 0 ? `${form.grossMarginPercent}%` : '—'}
              {' · '}
              Repeat Rate {form.repeatPurchaseRate && parseFloat(form.repeatPurchaseRate) > 0 ? `${form.repeatPurchaseRate}%` : '—'}
              {' · '}
              Order Frequency {form.avgOrderFrequencyMonths && parseFloat(form.avgOrderFrequencyMonths) > 0 ? `${form.avgOrderFrequencyMonths} months` : '—'}
            </p>
            <button
              onClick={() => {
                document.getElementById('quick-estimate-inputs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-800 transition-colors shrink-0"
            >
              Edit shared inputs
            </button>
          </div>
        </div>

        {/* Desktop column headers */}
        <div className="hidden sm:grid gap-3 mb-2" style={{ gridTemplateColumns: '1fr 7.5rem 7.5rem 2rem' }}>
          <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Channel</span>
          <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold">CAC</span>
          <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Volume</span>
          <span />
        </div>

        {/* Desktop rows */}
        <div className="hidden sm:block space-y-2">
          {channels.map((ch) => (
            <div key={ch.id} className="grid gap-3 items-center" style={{ gridTemplateColumns: '1fr 7.5rem 7.5rem 2rem' }}>
              {ch.isPreset ? (
                <span className="text-sm text-slate-700">{ch.label}</span>
              ) : (
                <CellInput
                  type="text"
                  value={ch.label}
                  onChange={(v) => updateChannel(ch.id, 'label', v)}
                  placeholder="Channel name"
                />
              )}
              <CellInput
                value={ch.cac}
                onChange={(v) => updateChannel(ch.id, 'cac', v)}
                prefix="£"
                placeholder="0"
              />
              <CellInput
                value={ch.volume}
                onChange={(v) => updateChannel(ch.id, 'volume', v)}
                placeholder="0"
              />
              {ch.isPreset ? (
                <span />
              ) : (
                <button
                  onClick={() => removeChannel(ch.id)}
                  className="h-7 w-7 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 transition-colors"
                  aria-label="Remove channel"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Mobile card layout */}
        <div className="sm:hidden space-y-3">
          {channels.map((ch) => (
            <div key={ch.id} className="border border-slate-200 rounded-lg p-3 space-y-2.5 bg-white">
              {ch.isPreset ? (
                <p className="text-sm font-medium text-slate-700">{ch.label}</p>
              ) : (
                <div className="flex gap-2 items-start">
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">Channel name</p>
                    <CellInput
                      type="text"
                      value={ch.label}
                      onChange={(v) => updateChannel(ch.id, 'label', v)}
                      placeholder="Channel name"
                    />
                  </div>
                  <button
                    onClick={() => removeChannel(ch.id)}
                    className="mt-5 h-7 w-7 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 transition-colors"
                    aria-label="Remove channel"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">CAC</p>
                  <CellInput value={ch.cac} onChange={(v) => updateChannel(ch.id, 'cac', v)} prefix="£" placeholder="0" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">Volume</p>
                  <CellInput value={ch.volume} onChange={(v) => updateChannel(ch.id, 'volume', v)} placeholder="0" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add channel */}
        <div className="mt-3">
          <button
            onClick={addChannel}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            <Plus size={14} />
            Add channel
          </button>
        </div>

        {/* ── Full Analyser validation + Calculate ───────────────────────── */}
        {showSharedError && (
          <div className="mt-8 border border-red-200 bg-red-50 rounded-lg px-4 py-3">
            <p className="text-sm text-red-700">
              Enter AOV, margin, repeat rate and order frequency in the Quick Estimate section above before running the full analysis.
            </p>
          </div>
        )}

        <div className="mt-8 flex justify-end">
          <button
            onClick={onCalculateFullAnalyser}
            className="bg-slate-900 text-white px-6 py-2.5 rounded text-sm font-medium hover:bg-slate-800 transition-colors min-w-[160px]"
          >
            Calculate
          </button>
        </div>
      </div>
    </>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export function PaybackPeriod() {
  const [pageState, setPageState] = useState<ViewState>({ view: 'input' });
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [channels, setChannels] = useState<ChannelRow[]>(makePresetChannels);
  const [errors, setErrors] = useState<string[]>([]);
  const [sharedErrorTouched, setSharedErrorTouched] = useState(false);

  const p = (s: string) => parseFloat(s);
  const sharedInputsMissing =
    !(p(form.aov) > 0) ||
    !(p(form.grossMarginPercent) > 0) ||
    !(p(form.avgOrderFrequencyMonths) > 0);
  const showSharedError = sharedErrorTouched && sharedInputsMissing;

  const handleCalculate = () => {
    const errs: string[] = [];

    if (!(p(form.blendedCAC) > 0)) errs.push('Blended CAC must be greater than 0');
    if (!(p(form.aov) > 0)) errs.push('AOV must be greater than 0');
    if (!(p(form.grossMarginPercent) > 0) || p(form.grossMarginPercent) > 100) errs.push('Gross margin must be between 1 and 100%');
    if (!(p(form.avgOrderFrequencyMonths) > 0)) errs.push('Order frequency must be greater than 0');

    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    const inputs = toInputs(form);
    const results = calculatePayback(inputs);

    const activeChannels: ChannelInput[] = channels
      .filter((ch) => parseFloat(ch.volume) > 0)
      .map((ch) => ({
        label: ch.label || 'Unnamed channel',
        cac: parseFloat(ch.cac) || 0,
        volume: parseFloat(ch.volume),
      }));

    const fullResults = activeChannels.length > 0
      ? calculateFullAnalyser(activeChannels, {
          aov: parseFloat(form.aov) || 0,
          grossMarginPercent: parseFloat(form.grossMarginPercent) || 0,
          repeatPurchaseRate: parseFloat(form.repeatPurchaseRate) || 0,
          avgOrderFrequencyMonths: parseFloat(form.avgOrderFrequencyMonths) || 0,
        })
      : null;

    setPageState({ view: 'results', inputs, results, fullResults });
  };

  const handleFullAnalyserCalculate = () => {
    if (sharedInputsMissing) {
      setSharedErrorTouched(true);
      return;
    }
    const inputs = toInputs(form);
    const results = calculatePayback(inputs);

    const activeChannels: ChannelInput[] = channels
      .filter((ch) => parseFloat(ch.volume) > 0)
      .map((ch) => ({
        label: ch.label || 'Unnamed channel',
        cac: parseFloat(ch.cac) || 0,
        volume: parseFloat(ch.volume),
      }));

    const fullResults = activeChannels.length > 0
      ? calculateFullAnalyser(activeChannels, {
          aov: parseFloat(form.aov) || 0,
          grossMarginPercent: parseFloat(form.grossMarginPercent) || 0,
          repeatPurchaseRate: parseFloat(form.repeatPurchaseRate) || 0,
          avgOrderFrequencyMonths: parseFloat(form.avgOrderFrequencyMonths) || 0,
        })
      : null;

    setPageState({ view: 'results', inputs, results, fullResults });
  };

  return (
    <ToolLayout
      title="LTV:CAC Analyser"
      description="CAC is only half the equation. Enter your unit economics to get the blended picture, then add channel-level data to see which acquisition channels are LTV-positive, which are breaking even, which are destroying margin at scale."
      metaDescription="Enter your unit economics to see LTV:CAC at 12 and 24 months and how long it takes to recover your acquisition cost."
    >
      {pageState.view === 'input' ? (
        <InputView
          form={form}
          setForm={setForm}
          channels={channels}
          setChannels={setChannels}
          onCalculateQuickEstimate={handleCalculate}
          onCalculateFullAnalyser={handleFullAnalyserCalculate}
          errors={errors}
          showSharedError={showSharedError}
        />
      ) : (
        <ResultsView
          results={pageState.results}
          inputs={pageState.inputs}
          fullResults={pageState.fullResults}
          onRecalculate={() => setPageState({ view: 'input' })}
        />
      )}
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
      <div className="mt-8 pt-8 border-t border-slate-200">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Try this next</p>
        <Link
          to="/tools/first-purchase"
          className="group flex items-start justify-between gap-4 bg-white border border-slate-200 rounded-lg px-5 py-4 hover:border-slate-300 transition-colors shadow-card"
        >
          <div>
            <p className="text-sm font-semibold text-slate-900 mb-1 group-hover:text-slate-700 transition-colors">First Purchase Predictor</p>
            <p className="text-sm text-slate-500">LTV is shaped by which product customers buy first. See which one produces the strongest repeat buyers.</p>
          </div>
          <span className="text-sm text-slate-400 group-hover:text-slate-900 transition-colors whitespace-nowrap mt-0.5">Open →</span>
        </Link>
      </div>
    </ToolLayout>
  );
}
