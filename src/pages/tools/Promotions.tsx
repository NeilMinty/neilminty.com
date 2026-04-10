import { useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { ResultCard } from '@/components/ResultCard';
import { SectionLabel } from '@/components/SectionLabel';
import { InputField } from '@/components/InputField';
import { calculatePromotion } from '@/logic/promotionLogic';
import type { PromotionInputs, PromotionResults } from '@/logic/promotionTypes';
import { cn, formatCurrency } from '@/lib/utils';

// ─── FORM STATE ───────────────────────────────────────────────────────────────
// String fields allow empty inputs (better UX than defaulting to 0).
// Converted to numbers on submit.

interface FormState {
  aov: string;
  grossMarginPercent: string;
  baselineWeeklyOrders: string;
  discountDepth: string;
  durationWeeks: string;
  fulfilmentCostPerOrder: string;
  deliveryChargePerOrder: string;
  freeDeliveryPercent: string;
  incrementalMarketingSpend: string;
  returnsRateIncrease: string;
  subscriptionPercent: string;
  isOverstockClearance: boolean;
}

const DEFAULT_FORM: FormState = {
  aov: '',
  grossMarginPercent: '',
  baselineWeeklyOrders: '',
  discountDepth: '',
  durationWeeks: '',
  fulfilmentCostPerOrder: '',
  deliveryChargePerOrder: '',
  freeDeliveryPercent: '',
  incrementalMarketingSpend: '',
  returnsRateIncrease: '',
  subscriptionPercent: '',
  isOverstockClearance: false,
};

function toInputs(form: FormState): PromotionInputs {
  const p = (s: string) => parseFloat(s) || 0;
  return {
    aov: p(form.aov),
    grossMarginPercent: p(form.grossMarginPercent),
    baselineWeeklyOrders: p(form.baselineWeeklyOrders),
    discountDepth: p(form.discountDepth),
    promotionDurationDays: p(form.durationWeeks) * 7,
    fulfilmentCostPerOrder: p(form.fulfilmentCostPerOrder),
    deliveryChargePerOrder: p(form.deliveryChargePerOrder),
    freeDeliveryPercent: p(form.freeDeliveryPercent),
    incrementalMarketingSpend: p(form.incrementalMarketingSpend),
    returnsRateIncrease: p(form.returnsRateIncrease),
    subscriptionPercent: p(form.subscriptionPercent),
    isOverstockClearance: form.isOverstockClearance,
  };
}

// ─── VIEW STATE ───────────────────────────────────────────────────────────────

type ViewState =
  | { view: 'input' }
  | { view: 'results'; inputs: PromotionInputs; results: PromotionResults };

// ─── SCENARIO TABLE ───────────────────────────────────────────────────────────

function ScenarioTable({
  scenarios,
  baselineOrders,
}: {
  scenarios: PromotionResults['scenarios'];
  baselineOrders: number;
}) {
  return (
    <div
      className="border border-slate-200 rounded-lg overflow-hidden shadow-card"
    >
      <table className="w-full text-sm">
        <thead className="bg-white border-b border-slate-200">
          <tr>
            <th className="py-2.5 px-4 text-left text-[10px] uppercase tracking-wide font-semibold text-slate-400">
              Uplift
            </th>
            <th className="py-2.5 px-4 text-right text-[10px] uppercase tracking-wide font-semibold text-slate-400">
              Additional orders
            </th>
            <th className="py-2.5 px-4 text-right text-[10px] uppercase tracking-wide font-semibold text-slate-400">
              Margin at this uplift
            </th>
            <th className="py-2.5 px-4 text-right text-[10px] uppercase tracking-wide font-semibold text-slate-400">
              Verdict
            </th>
          </tr>
        </thead>
        <tbody>
          {scenarios.map((s) => {
            const additionalOrders = s.orders - baselineOrders;
            const isAbove = s.profitVsBaseline >= 0;
            return (
              <tr key={s.upliftPercent} className="border-t border-slate-200">
                <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                  +{s.upliftPercent}%
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                  +{Math.round(additionalOrders).toLocaleString()}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                  {formatCurrency(s.profit)}
                </td>
                <td className="py-3 px-4 text-right">
                  <span
                    className={cn(
                      'text-sm font-medium',
                      isAbove ? 'text-slate-900' : 'text-red-600'
                    )}
                  >
                    {isAbove ? 'Above baseline' : 'Below baseline'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── RESULTS VIEW ─────────────────────────────────────────────────────────────

function ResultsView({
  inputs,
  results,
  onRecalculate,
}: {
  inputs: PromotionInputs;
  results: PromotionResults;
  onRecalculate: () => void;
}) {
  const baselineOrders = inputs.baselineWeeklyOrders * (inputs.promotionDurationDays / 7);

  const breakEvenOrderCount = isFinite(results.breakEvenUpliftPercent)
    ? Math.round(baselineOrders * (1 + results.breakEvenUpliftPercent / 100))
    : null;

  // Returns impact (£) — total extra returns cost vs no returns uplift, at baseline volume
  const promotionalAOV = inputs.aov * (1 - inputs.discountDepth / 100);
  const returnsImpactTotal =
    promotionalAOV *
    (inputs.returnsRateIncrease / 100) *
    (inputs.grossMarginPercent / 100) *
    baselineOrders;

  const promoMarginVariant =
    results.promotionalMarginPerOrder >= 0 ? ('positive' as const) : ('critical' as const);

  const breakEvenVariant =
    results.breakEvenUpliftPercent <= 20
      ? ('positive' as const)
      : results.breakEvenUpliftPercent <= 40
        ? ('warning' as const)
        : ('critical' as const);

  const fmtPct = (n: number) => (isFinite(n) ? `${n.toFixed(1)}%` : '—');

  return (
    <div className="space-y-8">
      {/* 2×2 primary metric cards */}
      <div>
        <SectionLabel>Margin analysis</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ResultCard
            label="Full-price margin per order"
            value={formatCurrency(results.fullPriceMarginPerOrder)}
            variant="neutral"
          />
          <ResultCard
            label="Promotional margin per order"
            value={formatCurrency(results.promotionalMarginPerOrder)}
            subtext={`−${results.marginReductionPercent.toFixed(1)}% vs full price`}
            variant={promoMarginVariant}
          />
          <ResultCard
            label="Break-even uplift required"
            value={fmtPct(results.breakEvenUpliftPercent)}
            subtext="volume increase needed to match baseline profit"
            variant={breakEvenVariant}
          />
          <ResultCard
            label="Break-even order count"
            value={
              breakEvenOrderCount !== null
                ? breakEvenOrderCount.toLocaleString()
                : '—'
            }
            subtext={
              breakEvenOrderCount !== null
                ? `vs ${Math.round(baselineOrders).toLocaleString()} baseline orders`
                : undefined
            }
            variant="neutral"
          />
        </div>
      </div>

      {/* Scenario analysis table */}
      <div>
        <SectionLabel>Scenario analysis</SectionLabel>
        <ScenarioTable scenarios={results.scenarios} baselineOrders={baselineOrders} />
      </div>

      {/* Risk decomposition */}
      <div>
        <SectionLabel>Risk decomposition</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ResultCard
            label="Returns impact"
            value={formatCurrency(returnsImpactTotal)}
            subtext={`+${results.returnsImpactOnBreakEven.toFixed(1)}% added to break-even threshold`}
            variant="warning"
          />
          <ResultCard
            label="Marketing spend impact"
            value={formatCurrency(inputs.incrementalMarketingSpend)}
            subtext={`+${results.marketingSpendImpactOnBreakEven.toFixed(1)}% added to break-even threshold`}
            variant="warning"
          />
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
        {results.overstockNote && (
          <p className="text-sm text-slate-500 leading-relaxed mt-3">
            {results.overstockNote}
          </p>
        )}
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
      {/* Baseline */}
      <div>
        <SectionLabel>Baseline</SectionLabel>
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
            hint="Product margin before returns costs"
            placeholder="0"
          />
          <InputField
            label="Weekly Order Volume"
            value={form.baselineWeeklyOrders}
            onChange={set('baselineWeeklyOrders')}
            placeholder="0"
          />
        </div>
      </div>

      {/* Promotion */}
      <div>
        <SectionLabel>Promotion</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <InputField
            label="Discount Depth"
            value={form.discountDepth}
            onChange={set('discountDepth')}
            suffix="%"
            placeholder="0"
          />
          <InputField
            label="Duration"
            value={form.durationWeeks}
            onChange={set('durationWeeks')}
            suffix="weeks"
            placeholder="1"
          />
          <InputField
            label="Fulfilment Cost"
            value={form.fulfilmentCostPerOrder}
            onChange={set('fulfilmentCostPerOrder')}
            prefix="£"
            placeholder="0"
          />
          <InputField
            label="Delivery Charge"
            value={form.deliveryChargePerOrder}
            onChange={set('deliveryChargePerOrder')}
            prefix="£"
            hint="What you charge customers when delivery is not free"
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
          <InputField
            label="Marketing Spend"
            value={form.incrementalMarketingSpend}
            onChange={set('incrementalMarketingSpend')}
            prefix="£"
            hint="Paid media to promote the offer, leave blank if none"
            placeholder="0"
          />
        </div>
      </div>

      {/* Risk */}
      <div>
        <SectionLabel>Risk</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <InputField
            label="Returns Uplift"
            value={form.returnsRateIncrease}
            onChange={set('returnsRateIncrease')}
            suffix="%"
            hint="Extra returns above your normal rate driven by the promotion"
            placeholder="0"
          />
          <InputField
            label="Subscription Revenue"
            value={form.subscriptionPercent}
            onChange={set('subscriptionPercent')}
            suffix="%"
            hint="Discounted subscriptions have long-term margin implications"
            placeholder="0"
          />
        </div>
      </div>

      {/* Context */}
      <div>
        <SectionLabel>Context</SectionLabel>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isOverstockClearance}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, isOverstockClearance: e.target.checked }))
            }
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-slate-900"
          />
          <span className="text-sm text-slate-700">
            This promotion is intended to clear overstocked inventory
            <span className="block text-xs text-slate-400 mt-0.5">
              Adds context to the results commentary
            </span>
          </span>
        </label>
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

export function Promotions() {
  const [pageState, setPageState] = useState<ViewState>({ view: 'input' });
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [errors, setErrors] = useState<string[]>([]);

  const handleCalculate = () => {
    const errs: string[] = [];
    if (!parseFloat(form.aov)) errs.push('AOV is required');
    if (!parseFloat(form.grossMarginPercent)) errs.push('Gross margin is required');
    if (!parseFloat(form.baselineWeeklyOrders)) errs.push('Baseline order volume is required');
    if (!parseFloat(form.durationWeeks)) errs.push('Duration is required');
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    const inputs = toInputs(form);
    const results = calculatePromotion(inputs);
    setPageState({ view: 'results', inputs, results });
  };

  return (
    <ToolLayout
      title="Promotions Profitability Calculator"
      description="Before you run a promotion, know whether it can earn its margin. Enter your baseline and promotion parameters to find the break-even volume uplift required and whether it's realistic."
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
    </ToolLayout>
  );
}
