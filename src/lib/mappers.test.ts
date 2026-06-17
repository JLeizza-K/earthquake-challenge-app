import { describe, it, expect } from 'vitest';
import { toEarthquakes } from './mappers.js';
import type { UsgsFeature } from '../types/index.js';

type FeatureOverride = Partial<{
  type: string;
  geometry: UsgsFeature['geometry'];
  properties: UsgsFeature['properties'];
}>;

const makeFeature = (overrides: FeatureOverride = {}): UsgsFeature =>
  ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [-118.2437, 34.0522, 10] },
    properties: { place: 'Los Angeles', mag: 3.5, time: 1700000000000 },
    ...overrides,
  }) as UsgsFeature;

const makeFC = (features: UsgsFeature[]) => ({ type: 'FeatureCollection', features });

describe('toEarthquakes — null/missing geometry (Safeguard 8)', () => {
  it('drops features with null geometry', () => {
    const fc = makeFC([makeFeature({ geometry: null })]);
    const { earthquakes, skippedCount } = toEarthquakes(fc);
    expect(earthquakes).toHaveLength(0);
    expect(skippedCount).toBe(1);
  });

  it('drops features with missing coordinates', () => {
    const fc = makeFC([makeFeature({ geometry: { type: 'Point' } })]);
    const { earthquakes, skippedCount } = toEarthquakes(fc);
    expect(earthquakes).toHaveLength(0);
    expect(skippedCount).toBe(1);
  });

  it('counts multiple skipped features', () => {
    const fc = makeFC([
      makeFeature({ geometry: null }),
      makeFeature({ geometry: null }),
      makeFeature(),
    ]);
    const { earthquakes, skippedCount } = toEarthquakes(fc);
    expect(earthquakes).toHaveLength(1);
    expect(skippedCount).toBe(2);
  });
});

describe('toEarthquakes — null mag (kept)', () => {
  it('keeps features where mag is null', () => {
    const feature = makeFeature({
      properties: { place: 'Somewhere', mag: null, time: 1700000000000 },
    });
    const fc = makeFC([feature]);
    const { earthquakes, skippedCount } = toEarthquakes(fc);
    expect(earthquakes).toHaveLength(1);
    expect(earthquakes[0].mag).toBeNull();
    expect(skippedCount).toBe(0);
  });
});

describe('toEarthquakes — never throws (Safeguard 8)', () => {
  it('returns empty result for null input', () => {
    expect(() => toEarthquakes(null)).not.toThrow();
    const { earthquakes, skippedCount } = toEarthquakes(null);
    expect(earthquakes).toHaveLength(0);
    expect(skippedCount).toBe(0);
  });

  it('returns empty result for missing features array', () => {
    expect(() => toEarthquakes({})).not.toThrow();
    const { earthquakes } = toEarthquakes({});
    expect(earthquakes).toHaveLength(0);
  });

  it('handles features with null properties gracefully', () => {
    const feature = makeFeature({ properties: null });
    const fc = makeFC([feature]);
    expect(() => toEarthquakes(fc)).not.toThrow();
  });
});

describe('toEarthquakes — valid feature mapping', () => {
  it('maps valid features correctly', () => {
    const fc = makeFC([makeFeature()]);
    const { earthquakes } = toEarthquakes(fc);
    expect(earthquakes[0]).toMatchObject({
      place: 'Los Angeles',
      mag: 3.5,
      time: 1700000000000,
      coordinates: [-118.2437, 34.0522, 10],
    });
  });
});
