import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildCountUrl, fetchCount } from './api.js';

const CRITERIA = { starttime: '2024-01-01', endtime: '2024-01-07', minMagnitude: 4 };

describe('buildCountUrl', () => {
  it('targets /count, not /query', () => {
    const url = buildCountUrl(CRITERIA);
    expect(url).toContain('/count?');
    expect(url).not.toContain('/query');
  });

  it('omits format=geojson', () => {
    const url = buildCountUrl(CRITERIA);
    expect(url).not.toContain('format=');
  });

  it('appends T23:59:59 to endtime', () => {
    const url = buildCountUrl(CRITERIA);
    expect(url).toContain('endtime=2024-01-07T23%3A59%3A59');
  });

  it('includes starttime and minmagnitude', () => {
    const url = buildCountUrl(CRITERIA);
    expect(url).toContain('starttime=2024-01-01');
    expect(url).toContain('minmagnitude=4');
  });
});

async function runCountWithTimers(mockFetch: typeof fetch) {
  vi.stubGlobal('fetch', mockFetch);
  const p = fetchCount(CRITERIA, vi.fn());
  p.catch(() => {});
  await vi.runAllTimersAsync();
  return p;
}

function teardown() {
  vi.useRealTimers();
  vi.unstubAllGlobals();
}

describe('fetchCount — success', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('resolves to a number parsed from plain-text body', async () => {
    const mock = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('1234') });
    vi.stubGlobal('fetch', mock);
    const result = await fetchCount(CRITERIA, vi.fn());
    expect(result).toBe(1234);
    expect(typeof result).toBe('number');
  });

  it('resolves to 0 when body is "0"', async () => {
    const mock = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('0') });
    vi.stubGlobal('fetch', mock);
    const result = await fetchCount(CRITERIA, vi.fn());
    expect(result).toBe(0);
  });
});

describe('fetchCount — retryable errors', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(teardown);

  it('retries on HTTP 500 and exhausts 3 attempts', async () => {
    const mock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    const p = runCountWithTimers(mock);
    await p.catch(() => {});
    await expect(p).rejects.toThrow('HTTP 500');
    expect(mock).toHaveBeenCalledTimes(3);
  });

  it('retries on HTTP 429 and exhausts 3 attempts', async () => {
    const mock = vi.fn().mockResolvedValue({ ok: false, status: 429 });
    const p = runCountWithTimers(mock);
    await p.catch(() => {});
    await expect(p).rejects.toThrow('HTTP 429');
    expect(mock).toHaveBeenCalledTimes(3);
  });

  it('retries on network failure (TypeError) and exhausts 3 attempts', async () => {
    const mock = vi.fn().mockRejectedValue(new TypeError('Network error'));
    const p = runCountWithTimers(mock);
    await p.catch(() => {});
    await expect(p).rejects.toThrow();
    expect(mock).toHaveBeenCalledTimes(3);
  });
});

describe('fetchCount — non-retryable errors', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(teardown);

  it('does NOT retry on HTTP 400', async () => {
    const mock = vi.fn().mockResolvedValue({ ok: false, status: 400 });
    const p = runCountWithTimers(mock);
    await p.catch(() => {});
    await expect(p).rejects.toThrow('HTTP 400');
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('marks non-retryable errors with nonRetryable flag', async () => {
    const mock = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    const p = runCountWithTimers(mock);
    await p.catch(() => {});
    await expect(p).rejects.toMatchObject({ nonRetryable: true });
  });
});

describe('fetchCount — onAttempt callback', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(teardown);

  it('calls onAttempt with incrementing attempt numbers', async () => {
    const mock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal('fetch', mock);
    const onAttempt = vi.fn();
    const p = fetchCount(CRITERIA, onAttempt);
    p.catch(() => {});
    await vi.runAllTimersAsync();
    expect(onAttempt).toHaveBeenCalledTimes(3);
    expect(onAttempt).toHaveBeenNthCalledWith(1, 1);
    expect(onAttempt).toHaveBeenNthCalledWith(2, 2);
    expect(onAttempt).toHaveBeenNthCalledWith(3, 3);
  });
});

describe('fetchCount — second attempt success', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(teardown);

  it('succeeds on second attempt after one retryable failure', async () => {
    const mock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('42') });
    vi.stubGlobal('fetch', mock);
    const p = fetchCount(CRITERIA, vi.fn());
    await vi.runAllTimersAsync();
    const result = await p;
    expect(result).toBe(42);
    expect(mock).toHaveBeenCalledTimes(2);
  });
});
