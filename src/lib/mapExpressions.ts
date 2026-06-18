import type { ExpressionSpecification } from 'maplibre-gl';
import {
  CLASS_COLORS,
  NULL_COLOR,
  RADIUS_NULL,
  RADIUS_ANCHORS,
  POINT_FACTOR,
} from './magnitudeStyle.js';

export function buildColorExpr(): ExpressionSpecification {
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

export function buildCurveExpr(): ExpressionSpecification {
  return ['interpolate', ['linear'], ['get', 'mag'], ...RADIUS_ANCHORS];
}

export function buildAuraRadiusExpr(): ExpressionSpecification {
  return ['case', ['==', ['get', 'mag'], null], 0, buildCurveExpr()];
}

export function buildPointRadiusExpr(): ExpressionSpecification {
  return ['case', ['==', ['get', 'mag'], null], RADIUS_NULL, ['*', buildCurveExpr(), POINT_FACTOR]];
}

export function buildClusterColorExpr(): ExpressionSpecification {
  return [
    'case',
    ['==', ['get', 'max_mag'], null],
    NULL_COLOR,
    ['<', ['get', 'max_mag'], 3.0],
    CLASS_COLORS.micro,
    ['<', ['get', 'max_mag'], 4.0],
    CLASS_COLORS.minor,
    ['<', ['get', 'max_mag'], 5.0],
    CLASS_COLORS.light,
    ['<', ['get', 'max_mag'], 6.0],
    CLASS_COLORS.moderate,
    ['<', ['get', 'max_mag'], 7.0],
    CLASS_COLORS.strong,
    ['<', ['get', 'max_mag'], 8.0],
    CLASS_COLORS.major,
    CLASS_COLORS.great,
  ];
}

export function buildClusterSizeExpr(): ExpressionSpecification {
  return ['step', ['get', 'point_count'], 22, 10, 32, 50, 44];
}

export function buildClusterProperties() {
  const reduce: ExpressionSpecification = [
    'case',
    ['==', ['accumulated'], null],
    ['get', 'max_mag'],
    ['==', ['get', 'max_mag'], null],
    ['accumulated'],
    ['max', ['accumulated'], ['get', 'max_mag']],
  ];
  return { max_mag: [reduce, ['get', 'mag']] };
}
