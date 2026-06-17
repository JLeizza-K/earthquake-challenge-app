import type { MagnitudeClass, NonNullMagnitudeClass } from '../types/index.js';

export const CLASS_COLORS: Record<NonNullMagnitudeClass, string> = {
  micro: '#FED976',
  minor: '#FEB24C',
  light: '#FD8D3C',
  moderate: '#FC4E2A',
  strong: '#E31A1C',
  major: '#BD0026',
  great: '#800026',
};

export const NULL_COLOR = '#9E9E9E';
export const RADIUS_NULL = 4;
export const RADIUS_MIN = 4;
export const RADIUS_MAX = 52;
export const POINT_FACTOR = 0.2;

// Alternating [mag, radius] pairs spread into the MapLibre interpolate expression.
export const RADIUS_ANCHORS: number[] = [0, 4, 2, 8, 4, 16, 5, 24, 6, 34, 8, 44, 10, 52];

export function getMagnitudeClass(mag: number | null | undefined): MagnitudeClass {
  if (mag === null || mag === undefined) return 'null-data';
  if (mag < 3.0) return 'micro';
  if (mag < 4.0) return 'minor';
  if (mag < 5.0) return 'light';
  if (mag < 6.0) return 'moderate';
  if (mag < 7.0) return 'strong';
  if (mag < 8.0) return 'major';
  return 'great';
}

export function getAuraRadius(mag: number | null | undefined): number {
  if (mag === null || mag === undefined) return 0;
  const m = Math.max(0, Math.min(10, mag));
  for (let i = 0; i < RADIUS_ANCHORS.length - 2; i += 2) {
    if (m <= RADIUS_ANCHORS[i + 2]) {
      const x0 = RADIUS_ANCHORS[i],
        y0 = RADIUS_ANCHORS[i + 1];
      const x1 = RADIUS_ANCHORS[i + 2],
        y1 = RADIUS_ANCHORS[i + 3];
      return y0 + ((m - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return RADIUS_MAX;
}

export function getPointRadius(mag: number | null | undefined): number {
  if (mag === null || mag === undefined) return RADIUS_NULL;
  return getAuraRadius(mag) * POINT_FACTOR;
}
