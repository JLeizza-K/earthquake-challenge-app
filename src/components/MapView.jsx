import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const EMPTY_FC = { type: 'FeatureCollection', features: [] };
const LAYER_PAINT = { 'circle-radius': 5, 'circle-color': '#e74c3c', 'circle-opacity': 0.8 };

function toFeatureCollection(earthquakes) {
  return {
    type: 'FeatureCollection',
    features: earthquakes.map((eq) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: eq.coordinates },
      properties: { place: eq.place, mag: eq.mag, time: eq.time },
    })),
  };
}

function setupLayer(map) {
  map.addSource('earthquakes', { type: 'geojson', data: EMPTY_FC });
  map.addLayer({ id: 'earthquakes', type: 'circle', source: 'earthquakes', paint: LAYER_PAINT });
}

function applyEarthquakes(map, earthquakes) {
  if (!map || !map.loaded() || !map.getSource('earthquakes')) return;
  const fc = earthquakes?.length > 0 ? toFeatureCollection(earthquakes) : EMPTY_FC;
  map.getSource('earthquakes').setData(fc);
}

export default function MapView({ earthquakes }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const earthquakesRef = useRef(earthquakes);

  useEffect(() => {
    earthquakesRef.current = earthquakes;
  }, [earthquakes]);

  useEffect(() => {
    if (mapRef.current) return;
    const map = new maplibregl.Map({ container: containerRef.current, style: STYLE_URL });
    mapRef.current = map;
    map.on('load', () => {
      setupLayer(map);
      applyEarthquakes(map, earthquakesRef.current);
    });
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    applyEarthquakes(mapRef.current, earthquakes);
  }, [earthquakes]);

  return <div ref={containerRef} style={{ width: '100%', height: '100vh' }} />;
}
