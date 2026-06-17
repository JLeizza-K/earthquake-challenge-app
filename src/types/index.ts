// Domain
export interface Earthquake {
  place: string;
  mag: number | null;
  time: number;
  coordinates: [number, number, number];
}

// Filter / validation
export interface FilterInput {
  starttime: string;
  endtime: string;
  minMagnitude: string;
}

export interface FilterCriteria {
  starttime: string;
  endtime: string;
  minMagnitude: number;
}

export type FilterErrors = Partial<Record<keyof FilterInput, string>>;

export interface ValidationResult {
  valid: boolean;
  errors: FilterErrors;
}

// Magnitude
export type NonNullMagnitudeClass =
  | 'micro'
  | 'minor'
  | 'light'
  | 'moderate'
  | 'strong'
  | 'major'
  | 'great';

export type MagnitudeClass = NonNullMagnitudeClass | 'null-data';

// Fetch status
export type FetchStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error';

// API errors
export interface TooManyResultsError {
  code: 'TOO_MANY_RESULTS';
}

export interface HttpError extends Error {
  status?: number;
  nonRetryable?: boolean;
}

// USGS GeoJSON input shapes (loosely typed — external API data)
export interface UsgsProperties {
  place?: string | null;
  mag?: number | null;
  time?: number | null;
}

export interface UsgsGeometry {
  type?: string;
  coordinates?: number[];
}

export interface UsgsFeature {
  geometry?: UsgsGeometry | null;
  properties?: UsgsProperties | null;
}

export interface UsgsFeatureCollection {
  type?: string;
  features?: UsgsFeature[];
}
