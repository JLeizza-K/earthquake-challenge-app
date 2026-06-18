import maplibregl, {
  type Map as MapLibreMap,
  type Popup,
  type MapGeoJSONFeature,
} from 'maplibre-gl';
import { buildPopupContent } from './earthquakePopup.js';
import { isEqProps, type EqProps } from './clusterLeaves.js';

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
