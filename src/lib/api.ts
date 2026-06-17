import type { FilterCriteria, UsgsFeatureCollection, HttpError } from '../types/index.js';

const USGS_BASE = 'https://earthquake.usgs.gov/fdsnws/event/1/query';
const USGS_COUNT = 'https://earthquake.usgs.gov/fdsnws/event/1/count';
const TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [1_000, 2_000];

type OnAttempt = (attempt: number) => void;

export function buildQueryUrl(criteria: FilterCriteria): string {
  const params = new URLSearchParams({
    format: 'geojson',
    starttime: criteria.starttime,
    endtime: `${criteria.endtime}T23:59:59`,
    minmagnitude: String(criteria.minMagnitude),
  });
  return `${USGS_BASE}?${params.toString()}`;
}

export function buildCountUrl(criteria: FilterCriteria): string {
  const params = new URLSearchParams({
    starttime: criteria.starttime,
    endtime: `${criteria.endtime}T23:59:59`,
    minmagnitude: String(criteria.minMagnitude),
  });
  return `${USGS_COUNT}?${params.toString()}`;
}

function isRetryable(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as { name?: string; status?: number };
  if (e.name === 'AbortError' || e.name === 'TypeError') return true;
  return e.status === 429 || (e.status !== undefined && e.status >= 500);
}

async function attemptFetch<T>(url: string, parse: (r: Response) => Promise<T>): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`) as HttpError;
    err.status = res.status;
    throw err;
  }
  return parse(res);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(
  url: string,
  parse: (r: Response) => Promise<T>,
  onAttempt?: OnAttempt,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    onAttempt?.(i + 1);
    try {
      return await attemptFetch(url, parse);
    } catch (err) {
      lastError = err;
      if (!isRetryable(err)) {
        (err as HttpError).nonRetryable = true;
        throw err;
      }
      if (i < MAX_ATTEMPTS - 1) await delay(BACKOFF_MS[i]);
    }
  }
  throw lastError;
}

export function fetchCount(criteria: FilterCriteria, onAttempt?: OnAttempt): Promise<number> {
  return withRetry(buildCountUrl(criteria), (r) => r.text().then(Number), onAttempt);
}

export function fetchEarthquakes(
  criteria: FilterCriteria,
  onAttempt?: OnAttempt,
): Promise<UsgsFeatureCollection> {
  return withRetry(buildQueryUrl(criteria), (r) => r.json(), onAttempt);
}
