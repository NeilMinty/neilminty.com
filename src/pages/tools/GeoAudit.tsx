import { useState, useEffect, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { SectionLabel } from '@/components/SectionLabel';
import { useGeoAudit } from '@/hooks/use-geo-audit';
import type { GeoScore, QueryResult } from '@/hooks/use-geo-audit';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function normaliseDomain(input: string): string {
  let s = input.trim();
  s = s.replace(/^https?:\/\//i, '');
  s = s.replace(/^www\./i, '');
  s = s.replace(/\/.*$/, '');
  return s;
}

function isValidDomain(s: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/.test(s);
}

function overallScoreColour(n: number): string {
  if (n >= 80) return 'text-green-700';
  if (n >= 65) return 'text-amber-600';
  return 'text-red-600';
}

function overallScoreLabel(n: number): string {
  if (n >= 80) return 'Strong GEO readiness';
  if (n >= 65) return 'Moderate — gaps remain';
  if (n >= 50) return 'Low — significant work needed';
  return 'Not AI-visible';
}

function scoreColour(n: number): string {
  if (n >= 70) return 'text-green-700';
  if (n >= 50) return 'text-amber-600';
  return 'text-red-600';
}

function barColour(n: number): string {
  if (n >= 70) return 'bg-green-500';
  if (n >= 50) return 'bg-amber-400';
  return 'bg-red-400';
}

function confidenceBadge(c: GeoScore['confidence']): string {
  if (c === 'high')   return 'bg-green-50 text-green-700 border-green-200';
  if (c === 'medium') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-slate-100 text-slate-500 border-slate-200';
}

const DIMENSION_LABELS: Record<keyof GeoScore['dimensions'], string> = {
  entity_clarity:       'Entity Clarity',
  claim_specificity:    'Claim Specificity',
  structure_legibility: 'Structure Legibility',
  citation_worthiness:  'Citation Worthiness',
  comparison_anchoring: 'Comparison Anchoring',
};

// ─── SCORE BAR ────────────────────────────────────────────────────────────────

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-slate-700">{label}</span>
        <span className={`text-sm font-semibold tabular-nums ${scoreColour(score)}`}>{score}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColour(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

// ─── SCORE INTERPRETATION ─────────────────────────────────────────────────────

const INTERPRETATION_ITEMS = [
  {
    title: 'Brand authority gap',
    explanation: 'AI engines weight established brands more heavily than content quality alone.',
    fix: 'Build cited mentions on high-authority sites like Healthline, Forbes Health, or specialist publications in your category.',
  },
  {
    title: 'Training data coverage',
    explanation: "If your brand isn't discussed across the web, AI models won't know you exist regardless of your on-page content.",
    fix: 'PR, affiliate content, and review aggregators (Trustpilot, Google Reviews) all contribute to training data presence.',
  },
  {
    title: 'Category competition',
    explanation: 'In high-competition categories, AI defaults to known aggregators and authority sites before individual brands.',
    fix: 'Target lower-competition queries where aggregators are absent — specific ingredients, conditions, or use cases rather than broad category terms.',
  },
  {
    title: 'No llms.txt',
    explanation: "Without an llms.txt file, AI crawlers have no structured description of what your brand sells or stands for.",
    fix: 'Add an llms.txt to your root domain with a specific brand description, product list, and catalogue URL.',
  },
] as const;

function ScoreInterpretation() {
  return (
    <div>
      <SectionLabel>Why a good score doesn't guarantee visibility</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {INTERPRETATION_ITEMS.map(item => (
          <div key={item.title} className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-4">
            <p className="text-sm font-medium text-slate-800 mb-1">{item.title}</p>
            <p className="text-xs text-slate-500 leading-relaxed">{item.explanation}</p>
            <p className="text-xs text-slate-400 leading-relaxed mt-2">
              <span className="font-medium text-slate-500">Fix: </span>{item.fix}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CITATION RESULTS ─────────────────────────────────────────────────────────

function citationMessage(results: QueryResult[]): string {
  const citedCount = results.filter(r => r.cited && !r.error).length;
  const validCount = results.filter(r => !r.error).length;
  if (validCount === 0) return '';
  if (citedCount === 0) return "Your site isn't appearing in AI responses for this query. This is what a full audit addresses.";
  if (citedCount < validCount) return "You're appearing in some AI engines but not others. Consistency is the next challenge.";
  return "Strong AI visibility for this query. A full audit identifies where this breaks down across your full catalogue.";
}

function SnippetText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped]   = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) setClamped(el.scrollHeight > el.clientHeight);
  }, [text]);

  return (
    <div>
      <p
        ref={ref}
        className={`text-xs text-slate-500 leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}
      >
        {text}
      </p>
      {(clamped || expanded) && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}

function QueryCard({ result }: { result: QueryResult }) {
  const hasCited = result.cited && !result.error;
  const hasError = !!result.error;

  return (
    <div className="bg-white border border-slate-200 rounded-lg px-5 py-5 shadow-card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-900">{result.engine}</span>
        {hasError ? (
          <span className="text-xs px-2 py-0.5 rounded border bg-slate-100 text-slate-400 border-slate-200">
            unavailable
          </span>
        ) : hasCited ? (
          <span className="text-xs px-2 py-0.5 rounded border bg-green-50 text-green-700 border-green-200 font-medium">
            cited ✓
          </span>
        ) : (
          <span className="text-xs px-2 py-0.5 rounded border bg-red-50 text-red-600 border-red-200 font-medium">
            not cited
          </span>
        )}
      </div>

      {hasError && (
        <p className="text-xs text-slate-400">{result.error}</p>
      )}

      {!hasError && result.snippet && (
        <SnippetText text={result.snippet} />
      )}

      {!hasError && hasCited && result.citations.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">Cited from:</p>
          <ul className="space-y-0.5">
            {result.citations.slice(0, 3).map(url => {
              let host = url;
              try { host = new URL(url).hostname.replace(/^www\./, ''); } catch { /* leave as-is */ }
              return (
                <li key={url} className="text-xs text-green-700 font-medium truncate">{host}</li>
              );
            })}
          </ul>
        </div>
      )}

      {!hasError && !hasCited && result.top_alternatives.length > 0 && (
        <div>
          <p className="text-xs text-slate-400 mb-1">These brands were cited instead:</p>
          <ul className="space-y-0.5">
            {result.top_alternatives.map(domain => (
              <li key={domain} className="text-xs text-slate-600">{domain}</li>
            ))}
          </ul>
        </div>
      )}

      {!hasError && result.citations.length === 0 && (
        <p className="text-xs text-slate-400">No sources returned</p>
      )}
    </div>
  );
}

function CitationResultsSection({
  queryState,
  query,
}: {
  queryState: ReturnType<typeof useGeoAudit>['queryState'];
  query: string;
}) {
  const results  = queryState.status === 'done' ? queryState.results : null;
  const message  = results ? citationMessage(results) : null;
  const citedAny = results ? results.some(r => r.cited && !r.error) : false;

  return (
    <div className="space-y-4">
      <SectionLabel>Test Your AI Visibility</SectionLabel>

      {queryState.status === 'running' && (
        <div className="border border-slate-200 bg-slate-50 rounded-lg px-4 py-4 flex items-center gap-3">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <p className="text-sm text-slate-600">Checking AI citations for "{query}"…</p>
        </div>
      )}

      {queryState.status === 'error' && (
        <div className="border border-red-200 bg-red-50 rounded-lg px-4 py-3">
          <p className="text-sm text-red-700">{queryState.message}</p>
        </div>
      )}

      {results && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {results.map(r => <QueryCard key={r.engine} result={r} />)}
          </div>
          {message && (
            <div className="border border-slate-200 rounded-lg px-5 py-5 bg-white shadow-card">
              <p className="text-sm text-slate-700 leading-relaxed mb-4">{message}</p>
              {!citedAny && (
                <a
                  href="mailto:neil@personaify.io?subject=GEO Audit Request"
                  className="inline-block bg-slate-900 text-white px-6 py-2.5 rounded text-sm font-medium hover:bg-slate-800 transition-colors"
                >
                  Apply for a full audit →
                </a>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── LOADING SECTION ──────────────────────────────────────────────────────────

function AuditLoadingSection({ stageLabel, stage }: { stageLabel: string | null; stage: 'discovering' | 'fetching' | 'scoring' }) {
  return (
    <div className="border border-slate-200 bg-slate-50 rounded-lg px-5 py-5">
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <p className="text-sm text-slate-600">{stageLabel}</p>
      </div>
      <div className="mt-4 space-y-2">
        {(['discovering', 'fetching', 'scoring'] as const).map((s) => {
          const order   = { discovering: 0, fetching: 1, scoring: 2 };
          const done    = order[s] < order[stage];
          const active  = order[s] === order[stage];
          return (
            <div key={s} className="flex items-center gap-2">
              <span className={`w-4 text-center text-xs ${done ? 'text-green-600' : active ? 'text-slate-700' : 'text-slate-300'}`}>
                {done ? '✓' : active ? '›' : '·'}
              </span>
              <span className={`text-sm ${done ? 'text-slate-400' : active ? 'text-slate-700 font-medium' : 'text-slate-300'}`}>
                {s === 'discovering' ? 'Discovering pages' : s === 'fetching' ? 'Fetching content' : 'Scoring'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export function GeoAudit() {
  const { state, stageLabel, queryState, suggestedQuery, suggestQuery, runQuery, runAudit, reset } = useGeoAudit();

  const [domainInput, setDomainInput]   = useState('');
  const [queryInput, setQueryInput]     = useState('');
  const [userTypedQuery, setUserTypedQuery] = useState(false);
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [domainError, setDomainError]   = useState('');

  // Pre-fill query from suggestion unless user has already typed
  useEffect(() => {
    if (suggestedQuery && !userTypedQuery) {
      setQueryInput(suggestedQuery);
    }
  }, [suggestedQuery, userTypedQuery]);

  function handleDomainBlur() {
    const domain = normaliseDomain(domainInput);
    if (isValidDomain(domain)) suggestQuery(domain);
  }

  function handleSubmit() {
    const domain = normaliseDomain(domainInput);
    if (!isValidDomain(domain)) {
      setDomainError('Enter a valid domain, e.g. example.com');
      return;
    }
    setDomainError('');
    const query = queryInput.trim();
    setSubmittedQuery(query);
    runAudit(domain);
    if (query) runQuery(domain, query);
  }

  function handleReset() {
    reset();
    setDomainInput('');
    setQueryInput('');
    setUserTypedQuery(false);
    setSubmittedQuery('');
    setDomainError('');
  }

  const isActive = state.status === 'loading' || state.status === 'complete';
  const domain   = state.status === 'complete' ? state.domain : normaliseDomain(domainInput);
  const score    = state.status === 'complete' ? state.score : null;

  return (
    <ToolLayout
      title="GEO Readiness Audit"
      description="How visible is your site to AI engines? Enter a domain to get a GEO readiness score across five dimensions — entity clarity, claim specificity, structure legibility, citation worthiness, and comparison anchoring."
      metaDescription="Free GEO readiness audit. Score your site across five generative engine optimisation dimensions — entity clarity, claim specificity, structure, citation worthiness, and comparison anchoring."
    >

      {/* ── Input form ────────────────────────────────────────────────────── */}
      {!isActive && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Domain */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Your domain</label>
              <div className="flex items-stretch border border-slate-200 rounded bg-white focus-within:border-slate-400 transition-colors">
                <span className="px-3 text-sm text-slate-400 border-r border-slate-200 flex items-center bg-slate-50 rounded-l select-none shrink-0">
                  https://
                </span>
                <input
                  type="text"
                  value={domainInput}
                  onChange={(e) => { setDomainInput(e.target.value); setDomainError(''); }}
                  onBlur={handleDomainBlur}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                  placeholder="example.com"
                  className="flex-1 px-3 py-2 text-sm text-slate-900 bg-transparent outline-none min-w-0"
                  autoFocus
                />
              </div>
              {domainError && <p className="text-xs text-red-600">{domainError}</p>}
              <p className="text-xs text-slate-400">Paste a full URL — https:// will be stripped</p>
            </div>

            {/* Query */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Search query</label>
              <input
                type="text"
                value={queryInput}
                onChange={(e) => { setQueryInput(e.target.value); setUserTypedQuery(true); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                placeholder="e.g. best supplements for sleep UK"
                className="border border-slate-200 rounded bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 transition-colors"
              />
              <p className="text-xs text-slate-400">
                {queryInput && !userTypedQuery ? 'Suggested from your domain — edit if needed' : 'Optional — leave blank to skip citation check'}
              </p>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            className="bg-slate-900 text-white px-6 py-2.5 rounded text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            Run Audit
          </button>

          {state.status === 'error' && (
            <div className="border border-red-200 bg-red-50 rounded-lg px-4 py-3">
              <p className="text-sm text-red-700">{state.message}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Active view ───────────────────────────────────────────────────── */}
      {isActive && (
        <div className="space-y-8">

          {/* Domain + meta */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-slate-700">{domain}</span>
            {score && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-sm text-slate-500">{score.pages_scored} page{score.pages_scored !== 1 ? 's' : ''} scored</span>
                <span className="text-slate-300">·</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded border ${confidenceBadge(score.confidence)}`}>
                  {score.confidence} confidence
                </span>
              </>
            )}
          </div>

          {/* Audit: loading */}
          {state.status === 'loading' && (
            <AuditLoadingSection stageLabel={stageLabel} stage={state.stage} />
          )}

          {/* Audit: results */}
          {score && (
            <>
              {/* Overall score */}
              <div>
                <SectionLabel>GEO Readiness Score</SectionLabel>
                <div className="bg-white border border-slate-200 rounded-lg px-6 py-6 shadow-card flex items-center gap-5">
                  <span className={`text-6xl font-semibold tracking-tight tabular-nums leading-none ${overallScoreColour(score.overall)}`}>
                    {score.overall}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-700">out of 100</p>
                    <p className="text-xs text-slate-400 mt-0.5">{overallScoreLabel(score.overall)}</p>
                  </div>
                </div>
              </div>

              {/* Dimensions */}
              <div>
                <SectionLabel>Dimensions</SectionLabel>
                <div className="bg-white border border-slate-200 rounded-lg px-5 py-5 shadow-card space-y-4">
                  {(Object.entries(score.dimensions) as [keyof GeoScore['dimensions'], number][]).map(([key, val]) => (
                    <ScoreBar key={key} label={DIMENSION_LABELS[key]} score={val} />
                  ))}
                </div>
              </div>

              {/* Verdict */}
              <div>
                <SectionLabel>Verdict</SectionLabel>
                <div className="border border-slate-200 bg-slate-50 rounded-lg p-4">
                  <p className="text-sm text-slate-700 leading-relaxed">{score.verdict}</p>
                </div>
              </div>

              {/* Interpretation */}
              <ScoreInterpretation />
            </>
          )}

          {/* Citation results — independent of audit state */}
          {submittedQuery && queryState.status !== 'idle' && (
            <div className="pt-2 border-t border-slate-200">
              <CitationResultsSection queryState={queryState} query={submittedQuery} />
            </div>
          )}

          {/* CTA */}
          {score && (
            <div className="border border-slate-200 rounded-lg px-6 py-6 bg-white shadow-card">
              <h2 className="text-base font-semibold text-slate-900 mb-2">Want the full picture?</h2>
              <p className="text-sm text-slate-500 leading-relaxed mb-5">
                This audit scores surface-level GEO signals. A full audit goes deeper: per-page rewrite briefs, JSON-LD schema implementation, llms.txt generation, Citation Share tracking against competitors, and benchmark scoring against the top-ranking sites in your category.
              </p>
              <a
                href="mailto:neil@personaify.io?subject=GEO Audit Request"
                className="inline-block bg-slate-900 text-white px-6 py-2.5 rounded text-sm font-medium hover:bg-slate-800 transition-colors"
              >
                Apply for a full audit →
              </a>
            </div>
          )}

          {/* Reset */}
          <div className="flex sm:justify-end pt-2 border-t border-slate-200">
            <button
              onClick={handleReset}
              className="w-full sm:w-auto border border-slate-200 text-slate-700 px-6 py-2.5 rounded text-sm font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors"
            >
              Audit another domain
            </button>
          </div>

        </div>
      )}
    </ToolLayout>
  );
}
