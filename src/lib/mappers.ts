import type { Earthquake, UsgsFeature, UsgsFeatureCollection } from '../types/index.js';

function mapFeature(feature: UsgsFeature): Earthquake {
  const coords = feature.geometry!.coordinates!;
  return {
    place: feature.properties?.place ?? '',
    mag: feature.properties?.mag ?? null,
    time: feature.properties?.time ?? 0,
    coordinates: [coords[0], coords[1], coords[2] ?? 0] as [number, number, number],
  };
}

export function toEarthquakes(featureCollection: UsgsFeatureCollection | null | undefined): {
  earthquakes: Earthquake[];
  skippedCount: number;
} {
  if (!featureCollection?.features) return { earthquakes: [], skippedCount: 0 };

  const earthquakes: Earthquake[] = [];
  let skippedCount = 0;

  for (const feature of featureCollection.features) {
    if (!feature?.geometry?.coordinates) {
      skippedCount++;
      continue;
    }
    earthquakes.push(mapFeature(feature));
  }

  return { earthquakes, skippedCount };
}
