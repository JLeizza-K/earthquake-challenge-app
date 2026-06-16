import { describe, it, expect } from 'vitest';
import { validateFilters } from './validation.js';

const TODAY = new Date().toISOString().slice(0, 10);
const YESTERDAY = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
const LAST_WEEK = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
const FUTURE = '9999-12-31';

const base = { starttime: LAST_WEEK, endtime: YESTERDAY, minMagnitude: '4.5' };

describe('validateFilters — valid case', () => {
  it('returns valid for well-formed input', () => {
    const { valid, errors } = validateFilters(base);
    expect(valid).toBe(true);
    expect(errors).toEqual({});
  });

  it('accepts minMagnitude of 0', () => {
    expect(validateFilters({ ...base, minMagnitude: '0' }).valid).toBe(true);
  });

  it('accepts minMagnitude of 10', () => {
    expect(validateFilters({ ...base, minMagnitude: '10' }).valid).toBe(true);
  });

  it('accepts today as endtime', () => {
    expect(validateFilters({ ...base, endtime: TODAY }).valid).toBe(true);
  });
});

describe('validateFilters — AC1: start date after end date', () => {
  it('errors when starttime is after endtime', () => {
    const { valid, errors } = validateFilters({
      ...base,
      starttime: YESTERDAY,
      endtime: LAST_WEEK,
    });
    expect(valid).toBe(false);
    expect(errors.starttime).toBeTruthy();
  });
});

describe('validateFilters — AC2: required fields', () => {
  it('errors when starttime is missing', () => {
    const { valid, errors } = validateFilters({ ...base, starttime: '' });
    expect(valid).toBe(false);
    expect(errors.starttime).toBeTruthy();
  });

  it('errors when endtime is missing', () => {
    const { valid, errors } = validateFilters({ ...base, endtime: '' });
    expect(valid).toBe(false);
    expect(errors.endtime).toBeTruthy();
  });

  it('errors when minMagnitude is missing', () => {
    const { valid, errors } = validateFilters({ ...base, minMagnitude: '' });
    expect(valid).toBe(false);
    expect(errors.minMagnitude).toBeTruthy();
  });
});

describe('validateFilters — AC2: magnitude range', () => {
  it('errors when minMagnitude is below 0', () => {
    const { valid, errors } = validateFilters({ ...base, minMagnitude: '-1' });
    expect(valid).toBe(false);
    expect(errors.minMagnitude).toBeTruthy();
  });

  it('errors when minMagnitude is above 10', () => {
    const { valid, errors } = validateFilters({ ...base, minMagnitude: '10.1' });
    expect(valid).toBe(false);
    expect(errors.minMagnitude).toBeTruthy();
  });
});

describe('validateFilters — AC6: non-date / non-numeric input', () => {
  it('errors when starttime contains letters', () => {
    const { valid, errors } = validateFilters({ ...base, starttime: 'abc' });
    expect(valid).toBe(false);
    expect(errors.starttime).toBeTruthy();
  });

  it('errors when endtime contains special chars', () => {
    const { valid, errors } = validateFilters({ ...base, endtime: '2024/01/15' });
    expect(valid).toBe(false);
    expect(errors.endtime).toBeTruthy();
  });

  it('errors when minMagnitude is not a number', () => {
    const { valid, errors } = validateFilters({ ...base, minMagnitude: 'abc' });
    expect(valid).toBe(false);
    expect(errors.minMagnitude).toBeTruthy();
  });
});

describe('validateFilters — future date rejection', () => {
  it('errors when starttime is in the future', () => {
    const { valid, errors } = validateFilters({ ...base, starttime: FUTURE });
    expect(valid).toBe(false);
    expect(errors.starttime).toBeTruthy();
  });

  it('errors when endtime is in the future', () => {
    const { valid, errors } = validateFilters({ ...base, endtime: FUTURE });
    expect(valid).toBe(false);
    expect(errors.endtime).toBeTruthy();
  });
});
