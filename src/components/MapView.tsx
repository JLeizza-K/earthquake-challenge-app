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
  buildColorExpr,
  buildAuraRadiusExpr,
  buildPointRadiusExpr,
  buildClusterColorExpr,
  buildClusterSizeExpr,
  buildClusterProperties,
} from '../lib/mapExpressions.js';
import { buildPopupContent } from '../lib/earthquakePopup.js';
import { isEqProps } from '../lib/clusterLeaves.js';
import type { ExpressionSpecification } from 'maplibre-gl';
import type { Earthquake } from '../types/index.js';

interface MapViewProps {
  earthquakes: Earthquake[];
}

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const EMPTY_FC = { type: 'FeatureCollection' as const, features: [] };

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

function setupSource(map: MapLibreMap): void {
  map.addSource('earthquakes', {
    type: 'geojson',
    data: EMPTY_FC,
    cluster: true,
    clusterRadius: 38,
    clusterMaxZoom: 14,
    clusterProperties: buildClusterProperties(),
  });
}

function setupLayer(map: MapLibreMap) {
  setupSource(map);
  map.addLayer({
    id: 'earthquakes-halo',
    type: 'circle',
    source: 'earthquakes',
    filter: ['!', ['has', 'point_count']] as ExpressionSpecification,
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
    filter: ['!', ['has', 'point_count']] as ExpressionSpecification,
    paint: {
      'circle-color': buildColorExpr(),
      'circle-radius': buildPointRadiusExpr(),
      'circle-opacity': 0.8,
    },
  });
}

function setupClusterLayers(map: MapLibreMap): void {
  map.addLayer({
    id: 'cluster-circle',
    type: 'circle',
    source: 'earthquakes',
    filter: ['has', 'point_count'] as ExpressionSpecification,
    paint: {
      'circle-color': buildClusterColorExpr(),
      'circle-radius': buildClusterSizeExpr(),
    },
  });
  map.addLayer({
    id: 'cluster-count',
    type: 'symbol',
    source: 'earthquakes',
    filter: ['has', 'point_count'] as ExpressionSpecification,
    layout: { 'text-field': '{point_count_abbreviated}', 'text-size': 13 },
    paint: { 'text-color': '#ffffff' },
  });
}

function openPopup(
  map: MapLibreMap,
  popupRef: { current: Popup | null },
  feature: MapGeoJSONFeature,
): void {
  if (!feature.geometry || feature.geometry.type !== 'Point') return;
  const coords = feature.geometry.coordinates;
  const [lng, lat] = coords;
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
  setupClusterLayers(map);
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
