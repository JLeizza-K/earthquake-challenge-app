# Canvas — Story 4: Cluster nearby earthquakes and inspect them in a side panel

---

## R — Requirements

### What we deliver

- Native MapLibre clustering on the `earthquakes` source: nearby earthquakes group into a
  single cluster marker at low zoom and split into individuals on zoom in (AC1, AC2).
- Cluster markers colored by the maximum magnitude among their members, using the existing
  `CLASS_COLORS` palette from `magnitudeStyle.ts`. Size scales with `point_count` (AC1).
- A side panel (docked right, ~320 px wide, full map height) opened by clicking a cluster,
  listing up to 500 members as cards — same fields and fallbacks as the Story 3 popup (AC4, AC5).
- Card click: panel closes, map recenters with `map.easeTo`, Story 3 popup opens (AC6).
- Panel lifecycle: close control, a different cluster click (replaces), or new query (AC8).
  Clicking empty map does NOT close the panel (AC7).

### Out of scope (explicit)

- Responsive layout (panel is fixed position and width only — no breakpoints) → not in scope.
- Dark mode, theming, UX polish, `renderWorldCopies` → deferred.
- Any change to filtering/fetching (Story 1), the magnitude palette (Story 2), or the Story 3
  popup behavior for individual markers.

### Definition of done (AC mapping)

| AC  | Condition                                         | Pass when                                                                              | Verified by |
| --- | ------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------- |
| AC1 | Multiple nearby earthquakes at low zoom           | Render as one cluster marker showing their count                                       | Interaction |
| AC2 | Zoom in on a cluster                              | Dissolves above zoom 14 into smaller clusters and/or individuals                       | Interaction |
| AC3 | Individual earthquake at any zoom                 | Story 2 magnitude-based color, size, and aura — unchanged                              | Interaction |
| AC4 | Click a cluster                                   | Panel opens; each card shows place, magnitude+class, local time (≤500 accepted cap)    | Interaction |
| AC5 | Cluster member with null magnitude or empty place | Card shows "Magnitude data unavailable" / "Location unknown" — same fallbacks as popup | Unit test   |
| AC6 | Click a card                                      | Panel closes, map recenters, popup opens for that earthquake                           | Interaction |
| AC7 | Click empty map with panel open                   | Panel stays open; popup (if any) closes                                                | Interaction |
| AC8 | New query while panel is open                     | Panel closes; no stale cluster data shown                                              | Interaction |
| AC9 | Two earthquakes at nearly identical coordinates   | Absorbed by cluster; residual above zoom 14 is an accepted edge case                   | Interaction |

---

## E — Entities

### Cluster feature

Properties present on a cluster feature (when `cluster: true` is active):

| Property                  | Type           | Source                                                                                     |
| ------------------------- | -------------- | ------------------------------------------------------------------------------------------ |
| `point_count`             | integer        | Engine-generated                                                                           |
| `point_count_abbreviated` | string         | Engine-generated                                                                           |
| `cluster_id`              | integer        | Engine-generated                                                                           |
| `max_mag`                 | number \| null | `clusterProperties` accumulator: max over numeric-mag members only (null members excluded) |

`max_mag` is null only when EVERY member has null magnitude — a mixed cluster colors by the
max of its numeric-mag members; null-mag members are excluded from the accumulation. Null-mag
member exclusion is accepted and expected; it prevents a rare null-mag event from poisoning a
cluster's color. No leaf properties (`place`, `time`) appear on the cluster feature.

### Leaf feature (from `getClusterLeaves`)

Same shape as individual features from `toFeatureCollection`: `{ place, mag, time }` on
`properties`, `[lng, lat, depth]` on `geometry.coordinates`. The `isEqProps` guard from
Story 3 applies to each leaf's properties before use. Leaves are mapped to the `Earthquake`
type (from `src/types/index.ts`) by combining validated properties with the feature's
geometry coordinates.

### Panel state (lives in `MapView`)

```
panelLeaves: Earthquake[] | null   // null = closed; non-null array = open
generationRef: useRef<number>       // incremented on each cluster click and on query change
```

`generationRef` is not React state — it does not trigger re-renders. It is checked inside
the `.then()` handler before calling `setPanelLeaves`.

---

## A — Approach

### Layer architecture (OQ3)

`clusterRadius: 50`, `clusterMaxZoom: 14` added to the `earthquakes` source, along with
`cluster: true` and `clusterProperties`. The 50-pixel cluster radius is derived from aura
overlap: two mid-catalog earthquakes (mag ≈ 4–5, `getAuraRadius` gives 16–24 px) have
overlapping auras when their centers are within ~32–48 px; 50 px captures this with a small
buffer. `clusterMaxZoom: 14` lets individual markers appear at city-district zoom and above.

Layer order, bottom to top:

| Layer              | Type   | Filter                          | What it encodes              |
| ------------------ | ------ | ------------------------------- | ---------------------------- |
| `earthquakes-halo` | circle | `['!', ['has', 'point_count']]` | Story 2 aura (leaves only)   |
| `earthquakes`      | circle | `['!', ['has', 'point_count']]` | Story 2 point (leaves only)  |
| `cluster-circle`   | circle | `['has', 'point_count']`        | Cluster fill (max-mag color) |
| `cluster-count`    | symbol | `['has', 'point_count']`        | `point_count` label          |

The two Story 2 layers gain `filter: ['!', ['has', 'point_count']]`. Their paint expressions
are unchanged — AC3 is preserved automatically. Cluster layers sit on top, so `features[0]`
in `queryRenderedFeatures` is a cluster feature when the click lands on one.

### Cluster color by max magnitude (OQ2)

`clusterProperties` declares `max_mag` via a null-guarded accumulator: members with a numeric
`mag` are included in the max; null-magnitude members are excluded entirely. `max_mag` is
therefore null only when every member has null mag.

`buildClusterColorExpr()` in `MapView.tsx` maps `['get', 'max_mag']` to `CLASS_COLORS` reusing
`getMagnitudeClass` read-only — the same approach as `buildColorExpr` for individual markers,
applied to the aggregated `max_mag` instead of `mag`. The null-first branch fires only for
all-null clusters (→ `NULL_COLOR`). Cluster size: a step expression on `['get', 'point_count']`
produces distinct radii for small, medium, and large clusters. No new palette is introduced.

### Three-target click model (R5, R6)

`handleClick` queries both cluster and leaf layers:

```
queryRenderedFeatures([<cluster-circle>, <earthquakes-halo>])
  features[0] has point_count  →  load leaves async → open panel
  features[0] no point_count   →  openPopup (Story 3, unchanged)
  empty array                  →  closePopup only — panelLeaves unchanged
```

Discrimination uses `has('point_count')` on `features[0].properties`, not layer ID.
Single handler; no click-outside listener; no additional flag.

### Async leaves flow and generation guard (R4, OQ4)

On a cluster click the handler increments `generationRef.current` and captures the current
value. `source.getClusterLeaves(clusterId, 500, 0)` returns a Promise; the generation guard
is checked inside the `.then()`: if `generationRef.current !== capturedGen`, the response is discarded. Otherwise leaves are
validated with `isEqProps`, mapped to `Earthquake[]`, and `setPanelLeaves(leaves)` opens
the panel.

`generationRef.current` is also incremented in the `useEffect` that fires on `earthquakes`
prop changes, so an in-flight response from a prior dataset never reopens a panel closed by
AC8.

**Accepted limitation (OQ4):** clusters with >500 members show only the first 500 cards.
Documented explicitly — analogous to AC9's residual case. The 50-px aura-derived radius
makes >500-member clusters extremely unlikely within normal filter bounds.

### Panel lifecycle and state (OQ8)

`panelLeaves` lives in `MapView`, co-located with `popupRef` and `handleClick`. `MapView`
renders the map `<div>` and `<ClusterPanel>` side by side; the enclosing element is
`position: relative` and the panel is `position: absolute; right: 0` at full height.

| Trigger                          | `panelLeaves` after | Popup after      |
| -------------------------------- | ------------------- | ---------------- |
| Cluster click                    | new leaves array    | closes           |
| Different cluster click          | new leaves array    | closes           |
| Close control                    | null                | unchanged        |
| Card click                       | null                | opens (AC6)      |
| Empty map click                  | unchanged           | closes           |
| Individual earthquake click      | unchanged           | opens (Story 3)  |
| New query (`earthquakes` change) | null                | closes (Story 3) |

### Card click → popup reuse (OQ6, OQ7)

`LOCATION_UNKNOWN` is exported from `earthquakePopup.ts` (line 5: `const` → `export const`).
Cards in `ClusterPanel.tsx` are built in JSX and import `LOCATION_UNKNOWN`, `formatEarthquakeTime`,
`getMagnitudeClass`, and `MSG_MAGNITUDE_UNAVAILABLE` directly. No fallback logic is
re-implemented — AC5's "not a separate implementation" constraint is satisfied.

Card click calls the `onCardClick` prop with the `Earthquake`. The handler in `MapView` sets
`panelLeaves` to null, then calls `map.easeTo` and opens the popup via `buildPopupContent` —
the same sequence as `openPopup`, using `map.easeTo` (not `flyTo`).

---

## S — Structure

### Files that change

**`src/components/MapView.tsx`** — already at 206 lines before Story 4. The additions
(cluster source options, `buildClusterColorExpr`, updated `handleClick`, `generationRef`,
`panelLeaves` state, `useEffect` update, panel render) will exceed 200 lines. Extracting
`ClusterPanel.tsx` is mandatory. Changes to `MapView.tsx`:

- `setupLayer`: `cluster: true`, `clusterRadius: 50`, `clusterMaxZoom: 14`, `clusterProperties`
  on source; `filter` added to both existing layers; `cluster-circle` and `cluster-count` layers added.
- `buildClusterColorExpr()`: new helper reading `['get', 'max_mag']`.
- `handleClick`: queries `['cluster-circle', 'earthquakes-halo']`; branches on `point_count`.
- `generationRef = useRef<number>(0)` added.
- `const [panelLeaves, setPanelLeaves] = useState<Earthquake[] | null>(null)`.
- `useEffect` on `earthquakes`: gains `generationRef.current++` and `setPanelLeaves(null)`.
- Render: `<ClusterPanel>` alongside the map div.

**New `src/components/ClusterPanel.tsx`** — exports `ClusterPanel`. Props:
`leaves: Earthquake[] | null`, `onClose: () => void`, `onCardClick: (eq: Earthquake) => void`.
Returns null when `leaves` is null. Each card renders place (with `LOCATION_UNKNOWN` fallback),
magnitude+class (with `MSG_MAGNITUDE_UNAVAILABLE` fallback), and time via `formatEarthquakeTime`.

**`src/lib/earthquakePopup.ts`** — line 5: `const LOCATION_UNKNOWN` → `export const LOCATION_UNKNOWN`. No other changes.

### Files that do NOT change

`src/lib/magnitudeStyle.ts` (read-only: `CLASS_COLORS`, `NULL_COLOR`, `getAuraRadius` as the
radius-calibration reference, and `getMagnitudeClass` reused for cluster color — not modified),
`src/lib/errorMessages.ts`, `src/lib/api.ts`, `src/lib/mappers.ts`,
`src/lib/validation.ts`, `src/hooks/useEarthquakeQuery.ts`, `src/components/FilterPanel.tsx`,
`src/components/FilterForm.tsx`, `src/components/StatusBanner.tsx`, `src/App.tsx`, all config files.

---

## O — Operations

### Cluster color mapping (max_mag → CLASS_COLORS)

| `max_mag`               | Color     | Constant                |
| ----------------------- | --------- | ----------------------- |
| null (all members null) | `#9E9E9E` | `NULL_COLOR`            |
| < 3.0                   | `#FED976` | `CLASS_COLORS.micro`    |
| 3.0–3.9                 | `#FEB24C` | `CLASS_COLORS.minor`    |
| 4.0–4.9                 | `#FD8D3C` | `CLASS_COLORS.light`    |
| 5.0–5.9                 | `#FC4E2A` | `CLASS_COLORS.moderate` |
| 6.0–6.9                 | `#E31A1C` | `CLASS_COLORS.strong`   |
| 7.0–7.9                 | `#BD0026` | `CLASS_COLORS.major`    |
| ≥ 8.0                   | `#800026` | `CLASS_COLORS.great`    |

Same class boundaries as `getMagnitudeClass`. The null row fires only when every cluster
member has null magnitude; a mixed cluster uses the max of its numeric members.
The cluster never uses a color outside `CLASS_COLORS` or `NULL_COLOR`.

---

## N — Norms

### ESLint hard rules

- Max 25 lines/function, max 5 parameters, complexity ≤ 10, max 200 lines/file.
- `MapView.tsx` at 206 lines before Story 4. Extracting `ClusterPanel.tsx` is mandatory.
  Keep `buildClusterColorExpr`, the generation-guard logic, and leaf-mapping in dedicated
  helpers to stay within the per-function line limit.
- `ClusterPanel.tsx` is new; keep it under 200 lines. A `ClusterCard` sub-component can be
  extracted within the same file if needed.

### Testing (this story)

Pure logic is unit-tested; map wiring and panel interaction are verified manually — consistent
with Stories 2 and 3.

**Unit tests (Vitest):**

- Cluster color mapping needs **no new unit test** — `getMagnitudeClass` is already fully
  covered by `magnitudeStyle.test.ts` (Story 2). `buildClusterColorExpr()` feeds `max_mag`
  into it; the expression wiring is verified by interaction.
- **AC5 — card fallbacks** — a card given `null` magnitude renders `MSG_MAGNITUDE_UNAVAILABLE`;
  empty place renders `LOCATION_UNKNOWN`; time renders via `formatEarthquakeTime`.
  Test environment: `happy-dom` (same pragma as `earthquakePopup.test.ts`).

**Interaction-verified (not automated):** AC1, AC2, AC3, AC4, AC6, AC7, AC8, AC9.

---

## S — Safeguards

These are non-negotiable. No implementation may bypass them.

1. **Story 2 individual-marker styling is unchanged (AC3).** The `earthquakes-halo` and
   `earthquakes` layers gain only a `filter` expression. Their paint expressions, `CLASS_COLORS`,
   `NULL_COLOR`, and all `magnitudeStyle.ts` exports are untouched; `getMagnitudeClass` is
   reused read-only for the cluster color expression — not extended or modified.

2. **Panel never shows stale data (AC8).** `setPanelLeaves(null)` is called in the
   `useEffect` on `earthquakes` changes, before `applyEarthquakes`. The generation counter is
   also incremented there, so an in-flight `getClusterLeaves` response from the prior dataset
   is discarded.

3. **Generation guard is always checked before applying async results.** The captured value at
   call time is compared to `generationRef.current` inside the `.then()` handler. A stale response never
   calls `setPanelLeaves`.

4. **No click-outside mechanism.** Panel dismissal happens only via the close control, a new
   cluster click, or a new query — all within the existing single `handleClick` branch
   structure. No additional event listener is added; no new flag is introduced.

5. **Cluster color reuses `CLASS_COLORS` exclusively.** No new palette; no hardcoded hex in
   the cluster layer paint. `NULL_COLOR` is the only fallback for an all-null-mag cluster.

6. **Leaf properties validated before use.** `isEqProps` is applied to each leaf from
   `getClusterLeaves` before constructing the `Earthquake[]` array. A leaf that fails
   validation is excluded from the panel.

7. **>500-member cluster is an accepted capped case.** No pagination, no count indicator.
   Documented as a known limitation analogous to AC9. The aura-derived 50-px cluster radius
   makes this extremely unlikely in practice.
