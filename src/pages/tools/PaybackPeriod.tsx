import { useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { ResultCard } from '@/components/ResultCard';
import { SectionLabel } from '@/components/SectionLabel';
import { InputField } from '@/components/InputField';
import { calculatePayback } from '@/logic/paybackLogic';
import type { PaybackInputs, PaybackResults } from '@/logic/paybackTypes';
import { formatCurrency } from '@/lib/utils';

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
  | { view: 'results'; inputs: PaybackInputs; results: PaybackResults };

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

// ─── RESULTS VIEW ─────────────────────────────────────────────────────────────

function ResultsView({
  results,
  onRecalculate,
}: {
  results: PaybackResults;
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
  onCalculate,
  errors,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onCalculate: () => void;
  errors: string[];
}) {
  const set = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-8">
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

      {/* Validation errors */}
      {errors.length > 0 && (
        <div className="border border-red-200 bg-red-50 rounded-lg px-4 py-3">
          <ul className="space-y-1">
            {errors.map((err) => (
              <li key={err} className="text-sm text-red-700">
                {err}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Calculate */}
      <div className="flex justify-end">
        <button
          onClick={onCalculate}
          className="bg-slate-900 text-white px-6 py-2.5 rounded text-sm font-medium hover:bg-slate-800 transition-colors min-w-[160px]"
        >
          Calculate
        </button>
      </div>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export function PaybackPeriod() {
  const [pageState, setPageState] = useState<ViewState>({ view: 'input' });
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [errors, setErrors] = useState<string[]>([]);

  const handleCalculate = () => {
    const errs: string[] = [];
    const p = (s: string) => parseFloat(s);

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
    setPageState({ view: 'results', inputs, results });
  };

  return (
    <ToolLayout
      title="LTV:CAC Analyser"
      description="CAC is only half the equation. Enter your unit economics to find out how long it takes to recover acquisition cost, and whether your LTV makes the model work."
      metaDescription="Enter your unit economics to see LTV:CAC at 12 and 24 months and how long it takes to recover your acquisition cost."
    >
      {pageState.view === 'input' ? (
        <InputView
          form={form}
          setForm={setForm}
          onCalculate={handleCalculate}
          errors={errors}
        />
      ) : (
        <ResultsView
          results={pageState.results}
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
    </ToolLayout>
  );
}
