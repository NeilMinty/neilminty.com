import { useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { ResultCard } from '@/components/ResultCard';
import { SectionLabel } from '@/components/SectionLabel';
import { InputField } from '@/components/InputField';
import { calculateLeakage } from '@/logic/marginLogic';
import type { MarginInputs, MarginResults } from '@/logic/marginTypes';
import { formatCurrency } from '@/lib/utils';

// ─── FORM STATE ───────────────────────────────────────────────────────────────

interface FormState {
  annualRevenue: string;
  aov: string;
  grossMarginPercent: string;
  returnsRate: string;
  fullPriceResellPercent: string;
  discountedResellPercent: string;
  writeOffPercent: string;
  resaleDiscountPercent: string;
  returnProcessingCost: string;
  promotedOrdersPercent: string;
  discountDepth: string;
  deliveryCost: string;
  deliveryCharge: string;
  freeDeliveryPercent: string;
}

const DEFAULT_FORM: FormState = {
  annualRevenue: '',
  aov: '',
  grossMarginPercent: '',
  returnsRate: '',
  fullPriceResellPercent: '',
  discountedResellPercent: '',
  writeOffPercent: '',
  resaleDiscountPercent: '',
  returnProcessingCost: '',
  promotedOrdersPercent: '',
  discountDepth: '',
  deliveryCost: '',
  deliveryCharge: '',
  freeDeliveryPercent: '',
};

function toInputs(form: FormState): MarginInputs {
  const p = (s: string) => parseFloat(s) || 0;
  return {
    annualRevenue: p(form.annualRevenue),
    aov: p(form.aov),
    grossMarginPercent: p(form.grossMarginPercent),
    returnsRate: p(form.returnsRate),
    fullPriceResellPercent: p(form.fullPriceResellPercent),
    discountedResellPercent: p(form.discountedResellPercent),
    writeOffPercent: p(form.writeOffPercent),
    resaleDiscountPercent: p(form.resaleDiscountPercent),
    returnProcessingCost: p(form.returnProcessingCost),
    promotedOrdersPercent: p(form.promotedOrdersPercent),
    discountDepth: p(form.discountDepth),
    deliveryCost: p(form.deliveryCost),
    deliveryCharge: p(form.deliveryCharge),
    freeDeliveryPercent: p(form.freeDeliveryPercent),
  };
}

// ─── VIEW STATE ───────────────────────────────────────────────────────────────

type ViewState =
  | { view: 'input' }
  | { view: 'results'; inputs: MarginInputs; results: MarginResults };

// ─── RESULTS VIEW ─────────────────────────────────────────────────────────────

function leakageVariant(pct: number): 'neutral' | 'warning' | 'critical' {
  if (pct >= 10) return 'critical';
  if (pct >= 5) return 'warning';
  return 'neutral';
}

function ResultsView({
  results,
  onRecalculate,
}: {
  results: MarginResults;
  onRecalculate: () => void;
}) {
  const cmVariant =
    results.contributionMarginClass === 'healthy'
      ? ('positive' as const)
      : results.contributionMarginClass === 'under_pressure'
        ? ('warning' as const)
        : ('critical' as const);

  return (
    <div className="space-y-8">
      {/* Three leakage source cards */}
      <div>
        <SectionLabel>Leakage by source</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ResultCard
            label="Returns leakage"
            value={formatCurrency(results.returnsLeakage)}
            subtext={`${results.returnsLeakagePct.toFixed(1)}% of revenue`}
            variant={leakageVariant(results.returnsLeakagePct)}
          />
          <ResultCard
            label="Discount erosion"
            value={formatCurrency(results.discountErosion)}
            subtext={`${results.discountErosionPct.toFixed(1)}% of revenue`}
            variant={leakageVariant(results.discountErosionPct)}
          />
          <ResultCard
            label="Delivery subsidy"
            value={formatCurrency(results.deliverySubsidy)}
            subtext={`${results.deliverySubsidyPct.toFixed(1)}% of revenue`}
            variant={leakageVariant(results.deliverySubsidyPct)}
          />
        </div>
      </div>

      {/* Total leakage + contribution margin */}
      <div>
        <SectionLabel>Total impact</SectionLabel>
        <ResultCard
          label="Total leakage"
          value={formatCurrency(results.totalLeakage)}
          subtext={`Contribution margin: ${results.contributionMarginPct.toFixed(1)}% (${formatCurrency(results.contributionMargin)})`}
          variant={cmVariant}
        />
      </div>

      {/* Leakage ranked list */}
      <div>
        <SectionLabel>Leakage ranked</SectionLabel>
        <div
          className="border border-slate-200 rounded-lg overflow-hidden shadow-card"
        >
          {results.leakageRanked.map((entry, i) => (
            <div
              key={entry.label}
              className={`flex items-center justify-between px-4 py-3 text-sm ${i > 0 ? 'border-t border-slate-200' : ''}`}
            >
              <span className="text-slate-700">{entry.label}</span>
              <span className="font-mono tabular-nums text-slate-700">
                {formatCurrency(entry.value)}
                <span className="ml-2 text-slate-400">{entry.pct.toFixed(1)}%</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Biggest lever callout */}
      <div>
        <SectionLabel>Biggest lever</SectionLabel>
        <div className="border border-slate-200 bg-slate-50 rounded-lg p-4">
          <p className="text-sm text-slate-700 leading-relaxed">
            {results.biggestLeverRecommendation}
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

      {/* Margin */}
      <div>
        <SectionLabel>Margin</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <InputField
            label="Gross Margin"
            value={form.grossMarginPercent}
            onChange={set('grossMarginPercent')}
            suffix="%"
            hint="Product margin before operational costs"
            placeholder="0"
          />
        </div>
      </div>

      {/* Returns */}
      <div>
        <SectionLabel>Returns</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <InputField
            label="Returns Rate"
            value={form.returnsRate}
            onChange={set('returnsRate')}
            suffix="%"
            placeholder="0"
          />
          <InputField
            label="Full Price Resell"
            value={form.fullPriceResellPercent}
            onChange={set('fullPriceResellPercent')}
            suffix="%"
            hint="% of returns resold at full price"
            placeholder="0"
          />
          <InputField
            label="Discounted Resell"
            value={form.discountedResellPercent}
            onChange={set('discountedResellPercent')}
            suffix="%"
            hint="% of returns resold at a markdown"
            placeholder="0"
          />
          <InputField
            label="Write-off"
            value={form.writeOffPercent}
            onChange={set('writeOffPercent')}
            suffix="%"
            hint="% of returns with no resale value"
            placeholder="0"
          />
          <InputField
            label="Resale Discount"
            value={form.resaleDiscountPercent}
            onChange={set('resaleDiscountPercent')}
            suffix="%"
            hint="Average markdown on discounted resale"
            placeholder="0"
          />
          <InputField
            label="Return Processing Cost"
            value={form.returnProcessingCost}
            onChange={set('returnProcessingCost')}
            prefix="£"
            hint="Cost to process each returned item"
            placeholder="0"
          />
        </div>
      </div>

      {/* Discounts */}
      <div>
        <SectionLabel>Discounts</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <InputField
            label="Promoted Orders"
            value={form.promotedOrdersPercent}
            onChange={set('promotedOrdersPercent')}
            suffix="%"
            hint="% of orders placed using a discount"
            placeholder="0"
          />
          <InputField
            label="Discount Depth"
            value={form.discountDepth}
            onChange={set('discountDepth')}
            suffix="%"
            hint="Average discount applied to promoted orders"
            placeholder="0"
          />
        </div>
      </div>

      {/* Delivery */}
      <div>
        <SectionLabel>Delivery</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <InputField
            label="Delivery Cost"
            value={form.deliveryCost}
            onChange={set('deliveryCost')}
            prefix="£"
            hint="What you pay per order for fulfilment"
            placeholder="0"
          />
          <InputField
            label="Delivery Charge"
            value={form.deliveryCharge}
            onChange={set('deliveryCharge')}
            prefix="£"
            hint="What you charge customers when delivery is paid"
            placeholder="0"
          />
          <InputField
            label="Free Delivery"
            value={form.freeDeliveryPercent}
            onChange={set('freeDeliveryPercent')}
            suffix="%"
            hint="% of orders where you absorb delivery cost"
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
          className="bg-slate-900 text-white px-6 py-2.5 rounded text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          Calculate
        </button>
      </div>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export function MarginLeakage() {
  const [pageState, setPageState] = useState<ViewState>({ view: 'input' });
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [errors, setErrors] = useState<string[]>([]);

  const handleCalculate = () => {
    const errs: string[] = [];
    const p = (s: string) => parseFloat(s);
    const n = (s: string) => parseFloat(s) || 0;

    if (!(p(form.annualRevenue) > 0)) errs.push('Annual revenue must be greater than 0');
    if (!(p(form.aov) > 0)) errs.push('AOV must be greater than 0');
    if (!(p(form.grossMarginPercent) > 0) || p(form.grossMarginPercent) > 100) errs.push('Gross margin must be between 1 and 100%');
    if (!isNaN(p(form.returnsRate)) && (p(form.returnsRate) < 0 || p(form.returnsRate) > 100)) errs.push('Returns rate must be between 0 and 100%');

    const resellSum =
      n(form.fullPriceResellPercent) +
      n(form.discountedResellPercent) +
      n(form.writeOffPercent);
    if (resellSum > 100) {
      errs.push(
        `Full price resell + discounted resell + write-off must not exceed 100% (currently ${resellSum.toFixed(0)}%)`
      );
    }

    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    const inputs = toInputs(form);
    const results = calculateLeakage(inputs);
    setPageState({ view: 'results', inputs, results });
  };

  return (
    <ToolLayout
      title="Margin Leakage Calculator"
      description="Where is your margin actually going? Enter your revenue, returns, discounting, and delivery parameters to see total leakage by source and the single biggest lever to pull."
      metaDescription="Where is your contribution margin going? Breaks erosion into returns, discounting, and delivery — ranked by size."
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
            className="bg-slate-900 text-white px-6 py-2.5 rounded text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            Explore the demo →
          </a>
        </div>
      </div>
    </ToolLayout>
  );
}
