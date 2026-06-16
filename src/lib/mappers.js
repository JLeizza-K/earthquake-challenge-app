function mapFeature(feature) {
  return {
    place: feature.properties?.place ?? '',
    mag: feature.properties?.mag ?? null,
    time: feature.properties?.time ?? 0,
    coordinates: feature.geometry.coordinates,
  };
}

export function toEarthquakes(featureCollection) {
  if (!featureCollection?.features) return { earthquakes: [], skippedCount: 0 };

  const earthquakes = [];
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
