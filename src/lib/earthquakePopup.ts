import { getMagnitudeClass } from './magnitudeStyle.js';
import { MSG_MAGNITUDE_UNAVAILABLE } from './errorMessages.js';
import type { Earthquake } from '../types/index.js';

export const LOCATION_UNKNOWN = 'Location unknown';
const LABEL_PLACE = 'Place';
const LABEL_MAGNITUDE = 'Magnitude';
const LABEL_TIME = 'Time';

const TIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
};

const TIME_FORMATTER = new Intl.DateTimeFormat(undefined, TIME_FORMAT_OPTIONS);

export function formatEarthquakeTime(timeMs: number): string {
  return TIME_FORMATTER.format(new Date(timeMs));
}

function buildRow(label: string, value: string): HTMLParagraphElement {
  const p = document.createElement('p');
  const lbl = document.createElement('strong');
  lbl.textContent = label + ': ';
  const val = document.createElement('span');
  val.textContent = value;
  p.appendChild(lbl);
  p.appendChild(val);
  return p;
}

export function buildPopupContent({
  mag,
  place,
  time,
}: Pick<Earthquake, 'mag' | 'place' | 'time'>): HTMLElement {
  const container = document.createElement('div');
  const placeText = place && place.trim() ? place : LOCATION_UNKNOWN;
  const magText = mag === null ? MSG_MAGNITUDE_UNAVAILABLE : `${mag} — ${getMagnitudeClass(mag)}`;
  container.appendChild(buildRow(LABEL_PLACE, placeText));
  container.appendChild(buildRow(LABEL_MAGNITUDE, magText));
  container.appendChild(buildRow(LABEL_TIME, formatEarthquakeTime(time)));
  return container;
}
