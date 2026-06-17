import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  CLASS_COLORS,
  NULL_COLOR,
  RADIUS_NULL,
  RADIUS_ANCHORS,
  POINT_FACTOR,
} from '../lib/magnitudeStyle.js';

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const EMPTY_FC = { type: 'FeatureCollection', features: [] };

function buildColorExpr() {
  return [
    'case',
    ['==', ['get', 'mag'], null],
    NULL_COLOR,
    ['<', ['get', 'mag'], 3.0],
    CLASS_COLORS.micro,
    ['<', ['get', 'mag'], 4.0],
    CLASS_COLORS.minor,
    ['<', ['get', 'mag'], 5.0],
    CLASS_COLORS.light,
    ['<', ['get', 'mag'], 6.0],
    CLASS_COLORS.moderate,
    ['<', ['get', 'mag'], 7.0],
    CLASS_COLORS.strong,
    ['<', ['get', 'mag'], 8.0],
    CLASS_COLORS.major,
    CLASS_COLORS.great,
  ];
}

function buildCurveExpr() {
  return ['interpolate', ['linear'], ['get', 'mag'], ...RADIUS_ANCHORS];
}

function buildAuraRadiusExpr() {
  return ['case', ['==', ['get', 'mag'], null], 0, buildCurveExpr()];
}

function buildPointRadiusExpr() {
  return ['case', ['==', ['get', 'mag'], null], RADIUS_NULL, ['*', buildCurveExpr(), POINT_FACTOR]];
}

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
  map.addLayer({
    id: 'earthquakes-halo',
    type: 'circle',
    source: 'earthquakes',
    paint: {
      'circle-color': buildColorExpr(),
      'circle-radius': buildAuraRadiusExpr(),
      'circle-opacity': 0.5,
    },
  });
  map.addLayer({
    id: 'earthquakes',
    type: 'circle',
    source: 'earthquakes',
    paint: {
      'circle-color': buildColorExpr(),
      'circle-radius': buildPointRadiusExpr(),
      'circle-opacity': 0.8,
    },
  });
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
