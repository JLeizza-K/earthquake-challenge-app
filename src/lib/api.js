const USGS_BASE = 'https://earthquake.usgs.gov/fdsnws/event/1/query';
const USGS_COUNT = 'https://earthquake.usgs.gov/fdsnws/event/1/count';
const TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [1_000, 2_000];

export function buildQueryUrl(criteria) {
  const params = new URLSearchParams({
    format: 'geojson',
    starttime: criteria.starttime,
    endtime: `${criteria.endtime}T23:59:59`,
    minmagnitude: String(criteria.minMagnitude),
  });
  return `${USGS_BASE}?${params.toString()}`;
}

export function buildCountUrl(criteria) {
  const params = new URLSearchParams({
    starttime: criteria.starttime,
    endtime: `${criteria.endtime}T23:59:59`,
    minmagnitude: String(criteria.minMagnitude),
  });
  return `${USGS_COUNT}?${params.toString()}`;
}

function isRetryable(err) {
  if (err.name === 'AbortError' || err.name === 'TypeError') return true;
  return err.status === 429 || err.status >= 500;
}

async function attemptFetch(url, parse) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return parse(res);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry(url, parse, onAttempt) {
  let lastError;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    onAttempt?.(i + 1);
    try {
      return await attemptFetch(url, parse);
    } catch (err) {
      lastError = err;
      if (!isRetryable(err)) {
        err.nonRetryable = true;
        throw err;
      }
      if (i < MAX_ATTEMPTS - 1) await delay(BACKOFF_MS[i]);
    }
  }
  throw lastError;
}

export function fetchCount(criteria, onAttempt) {
  return withRetry(buildCountUrl(criteria), (r) => r.text().then(Number), onAttempt);
}

export function fetchEarthquakes(criteria, onAttempt) {
  return withRetry(buildQueryUrl(criteria), (r) => r.json(), onAttempt);
}
