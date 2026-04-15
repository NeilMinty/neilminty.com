import { useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { ResultCard } from '@/components/ResultCard';
import { SectionLabel } from '@/components/SectionLabel';
import { InputField } from '@/components/InputField';
import { calculateReturnsCost } from '@/logic/returnsCostLogic';
import type { ReturnsCostInputs, ReturnsCostResults } from '@/logic/returnsCostTypes';
import { formatCurrency } from '@/lib/utils';

// ─── FORM STATE ───────────────────────────────────────────────────────────────

interface FormState {
  annualRevenue: string;
  aov: string;
  returnsRate: string;
  costPerReturn: string;
  resaleDiscountedPct: string;
  writeoffPct: string;
  avgDiscountPct: string;
  grossMargin: string;
}

const DEFAULT_FORM: FormState = {
  annualRevenue: '',
  aov: '',
  returnsRate: '',
  costPerReturn: '',
  resaleDiscountedPct: '',
  writeoffPct: '',
  avgDiscountPct: '',
  grossMargin: '',
};

function toInputs(form: FormState): ReturnsCostInputs {
  const p = (s: string) => parseFloat(s) || 0;
  return {
    annualRevenue: p(form.annualRevenue),
    aov: p(form.aov),
    returnsRate: p(form.returnsRate),
    grossMargin: p(form.grossMargin),
    costPerReturn: p(form.costPerReturn),
    resaleDiscountedPct: p(form.resaleDiscountedPct),
    writeoffPct: p(form.writeoffPct),
    avgDiscountPct: p(form.avgDiscountPct),
  };
}

// ─── VIEW STATE ───────────────────────────────────────────────────────────────

type ViewState =
  | { view: 'input' }
  | { view: 'results'; inputs: ReturnsCostInputs; results: ReturnsCostResults };

// ─── RESULTS VIEW ─────────────────────────────────────────────────────────────

function ResultsView({
  inputs,
  results,
  onRecalculate,
}: {
  inputs: ReturnsCostInputs;
  results: ReturnsCostResults;
  onRecalculate: () => void;
}) {
  const totalCostPctOfRevenue =
    inputs.annualRevenue > 0
      ? (results.totalReturnsCost / inputs.annualRevenue) * 100
      : 0;

  const totalVariant =
    totalCostPctOfRevenue >= 10
      ? ('critical' as const)
      : totalCostPctOfRevenue >= 5
        ? ('warning' as const)
        : ('neutral' as const);

  const breakdownItems = [
    { label: 'Hard cost', value: results.hardReturnsCost },
    { label: 'Margin leakage', value: results.marginLeakage },
  ];

  return (
    <div className="space-y-8">
      {/* 2×2 primary cards */}
      <div>
        <SectionLabel>Cost summary</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ResultCard
            label="Total returns cost"
            value={formatCurrency(results.totalReturnsCost)}
            subtext={`${totalCostPctOfRevenue.toFixed(1)}% of annual revenue`}
            variant={totalVariant}
          />
          <ResultCard
            label="True cost per return"
            value={formatCurrency(results.trueReturnsCost)}
            subtext={`across ${Math.round(results.annualReturns).toLocaleString()} annual returns`}
            variant="neutral"
          />
          <ResultCard
            label="Hard returns cost"
            value={formatCurrency(results.hardReturnsCost)}
            subtext="Processing cost × annual returns"
            variant="neutral"
          />
          <ResultCard
            label="Margin leakage"
            value={formatCurrency(results.marginLeakage)}
            subtext="Discounted resale + write-off margin loss"
            variant="warning"
          />
        </div>
      </div>

      {/* Cost breakdown list */}
      <div>
        <SectionLabel>Cost breakdown</SectionLabel>
        <div
          className="border border-slate-200 rounded-lg overflow-hidden shadow-card"
        >
          {breakdownItems.map((item, i) => {
            const pct =
              results.totalReturnsCost > 0
                ? (item.value / results.totalReturnsCost) * 100
                : 0;
            return (
              <div
                key={item.label}
                className={`flex items-center justify-between px-4 py-3 text-sm ${i > 0 ? 'border-t border-slate-200' : ''}`}
              >
                <span className="text-slate-700">{item.label}</span>
                <span className="font-mono tabular-nums text-slate-700">
                  {formatCurrency(item.value)}
                  <span className="ml-2 text-slate-400">{pct.toFixed(1)}%</span>
                </span>
              </div>
            );
          })}
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
      {/* Revenue */}
      <div>
        <SectionLabel>Revenue</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <InputField
            label="Annual Revenue"
            value={form.annualRevenue}
            onChange={set('annualRevenue')}
            prefix="£"
            placeholder="0"
          />
          <InputField
            label="AOV"
            value={form.aov}
            onChange={set('aov')}
            prefix="£"
            placeholder="0"
          />
        </div>
      </div>

      {/* Returns profile */}
      <div>
        <SectionLabel>Returns Profile</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <InputField
            label="Returns Rate"
            value={form.returnsRate}
            onChange={set('returnsRate')}
            suffix="%"
            placeholder="0"
          />
          <InputField
            label="Cost Per Return"
            value={form.costPerReturn}
            onChange={set('costPerReturn')}
            prefix="£"
            hint="Handling, inspection, and restocking cost per item"
            placeholder="0"
          />
        </div>
      </div>

      {/* Resale & write-off */}
      <div>
        <SectionLabel>Resale & Write-off</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <InputField
            label="Discounted Resell"
            value={form.resaleDiscountedPct}
            onChange={set('resaleDiscountedPct')}
            suffix="%"
            hint="% of returns resold at a markdown (remainder assumed full price)"
            placeholder="0"
          />
          <InputField
            label="Write-off"
            value={form.writeoffPct}
            onChange={set('writeoffPct')}
            suffix="%"
            hint="% of returns with no resale value"
            placeholder="0"
          />
          <InputField
            label="Avg Resale Discount"
            value={form.avgDiscountPct}
            onChange={set('avgDiscountPct')}
            suffix="%"
            hint="Average markdown applied to discounted resale items"
            placeholder="0"
          />
        </div>
      </div>

      {/* Margin */}
      <div>
        <SectionLabel>Margin</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <InputField
            label="Gross Margin"
            value={form.grossMargin}
            onChange={set('grossMargin')}
            suffix="%"
            hint="Product margin — used to compute write-off and resale margin loss"
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
      <div className="flex sm:justify-end">
        <button
          onClick={onCalculate}
          className="w-full sm:w-auto bg-slate-900 text-white px-6 py-2.5 rounded text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          Calculate
        </button>
      </div>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export function ReturnsCost() {
  const [pageState, setPageState] = useState<ViewState>({ view: 'input' });
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [errors, setErrors] = useState<string[]>([]);

  const handleCalculate = () => {
    const errs: string[] = [];
    const p = (s: string) => parseFloat(s);
    const n = (s: string) => parseFloat(s) || 0;

    if (!(p(form.annualRevenue) > 0)) errs.push('Annual revenue must be greater than 0');
    if (!(p(form.aov) > 0)) errs.push('AOV must be greater than 0');
    if (!(p(form.returnsRate) > 0) || p(form.returnsRate) > 100) errs.push('Returns rate must be between 1 and 100%');

    const resellSum = n(form.resaleDiscountedPct) + n(form.writeoffPct);
    if (resellSum > 100) {
      errs.push(
        `Discounted resell + write-off must not exceed 100% (currently ${resellSum.toFixed(0)}%)`
      );
    }

    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    const inputs = toInputs(form);
    const results = calculateReturnsCost(inputs);
    setPageState({ view: 'results', inputs, results });
  };

  return (
    <ToolLayout
      title="Returns Cost Calculator"
      description="Most brands know their returns rate. Few know what returns are actually costing them. Enter your returns profile to see the true cost per return and where the money is going."
      metaDescription="Your returns rate is a headline. This is what it's actually costing you — hard cost, margin leakage, and operational drag combined."
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
          inputs={pageState.inputs}
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
            className="inline-block px-6 py-2.5 bg-slate-900 text-white text-sm font-medium rounded hover:bg-slate-800 transition-colors"
          >
            Explore the demo →
          </a>
        </div>
      </div>
    </ToolLayout>
  );
}
