import { describe, it, expect } from 'vitest';
import type { Feature, Point } from 'geojson';
import { isEqProps, mapLeavesToEarthquakes } from './clusterLeaves.js';

function makeLeaf(props: Record<string, unknown> | null, coords: number[]): Feature<Point> {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: coords },
    properties: props,
  };
}

describe('isEqProps — shape validation', () => {
  it('accepts a valid shape', () => {
    expect(isEqProps({ mag: 5.2, place: 'Near Somewhere', time: 1700000000000 })).toBe(true);
  });
  it('accepts mag null (null-magnitude earthquake is valid)', () => {
    expect(isEqProps({ mag: null, place: 'Somewhere', time: 1700000000000 })).toBe(true);
  });
  it('rejects null properties', () => {
    expect(isEqProps(null)).toBe(false);
  });
  it('rejects non-string place', () => {
    expect(isEqProps({ mag: 3.0, place: 42, time: 1700000000000 })).toBe(false);
  });
  it('rejects non-number time', () => {
    expect(isEqProps({ mag: 3.0, place: 'Somewhere', time: '2024-01-01' })).toBe(false);
  });
});

describe('mapLeavesToEarthquakes — happy path', () => {
  it('maps valid leaves to correct Earthquake[]', () => {
    const leaves = [
      makeLeaf({ mag: 4.5, place: 'Pacific Ocean', time: 1700000000000 }, [-120, 35, 10]),
      makeLeaf({ mag: 2.1, place: 'Atlantic', time: 1700000001000 }, [-40, 10, 5]),
    ];
    const result = mapLeavesToEarthquakes(leaves);
    expect(result).toHaveLength(2);
    expect(result[0].place).toBe('Pacific Ocean');
    expect(result[0].coordinates).toEqual([-120, 35, 10]);
  });

  it('carries coordinates through correctly', () => {
    const leaves = [makeLeaf({ mag: 3.0, place: 'Test', time: 100 }, [-100.5, 25.3, 8.2])];
    const result = mapLeavesToEarthquakes(leaves);
    expect(result[0].coordinates).toEqual([-100.5, 25.3, 8.2]);
  });
});

describe('mapLeavesToEarthquakes — filtering', () => {
  it('excludes a leaf whose properties fail isEqProps', () => {
    const leaves = [
      makeLeaf({ mag: 4.5, place: 'Pacific Ocean', time: 1700000000000 }, [-120, 35, 10]),
      makeLeaf({ mag: 'invalid', place: 'Bad Leaf', time: 1700000001000 }, [-50, 20, 0]),
    ];
    const result = mapLeavesToEarthquakes(leaves);
    expect(result).toHaveLength(1);
    expect(result[0].place).toBe('Pacific Ocean');
  });

  it('keeps a leaf with mag null and maps it to Earthquake with mag null', () => {
    const leaves = [makeLeaf({ mag: null, place: 'Somewhere', time: 1700000000000 }, [-90, 15, 0])];
    const result = mapLeavesToEarthquakes(leaves);
    expect(result).toHaveLength(1);
    expect(result[0].mag).toBeNull();
  });
});
