import type { Feature, Point } from 'geojson';
import type { Earthquake } from '../types/index.js';

export interface EqProps {
  mag: number | null;
  place: string;
  time: number;
}

export function isEqProps(p: unknown): p is EqProps {
  if (typeof p !== 'object' || p === null) return false;
  const obj = p as Record<string, unknown>;
  return (
    (typeof obj['mag'] === 'number' || obj['mag'] === null) &&
    typeof obj['place'] === 'string' &&
    typeof obj['time'] === 'number'
  );
}

function toEarthquake(leaf: Feature<Point>): Earthquake | null {
  if (!isEqProps(leaf.properties)) return null;
  const [lng, lat, depth = 0] = leaf.geometry.coordinates;
  const coordinates: [number, number, number] = [lng, lat, depth];
  return {
    place: leaf.properties.place,
    mag: leaf.properties.mag,
    time: leaf.properties.time,
    coordinates,
  };
}

export function mapLeavesToEarthquakes(rawLeaves: Feature[]): Earthquake[] {
  return rawLeaves
    .filter((leaf): leaf is Feature<Point> => leaf.geometry.type === 'Point')
    .map(toEarthquake)
    .filter((eq): eq is Earthquake => eq !== null);
}
