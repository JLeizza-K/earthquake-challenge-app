# Story 4: Cluster nearby earthquakes and inspect them in a side panel

## Description

As a person exploring earthquake data, I want nearby earthquakes to group into clusters on
the map and to open a panel listing the earthquakes in a cluster I click, so that I can read
a dense area without it being an unreadable pile of overlapping markers, and inspect any
single event from there.

## Scope

- In: native MapLibre clustering of the earthquake source (group at low zoom, split on zoom
  in, show a count); clicking a cluster opens a side panel listing the earthquakes in that
  cluster; each list item is a card showing the same fields as the popup (place, magnitude +
  class, local time); clicking a card closes the panel, recenters the map on that earthquake,
  and opens its popup (reusing Story 3); closing the panel.
- Out: responsive layout of the panel (fixed width and position only — no breakpoints, no
  mobile full-screen, no "1/5 grid"); dark mode / theming / visual polish; renderWorldCopies
  and the low-zoom world-copies bug (deferred to UX story); any change to filtering/fetching
  (Story 1) or the magnitude palette (Story 2). The Story 3 popup behavior is reused, not
  modified.

## Acceptance Criteria

### AC1 — Earthquakes cluster at low zoom

Given earthquakes rendered on the map,
When several are close together at the current zoom,
Then they are grouped into a single cluster marker showing the count of earthquakes it
contains, instead of overlapping individual markers.

### AC2 — Clusters split on zoom in

Given a cluster marker,
When the user zooms in far enough that its members are no longer close together,
Then the cluster breaks apart into smaller clusters and/or individual earthquake markers.

### AC3 — Individual markers keep Story 2 styling

Given an earthquake that is not part of any cluster at the current zoom,
When it is rendered,
Then it appears with the same magnitude-based size, class color, and aura as Story 2 (this
story does not change individual-marker styling).

### AC4 — Clicking a cluster opens the side panel

Given a cluster marker,
When the user clicks it,
Then a panel opens listing every earthquake that belongs to that cluster, each as a card
showing place, magnitude with its USGS class, and local time (the same fields and formatting
as the Story 3 popup).

### AC5 — Cards reuse the popup's data rules

Given the cards listed in the panel,
When a card has a null magnitude or a missing place,
Then it degrades exactly as the popup does ("Magnitude data unavailable" / "Location
unknown"), and times are shown locale-aware — reusing the Story 3 formatting and fallbacks,
not a separate implementation.

### AC6 — Clicking a card inspects that earthquake

Given the panel open with a list of cards,
When the user clicks one card,
Then the panel closes, the map recenters on that earthquake's location, and its popup opens
(reusing the Story 3 popup + recenter behavior).

### AC7 — Close the panel

Given an open cluster panel,
When the user closes it via the close control, or opens a different cluster (which replaces
it),
Then the panel dismisses cleanly with no stale panel left on screen. (Clicking empty map does
NOT close the panel.)

### AC8 — Panel reflects the current data

Given an open cluster panel,
When a new query runs and the dataset changes,
Then the panel closes, so it never shows a cluster built from stale data (mirroring the
popup's close-on-new-query behavior from Story 3).

### AC9 — Overlapping earthquakes are readable via clustering + panel

Given two or more earthquakes at nearly identical coordinates (which individual markers would
render as overlapping auras),
When they are clustered at the current zoom,
Then they appear as one cluster, and clicking it lists each of them as a separate card in the
panel — so the user can read and select each one even though their markers overlap. (This
absorbs the Story 3 overlapping-aura limitation. The residual case — earthquakes still
co-located above the cluster max-zoom — is an accepted edge case.)
