import { useEffect, useRef } from 'react';
import maplibregl, {
  Map as MapLibreMap,
  MapGeoJSONFeature,
  Popup,
  GeoJSONSource,
  type MapMouseEvent,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  CLASS_COLORS,
  NULL_COLOR,
  RADIUS_NULL,
  RADIUS_ANCHORS,
  POINT_FACTOR,
} from '../lib/magnitudeStyle.js';
import { buildPopupContent } from '../lib/earthquakePopup.js';
import type { ExpressionSpecification } from 'maplibre-gl';
import type { Earthquake } from '../types/index.js';

interface MapViewProps {
  earthquakes: Earthquake[];
}

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const EMPTY_FC = { type: 'FeatureCollection' as const, features: [] as const };

function buildColorExpr(): ExpressionSpecification {
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

function buildCurveExpr(): ExpressionSpecification {
  return ['interpolate', ['linear'], ['get', 'mag'], ...RADIUS_ANCHORS];
}

function buildAuraRadiusExpr(): ExpressionSpecification {
  return ['case', ['==', ['get', 'mag'], null], 0, buildCurveExpr()];
}

function buildPointRadiusExpr(): ExpressionSpecification {
  return ['case', ['==', ['get', 'mag'], null], RADIUS_NULL, ['*', buildCurveExpr(), POINT_FACTOR]];
}

function toFeatureCollection(earthquakes: Earthquake[]) {
  return {
    type: 'FeatureCollection' as const,
    features: earthquakes.map((eq) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: eq.coordinates },
      properties: { place: eq.place, mag: eq.mag, time: eq.time },
    })),
  };
}

function setupLayer(map: MapLibreMap) {
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

interface EqProps {
  mag: number | null;
  place: string;
  time: number;
}

function isEqProps(p: unknown): p is EqProps {
  if (typeof p !== 'object' || p === null) return false;
  const obj = p as Record<string, unknown>;
  return (
    (typeof obj['mag'] === 'number' || obj['mag'] === null) &&
    typeof obj['place'] === 'string' &&
    typeof obj['time'] === 'number'
  );
}

function openPopup(
  map: MapLibreMap,
  popupRef: { current: Popup | null },
  feature: MapGeoJSONFeature,
): void {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (!feature.geometry || feature.geometry.type !== 'Point') return;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
  const coords = feature.geometry.coordinates;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const [lng, lat] = coords;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const lngLat: [number, number] = [lng, lat];
  if (popupRef.current) popupRef.current.remove();
  map.easeTo({ center: lngLat });
  if (!isEqProps(feature.properties)) return;
  popupRef.current = new maplibregl.Popup()
    .setLngLat(lngLat)
    .setDOMContent(
      buildPopupContent({
        mag: feature.properties.mag,
        place: feature.properties.place,
        time: feature.properties.time,
      }),
    )
    .addTo(map);
}

function handleClick(
  map: MapLibreMap,
  popupRef: { current: Popup | null },
  e: MapMouseEvent,
): void {
  const features = map.queryRenderedFeatures(e.point, { layers: ['earthquakes-halo'] });
  if (features.length > 0) {
    openPopup(map, popupRef, features[0]);
  } else {
    closePopup(popupRef);
  }
}

function closePopup(popupRef: { current: Popup | null }): void {
  if (popupRef.current) {
    popupRef.current.remove();
    popupRef.current = null;
  }
}

function applyEarthquakes(map: MapLibreMap | null, earthquakes: Earthquake[]): void {
  if (!map || !map.loaded()) return;
  const src = map.getSource('earthquakes');
  if (!(src instanceof GeoJSONSource)) return;
  const fc = earthquakes.length > 0 ? toFeatureCollection(earthquakes) : EMPTY_FC;
  src.setData(fc);
}

function initMap(
  map: MapLibreMap,
  earthquakesRef: { current: Earthquake[] },
  popupRef: { current: Popup | null },
): void {
  setupLayer(map);
  applyEarthquakes(map, earthquakesRef.current);
  map.on('click', (e) => handleClick(map, popupRef, e));
}

export default function MapView({ earthquakes }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const earthquakesRef = useRef<Earthquake[]>(earthquakes);
  const popupRef = useRef<Popup | null>(null);

  useEffect(() => {
    earthquakesRef.current = earthquakes;
  }, [earthquakes]);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const map = new maplibregl.Map({ container: containerRef.current, style: STYLE_URL });
    mapRef.current = map;
    map.on('load', () => initMap(map, earthquakesRef, popupRef));
    return () => {
      map.remove();
      mapRef.current = null;
      popupRef.current = null;
    };
  }, []);

  useEffect(() => {
    closePopup(popupRef);
    applyEarthquakes(mapRef.current, earthquakes);
  }, [earthquakes]);

  return <div ref={containerRef} style={{ width: '100%', height: '100vh' }} />;
}
