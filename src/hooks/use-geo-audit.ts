import { useState, useRef } from 'react';

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface GeoScore {
  overall: number;
  dimensions: {
    entity_clarity: number;
    claim_specificity: number;
    structure_legibility: number;
    citation_worthiness: number;
    comparison_anchoring: number;
  };
  verdict: string;
  pages_scored: number;
  confidence: 'high' | 'medium' | 'low';
  confidence_note?: string | null;
  source_type_breakdown?: {
    editorial:  { min: number; max: number };
    community:  { min: number; max: number };
    aggregator: { min: number; max: number };
    expert:     { min: number; max: number };
    base_model: { min: number; max: number };
  };
  retrieval_dominance?: string;
  brand_aliases?: string[];
}

export interface QueryResult {
  engine: string;
  mentioned: boolean;
  cited: boolean;
  citations: string[];
  snippet: string;
  top_alternatives: string[];
  error?: string;
}

export interface BrandMention {
  url: string;
  source_type: 'editorial' | 'community' | 'aggregator' | 'expert';
  mentioned: boolean;
  context: string | null;
  competitors_on_page: string[];
}

export interface SignalCoverageResult {
  category: string;
  sources_checked: number;
  brand_mentions: BrandMention[];
  signal_summary: {
    editorial_coverage: 'strong' | 'partial' | 'absent';
    community_coverage: 'strong' | 'partial' | 'absent';
    expert_coverage: 'strong' | 'partial' | 'absent';
    top_competitors_by_frequency: string[];
  };
}

export type AuditStage = 'discovering' | 'fetching' | 'scoring';

type AuditState =
  | { status: 'idle' }
  | { status: 'loading'; stage: AuditStage }
  | { status: 'complete'; domain: string; score: GeoScore }
  | { status: 'error'; message: string };

type QueryState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'done'; query: string; results: QueryResult[] }
  | { status: 'error'; message: string };

type SignalState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; result: SignalCoverageResult }
  | { status: 'error'; message: string };

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const SUPABASE_URL  = import.meta.env.VITE_NEILMINTY_SUPABASE_URL as string;
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

const STAGE_LABELS: Record<AuditStage, string> = {
  discovering: 'Discovering pages…',
  fetching:    'Fetching content…',
  scoring:     'Scoring…',
};

// ─── HOOK ─────────────────────────────────────────────────────────────────────

export function useGeoAudit() {
  const [state, setState]                   = useState<AuditState>({ status: 'idle' });
  const [queryState, setQueryState]         = useState<QueryState>({ status: 'idle' });
  const [signalState, setSignalState]       = useState<SignalState>({ status: 'idle' });
  const [suggestedQuery, setSuggestedQuery] = useState('');
  const runIdRef                            = useRef(0);

  const stageLabel =
    state.status === 'loading' ? STAGE_LABELS[state.stage] : null;

  async function runSignalCoverage(domain: string, verdict: string, runId: number) {
    setSignalState({ status: 'loading' });
    try {
      const res = await fetch(`${FUNCTIONS_URL}/geo-signal-coverage`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ domain, verdict }),
      });
      const data = await res.json() as { success: boolean; result?: SignalCoverageResult; error?: string };
      if (runIdRef.current !== runId) return;
      if (!data.success || !data.result) {
        setSignalState({ status: 'error', message: data.error ?? 'Signal coverage check failed.' });
        return;
      }
      setSignalState({ status: 'done', result: data.result });
    } catch (err) {
      if (runIdRef.current !== runId) return;
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      setSignalState({ status: 'error', message });
    }
  }

  function aliasesFromDomain(domain: string): string[] {
    const host  = domain.replace(/^www\./, '').split('/')[0];
    const noTld = host.replace(/(\.[a-z]{2,4}){1,2}$/, '');
    const words = noTld.replace(/[-_.]/g, ' ').trim();
    const title = words.replace(/\b\w/g, c => c.toUpperCase());
    return [...new Set([words, title])].filter(s => s.length > 2);
  }

  async function runAudit(domain: string, query?: string) {
    const runId = ++runIdRef.current;
    setState({ status: 'loading', stage: 'discovering' });
    setQueryState({ status: 'idle' });
    setSignalState({ status: 'idle' });

    try {
      // ── Step 1: geo-crawl ──────────────────────────────────────────────────
      const crawlRes = await fetch(`${FUNCTIONS_URL}/geo-crawl`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ domain }),
      });

      const crawlData = await crawlRes.json() as {
        success: boolean;
        pages?: { url: string; type: string; content: string; wordCount: number }[];
        confidence_note?: string | null;
        confidence_tier?: 'medium' | 'low' | null;
        error?: string;
      };

      if (!crawlData.success) {
        setState({ status: 'error', message: crawlData.error ?? 'Failed to discover pages.' });
        return;
      }

      const pages = crawlData.pages ?? [];
      const confidenceNote = crawlData.confidence_note ?? null;
      const confidenceTier = crawlData.confidence_tier ?? null;

      if (pages.length === 0) {
        setState({ status: 'error', message: 'No pages met the content threshold. The site may be too thin to audit.' });
        return;
      }

      setState({ status: 'loading', stage: 'scoring' });

      // ── Step 2: geo-score ──────────────────────────────────────────────────
      const scoreRes = await fetch(`${FUNCTIONS_URL}/geo-score`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ pages }),
      });

      const scoreData = await scoreRes.json() as {
        success: boolean;
        score?: GeoScore;
        error?: string;
      };

      if (!scoreData.success || !scoreData.score) {
        setState({ status: 'error', message: scoreData.error ?? 'Scoring failed. Please try again.' });
        return;
      }

      const score = scoreData.score;
      console.log('[geo-audit] breakdown_raw:', JSON.stringify(score.source_type_breakdown));
      if (confidenceNote) {
        score.confidence      = confidenceTier ?? 'low';
        score.confidence_note = confidenceNote;
      }

      setState({ status: 'complete', domain, score });

      // ── Step 3: signal coverage + query (non-blocking, post-score) ────────
      const aliases = (score.brand_aliases && score.brand_aliases.length > 0)
        ? score.brand_aliases
        : aliasesFromDomain(domain);

      console.log('[geo-audit] calling runSignalCoverage', { domain, runId, verdictSnippet: score.verdict.slice(0, 80) });
      runSignalCoverage(domain, score.verdict, runId);
      if (query) runQuery(domain, query, aliases, runId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setState({ status: 'error', message });
    }
  }

  async function suggestQuery(domain: string) {
    try {
      const res = await fetch(`${FUNCTIONS_URL}/geo-suggest`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ domain, verdict: 'a brand website' }),
      });
      const data = await res.json() as { success: boolean; query?: string };
      if (data.success && data.query) setSuggestedQuery(data.query);
    } catch {
      // silently ignore
    }
  }

  async function runQuery(domain: string, query: string, aliases: string[], runId: number) {
    setQueryState({ status: 'running' });
    try {
      const res = await fetch(`${FUNCTIONS_URL}/geo-query`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ domain, query, brand_aliases: aliases }),
      });
      const data = await res.json() as { success: boolean; results?: QueryResult[]; error?: string };
      if (runIdRef.current !== runId) return;
      if (!data.success || !data.results) {
        setQueryState({ status: 'error', message: data.error ?? 'Query failed. Please try again.' });
        return;
      }
      setQueryState({ status: 'done', query, results: data.results });
    } catch (err) {
      if (runIdRef.current !== runId) return;
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setQueryState({ status: 'error', message });
    }
  }

  function reset() {
    setState({ status: 'idle' });
    setQueryState({ status: 'idle' });
    setSignalState({ status: 'idle' });
    setSuggestedQuery('');
  }

  return {
    state,
    stageLabel,
    queryState,
    signalState,
    suggestedQuery,
    suggestQuery,
    runAudit,
    reset,
  };
}
