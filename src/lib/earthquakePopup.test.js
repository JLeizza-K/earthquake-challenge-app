// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { formatEarthquakeTime, buildPopupContent } from './earthquakePopup.js';

// 2026-07-15T12:00:00.000Z — mid-month, mid-year; year 2026 is stable across UTC±14.
const FIXED_TS = new Date('2026-07-15T12:00:00.000Z').getTime();

describe('formatEarthquakeTime (AC2)', () => {
  it('contains the year 2026', () => {
    expect(formatEarthquakeTime(FIXED_TS)).toContain('2026');
  });

  it('contains a comma separator between date and time', () => {
    expect(formatEarthquakeTime(FIXED_TS)).toContain(',');
  });

  it('does not show seconds (only one colon in the time portion)', () => {
    const result = formatEarthquakeTime(FIXED_TS);
    // HH:MM has one colon; HH:MM:SS would have two
    const colonCount = (result.match(/:/g) ?? []).length;
    expect(colonCount).toBe(1);
  });

  it('does not show AM or PM (24h clock)', () => {
    expect(formatEarthquakeTime(FIXED_TS)).not.toMatch(/am|pm/i);
  });
});

describe('buildPopupContent — happy path (AC3)', () => {
  it('includes the place string as text', () => {
    const node = buildPopupContent({ mag: 5.4, place: '25 km SE of Hilo, Hawaii', time: FIXED_TS });
    expect(node.textContent).toContain('25 km SE of Hilo, Hawaii');
  });

  it('includes "{mag} — {class}" using Story 2 classification', () => {
    const node = buildPopupContent({ mag: 5.4, place: 'somewhere', time: FIXED_TS });
    expect(node.textContent).toContain('5.4 — moderate');
  });

  it('includes the formatted time string', () => {
    const node = buildPopupContent({ mag: 5.4, place: 'somewhere', time: FIXED_TS });
    expect(node.textContent).toContain('2026');
  });
});

describe('buildPopupContent — null magnitude (AC4)', () => {
  it('shows "Magnitude data unavailable" when mag is null', () => {
    const node = buildPopupContent({ mag: null, place: 'somewhere', time: FIXED_TS });
    expect(node.textContent).toContain('Magnitude data unavailable');
  });

  it('does not contain "null-data" when mag is null', () => {
    const node = buildPopupContent({ mag: null, place: 'somewhere', time: FIXED_TS });
    expect(node.textContent).not.toContain('null-data');
  });

  it('does not contain the literal string "null" when mag is null', () => {
    const node = buildPopupContent({ mag: null, place: 'somewhere', time: FIXED_TS });
    expect(node.textContent).not.toContain('null');
  });

  it('does not contain "NaN" when mag is null', () => {
    const node = buildPopupContent({ mag: null, place: 'somewhere', time: FIXED_TS });
    expect(node.textContent).not.toContain('NaN');
  });
});

describe('buildPopupContent — missing place (AC4)', () => {
  it('shows "Location unknown" when place is null', () => {
    const node = buildPopupContent({ mag: 5.4, place: null, time: FIXED_TS });
    expect(node.textContent).toContain('Location unknown');
  });

  it('shows "Location unknown" when place is an empty string', () => {
    const node = buildPopupContent({ mag: 5.4, place: '', time: FIXED_TS });
    expect(node.textContent).toContain('Location unknown');
  });

  it('shows "Location unknown" when place is whitespace only', () => {
    const node = buildPopupContent({ mag: 5.4, place: '   ', time: FIXED_TS });
    expect(node.textContent).toContain('Location unknown');
  });
});

describe('buildPopupContent — XSS safety (AC5)', () => {
  const SCRIPT = '<script>alert(1)</script>';

  it('place with markup characters appears verbatim in textContent', () => {
    const node = buildPopupContent({ mag: 5.4, place: SCRIPT, time: FIXED_TS });
    expect(node.textContent).toContain(SCRIPT);
  });

  it('markup in place is NOT parsed as a <script> element in the DOM tree', () => {
    const node = buildPopupContent({ mag: 5.4, place: SCRIPT, time: FIXED_TS });
    expect(node.querySelectorAll('script')).toHaveLength(0);
  });
});
