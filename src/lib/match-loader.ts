import { CricsheetData } from './engine/timeline';

export const FEATURED_MATCH_URL = '/matches/1254111.json';

export interface LoadOptions {
  url?: string;
  /** extra attempts after the first (flaky mobile networks) */
  retries?: number;
  timeoutMs?: number;
  backoffMs?: number;
  fetchImpl?: typeof fetch;
}

/** Cheap structural check so a captive-portal HTML page or a truncated body never reaches the engine. */
export function isCricsheetData(x: unknown): x is CricsheetData {
  if (!x || typeof x !== 'object') return false;
  const m = x as { info?: { teams?: unknown; players?: unknown }; innings?: unknown };
  return (
    !!m.info &&
    Array.isArray(m.info.teams) &&
    m.info.teams.length === 2 &&
    typeof m.info.players === 'object' &&
    m.info.players !== null &&
    Array.isArray(m.innings) &&
    m.innings.length > 0
  );
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function attempt(doFetch: typeof fetch, url: string, timeoutMs: number): Promise<CricsheetData> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await doFetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`Failed to load match: ${res.status} ${res.statusText}`.trim());
    const data: unknown = await res.json();
    if (!isCricsheetData(data)) throw new Error('Match file was not valid ball-by-ball data');
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Loads the featured match with a timeout and retries with backoff. The service
 * worker also caches this file, so a repeat visit works with no network at all.
 */
export async function loadFeaturedMatch(opts: LoadOptions = {}): Promise<CricsheetData> {
  const {
    url = FEATURED_MATCH_URL,
    retries = 2,
    timeoutMs = 8000,
    backoffMs = 500,
    fetchImpl,
  } = opts;
  const doFetch = fetchImpl ?? fetch;
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await attempt(doFetch, url, timeoutMs);
    } catch (err) {
      lastErr = err;
      if (i < retries) await sleep(backoffMs * 2 ** i);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Failed to load match');
}
