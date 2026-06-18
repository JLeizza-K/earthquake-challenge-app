// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import ClusterPanel from './ClusterPanel.js';
import { LOCATION_UNKNOWN, formatEarthquakeTime } from '../lib/earthquakePopup.js';
import { getMagnitudeClass } from '../lib/magnitudeStyle.js';
import { MSG_MAGNITUDE_UNAVAILABLE } from '../lib/errorMessages.js';
import type { Earthquake } from '../types/index.js';

const FIXED_TS = 1700000000000;

function makeEq(overrides: Partial<Earthquake> = {}): Earthquake {
  return {
    place: 'Test Place',
    mag: 5.0,
    time: FIXED_TS,
    coordinates: [10, 20, 5],
    ...overrides,
  };
}

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

function render(
  leaves: Earthquake[] | null,
  onClose: () => void = vi.fn(),
  onCardClick: (eq: Earthquake) => void = vi.fn(),
) {
  act(() => {
    root.render(<ClusterPanel leaves={leaves} onClose={onClose} onCardClick={onCardClick} />);
  });
}

describe('ClusterPanel — leaf rendering', () => {
  it('renders nothing when leaves is null', () => {
    render(null);
    expect(container.firstElementChild).toBeNull();
  });

  it('renders a card for each leaf', () => {
    render([makeEq(), makeEq({ place: 'Somewhere else' })]);
    const cards = container.querySelectorAll('button:not([aria-label="Close panel"])');
    expect(cards.length).toBe(2);
  });
});

describe('ClusterPanel — AC5 card fallbacks', () => {
  it('shows LOCATION_UNKNOWN when place is empty', () => {
    render([makeEq({ place: '' })]);
    expect(container.textContent).toContain(LOCATION_UNKNOWN);
  });

  it('shows LOCATION_UNKNOWN when place is whitespace only', () => {
    render([makeEq({ place: '   ' })]);
    expect(container.textContent).toContain(LOCATION_UNKNOWN);
  });

  it('shows MSG_MAGNITUDE_UNAVAILABLE when mag is null', () => {
    render([makeEq({ mag: null })]);
    expect(container.textContent).toContain(MSG_MAGNITUDE_UNAVAILABLE);
  });

  it('shows magnitude and class when mag is non-null', () => {
    render([makeEq({ mag: 4.5 })]);
    expect(container.textContent).toContain('4.5');
    expect(container.textContent).toContain(getMagnitudeClass(4.5));
  });

  it('renders time via formatEarthquakeTime', () => {
    render([makeEq({ time: FIXED_TS })]);
    expect(container.textContent).toContain(formatEarthquakeTime(FIXED_TS));
  });
});

describe('ClusterPanel — XSS safety', () => {
  it('does not parse markup in place as DOM elements', () => {
    render([makeEq({ place: '<script>alert(1)</script>' })]);
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('<script>alert(1)</script>');
  });
});

describe('ClusterPanel — click handlers', () => {
  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render([makeEq()], onClose);
    const btn = container.querySelector('button[aria-label="Close panel"]');
    act(() => {
      btn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onCardClick with the correct earthquake when a card is clicked', () => {
    const onCardClick: (eq: Earthquake) => void = vi.fn();
    const eq = makeEq({ place: 'Specific Place' });
    render([eq], vi.fn(), onCardClick);
    const cards = container.querySelectorAll('button:not([aria-label="Close panel"])');
    act(() => {
      cards[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onCardClick).toHaveBeenCalledWith(eq);
  });
});
