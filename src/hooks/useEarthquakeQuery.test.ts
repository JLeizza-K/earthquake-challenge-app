import { describe, it, expect } from 'vitest';
import { branchOnCount, loadingState } from './useEarthquakeQuery.js';

const CRITERIA = { starttime: '2024-01-01', endtime: '2024-01-07', minMagnitude: 4 };

describe('branchOnCount', () => {
  it('returns "tooMany" when count exceeds 20000', () => {
    expect(branchOnCount(20001)).toBe('tooMany');
    expect(branchOnCount(999999)).toBe('tooMany');
  });

  it('returns "tooMany" at 20001 but not at 20000', () => {
    expect(branchOnCount(20001)).toBe('tooMany');
    expect(branchOnCount(20000)).not.toBe('tooMany');
  });

  it('returns "empty" when count is exactly 0', () => {
    expect(branchOnCount(0)).toBe('empty');
  });

  it('returns "fetch" for count between 1 and 20000 inclusive', () => {
    expect(branchOnCount(1)).toBe('fetch');
    expect(branchOnCount(100)).toBe('fetch');
    expect(branchOnCount(20000)).toBe('fetch');
  });
});

describe('loadingState — retry() cannot surface stale earthquakes', () => {
  it('always resets earthquakes to [] regardless of prior state', () => {
    const state = loadingState(CRITERIA);
    expect(state.earthquakes).toEqual([]);
  });

  it('sets status to loading and carries the given criteria', () => {
    const state = loadingState(CRITERIA);
    expect(state.status).toBe('loading');
    expect(state.criteria).toBe(CRITERIA);
  });

  it('clears errorMessage', () => {
    const state = loadingState(CRITERIA);
    expect(state.errorMessage).toBeNull();
  });
});
