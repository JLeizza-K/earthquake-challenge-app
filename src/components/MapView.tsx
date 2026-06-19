import { useEffect, useRef } from 'react';
import maplibregl, {
  Map as MapLibreMap,
  Popup,
  GeoJSONSource,
  type ExpressionSpecification,
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
import { closePopup, handleClick, handleCardClick } from '../lib/mapClickHandlers.js';
import ClusterPanel from './ClusterPanel.js';
import type { Earthquake } from '../types/index.js';

interface MapViewProps {
  earthquakes: Earthquake[];
  panelLeaves: Earthquake[] | null;
  loadClusterLeaves: (src: GeoJSONSource, clusterId: number) => void;
  onClosePanel: () => void;
  resetPanel: () => void;
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

function applyEarthquakes(map: MapLibreMap | null, earthquakes: Earthquake[]): void {
  if (!map || !map.loaded()) return;
  const src = map.getSource('earthquakes');
  if (!(src instanceof GeoJSONSource)) return;
  src.setData(earthquakes.length > 0 ? toFeatureCollection(earthquakes) : EMPTY_FC);
}

function applyDataChange(
  earthquakesRef: { current: Earthquake[] },
  resetPanelRef: { current: () => void },
  popupRef: { current: Popup | null },
  mapRef: { current: MapLibreMap | null },
  earthquakes: Earthquake[],
): void {
  earthquakesRef.current = earthquakes;
  resetPanelRef.current();
  closePopup(popupRef);
  applyEarthquakes(mapRef.current, earthquakes);
}

function initMap(
  map: MapLibreMap,
  earthquakesRef: { current: Earthquake[] },
  popupRef: { current: Popup | null },
  onCluster: (src: GeoJSONSource, clusterId: number) => void,
): void {
  setupLayer(map);
  setupClusterLayers(map);
  applyEarthquakes(map, earthquakesRef.current);
  map.on('click', (e) => handleClick(map, popupRef, onCluster, e));
}

function useInitMap(
  containerRef: { current: HTMLDivElement | null },
  earthquakesRef: { current: Earthquake[] },
  popupRef: { current: Popup | null },
  loadClusterLeaves: (src: GeoJSONSource, clusterId: number) => void,
) {
  const mapRef = useRef<MapLibreMap | null>(null);
  const loadClusterLeavesRef = useRef(loadClusterLeaves);
  useEffect(() => {
    loadClusterLeavesRef.current = loadClusterLeaves;
  }, [loadClusterLeaves]);
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const opts = {
      container: containerRef.current,
      style: STYLE_URL,
      renderWorldCopies: false,
      dragRotate: false,
    };
    const map = new maplibregl.Map(opts);
    mapRef.current = map;
    map.on('load', () => initMap(map, earthquakesRef, popupRef, loadClusterLeavesRef.current));
    return () => {
      map.remove();
      mapRef.current = null;
      popupRef.current = null;
    };
  }, [containerRef, earthquakesRef, popupRef]);
  return mapRef;
}

export default function MapView(props: MapViewProps) {
  const { earthquakes, panelLeaves, loadClusterLeaves, onClosePanel, resetPanel } = props;
  const containerRef = useRef<HTMLDivElement>(null),
    earthquakesRef = useRef<Earthquake[]>(earthquakes);
  const popupRef = useRef<Popup | null>(null),
    resetPanelRef = useRef(resetPanel);
  const mapRef = useInitMap(containerRef, earthquakesRef, popupRef, loadClusterLeaves);
  useEffect(() => {
    applyDataChange(earthquakesRef, resetPanelRef, popupRef, mapRef, earthquakes);
  }, [earthquakes, mapRef]);
  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <ClusterPanel
        leaves={panelLeaves}
        onClose={onClosePanel}
        onCardClick={(eq) => {
          if (!mapRef.current) return;
          handleCardClick(mapRef.current, popupRef, onClosePanel, eq);
        }}
      />
    </div>
  );
}
