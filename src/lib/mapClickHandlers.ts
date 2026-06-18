import maplibregl, {
  GeoJSONSource,
  type Map as MapLibreMap,
  type MapMouseEvent,
  type Popup,
  type MapGeoJSONFeature,
} from 'maplibre-gl';
import { buildPopupContent } from './earthquakePopup.js';
import { isEqProps, type EqProps, isClusterFeatureProps } from './clusterLeaves.js';
import type { Earthquake } from '../types/index.js';

export function openAtCoords(
  map: MapLibreMap,
  popupRef: { current: Popup | null },
  lngLat: [number, number],
  props: EqProps,
): void {
  if (popupRef.current) popupRef.current.remove();
  map.easeTo({ center: lngLat });
  popupRef.current = new maplibregl.Popup()
    .setLngLat(lngLat)
    .setDOMContent(buildPopupContent(props))
    .addTo(map);
}

export function openPopup(
  map: MapLibreMap,
  popupRef: { current: Popup | null },
  feature: MapGeoJSONFeature,
): void {
  if (!feature.geometry || feature.geometry.type !== 'Point') return;
  const [lng, lat] = feature.geometry.coordinates;
  if (!isEqProps(feature.properties)) return;
  openAtCoords(map, popupRef, [lng, lat], feature.properties);
}

export function closePopup(popupRef: { current: Popup | null }): void {
  popupRef.current?.remove();
  popupRef.current = null;
}

export function handleClick(
  map: MapLibreMap,
  popupRef: { current: Popup | null },
  onCluster: (src: GeoJSONSource, clusterId: number) => void,
  e: MapMouseEvent,
): void {
  const features = map.queryRenderedFeatures(e.point, {
    layers: ['cluster-circle', 'earthquakes-halo'],
  });
  if (features.length === 0) {
    closePopup(popupRef);
    return;
  }
  const feature = features[0];
  if (isClusterFeatureProps(feature.properties)) {
    const src = map.getSource('earthquakes');
    if (!(src instanceof GeoJSONSource)) return;
    closePopup(popupRef);
    onCluster(src, feature.properties.cluster_id);
  } else {
    openPopup(map, popupRef, feature);
  }
}

export function handleCardClick(
  map: MapLibreMap,
  popupRef: { current: Popup | null },
  onClosePanel: () => void,
  eq: Earthquake,
): void {
  onClosePanel();
  const lngLat: [number, number] = [eq.coordinates[0], eq.coordinates[1]];
  openAtCoords(map, popupRef, lngLat, { mag: eq.mag, place: eq.place, time: eq.time });
}
