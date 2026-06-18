import type { Earthquake } from '../types/index.js';
import { LOCATION_UNKNOWN, formatEarthquakeTime } from '../lib/earthquakePopup.js';
import { getMagnitudeClass } from '../lib/magnitudeStyle.js';
import { MSG_MAGNITUDE_UNAVAILABLE } from '../lib/errorMessages.js';

interface ClusterCardProps {
  eq: Earthquake;
  onCardClick: (eq: Earthquake) => void;
}

function ClusterCard({ eq, onCardClick }: ClusterCardProps) {
  const place = eq.place && eq.place.trim() ? eq.place : LOCATION_UNKNOWN;
  const magText =
    eq.mag === null ? MSG_MAGNITUDE_UNAVAILABLE : `${eq.mag} — ${getMagnitudeClass(eq.mag)}`;
  return (
    <button
      type="button"
      onClick={() => onCardClick(eq)}
      className="w-full text-left p-3 border-b border-gray-200 hover:bg-gray-50"
    >
      <p className="font-semibold text-sm truncate">{place}</p>
      <p className="text-sm text-gray-600">{magText}</p>
      <p className="text-xs text-gray-400">{formatEarthquakeTime(eq.time)}</p>
    </button>
  );
}

interface ClusterPanelProps {
  leaves: Earthquake[] | null;
  onClose: () => void;
  onCardClick: (eq: Earthquake) => void;
}

export default function ClusterPanel({ leaves, onClose, onCardClick }: ClusterPanelProps) {
  if (leaves === null) return null;
  return (
    <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-lg flex flex-col z-10">
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <span className="font-semibold text-sm">{leaves.length} earthquakes</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      <div className="overflow-y-auto flex-1">
        {leaves.map((eq, i) => (
          <ClusterCard key={i} eq={eq} onCardClick={onCardClick} />
        ))}
      </div>
    </div>
  );
}
