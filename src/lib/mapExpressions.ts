import type { ExpressionSpecification } from 'maplibre-gl';
import {
  CLASS_COLORS,
  NULL_COLOR,
  RADIUS_NULL,
  RADIUS_ANCHORS,
  POINT_FACTOR,
} from './magnitudeStyle.js';

function buildColorExprFor(field: 'mag' | 'max_mag'): ExpressionSpecification {
  return [
    'case',
    ['==', ['get', field], null],
    NULL_COLOR,
    ['<', ['get', field], 3.0],
    CLASS_COLORS.micro,
    ['<', ['get', field], 4.0],
    CLASS_COLORS.minor,
    ['<', ['get', field], 5.0],
    CLASS_COLORS.light,
    ['<', ['get', field], 6.0],
    CLASS_COLORS.moderate,
    ['<', ['get', field], 7.0],
    CLASS_COLORS.strong,
    ['<', ['get', field], 8.0],
    CLASS_COLORS.major,
    CLASS_COLORS.great,
  ];
}

export function buildColorExpr(): ExpressionSpecification {
  return buildColorExprFor('mag');
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
  return buildColorExprFor('max_mag');
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
