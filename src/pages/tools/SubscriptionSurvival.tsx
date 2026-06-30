import { useState, useMemo } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
} from 'recharts';
import { ToolLayout } from '@/components/ToolLayout';
import { ResultCard } from '@/components/ResultCard';
import { SectionLabel } from '@/components/SectionLabel';
import { InputField } from '@/components/InputField';
import { calculateSubscriptionSurvival } from '@/logic/subscriptionSurvivalLogic';
import type {
  SubscriptionSurvivalInputs,
  SubscriptionSurvivalResults,
  SubscriptionFrequency,
} from '@/logic/subscriptionSurvivalTypes';
import { formatCurrency } from '@/lib/utils';

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────

const FREQ_OPTIONS: { value: SubscriptionFrequency; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'every6weeks', label: 'Every 6 weeks' },
  { value: 'every2months', label: 'Every 2 months' },
];

// Accent for the chart activation threshold line — dark amber, readable on white
const CHART_ACCENT = '#92400E';

// ─── FORM STATE ────────────────────────────────────────────────────────────────

interface FormState {
  aov: string;
  grossMarginPercent: string;
  frequency: SubscriptionFrequency;
  cac: string;
}

interface ChurnState {
  o1: number;
  o2: number;
  o3: number;
}

const DEFAULT_FORM: FormState = {
  aov: '',
  grossMarginPercent: '',
  frequency: 'monthly',
  cac: '',
};

const DEFAULT_CHURN: ChurnState = { o1: 40, o2: 25, o3: 15 };

// ─── VIEW STATE ────────────────────────────────────────────────────────────────

type ViewState =
  | { view: 'input' }
  | { view: 'live'; baseInputs: Pick<SubscriptionSurvivalInputs, 'aov' | 'grossMarginPercent' | 'frequency' | 'cac'> };

// ─── SELECT FIELD ─────────────────────────────────────────────────────────────

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-slate-200 rounded bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 transition-colors cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ─── SLIDER FIELD ─────────────────────────────────────────────────────────────

function SliderField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-baseline">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <span className="text-sm font-semibold tabular-nums text-slate-900">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={80}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-slate-900 cursor-pointer"
      />
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

// ─── SURVIVAL CHART ──────────────────────────────────────────────────────────

function SurvivalChart({ results }: { results: SubscriptionSurvivalResults }) {
  const { steps, cacPaybackOrder } = results;

  const chartData = steps.map((s) => ({
    order: s.order,
    subscribers: Math.round(s.survivors * 10) / 10,
    margin: Math.round(s.cumulativeMargin * 100) / 100,
  }));

  const maxMargin = Math.max(...steps.map((s) => s.cumulativeMargin), 1);

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={chartData} margin={{ top: 16, right: 56, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis
          dataKey="order"
          stroke="#CBD5E1"
          tick={{ fill: '#64748B', fontSize: 12 }}
          tickFormatter={(v) => `O${v}`}
        />
        <YAxis
          yAxisId="left"
          domain={[0, 100]}
          stroke="#CBD5E1"
          tick={{ fill: '#64748B', fontSize: 12 }}
          label={{
            value: 'Subscribers',
            angle: -90,
            position: 'insideLeft',
            fill: '#94A3B8',
            fontSize: 11,
            dx: 12,
          }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          domain={[0, maxMargin * 1.15]}
          stroke="#CBD5E1"
          tick={{ fill: '#64748B', fontSize: 12 }}
          tickFormatter={(v: number) => `£${v.toFixed(0)}`}
        />
        <Tooltip
          contentStyle={{
            background: '#fff',
            border: '1px solid #E2E8F0',
            borderRadius: 6,
            color: '#1E293B',
            fontSize: 12,
          }}
          labelStyle={{ color: '#64748B', marginBottom: 4 }}
          labelFormatter={(label) => `Order ${label}`}
          formatter={(value, name) => {
            const n = typeof value === 'number' ? value : 0;
            if (name === 'subscribers') return [`${n}`, 'Surviving'];
            return [formatCurrency(n), 'Cumul. margin / subscriber'];
          }}
        />
        <Legend
          wrapperStyle={{ color: '#64748B', fontSize: 12, paddingTop: 8 }}
          formatter={(name) =>
            name === 'subscribers' ? 'Subscribers surviving' : 'Cumulative margin'
          }
        />

        {/* Shaded zones */}
        {cacPaybackOrder === null ? (
          <ReferenceArea
            yAxisId="left"
            x1={1}
            x2={10}
            fill="rgba(220,38,38,0.08)"
            label={{ value: 'Pre-activation', position: 'insideTopLeft', fill: 'rgba(185,28,28,0.6)', fontSize: 10 }}
          />
        ) : (
          <>
            {cacPaybackOrder > 1 && (
              <ReferenceArea
                yAxisId="left"
                x1={1}
                x2={cacPaybackOrder}
                fill="rgba(220,38,38,0.08)"
                label={{ value: 'Pre-activation', position: 'insideTopLeft', fill: 'rgba(185,28,28,0.6)', fontSize: 10 }}
              />
            )}
            {cacPaybackOrder <= 10 && (
              <ReferenceArea
                yAxisId="left"
                x1={cacPaybackOrder}
                x2={10}
                fill="rgba(22,163,74,0.07)"
                label={{ value: 'Post-activation', position: 'insideTopRight', fill: 'rgba(21,128,61,0.6)', fontSize: 10 }}
              />
            )}
            <ReferenceLine
              yAxisId="left"
              x={cacPaybackOrder}
              stroke={CHART_ACCENT}
              strokeWidth={1.5}
              strokeDasharray="5 3"
              label={{
                value: 'CAC recovered',
                position: 'insideTopRight',
                fill: CHART_ACCENT,
                fontSize: 11,
                fontWeight: 600,
                dy: cacPaybackOrder <= 2 ? 18 : 0,
              }}
            />
          </>
        )}

        <Line
          yAxisId="left"
          type="monotone"
          dataKey="subscribers"
          stroke="#475569"
          strokeWidth={2}
          dot={{ fill: '#475569', r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: '#475569' }}
          name="subscribers"
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="margin"
          stroke={CHART_ACCENT}
          strokeWidth={2}
          dot={false}
          strokeDasharray="5 3"
          name="margin"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ─── SENSITIVITY CALLOUT ──────────────────────────────────────────────────────

function SensitivityCallout({
  results,
  churnO2,
}: {
  results: SubscriptionSurvivalResults;
  churnO2: number;
}) {
  const { extraSubscribers, extraMargin } = results.sensitivityDelta;
  const roundedSubscribers = Math.round(extraSubscribers);

  let text: string;
  if (churnO2 === 0) {
    text = 'O2 churn is already at 0%. No further reduction modelled.';
  } else if (roundedSubscribers === 0 && extraMargin < 0.01) {
    text = 'Reducing O2 churn by 5pp has no measurable impact at these inputs.';
  } else {
    const subText = roundedSubscribers === 1 ? '1 more subscriber' : `${roundedSubscribers} more subscribers`;
    text = `Reducing O2 churn by 5pp would move ${subText} past the activation threshold, recovering an additional ${formatCurrency(extraMargin)} per 100 acquired.`;
  }

  return (
    <div className="border border-slate-200 bg-slate-50 rounded-lg p-4">
      <p className="text-sm text-slate-700 leading-relaxed">
        <span className="font-semibold text-slate-900">Moving O2 churn by 5pp recovers: </span>
        {text}
      </p>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export function SubscriptionSurvival() {
  const [viewState, setViewState] = useState<ViewState>({ view: 'input' });
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [churn, setChurn] = useState<ChurnState>(DEFAULT_CHURN);
  const [errors, setErrors] = useState<string[]>([]);

  const set = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const p = (s: string) => parseFloat(s);

  const results = useMemo<SubscriptionSurvivalResults | null>(() => {
    if (viewState.view !== 'live') return null;
    return calculateSubscriptionSurvival({
      ...viewState.baseInputs,
      churnO1: churn.o1,
      churnO2: churn.o2,
      churnO3: churn.o3,
    });
  }, [viewState, churn]);

  const handleRun = () => {
    const errs: string[] = [];
    if (!(p(form.aov) > 0)) errs.push('AOV must be greater than 0');
    if (!(p(form.grossMarginPercent) > 0) || p(form.grossMarginPercent) > 100)
      errs.push('Gross margin must be between 1 and 100%');
    if (!(p(form.cac) > 0)) errs.push('CAC must be greater than 0');
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    setViewState({
      view: 'live',
      baseInputs: {
        aov: p(form.aov),
        grossMarginPercent: p(form.grossMarginPercent),
        frequency: form.frequency,
        cac: p(form.cac),
      },
    });
  };

  return (
    <ToolLayout
      title="Subscription Survival Model"
      description="Enter your unit economics. See where your cohort breaks."
      metaDescription="Model how your subscription cohort decays across orders. See where CAC is recovered and what happens when you adjust churn at each order step."
      wide
    >
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-8">

        {/* Left: Inputs */}
        <div className="space-y-8">
          <div>
            <SectionLabel>Unit economics</SectionLabel>
            <div className="space-y-4">
              <InputField
                label="AOV"
                value={form.aov}
                onChange={set('aov')}
                prefix="£"
                placeholder="40"
              />
              <InputField
                label="Gross margin"
                value={form.grossMarginPercent}
                onChange={set('grossMarginPercent')}
                suffix="%"
                placeholder="60"
              />
              <SelectField
                label="Subscription frequency"
                value={form.frequency}
                onChange={(v) => setForm((prev) => ({ ...prev, frequency: v as SubscriptionFrequency }))}
                options={FREQ_OPTIONS}
              />
              <InputField
                label="CAC"
                value={form.cac}
                onChange={set('cac')}
                prefix="£"
                placeholder="50"
                hint="Cost to acquire one subscriber"
              />
            </div>

            {errors.length > 0 && (
              <div className="mt-4 border border-red-200 bg-red-50 rounded-lg px-4 py-3">
                <ul className="space-y-1">
                  {errors.map((e) => (
                    <li key={e} className="text-sm text-red-700">{e}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-5">
              <button
                onClick={handleRun}
                className="w-full bg-slate-900 text-white px-6 py-2.5 rounded text-sm font-medium hover:bg-slate-800 transition-colors"
              >
                {viewState.view === 'live' ? 'Update model' : 'Run model'}
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200">
            <SectionLabel>Churn rates</SectionLabel>
            <div className="space-y-5">
              <SliderField
                label="O1 churn — exits after first order"
                value={churn.o1}
                onChange={(v) => setChurn((prev) => ({ ...prev, o1: v }))}
              />
              <SliderField
                label="O2 churn — exits after second order"
                value={churn.o2}
                onChange={(v) => setChurn((prev) => ({ ...prev, o2: v }))}
              />
              <SliderField
                label="O3 churn — exits after third order"
                value={churn.o3}
                onChange={(v) => setChurn((prev) => ({ ...prev, o3: v }))}
                hint={`Long-run rate (O4+): ${(churn.o3 / 2).toFixed(1)}% per billing cycle`}
              />
            </div>
          </div>
        </div>

        {/* Right: Results */}
        <div>
          {results === null ? (
            <div className="border border-slate-200 rounded-lg p-10 text-center shadow-card">
              <p className="text-slate-500">
                Enter your unit economics and run the model to see the survival curve.
              </p>
              <p className="text-sm text-slate-400 mt-2">
                Adjust the churn sliders on the left — the chart updates in real time.
              </p>
            </div>
          ) : (
            <div className="space-y-6">

              {/* Headline metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <ResultCard
                  label="CAC payback order"
                  value={results.cacPaybackOrder !== null ? `Order ${results.cacPaybackOrder}` : 'Never'}
                  subtext="within 10 orders"
                  variant="neutral"
                />
                <ResultCard
                  label="Exit before activation"
                  value={`${Math.round(results.subscribersBeforeActivation)} of 100`}
                  subtext="subscribers exit before CAC is recovered"
                  variant="neutral"
                />
                <ResultCard
                  label="Net loss, early churn"
                  value={formatCurrency(results.netLossPerHundred)}
                  subtext="per 100 subscribers acquired"
                  variant="neutral"
                />
                <ResultCard
                  label="Margin per survivor"
                  value={`${formatCurrency(viewState.view === 'live' ? viewState.baseInputs.aov * (viewState.baseInputs.grossMarginPercent / 100) : 0)} / order`}
                  subtext="per subscriber past activation"
                  variant="neutral"
                />
              </div>

              {/* Chart */}
              <div className="border border-slate-200 rounded-lg shadow-card px-5 pt-5 pb-4">
                <SectionLabel>Cohort survival — orders 1–10</SectionLabel>
                <SurvivalChart results={results} />
                {results.cacPaybackOrder === null && (
                  <p className="text-sm text-red-600 mt-2 text-center">
                    CAC not recovered within 10 orders at current inputs
                  </p>
                )}
              </div>

              {/* Sensitivity callout */}
              <SensitivityCallout results={results} churnO2={churn.o2} />
            </div>
          )}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="mt-16 pt-10 border-t border-slate-200">
        <p className="text-sm text-slate-500 leading-relaxed mb-3">
          If you want to run this against your actual order data, that's a different conversation.
        </p>
        <button
          onClick={() => { window.location.href = 'mail' + 'to:neil@person' + 'aify.io'; }}
          className="text-sm text-slate-900 underline underline-offset-2 hover:text-slate-600 transition-colors bg-transparent border-none p-0 cursor-pointer"
        >
          Let's talk →
        </button>
      </div>
    </ToolLayout>
  );
}
