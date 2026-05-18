import { useState } from 'react';

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
}

export interface QueryResult {
  engine: string;
  cited: boolean;
  citations: string[];
  snippet: string;
  top_alternatives: string[];
  error?: string;
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
  const [suggestedQuery, setSuggestedQuery] = useState('');

  const stageLabel =
    state.status === 'loading' ? STAGE_LABELS[state.stage] : null;

  async function runAudit(domain: string) {
    setState({ status: 'loading', stage: 'discovering' });

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
        error?: string;
      };

      if (!crawlData.success) {
        setState({ status: 'error', message: crawlData.error ?? 'Failed to discover pages.' });
        return;
      }

      const pages = crawlData.pages ?? [];

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

      setState({ status: 'complete', domain, score: scoreData.score });
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

  async function runQuery(domain: string, query: string) {
    setQueryState({ status: 'running' });
    try {
      const res = await fetch(`${FUNCTIONS_URL}/geo-query`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ domain, query }),
      });
      const data = await res.json() as { success: boolean; results?: QueryResult[]; error?: string };
      if (!data.success || !data.results) {
        setQueryState({ status: 'error', message: data.error ?? 'Query failed. Please try again.' });
        return;
      }
      setQueryState({ status: 'done', query, results: data.results });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setQueryState({ status: 'error', message });
    }
  }

  function reset() {
    setState({ status: 'idle' });
    setQueryState({ status: 'idle' });
    setSuggestedQuery('');
  }

  return { state, stageLabel, queryState, suggestedQuery, suggestQuery, runQuery, runAudit, reset };
}
