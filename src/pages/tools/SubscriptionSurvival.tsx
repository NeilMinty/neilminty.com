import { useState, useMemo, useEffect } from 'react';
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

const DARK = {
  bg: '#0F0F0F',
  surface: 'rgba(255,255,255,0.04)',
  border: 'rgba(240,238,233,0.12)',
  borderSubtle: 'rgba(240,238,233,0.08)',
  text: '#F0EEE9',
  textMuted: 'rgba(240,238,233,0.5)',
  textDim: 'rgba(240,238,233,0.3)',
  accent: '#F59E0B',
  inputBg: 'rgba(255,255,255,0.04)',
  inputBorder: 'rgba(240,238,233,0.15)',
} as const;

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

// ─── DARK INPUT ────────────────────────────────────────────────────────────────

function DarkInput({
  label,
  value,
  onChange,
  prefix,
  suffix,
  hint,
  placeholder = '0',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  suffix?: string;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ color: DARK.textMuted, fontSize: 13, fontWeight: 500 }}>{label}</label>
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          border: `1px solid ${DARK.inputBorder}`,
          borderRadius: 6,
          background: DARK.inputBg,
        }}
      >
        {prefix && (
          <span
            style={{
              padding: '0 10px',
              display: 'flex',
              alignItems: 'center',
              color: DARK.textDim,
              fontSize: 13,
              borderRight: `1px solid ${DARK.borderSubtle}`,
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '6px 0 0 6px',
              userSelect: 'none',
            }}
          >
            {prefix}
          </span>
        )}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            padding: '8px 12px',
            color: DARK.text,
            fontSize: 14,
            minWidth: 0,
          }}
        />
        {suffix && (
          <span
            style={{
              padding: '0 10px',
              display: 'flex',
              alignItems: 'center',
              color: DARK.textDim,
              fontSize: 13,
              borderLeft: `1px solid ${DARK.borderSubtle}`,
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '0 6px 6px 0',
              userSelect: 'none',
            }}
          >
            {suffix}
          </span>
        )}
      </div>
      {hint && <p style={{ color: DARK.textDim, fontSize: 12 }}>{hint}</p>}
    </div>
  );
}

// ─── DARK SELECT ───────────────────────────────────────────────────────────────

function DarkSelect({
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ color: DARK.textMuted, fontSize: 13, fontWeight: 500 }}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: DARK.inputBg,
          border: `1px solid ${DARK.inputBorder}`,
          borderRadius: 6,
          padding: '8px 12px',
          color: DARK.text,
          fontSize: 14,
          outline: 'none',
          cursor: 'pointer',
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ background: '#1A1A1A', color: DARK.text }}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── DARK SLIDER ──────────────────────────────────────────────────────────────

function DarkSlider({
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <label style={{ color: DARK.textMuted, fontSize: 13, fontWeight: 500 }}>{label}</label>
        <span style={{ color: DARK.accent, fontFamily: 'ui-monospace, monospace', fontSize: 14, fontWeight: 600 }}>
          {value}%
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={80}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: DARK.accent, cursor: 'pointer' }}
      />
      {hint && <p style={{ color: DARK.textDim, fontSize: 12 }}>{hint}</p>}
    </div>
  );
}

// ─── METRIC CARD ──────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  subtext,
  accent = false,
}: {
  label: string;
  value: string;
  subtext?: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        background: DARK.surface,
        border: `1px solid ${DARK.border}`,
        borderRadius: 8,
        padding: '16px 20px',
      }}
    >
      <p
        style={{
          color: DARK.textMuted,
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 6,
        }}
      >
        {label}
      </p>
      <p
        style={{
          color: accent ? DARK.accent : DARK.text,
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          fontFamily: 'ui-monospace, monospace',
          lineHeight: 1.2,
        }}
      >
        {value}
      </p>
      {subtext && (
        <p style={{ color: DARK.textMuted, fontSize: 13, marginTop: 4 }}>{subtext}</p>
      )}
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

  const tooltipStyle = {
    contentStyle: {
      background: '#1C1C1C',
      border: `1px solid ${DARK.border}`,
      borderRadius: 6,
      color: DARK.text,
      fontSize: 12,
    },
    labelStyle: { color: DARK.textMuted, marginBottom: 4 },
  };

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={chartData} margin={{ top: 16, right: 56, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(240,238,233,0.06)" />
        <XAxis
          dataKey="order"
          stroke="rgba(240,238,233,0.15)"
          tick={{ fill: 'rgba(240,238,233,0.45)', fontSize: 12 }}
          tickFormatter={(v) => `O${v}`}
        />
        <YAxis
          yAxisId="left"
          domain={[0, 100]}
          stroke="rgba(240,238,233,0.15)"
          tick={{ fill: 'rgba(240,238,233,0.45)', fontSize: 12 }}
          label={{
            value: 'Subscribers',
            angle: -90,
            position: 'insideLeft',
            fill: 'rgba(240,238,233,0.3)',
            fontSize: 11,
            dx: 12,
          }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          domain={[0, maxMargin * 1.15]}
          stroke="rgba(240,238,233,0.15)"
          tick={{ fill: 'rgba(240,238,233,0.45)', fontSize: 12 }}
          tickFormatter={(v: number) => `£${v.toFixed(0)}`}
        />
        <Tooltip
          {...tooltipStyle}
          labelFormatter={(label) => `Order ${label}`}
          formatter={(value, name) => {
            const n = typeof value === 'number' ? value : 0;
            if (name === 'subscribers') return [`${n}`, 'Surviving'];
            return [formatCurrency(n), 'Cumul. margin / subscriber'];
          }}
        />
        <Legend
          wrapperStyle={{ color: 'rgba(240,238,233,0.6)', fontSize: 12, paddingTop: 8 }}
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
            fill="rgba(220,38,38,0.1)"
            label={{ value: 'Pre-activation', position: 'insideTopLeft', fill: 'rgba(239,68,68,0.55)', fontSize: 10 }}
          />
        ) : (
          <>
            {cacPaybackOrder > 1 && (
              <ReferenceArea
                yAxisId="left"
                x1={1}
                x2={cacPaybackOrder}
                fill="rgba(220,38,38,0.1)"
                label={{ value: 'Pre-activation', position: 'insideTopLeft', fill: 'rgba(239,68,68,0.55)', fontSize: 10 }}
              />
            )}
            {cacPaybackOrder <= 10 && (
              <ReferenceArea
                yAxisId="left"
                x1={cacPaybackOrder}
                x2={10}
                fill="rgba(22,163,74,0.08)"
                label={{ value: 'Post-activation', position: 'insideTopRight', fill: 'rgba(34,197,94,0.5)', fontSize: 10 }}
              />
            )}
            <ReferenceLine
              yAxisId="left"
              x={cacPaybackOrder}
              stroke={DARK.accent}
              strokeWidth={1.5}
              strokeDasharray="5 3"
              label={{
                value: 'CAC recovered',
                position: 'insideTopRight',
                fill: DARK.accent,
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
          stroke={DARK.text}
          strokeWidth={2}
          dot={{ fill: DARK.text, r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: DARK.text }}
          name="subscribers"
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="margin"
          stroke={DARK.accent}
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
    <div
      style={{
        marginTop: 16,
        padding: '12px 16px',
        background: 'rgba(245,158,11,0.07)',
        border: `1px solid rgba(245,158,11,0.2)`,
        borderRadius: 6,
      }}
    >
      <p style={{ color: 'rgba(240,238,233,0.7)', fontSize: 13, lineHeight: 1.6 }}>
        <span style={{ color: DARK.accent, fontWeight: 600 }}>Moving O2 churn by 5pp recovers: </span>
        {text}
      </p>
    </div>
  );
}

// ─── SECTION DIVIDER ──────────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <p
      style={{
        color: DARK.textMuted,
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 12,
        marginTop: 24,
      }}
    >
      {label}
    </p>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export function SubscriptionSurvival() {
  const [viewState, setViewState] = useState<ViewState>({ view: 'input' });
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [churn, setChurn] = useState<ChurnState>(DEFAULT_CHURN);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    document.title = 'Subscription Survival Model | Neil Minty';
    const tag = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    const prev = tag?.content;
    if (tag) tag.content = 'Model how your subscription cohort decays across orders. See where CAC is recovered and what happens when you adjust churn at each order step.';
    return () => {
      document.title = 'Neil Minty — DTC Operator Tools';
      if (tag && prev !== undefined) tag.content = prev;
    };
  }, []);

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
    <div style={{ background: DARK.bg, minHeight: 'calc(100vh - 56px)', color: DARK.text }}>
      <div style={{ maxWidth: 1152, margin: '0 auto', padding: '48px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 40, paddingBottom: 32, borderBottom: `1px solid ${DARK.border}` }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: DARK.text, marginBottom: 8, letterSpacing: '-0.01em' }}>
            Subscription Survival Model
          </h1>
          <p style={{ color: DARK.textMuted, lineHeight: 1.6 }}>
            Enter your unit economics. See where your cohort breaks.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-8">

          {/* Left: Inputs */}
          <div>
            <div
              style={{
                background: DARK.surface,
                border: `1px solid ${DARK.border}`,
                borderRadius: 10,
                padding: '24px 20px',
              }}
            >
              <SectionDivider label="Unit economics" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <DarkInput
                  label="AOV"
                  value={form.aov}
                  onChange={set('aov')}
                  prefix="£"
                  placeholder="40"
                />
                <DarkInput
                  label="Gross margin"
                  value={form.grossMarginPercent}
                  onChange={set('grossMarginPercent')}
                  suffix="%"
                  placeholder="60"
                />
                <DarkSelect
                  label="Subscription frequency"
                  value={form.frequency}
                  onChange={(v) => setForm((prev) => ({ ...prev, frequency: v as SubscriptionFrequency }))}
                  options={FREQ_OPTIONS}
                />
                <DarkInput
                  label="CAC"
                  value={form.cac}
                  onChange={set('cac')}
                  prefix="£"
                  placeholder="50"
                  hint="Cost to acquire one subscriber"
                />
              </div>

              {errors.length > 0 && (
                <div
                  style={{
                    marginTop: 16,
                    padding: '10px 14px',
                    background: 'rgba(220,38,38,0.1)',
                    border: '1px solid rgba(220,38,38,0.25)',
                    borderRadius: 6,
                  }}
                >
                  {errors.map((e) => (
                    <p key={e} style={{ color: 'rgba(252,165,165,0.9)', fontSize: 13 }}>{e}</p>
                  ))}
                </div>
              )}

              <button
                onClick={handleRun}
                style={{
                  marginTop: 20,
                  width: '100%',
                  background: DARK.accent,
                  color: '#0F0F0F',
                  border: 'none',
                  borderRadius: 6,
                  padding: '10px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  letterSpacing: '-0.01em',
                }}
              >
                {viewState.view === 'live' ? 'Update model' : 'Run model'}
              </button>

              {/* Churn sliders */}
              <div style={{ marginTop: 28, paddingTop: 24, borderTop: `1px solid ${DARK.borderSubtle}` }}>
                <SectionDivider label="Churn rates" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <DarkSlider
                    label="O1 churn — exits after first order"
                    value={churn.o1}
                    onChange={(v) => setChurn((prev) => ({ ...prev, o1: v }))}
                  />
                  <DarkSlider
                    label="O2 churn — exits after second order"
                    value={churn.o2}
                    onChange={(v) => setChurn((prev) => ({ ...prev, o2: v }))}
                  />
                  <DarkSlider
                    label="O3 churn — exits after third order"
                    value={churn.o3}
                    onChange={(v) => setChurn((prev) => ({ ...prev, o3: v }))}
                    hint={`Long-run rate (O4+): ${(churn.o3 / 2).toFixed(1)}% per billing cycle`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Results */}
          <div>
            {results === null ? (
              <div
                style={{
                  height: '100%',
                  minHeight: 320,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: DARK.surface,
                  border: `1px solid ${DARK.border}`,
                  borderRadius: 10,
                  padding: 40,
                  textAlign: 'center',
                }}
              >
                <div>
                  <p style={{ color: DARK.textMuted, fontSize: 15 }}>
                    Enter your unit economics and run the model to see the survival curve.
                  </p>
                  <p style={{ color: DARK.textDim, fontSize: 13, marginTop: 8 }}>
                    Adjust the churn sliders on the left — the chart updates in real time.
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Headline metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <MetricCard
                    label="CAC payback order"
                    value={results.cacPaybackOrder !== null ? `Order ${results.cacPaybackOrder}` : 'Never'}
                    subtext="within 10 orders"
                    accent
                  />
                  <MetricCard
                    label="Exit before activation"
                    value={`${Math.round(results.subscribersBeforeActivation)} of 100`}
                    subtext="subscribers exit before CAC is recovered"
                  />
                  <MetricCard
                    label="Net loss, early churn"
                    value={formatCurrency(results.netLossPerHundred)}
                    subtext="per 100 subscribers acquired"
                  />
                </div>

                {/* Chart */}
                <div
                  style={{
                    background: DARK.surface,
                    border: `1px solid ${DARK.border}`,
                    borderRadius: 10,
                    padding: '24px 20px 16px',
                  }}
                >
                  <p
                    style={{
                      color: DARK.textMuted,
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      marginBottom: 16,
                    }}
                  >
                    Cohort survival — orders 1–10
                  </p>
                  <SurvivalChart results={results} />
                  {results.cacPaybackOrder === null && (
                    <p style={{ color: 'rgba(239,68,68,0.7)', fontSize: 12, marginTop: 8, textAlign: 'center' }}>
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
        <div
          style={{
            marginTop: 64,
            paddingTop: 32,
            borderTop: `1px solid ${DARK.border}`,
          }}
        >
          <p style={{ color: DARK.textMuted, fontSize: 14, lineHeight: 1.7 }}>
            If you want to run this against your actual order data, that's a different conversation.{' '}
            <button
              onClick={() => { window.location.href = 'mail' + 'to:neil@person' + 'aify.io'; }}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: DARK.accent,
                cursor: 'pointer',
                fontSize: 14,
                textDecoration: 'underline',
              }}
            >
              Let's talk.
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}
