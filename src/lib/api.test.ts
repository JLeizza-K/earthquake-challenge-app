import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildQueryUrl, fetchEarthquakes } from './api.js';

const CRITERIA = { starttime: '2024-01-01', endtime: '2024-01-07', minMagnitude: 4 };
const MOCK_FC = { type: 'FeatureCollection', features: [] };

describe('buildQueryUrl — endtime inclusivity (Safeguard 4)', () => {
  it('appends T23:59:59 to endtime', () => {
    const url = buildQueryUrl(CRITERIA);
    expect(url).toContain('endtime=2024-01-07T23%3A59%3A59');
  });

  it('includes starttime and minmagnitude unchanged', () => {
    const url = buildQueryUrl(CRITERIA);
    expect(url).toContain('starttime=2024-01-01');
    expect(url).toContain('minmagnitude=4');
  });

  it('always appends T23:59:59 regardless of input', () => {
    const url = buildQueryUrl({ ...CRITERIA, endtime: '2024-12-31' });
    expect(url).toContain('endtime=2024-12-31T23%3A59%3A59');
  });
});

async function runWithTimers(mockFetch: typeof fetch) {
  vi.stubGlobal('fetch', mockFetch);
  const p = fetchEarthquakes(CRITERIA, vi.fn());
  p.catch(() => {});
  await vi.runAllTimersAsync();
  return p;
}

function teardown() {
  vi.useRealTimers();
  vi.unstubAllGlobals();
}

describe('fetchEarthquakes — success on first attempt', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('resolves immediately without retrying', async () => {
    const mock = vi.fn().mockResolvedValue({ ok: true, json: async () => MOCK_FC });
    vi.stubGlobal('fetch', mock);
    const result = await fetchEarthquakes(CRITERIA, vi.fn());
    expect(result).toEqual(MOCK_FC);
    expect(mock).toHaveBeenCalledTimes(1);
  });
});

describe('fetchEarthquakes — retryable errors', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(teardown);

  it('retries on network failure (TypeError) and exhausts 3 attempts', async () => {
    const mock = vi.fn().mockRejectedValue(new TypeError('Network error'));
    const p = runWithTimers(mock);
    await p.catch(() => {});
    await expect(p).rejects.toThrow();
    expect(mock).toHaveBeenCalledTimes(3);
  });

  it('retries on HTTP 500 and exhausts 3 attempts', async () => {
    const mock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    const p = runWithTimers(mock);
    await p.catch(() => {});
    await expect(p).rejects.toThrow('HTTP 500');
    expect(mock).toHaveBeenCalledTimes(3);
  });

  it('retries on HTTP 429 and exhausts 3 attempts', async () => {
    const mock = vi.fn().mockResolvedValue({ ok: false, status: 429 });
    const p = runWithTimers(mock);
    await p.catch(() => {});
    await expect(p).rejects.toThrow('HTTP 429');
    expect(mock).toHaveBeenCalledTimes(3);
  });
});

describe('fetchEarthquakes — non-retryable errors', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(teardown);

  it('does NOT retry on HTTP 400', async () => {
    const mock = vi.fn().mockResolvedValue({ ok: false, status: 400 });
    const p = runWithTimers(mock);
    await p.catch(() => {});
    await expect(p).rejects.toThrow('HTTP 400');
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry on HTTP 403', async () => {
    const mock = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    const p = runWithTimers(mock);
    await p.catch(() => {});
    await expect(p).rejects.toThrow('HTTP 403');
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('marks non-retryable errors with nonRetryable flag', async () => {
    const mock = vi.fn().mockResolvedValue({ ok: false, status: 400 });
    const p = runWithTimers(mock);
    await p.catch(() => {});
    await expect(p).rejects.toMatchObject({ nonRetryable: true });
  });
});

describe('fetchEarthquakes — onAttempt callback', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(teardown);

  it('calls onAttempt with incrementing attempt numbers', async () => {
    const mock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal('fetch', mock);
    const onAttempt = vi.fn();
    const p = fetchEarthquakes(CRITERIA, onAttempt);
    p.catch(() => {});
    await vi.runAllTimersAsync();
    expect(onAttempt).toHaveBeenCalledTimes(3);
    expect(onAttempt).toHaveBeenNthCalledWith(1, 1);
    expect(onAttempt).toHaveBeenNthCalledWith(2, 2);
    expect(onAttempt).toHaveBeenNthCalledWith(3, 3);
  });
});

describe('fetchEarthquakes — second attempt success', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(teardown);

  it('succeeds on second attempt after one retryable failure', async () => {
    const mock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, json: async () => MOCK_FC });
    vi.stubGlobal('fetch', mock);
    const p = fetchEarthquakes(CRITERIA, vi.fn());
    await vi.runAllTimersAsync();
    const result = await p;
    expect(result).toEqual(MOCK_FC);
    expect(mock).toHaveBeenCalledTimes(2);
  });
});
