import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Treemap, Tooltip, ResponsiveContainer } from 'recharts';
import { ToolLayout } from '@/components/ToolLayout';
import { parseMetaExport, analyseCreatives } from '@/logic/metaCreativeLogic';
import type { DeliveryBucket, ProcessedAd, CreativeAnalysisResult } from '@/logic/metaCreativeTypes';
import { formatCurrency } from '@/lib/utils';
import type { TreemapNode } from 'recharts';

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────

const BUCKET_COLORS: Record<DeliveryBucket, string> = {
  stable:           '#3B6D11',
  learning:         '#BA7517',
  learning_limited: '#A32D2D',
  other:            '#C9CDC2',
};

const BUCKET_LABELS: Record<DeliveryBucket, string> = {
  stable:           'Stable',
  learning:         'Learning',
  learning_limited: 'Learning Limited',
  other:            'Other',
};

const ACTIVE_BUCKETS: DeliveryBucket[] = ['stable', 'learning', 'learning_limited'];

// ─── TREEMAP CELL ─────────────────────────────────────────────────────────────

function TreemapCell(props: TreemapNode) {
  const { x, y, width, height, depth, name } = props;
  const spend      = props.value as number;
  const spendShare = props['spendShare'] as number ?? 0;
  const fill       = props['fill'] as string ?? '#C9CDC2';

  if (depth === 0 || !width || !height || width < 2 || height < 2) return <g />;

  const showName  = width > 120 && height > 50;
  const showSpend = width > 70 && height > 35;
  const label     = name.length > 25 ? name.slice(0, 24) + '…' : name;
  const midX      = x + width / 2;
  const midY      = y + height / 2;

  return (
    <g>
      <rect
        x={x} y={y} width={width} height={height}
        fill={fill} fillOpacity={0.88}
        stroke="#F7F7F3" strokeWidth={1}
        style={{ cursor: 'default' }}
      />
      {showSpend && (
        <text
          fill="#F7F7F3"
          fontSize={11}
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {showName && (
            <tspan x={midX} y={midY - 7} textAnchor="middle">
              {label}
            </tspan>
          )}
          <tspan
            x={midX}
            y={showName ? midY + 7 : midY}
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
            fontSize={10}
          >
            {formatCurrency(spend)}
          </tspan>
        </text>
      )}
    </g>
  );
}

// ─── SPEND STATE BAR ──────────────────────────────────────────────────────────

function SpendStateBar({
  summary,
  deliveryMissing,
}: {
  summary: CreativeAnalysisResult['summary'];
  deliveryMissing: boolean;
}) {
  if (deliveryMissing) {
    return (
      <p className="text-sm text-slate-400 py-4 text-center">
        Delivery column was not detected in your export — spend state analysis is unavailable.
        Re-export with the Delivery column included to see learning phase breakdown.
      </p>
    );
  }

  const activeTotal = summary.stable + summary.learning + summary.learningLimited;
  if (activeTotal === 0) {
    return <p className="text-sm text-slate-400 py-4 text-center">No active spend to display.</p>;
  }

  type Segment = { bucket: DeliveryBucket; spend: number; pct: number };
  const segments: Segment[] = ACTIVE_BUCKETS
    .map((b) => ({
      bucket: b,
      spend: b === 'stable' ? summary.stable : b === 'learning' ? summary.learning : summary.learningLimited,
      pct: 0,
    }))
    .filter((s) => s.spend > 0)
    .map((s) => ({ ...s, pct: (s.spend / activeTotal) * 100 }));

  const inline  = segments.filter((s) => s.pct > 12);
  const legend  = segments.filter((s) => s.pct <= 12);

  return (
    <div>
      {/* Bar */}
      <div className="flex w-full rounded overflow-hidden" style={{ height: 48 }}>
        {segments.map((s) => (
          <div
            key={s.bucket}
            style={{ width: `${s.pct}%`, background: BUCKET_COLORS[s.bucket] }}
            className="flex items-center justify-center overflow-hidden"
          >
            {inline.some((i) => i.bucket === s.bucket) && (
              <span className="text-white text-xs font-medium px-1 truncate text-center leading-tight">
                {BUCKET_LABELS[s.bucket]}<br />
                {s.pct.toFixed(1)}%
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Legend for narrow segments */}
      {legend.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
          {legend.map((s) => (
            <div key={s.bucket} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: BUCKET_COLORS[s.bucket] }} />
              <span>{BUCKET_LABELS[s.bucket]}</span>
              <span className="font-medium text-slate-900">{formatCurrency(s.spend)}</span>
              <span className="text-slate-400">{s.pct.toFixed(1)}% of active</span>
            </div>
          ))}
        </div>
      )}

      {/* Learning premium callout */}
      {summary.estimatedPremium > 0 && (
        <p className="mt-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
          Approximately <span className="font-semibold text-slate-900">{formatCurrency(summary.estimatedPremium)}</span> of
          active spend is running at an estimated 40% CPA premium above stabilised ads — based on Meta benchmarks and a Q1 2026 audit of 47 ecommerce accounts.
        </p>
      )}
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

type Step = 'instructions' | 'upload' | 'results';

const EXPORT_STEPS = [
  'Open Meta Ads Manager and go to the Ads tab — not Campaigns or Ad Sets.',
  'Set your date range — last 30 days is recommended for a meaningful snapshot.',
  'Customise columns to include Ad Name, Amount Spent, and Delivery. If Delivery is missing the tool will still run but cannot show learning phase analysis.',
  'Click Export → CSV.',
];

export function MetaCreativeAudit() {
  const [step, setStep]                   = useState<Step>('instructions');
  const [result, setResult]               = useState<CreativeAnalysisResult | null>(null);
  const [error, setError]                 = useState<string | null>(null);
  const [warnings, setWarnings]           = useState<string[]>([]);
  const [fileName, setFileName]           = useState<string | null>(null);
  const [deliveryMissing, setDeliveryMissing] = useState(false);
  const [analysisDate, setAnalysisDate]   = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep('instructions');
    setResult(null);
    setError(null);
    setWarnings([]);
    setFileName(null);
    setDeliveryMissing(false);
    setAnalysisDate('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (parsed) => {
        const parseResult = parseMetaExport(parsed.data);
        if (parseResult.error) {
          setError(parseResult.error);
          return;
        }
        const analysisResult = analyseCreatives(parseResult.rows);
        setResult(analysisResult);
        setFileName(file.name);
        setWarnings(parseResult.warnings);
        setDeliveryMissing(parseResult.warnings.length > 0);
        setAnalysisDate(
          new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        );
        setError(null);
        setStep('results');
      },
    });
    e.target.value = '';
  };

  const treemapData = result
    ? result.ads.map((ad: ProcessedAd) => ({
        name:       ad.adName,
        size:       ad.spend,
        fill:       BUCKET_COLORS[ad.bucket],
        spendShare: ad.spendShare,
        bucket:     ad.bucket,
        spend:      ad.spend,
      }))
    : [];

  const tooltipContent = ({ active, payload }: any) => {
    if (!active || !payload?.[0]?.payload) return null;
    const node = payload[0].payload;
    const bucket = node.bucket as DeliveryBucket;
    return (
      <div
        style={{
          background: '#1A1A18',
          color: '#F7F7F3',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 6,
          padding: '10px 12px',
          maxWidth: 260,
          fontSize: 12,
        }}
      >
        <p style={{ fontFamily: 'Georgia, serif', fontWeight: 600, marginBottom: 6, lineHeight: 1.3, wordBreak: 'break-word' }}>
          {node.name}
        </p>
        <p style={{ fontFamily: 'ui-monospace, monospace', color: '#F7F7F3', marginBottom: 2 }}>
          {formatCurrency(node.size)}
        </p>
        <p style={{ color: '#A0A09A', marginBottom: 4 }}>
          {(node.spendShare as number).toFixed(1)}% of total spend
        </p>
        {bucket && (
          <span
            style={{
              display: 'inline-block',
              background: `${BUCKET_COLORS[bucket]}30`,
              color: BUCKET_COLORS[bucket],
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {BUCKET_LABELS[bucket]}
          </span>
        )}
      </div>
    );
  };

  return (
    <ToolLayout
      title="Meta Creative Audit"
      description="Upload a Meta Ads Manager export to see where your spend is — and how much is running in the learning phase."
      metaDescription="Audit your Meta creative spend by delivery state. See how much budget is in the learning phase and estimate the CPA premium you're paying."
      wide
    >
      <div className="space-y-8">

        {/* ── Step 1: Instructions ─────────────────────────────────────────── */}
        {step === 'instructions' && (
          <div className="max-w-2xl space-y-6">
            <div className="border border-slate-200 rounded-lg p-6 space-y-5">
              <h2 className="text-base font-semibold text-slate-900">
                Before you upload, pull your export correctly.
              </h2>
              <ol className="space-y-4">
                {EXPORT_STEPS.map((text, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-semibold">
                      {i + 1}
                    </span>
                    <p className="text-sm text-slate-700 leading-relaxed pt-0.5">{text}</p>
                  </li>
                ))}
              </ol>
            </div>
            <button
              onClick={() => setStep('upload')}
              className="bg-slate-900 text-white px-6 py-2.5 rounded text-sm font-medium hover:bg-slate-800 transition-colors"
            >
              Continue →
            </button>
          </div>
        )}

        {/* ── Step 2: Upload ───────────────────────────────────────────────── */}
        {step === 'upload' && (
          <div className="max-w-2xl space-y-6">
            <button
              onClick={() => { setStep('instructions'); setError(null); }}
              className="text-sm text-slate-400 hover:text-slate-700 transition-colors"
            >
              ← Back
            </button>

            {warnings.length > 0 && (
              <div className="flex items-start gap-3 border border-amber-200 bg-amber-50 rounded-lg px-4 py-3">
                <p className="flex-1 text-sm text-amber-800 leading-relaxed">{warnings.join(' ')}</p>
                <button
                  onClick={() => setWarnings([])}
                  className="text-amber-600 hover:text-amber-800 text-lg leading-none flex-shrink-0"
                  aria-label="Dismiss"
                >×</button>
              </div>
            )}

            {error && (
              <div className="border border-red-200 bg-red-50 rounded-lg px-4 py-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />

            <div
              className="border-2 border-dashed border-slate-200 rounded-lg p-12 text-center cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <p className="text-slate-700 font-medium mb-1">Click to upload your CSV export</p>
              <p className="text-sm text-slate-400">Meta Ads Manager export · Ad-level data</p>
            </div>
          </div>
        )}

        {/* ── Step 3: Results ──────────────────────────────────────────────── */}
        {step === 'results' && result && (
          <div className="space-y-6">

            {/* Subtitle */}
            <p className="text-sm text-slate-500">
              <span className="font-medium text-slate-700">{fileName}</span>
              {' · '}Analysed {analysisDate}
            </p>

            {/* Panel 1 — Treemap */}
            <div className="border border-slate-200 rounded-lg shadow-card px-5 pt-5 pb-4">
              <p className="text-sm font-semibold text-slate-900 mb-0.5">Spend by creative</p>
              <p className="text-xs text-slate-400 mb-4">
                {result.activeAds} active ad{result.activeAds !== 1 ? 's' : ''} · {result.totalAds} total in export
              </p>
              <ResponsiveContainer width="100%" height={400}>
                <Treemap
                  data={treemapData}
                  dataKey="size"
                  nameKey="name"
                  aspectRatio={4 / 3}
                  content={TreemapCell as any}
                  isAnimationActive={false}
                >
                  <Tooltip content={tooltipContent} />
                </Treemap>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-slate-100">
                {(['stable', 'learning', 'learning_limited', 'other'] as DeliveryBucket[]).map((b) => (
                  <div key={b} className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="w-2 h-2 rounded-full" style={{ background: BUCKET_COLORS[b] }} />
                    {BUCKET_LABELS[b]}
                  </div>
                ))}
              </div>
            </div>

            {/* Panel 2 — Spend state bar */}
            <div className="border border-slate-200 rounded-lg shadow-card px-5 pt-5 pb-4">
              <p className="text-sm font-semibold text-slate-900 mb-0.5">Spend by delivery state</p>
              <p className="text-xs text-slate-400 mb-4">
                Active spend only — excludes paused, inactive, and unrecognised delivery states.
              </p>
              <SpendStateBar summary={result.summary} deliveryMissing={deliveryMissing} />
            </div>

            {/* Reset */}
            <p className="text-sm">
              <button
                onClick={reset}
                className="text-slate-400 hover:text-slate-700 transition-colors underline underline-offset-2"
              >
                Upload a different file
              </button>
            </p>

            {/* Footer */}
            <p className="text-xs text-slate-400 text-center pb-2">
              Runs entirely in your browser — no data is uploaded or stored anywhere.
            </p>
          </div>
        )}

      </div>
    </ToolLayout>
  );
}
