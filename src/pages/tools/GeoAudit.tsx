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

// ─── CITATION QUERY SECTION ───────────────────────────────────────────────────

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
  const hasCited  = result.cited && !result.error;
  const hasError  = !!result.error;

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

function CitationQuerySection({
  domain,
  queryState,
  onRunQuery,
}: {
  domain: string;
  queryState: ReturnType<typeof useGeoAudit>['queryState'];
  onRunQuery: (domain: string, query: string) => void;
}) {
  const [queryInput, setQueryInput] = useState('');
  const [prefilled, setPrefilled]   = useState(false);

  // Pre-fill input when suggested query arrives
  useEffect(() => {
    if (queryState.status === 'ready' && queryState.suggestedQuery && !prefilled) {
      setQueryInput(queryState.suggestedQuery);
      setPrefilled(true);
    }
  }, [queryState, prefilled]);

  const isRunning = queryState.status === 'running' || queryState.status === 'suggesting';

  function handleRun() {
    if (!queryInput.trim()) return;
    onRunQuery(domain, queryInput.trim());
  }

  const results  = queryState.status === 'done' ? queryState.results : null;
  const message  = results ? citationMessage(results) : null;
  const citedAny = results ? results.some(r => r.cited && !r.error) : false;

  return (
    <div className="pt-10 border-t border-slate-200 space-y-6">
      <div>
        <SectionLabel>Test Your AI Visibility</SectionLabel>
        <p className="text-sm text-slate-500 leading-relaxed">
          Enter a search query your customers would use to see whether your site appears in AI engine responses.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700">Search query</label>
        <div className="flex gap-3 flex-col sm:flex-row">
          <input
            type="text"
            value={queryInput}
            onChange={e => setQueryInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleRun(); }}
            placeholder="e.g. best natural supplements for sleep"
            disabled={isRunning}
            className="flex-1 border border-slate-200 rounded bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 transition-colors disabled:opacity-50 min-w-0"
          />
          <button
            onClick={handleRun}
            disabled={isRunning || !queryInput.trim()}
            className="bg-slate-900 text-white px-6 py-2.5 rounded text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isRunning ? 'Running…' : 'Run Query'}
          </button>
        </div>
        {queryState.status === 'suggesting' && (
          <p className="text-xs text-slate-400">Suggesting a query…</p>
        )}
      </div>

      {queryState.status === 'error' && (
        <div className="border border-red-200 bg-red-50 rounded-lg px-4 py-3">
          <p className="text-sm text-red-700">{queryState.message}</p>
        </div>
      )}

      {results && (
        <div className="space-y-4">
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
        </div>
      )}
    </div>
  );
}

// ─── RESULTS VIEW ─────────────────────────────────────────────────────────────

function ResultsView({
  domain,
  score,
  queryState,
  onRunQuery,
  onReset,
}: {
  domain: string;
  score: GeoScore;
  queryState: ReturnType<typeof useGeoAudit>['queryState'];
  onRunQuery: (domain: string, query: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-8">

      {/* 1. Domain + meta */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-slate-700">{domain}</span>
        <span className="text-slate-300">·</span>
        <span className="text-sm text-slate-500">{score.pages_scored} page{score.pages_scored !== 1 ? 's' : ''} scored</span>
        <span className="text-slate-300">·</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded border ${confidenceBadge(score.confidence)}`}>
          {score.confidence} confidence
        </span>
      </div>

      {/* 2. Overall score */}
      <div>
        <SectionLabel>GEO Readiness Score</SectionLabel>
        <div className="bg-white border border-slate-200 rounded-lg px-6 py-6 shadow-card flex items-center gap-5">
          <span className={`text-6xl font-semibold tracking-tight tabular-nums leading-none ${scoreColour(score.overall)}`}>
            {score.overall}
          </span>
          <div>
            <p className="text-sm font-medium text-slate-700">out of 100</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {score.overall >= 70 ? 'Strong GEO readiness' : score.overall >= 50 ? 'Moderate GEO readiness' : 'Low GEO readiness'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Dimension bars */}
      <div>
        <SectionLabel>Dimensions</SectionLabel>
        <div className="bg-white border border-slate-200 rounded-lg px-5 py-5 shadow-card space-y-4">
          {(Object.entries(score.dimensions) as [keyof GeoScore['dimensions'], number][]).map(([key, val]) => (
            <ScoreBar key={key} label={DIMENSION_LABELS[key]} score={val} />
          ))}
        </div>
      </div>

      {/* 4. Verdict */}
      <div>
        <SectionLabel>Verdict</SectionLabel>
        <div className="border border-slate-200 bg-slate-50 rounded-lg p-4">
          <p className="text-sm text-slate-700 leading-relaxed">{score.verdict}</p>
        </div>
      </div>

      {/* 5. Citation query */}
      <CitationQuerySection
        domain={domain}
        queryState={queryState}
        onRunQuery={onRunQuery}
      />

      {/* 6. CTA */}
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

      {/* Reset */}
      <div className="flex sm:justify-end pt-2 border-t border-slate-200">
        <button
          onClick={onReset}
          className="w-full sm:w-auto border border-slate-200 text-slate-700 px-6 py-2.5 rounded text-sm font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors"
        >
          Audit another domain
        </button>
      </div>

    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export function GeoAudit() {
  const { state, stageLabel, queryState, runAudit, runQuery, reset } = useGeoAudit();
  const [input, setInput]         = useState('');
  const [domainError, setDomainError] = useState('');

  useEffect(() => {
    console.log('[geo-audit] VITE_NEILMINTY_SUPABASE_URL:', import.meta.env.VITE_NEILMINTY_SUPABASE_URL);
    console.log('[geo-audit] VITE_NEILMINTY_SUPABASE_ANON_KEY present:', !!import.meta.env.VITE_NEILMINTY_SUPABASE_ANON_KEY);
  }, []);

  function handleSubmit() {
    const domain = normaliseDomain(input);
    if (!isValidDomain(domain)) {
      setDomainError('Enter a valid domain, e.g. example.com');
      return;
    }
    setDomainError('');
    runAudit(domain);
  }

  function handleReset() {
    reset();
    setInput('');
    setDomainError('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSubmit();
  }

  return (
    <ToolLayout
      title="GEO Readiness Audit"
      description="How visible is your site to AI engines? Enter a domain to get a GEO readiness score across five dimensions — entity clarity, claim specificity, structure legibility, citation worthiness, and comparison anchoring."
      metaDescription="Free GEO readiness audit. Score your site across five generative engine optimisation dimensions — entity clarity, claim specificity, structure, citation worthiness, and comparison anchoring."
    >
      {/* ── Input ─────────────────────────────────────────────────────────── */}
      {(state.status === 'idle' || state.status === 'error') && (
        <div className="space-y-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Domain</label>
            <div className="flex gap-3 flex-col sm:flex-row">
              <div className="flex-1 flex items-stretch border border-slate-200 rounded bg-white focus-within:border-slate-400 transition-colors">
                <span className="px-3 text-sm text-slate-400 border-r border-slate-200 flex items-center bg-slate-50 rounded-l select-none shrink-0">
                  https://
                </span>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => { setInput(e.target.value); setDomainError(''); }}
                  onKeyDown={handleKeyDown}
                  placeholder="example.com"
                  className="flex-1 px-3 py-2 text-sm text-slate-900 bg-transparent outline-none min-w-0"
                  autoFocus
                />
              </div>
              <button
                onClick={handleSubmit}
                className="bg-slate-900 text-white px-6 py-2.5 rounded text-sm font-medium hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                Run GEO Audit
              </button>
            </div>
            {domainError && (
              <p className="text-xs text-red-600">{domainError}</p>
            )}
            <p className="text-xs text-slate-400">Paste a full URL — https:// will be stripped automatically</p>
          </div>

          {state.status === 'error' && (
            <div className="border border-red-200 bg-red-50 rounded-lg px-4 py-3">
              <p className="text-sm text-red-700">{state.message}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Loading ───────────────────────────────────────────────────────── */}
      {state.status === 'loading' && (
        <div className="space-y-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Domain</label>
            <div className="flex gap-3 flex-col sm:flex-row">
              <div className="flex-1 flex items-stretch border border-slate-200 rounded bg-white opacity-50">
                <span className="px-3 text-sm text-slate-400 border-r border-slate-200 flex items-center bg-slate-50 rounded-l select-none shrink-0">
                  https://
                </span>
                <input
                  type="text"
                  value={input}
                  readOnly
                  className="flex-1 px-3 py-2 text-sm text-slate-900 bg-transparent outline-none min-w-0"
                />
              </div>
              <button
                disabled
                className="bg-slate-900 text-white px-6 py-2.5 rounded text-sm font-medium opacity-50 cursor-not-allowed whitespace-nowrap"
              >
                Run GEO Audit
              </button>
            </div>
          </div>

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
              {(['discovering', 'fetching', 'scoring'] as const).map((stage) => {
                const stageOrder   = { discovering: 0, fetching: 1, scoring: 2 };
                const currentOrder = stageOrder[state.stage];
                const thisOrder    = stageOrder[stage];
                const done         = thisOrder < currentOrder;
                const active       = thisOrder === currentOrder;
                return (
                  <div key={stage} className="flex items-center gap-2">
                    <span className={`w-4 text-center text-xs ${done ? 'text-green-600' : active ? 'text-slate-700' : 'text-slate-300'}`}>
                      {done ? '✓' : active ? '›' : '·'}
                    </span>
                    <span className={`text-sm ${done ? 'text-slate-400' : active ? 'text-slate-700 font-medium' : 'text-slate-300'}`}>
                      {stage === 'discovering' ? 'Discovering pages' : stage === 'fetching' ? 'Fetching content' : 'Scoring'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Results ───────────────────────────────────────────────────────── */}
      {state.status === 'complete' && (
        <ResultsView
          domain={state.domain}
          score={state.score}
          queryState={queryState}
          onRunQuery={runQuery}
          onReset={handleReset}
        />
      )}
    </ToolLayout>
  );
}
