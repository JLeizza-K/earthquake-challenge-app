import { describe, it, expect } from 'vitest';
import {
  getMagnitudeClass,
  getAuraRadius,
  getPointRadius,
  POINT_FACTOR,
  RADIUS_NULL,
} from './magnitudeStyle.js';

describe('getMagnitudeClass — happy path (one representative per class)', () => {
  it('returns micro for mag 1.0', () => expect(getMagnitudeClass(1.0)).toBe('micro'));
  it('returns minor for mag 3.5', () => expect(getMagnitudeClass(3.5)).toBe('minor'));
  it('returns light for mag 4.5', () => expect(getMagnitudeClass(4.5)).toBe('light'));
  it('returns moderate for mag 5.5', () => expect(getMagnitudeClass(5.5)).toBe('moderate'));
  it('returns strong for mag 6.5', () => expect(getMagnitudeClass(6.5)).toBe('strong'));
  it('returns major for mag 7.5', () => expect(getMagnitudeClass(7.5)).toBe('major'));
  it('returns great for mag 9.0', () => expect(getMagnitudeClass(9.0)).toBe('great'));
});

describe('getMagnitudeClass — boundary values (belong to upper class)', () => {
  it('returns minor for mag exactly 3.0', () => expect(getMagnitudeClass(3.0)).toBe('minor'));
  it('returns light for mag exactly 4.0', () => expect(getMagnitudeClass(4.0)).toBe('light'));
  it('returns moderate for mag exactly 5.0', () => expect(getMagnitudeClass(5.0)).toBe('moderate'));
  it('returns strong for mag exactly 6.0', () => expect(getMagnitudeClass(6.0)).toBe('strong'));
  it('returns major for mag exactly 7.0', () => expect(getMagnitudeClass(7.0)).toBe('major'));
  it('returns great for mag exactly 8.0', () => expect(getMagnitudeClass(8.0)).toBe('great'));
});

describe('getMagnitudeClass — AC4: null magnitude resolves to null-data exclusively', () => {
  it('returns null-data for null', () => expect(getMagnitudeClass(null)).toBe('null-data'));
  it('returns null-data for undefined', () =>
    expect(getMagnitudeClass(undefined)).toBe('null-data'));
});

describe('getMagnitudeClass — edge cases', () => {
  it('returns micro for mag 0 (real event, not null-data)', () => {
    expect(getMagnitudeClass(0)).toBe('micro');
  });
  it('returns micro for negative magnitude (real earthquake)', () => {
    expect(getMagnitudeClass(-1.5)).toBe('micro');
  });
  it('returns great for magnitude above 10', () => {
    expect(getMagnitudeClass(10.5)).toBe('great');
  });
});

describe('getAuraRadius — concave curve anchors and null', () => {
  it('returns 0 for null (halo physically absent)', () => expect(getAuraRadius(null)).toBe(0));
  it('returns 4 for mag 0 (lower anchor)', () => expect(getAuraRadius(0)).toBe(4));
  it('returns 24 for mag 5 (mid anchor)', () => expect(getAuraRadius(5)).toBe(24));
  it('returns 52 for mag 10 (upper anchor)', () => expect(getAuraRadius(10)).toBe(52));
  it('clamps negative magnitude to 4px (same as mag 0)', () => expect(getAuraRadius(-2)).toBe(4));
  it('clamps magnitude above 10 to 52px (same as mag 10)', () =>
    expect(getAuraRadius(11)).toBe(52));
});

describe('getPointRadius — null fixed 4px; non-null = aura × POINT_FACTOR', () => {
  it('returns RADIUS_NULL (4px) for null — distinct "no data" marker', () => {
    expect(getPointRadius(null)).toBe(RADIUS_NULL);
  });
  it('returns aura × POINT_FACTOR for mag 0 (aura 4 → point 0.8)', () => {
    expect(getPointRadius(0)).toBeCloseTo(getAuraRadius(0) * POINT_FACTOR);
  });
  it('returns aura × POINT_FACTOR for mag 5 (aura 24 → point 4.8)', () => {
    expect(getPointRadius(5)).toBeCloseTo(getAuraRadius(5) * POINT_FACTOR);
  });
  it('returns aura × POINT_FACTOR for mag 10 (aura 52 → point 10.4)', () => {
    expect(getPointRadius(10)).toBeCloseTo(getAuraRadius(10) * POINT_FACTOR);
  });
});
