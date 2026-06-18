# Analysis — Story 4: Cluster nearby earthquakes and inspect them in a side panel

## Domain concepts

### Native MapLibre clustering: two render states

MapLibre GL JS supports clustering natively on GeoJSON sources via the `cluster: true`
option. When enabled, the source emits **two mutually exclusive feature types** at any
given zoom level:

- **Cluster features** — synthetic features produced by the engine that aggregate
  individual points within a given radius. They carry `point_count` (integer),
  `point_count_abbreviated` (string), and `cluster_id` (integer) as properties. They do
  **not** carry `mag`, `place`, or `time`.
- **Leaf features** — individual earthquake features that are not subsumed by any cluster
  at the current zoom. They carry the same `{ mag, place, time }` properties that
  `toFeatureCollection` puts on them.

Which type a feature belongs to is determined by the current zoom level and by two source
parameters: `clusterRadius` (the pixel radius within which points are merged) and
`clusterMaxZoom` (the zoom level above which all features are treated as individual
leaves). `clusterRadius` should be calibrated to the aura overlap threshold — points
whose rendered auras visually overlap are the natural candidates for clustering — making
Story 2's `getAuraRadius` the reference for deriving it (OQ1). `clusterMaxZoom` sets the
ceiling above which all markers are individual; this is the mechanism behind the AC9
accepted residual case. Below `clusterMaxZoom`, the engine recomputes clusters on every
zoom change.

### How native clustering interacts with the existing two-layer setup

The current `setupLayer` (line 73, `MapView.tsx`) registers the `earthquakes` source
**without** `cluster: true`. The two circle layers — `earthquakes-halo` (aura, 0.5
opacity) and `earthquakes` (point, 0.8 opacity) — each read the `mag` property via paint
expressions (`buildColorExpr`, `buildAuraRadiusExpr`, `buildPointRadiusExpr`). These
expressions assume every rendered feature has a `mag` property. Cluster features carry no
`mag`, so the expressions evaluate the null branch (`['==', ['get', 'mag'], null]`) or
produce `NULL_COLOR`/`RADIUS_NULL` for every cluster feature — rendering cluster markers
as grey dots of fixed size, which is incorrect and indistinguishable from null-magnitude
earthquake markers.

Required layer structure (R2): a cluster circle layer + count symbol layer for cluster markers, and the existing `earthquakes-halo`/`earthquakes` layers each filtered to `['!', ['has', 'point_count']]` for leaf features. Layer ordering determines click precedence (OQ3).

### The cluster panel: a different lifecycle from the popup

The popup is a MapLibre `Popup` instance (imperative, stored in `popupRef.current`). The cluster panel is a React component displaying a card list — it lives in React state, not a MapLibre object. The two coexist in the component tree but have separate open/close mechanisms. Where the state variable lives is OQ8.

### Asynchronous leaf resolution

Identifying a cluster's members requires `GeoJSONSource.getClusterLeaves(clusterId, limit, offset, callback)`, which is **asynchronous**. This contrasts with Story 3's popup path (`queryRenderedFeatures` is synchronous, in the same call stack). The async gap creates the stale-result risk that R4 addresses. The call returns at most `limit` leaves; OQ4 covers the limit decision.

---

## Rules

**R1 — `cluster: true` on the source changes the feature types emitted.**
Enabling clustering on the `earthquakes` source causes it to emit cluster features with
`point_count` instead of individual features for points that fall within
`clusterRadius` of each other. The source's `setData` flow from `applyEarthquakes` and
the Story 1 fetch/filter architecture remain unchanged — `cluster: true` is a source
option, not a data option.

**R2 — Existing paint expressions must not run on cluster features.**
`buildColorExpr`, `buildAuraRadiusExpr`, and `buildPointRadiusExpr` all read
`['get', 'mag']`. Cluster features have no `mag`; the `null` branch of each expression
would fire, rendering them as `NULL_COLOR` grey dots. The `earthquakes-halo` and
`earthquakes` layers must each carry a `filter: ['!', ['has', 'point_count']]`
expression so they only render leaf features. Story 2's mag-based styling (AC3) is then
preserved automatically for those features.

**R3 — Leaf features from `getClusterLeaves` carry the same property shape as individual
features.**
`toFeatureCollection` (line 61, `MapView.tsx`) places `{ place, mag, time }` on every
feature it produces. `getClusterLeaves` returns the underlying GeoJSON features for a
cluster's members — they are the same records as the leaves that individual-marker
layers would have rendered. The `properties` type from MapLibre is
`{ [name: string]: any }`, so the same validation concern that `isEqProps` addresses in
the popup path applies equally to leaf features returned from `getClusterLeaves`.

**R4 — `getClusterLeaves` is asynchronous; the handler must guard against stale results.**
A rapid click on cluster A followed by cluster B — or by an individual marker — must
result in the panel showing cluster B's members, not A's, regardless of which async
response arrives first. This parallels the `requestId` guard in `useEarthquakeQuery`. A
generation counter incremented on each cluster click, and checked before applying an
async result, is required. The generation must also be invalidated when a new query
closes the panel, so a response in flight from before the query never reopens it.

**R5 — The click handler must distinguish three targets: cluster, individual, and empty.**
The current `handleClick` (lines 140–151) queries a single layer (`earthquakes-halo`)
and branches on whether any features were found. After Story 4, three targets are
possible:

- A cluster feature (on the cluster layer)
- A leaf/individual feature (on `earthquakes-halo`, filtered)
- Neither (empty map)

Each target requires different behavior (open panel / open popup / close popup without
closing panel). The handler must query both the cluster layer and `earthquakes-halo`,
determine which case applies, and route accordingly. The layer ordering in
`queryRenderedFeatures` determines what `features[0]` is when both a cluster and a
leaf overlap — the canvas must specify which case takes precedence.

**R6 — Clicking empty map must NOT close the panel (AC7).**
Today, the `else` branch of `handleClick` calls `closePopup(popupRef)`, which runs on
any click that produces no features. After Story 4, that branch must close only the
popup — it must not close the panel. The panel's only close triggers are its explicit
close control and replacement by a new cluster click. No click-outside listener and no
additional flag are introduced; dismissal is handled entirely within the existing single
click handler's branch structure. A parallel click mechanism would recreate the
dual-handler state bug Story 3 was designed to avoid.

**R7 — Cards must reuse `buildPopupContent` / `formatEarthquakeTime` read-only (AC5).**
Both functions are exported from `earthquakePopup.ts`. However, `LOCATION_UNKNOWN` is a
private `const` in that file (line 5) — not exported. A card that handles the
missing-place fallback in JSX cannot reach it without either exporting it or
reimplementing it; the latter violates AC5. The canvas resolves this (OQ7).

**R8 — Panel must close when a new query arrives (AC8).**
`MapView`'s third `useEffect` (lines 200–203) already closes the popup and calls
`applyEarthquakes` when `earthquakes` changes. The panel must be cleared in the same
effect so it never shows cluster data from the prior dataset. The implementation depends
on the panel state location (OQ8).

**R9 — Clicking a card triggers the Story 3 popup flow (AC6).**
The card click must call `easeTo` to recenter and open a popup via `buildPopupContent`
and `setDOMContent` — the same sequence as `openPopup` (lines 112–138). The card
therefore needs access to the `MapLibreMap` instance and `popupRef`. How that access is
threaded depends on the panel state location (OQ8).

---

## The click model: three targets, one handler

The current handler is registered as `map.on('click', (e) => handleClick(map, popupRef, e))`
(line 175). This single listener handles every click on the map. After Story 4, the same
listener must route to three outcomes.

**Current flow:**

```
click → queryRenderedFeatures(['earthquakes-halo'])
  features.length > 0 → openPopup(features[0])
  else              → closePopup()
```

**Required flow after Story 4:**

```
click → queryRenderedFeatures([<cluster layer>, 'earthquakes-halo'])
  cluster feature found at top → load leaves async → open panel (AC4)
  leaf feature found at top    → openPopup (as today) (AC3)
  neither                      → closePopup only — panel stays open (AC7)
```

**Async interlude.** Between the cluster click and the arrival of `getClusterLeaves`
results the UI is in a transitional state. Whether to show a loading indicator is OQ9.

---

## Panel lifecycle and state

**Open/close triggers for the panel (AC7, AC8):**

| Trigger                                     | Effect on panel                                       |
| ------------------------------------------- | ----------------------------------------------------- |
| Click on a cluster                          | Open panel with that cluster's leaves                 |
| Click a different cluster                   | Replace panel content (implicitly closes old panel)   |
| Click the panel's close control             | Close panel                                           |
| Click empty map                             | No effect on panel (AC7)                              |
| Click an individual earthquake              | No effect on panel (Story 3 popup opens; panel stays) |
| New query runs (`earthquakes` prop changes) | Close panel (AC8)                                     |

State location is OQ8; R8's implementation depends on the answer. The generation counter from R4, invalidated on both cluster click and new query, ensures a stale async result cannot reopen a closed panel.

---

## Reuse of Story 3 (AC5, AC6)

The following Story 3 building blocks are reused for the panel's card rendering:

| Export                      | Location             | Reuse in Story 4                                                |
| --------------------------- | -------------------- | --------------------------------------------------------------- |
| `buildPopupContent`         | `earthquakePopup.ts` | Returns an `HTMLElement`; can be called per card                |
| `formatEarthquakeTime`      | `earthquakePopup.ts` | Exported; callable in card JSX                                  |
| `getMagnitudeClass`         | `magnitudeStyle.ts`  | Exported; used inside `buildPopupContent`, reachable separately |
| `MSG_MAGNITUDE_UNAVAILABLE` | `errorMessages.ts`   | Exported; used inside `buildPopupContent`                       |

`LOCATION_UNKNOWN` is a private `const` in `earthquakePopup.ts` (line 5) — not exported; see R7 and OQ7. Leaf features from `getClusterLeaves` carry the same `{ [name: string]: any }` MapLibre typing as Story 3; `isEqProps` or equivalent must be applied (R3).

---

## Missing data in cluster members (AC5, AC9)

A cluster may contain members with null magnitude or an empty/missing place. The leaf
features retain the same `{ mag, place, time }` properties that `toFeatureCollection`
placed on them:

- `mag: null` → `buildPopupContent` (or the equivalent card logic) shows
  `MSG_MAGNITUDE_UNAVAILABLE`. `getMagnitudeClass(null)` returns `'null-data'` — this
  must not be shown as a visible string in a card any more than in a popup.
- `place: ''` or `place` absent → `buildPopupContent`'s fallback to `LOCATION_UNKNOWN`
  handles this. The leaf's `properties.place` is always a string (if `isEqProps` passes)
  but may be empty.
- `time` is always a number on a valid leaf (verified by `isEqProps` equivalent). The
  cluster itself does not carry a time; the panel lists member times individually.

---

## Risks and edge cases

**E1 — Cluster with more members than the requested leaf limit.**
`getClusterLeaves(id, limit, 0, cb)` returns at most `limit` leaves. If a dense cluster
has 200 members and the limit is 50, the panel shows only 50 cards. AC4 says "every
earthquake that belongs to that cluster," which is in tension with a finite limit.
How many leaves to request, and what to show if the cluster exceeds that count, is OQ4.

**E2 — Co-located earthquakes above `clusterMaxZoom` (accepted per AC9).**
Above `clusterMaxZoom`, the source emits only leaf features. Earthquakes at nearly
identical coordinates render as overlapping markers — the Story 3 limitation resurfaces.
AC9 explicitly accepts this residual case.

**E3 — Cluster of exactly 2 at the split boundary.**
At the exact zoom where a cluster of 2 dissolves, the user sees two leaf features, not a
cluster. Clicking either opens the Story 3 popup. This is the expected behavior.

**E4 — Card click when a popup is already open.**
If a popup is open from a prior individual-marker click, a card click must atomically
replace it. The `popupRef.current.remove()` guard in `openPopup` already handles this —
no new logic is needed, provided the card click code path runs through `openPopup`
rather than a separate implementation (AC6, R9).

---

## What this story does NOT touch

- **Filtering and fetching (Story 1):** clustering is a rendering concern — it operates on already-fetched data via `setData`. `useEarthquakeQuery`, `withRetry`, `requestId` guard, and `errorMessages.ts` are unchanged.
- **Magnitude palette (Story 2):** `CLASS_COLORS`, `NULL_COLOR`, and paint expressions are unchanged for individual markers. Cluster marker appearance is a new Canvas decision that does not touch Story 2 constants.
- **Story 3 popup for individual markers:** `openPopup`, `closePopup`, `buildPopupContent`, and `isEqProps` are reused without modification.
- Responsive layout, dark mode, and `renderWorldCopies` are out of scope per the story.

---

## Open questions for the canvas

None of these has been answered here; all must be resolved by the canvas before implementation:

1. **`clusterRadius` value.** Derive from aura overlap: `getAuraRadius` (Story 2) is the reference. Also decide `clusterMaxZoom`.
2. **Cluster marker appearance.** Color, size, `point_count` font/position — must be visually distinct from individual markers and from null-magnitude grey.
3. **Layer ordering.** Which layers are added in what order, and how `queryRenderedFeatures` call order reflects it.
4. **`getClusterLeaves` limit.** How many to request; what to show if a cluster exceeds that count (E1).
5. **Panel position and width.** Fixed pixel width and screen side (left/right) are unspecified.
6. **Card click animation.** Whether `easeTo` (Story 3 default) or a different centering animation is used.
7. **`LOCATION_UNKNOWN` access.** Export it from `earthquakePopup.ts`, use `buildPopupContent`'s DOM output in a `ref`, or another approach that satisfies AC5.
8. **Panel state location.** `MapView` (co-located with click handler + `popupRef`) or lifted to `App`. Determines AC8 implementation and how card clicks reach the map instance.
9. **Loading indicator during async leaf resolution.** Whether to show one between cluster click and `getClusterLeaves` response.

---

## Acceptance criteria traceability

| AC  | Covered by                                                                                         |
| --- | -------------------------------------------------------------------------------------------------- |
| AC1 | Domain concepts (native clustering), R1 (`cluster: true` on source)                                |
| AC2 | Domain concepts (clusterMaxZoom dissolves clusters on zoom-in), R1                                 |
| AC3 | R2 (filter existing layers to leaf features), R1 (paint expressions unchanged for leaves)          |
| AC4 | Click model (cluster target → open panel), R4 (async guard), R5 (leaf properties), OQ 4            |
| AC5 | R7 (reuse read-only), Reuse section (exported functions, LOCATION_UNKNOWN gap), OQ 7               |
| AC6 | R9 (card click → Story 3 popup flow), E4 (popup replacement), OQ6                                  |
| AC7 | R6 (empty-map click does not close panel), Click model section                                     |
| AC8 | R8 (close panel on new query), Panel lifecycle (stale panel risk)                                  |
| AC9 | Domain concepts (cluster absorbs co-located markers), E2 (residual above clusterMaxZoom, accepted) |
