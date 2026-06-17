# Story 2: Reflect magnitude visually on the map

## Description

As a person exploring earthquake data, I want each earthquake's magnitude reflected
visually on the map — through size and color — so that I can gauge the severity and
distribution of events at a glance.

## Scope

- In: marker size by magnitude; marker color by USGS magnitude class; translucent
  halo/aura effect; visual treatment for events with no magnitude.
- Out: popup / detail view on click → Story 3; responsive layout → Story 3;
  caching → bonus.

## Magnitude → color scale (USGS classes)

| Magnitude | Class    |
| --------- | -------- |
| < 3.0     | micro    |
| 3.0–3.9   | minor    |
| 4.0–4.9   | light    |
| 5.0–5.9   | moderate |
| 6.0–6.9   | strong   |
| 7.0–7.9   | major    |
| ≥ 8.0     | great    |

Discrete warm palette — one color per class — mapping magnitude to color:
yellow (lower magnitude) → red (higher magnitude), for contrast against the
blue/green basemap. Exact hex values defined in the Canvas.

## Acceptance Criteria

### AC1 — Size reflects magnitude

Given earthquakes with varying magnitudes,
When they are rendered on the map,
Then the marker radius increases with magnitude following a consistent, readable
mapping — a higher-magnitude quake is clearly larger than a lower one, without being
disproportionately huge. (Exact curve and min/max radius defined in the Canvas.)

### AC2 — Color reflects magnitude class

Given earthquakes across different USGS magnitude classes,
When they are rendered,
Then each is colored by its class using the discrete warm palette (yellow → red),
with colors chosen to contrast against the blue/green basemap for legibility.
(Visual/UI criterion — verified by eye, not automated.)

### AC3 — Halo / aura effect

Given an earthquake rendered on the map,
When it is displayed,
Then it appears as a point at its exact location surrounded by a translucent aura of
the same color (~50% opacity), so that nearby points remain visible.
(Achieved through MapLibre circle styling — exact technique chosen in the Canvas.)

### AC4 — Earthquake with no magnitude

Given an earthquake whose magnitude is null,
When it is rendered,
Then it uses a neutral grey style outside the warm scale, at a small fixed size and
without a halo, so it reads as "no data" rather than a low-magnitude event.
