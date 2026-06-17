# Story 3: Show earthquake details in a popup

## Description

As a person exploring earthquake data, I want to click an earthquake on the map and
see its details, so that I can inspect a specific event without leaving the map.

## Scope

- In: click an earthquake (on the aura layer) to open a popup showing place, magnitude
  with its USGS class, and time in local time; safe rendering of API-sourced text;
  closing the popup (close control, clicking another quake, or clicking empty map).
- Out: responsive layout, clustering, and UX polish → later stories. No change to
  filtering, fetching, or marker styling from Stories 1–2.

## Acceptance Criteria

### AC1 — Open popup on click

Given earthquakes rendered on the map,
When the user clicks one (hit detected on the aura layer),
Then a popup opens at that earthquake's location showing place, magnitude, and time.

### AC2 — Human-readable local time

Given an earthquake with a time value,
When its popup is shown,
Then the time is shown in the user's local timezone and browser locale, formatted as
day + full month name + year + 24h time + no seconds (e.g. "16 June 2026, 14:30" in an
English locale, "16 junio 2026, 14:30" in a Spanish locale) — never a raw timestamp.

### AC3 — Magnitude with class

Given an earthquake with a known magnitude,
When its popup is shown,
Then the magnitude is shown with its USGS class (e.g. "5.4 — moderate"), reusing the
classification from Story 2.

### AC4 — Missing data fields

Given an earthquake with a null magnitude,
When its popup is shown,
Then it shows "Magnitude data unavailable" instead of a blank or misleading value.

Given an earthquake with a null or empty place,
When its popup is shown,
Then it shows "Location unknown" instead of blank.

The popup always opens; missing fields degrade gracefully and never prevent the popup
from rendering.

### AC5 — Safe rendering

Given place text sourced from the USGS API,

When the popup renders it,

Then the popup may use HTML structure for formatting, but API-sourced data is inserted

as text (via DOM textContent, never raw innerHTML/setHTML), so no markup in the data

can execute.

### AC6 — Close behavior

Given an open popup,
When the user closes it, clicks another earthquake, or clicks an empty area of the map,
Then it dismisses cleanly with no stale popups left on the map.

### AC7 — Center map on the selected earthquake

Given an earthquake rendered on the map,
When the user clicks it and its popup opens,
Then the map smoothly recenters on that earthquake's location (animated, not an
instant jump), so the popup opens within the viewport and is not clipped at the edge.
