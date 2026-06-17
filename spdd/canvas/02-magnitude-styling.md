# Canvas — Story 2: Reflect magnitude visually on the map

---

## R — Requirements

### What we deliver

- Marker radius driven by the `mag` property of each GeoJSON feature, following a
  calibrated concave curve (anchors defined in Operations).
- Marker color driven by the USGS magnitude class, using a discrete seven-color warm
  palette (values defined in Operations).
- A translucent aura of the same color at ~50% opacity surrounding each point.
- A distinct "no data" rendering for null-magnitude events: neutral grey, small fixed
  size, no aura.

### Out of scope (explicit)

- Popup / detail view on click → Story 3.
- Responsive layout → Story 3.
- Legend UI (color/size key alongside the map) → not in scope for this story.
- Filter field changes → Story 1 fields unchanged.
- Caching → bonus.
- Clustering → future story.

### Definition of done (AC mapping)

| AC  | Condition                             | Pass when                                                                   |
| --- | ------------------------------------- | --------------------------------------------------------------------------- |
| AC1 | Earthquakes with varying magnitudes   | Larger mag → larger circle; difference readable at a glance at typical zoom |
| AC2 | Earthquakes across magnitude classes  | Each class maps to exactly one warm color (yellow → red); verified by eye   |
| AC3 | Any earthquake with a known magnitude | Surrounded by a translucent aura of the same color (~50% opacity)           |
| AC4 | Earthquake with null magnitude        | Rendered grey, small fixed size, no aura                                    |

---

## E — Entities

### Earthquake (unchanged from Story 1)

```
Earthquake {
  place:       string
  mag:         number | null   // null is valid, already kept by toEarthquakes
  time:        number          // Unix ms
  coordinates: [number, number, number]
}
```

`MapView` receives `earthquakes: Earthquake[]` as a prop (unchanged). Each feature in
the GeoJSON `FeatureCollection` already carries `properties.mag` — including null values
— because `toFeatureCollection` stores `mag: eq.mag` verbatim.

### Magnitude classes (7 classes)

All events below 3.0 are grouped under "micro." This differs slightly from the USGS
micro cutoff (~2.0) but covers the full 0–10 filter range without orphan classes.
Boundary values belong to the upper class (≥ comparison).

| Class    | Magnitude range | Boundary rule               |
| -------- | --------------- | --------------------------- |
| micro    | < 3.0           | default / below-minor catch |
| minor    | 3.0 – 3.9       | ≥ 3.0                       |
| light    | 4.0 – 4.9       | ≥ 4.0                       |
| moderate | 5.0 – 5.9       | ≥ 5.0                       |
| strong   | 6.0 – 6.9       | ≥ 6.0                       |
| major    | 7.0 – 7.9       | ≥ 7.0                       |
| great    | ≥ 8.0           | ≥ 8.0                       |

### Null-magnitude as a distinct visual state

`null` is not a class. It is a separate rendering branch that resolves before any class
logic. A null-magnitude event receives its own fixed color, fixed radius, and no aura
(halo layer radius 0 — physically absent). It never receives a class color or class radius.

---

## A — Approach

### Builds on the Story 1 circle layer

Story 1 established a `geojson` source and a `circle` layer with uniform paint
constants (`circle-radius: 5`, `circle-color: '#e74c3c'`, `circle-opacity: 0.8`). Story
2 replaces those constants with data-driven expressions driven by `properties.mag`.
Everything else in the Story 1 architecture — source ID, layer ID, `setData` flow,
`requestId` guard, count-first pattern, and `toEarthquakes` mapper — is untouched.

### Size: the aura carries the magnitude encoding

The aura (halo layer) radius is a continuous function of the raw magnitude number — not
energy, which would produce extreme ratios. A concave curve adds more resolution in the
3–6 band where most catalog events fall, and avoids extreme sizes at the top of the
scale. The result is that the viewer reads magnitude through the aura's size, not the
solid point's.

The solid point (main layer) is a small epicenter locator fixed at 20% of the aura
radius. It does not independently encode magnitude — it marks the precise location while
the aura communicates severity.

Out-of-range values are clamped: negative magnitudes get the minimum aura radius, and
magnitudes above 10 get the maximum.

**Tradeoff accepted:** color is step-function (discrete per class) while aura radius is
continuous (piecewise interpolation). This slight inconsistency is the correct trade-off
— radius encodes a continuous quantity while color encodes a categorical one. A step
radius would discard within-class information unnecessarily.

### Color: discrete step function by class

Each class maps to exactly one color regardless of where within the class the magnitude
falls. A gradient would falsely imply that 3.9 and 4.0 are visually similar; a step
function reflects the categorical nature of the classification.

The palette varies lightness and saturation across classes (not hue shift alone), so
differences remain readable for users with red-green color vision deficiencies.

### Aura: second circle layer below the main layer

Two layers share the same `geojson` source:

- **`earthquakes-halo` (below):** the large, translucent, same-color circle. Its radius
  follows the magnitude curve — this is what communicates severity. Opacity ~0.5.
- **`earthquakes` (above):** a small solid locator dot at 20% of the halo radius. It
  marks the epicenter without competing with the aura for size attention. Opacity 0.8.

For null-magnitude events the halo radius is 0 (physically absent). The solid point is a
fixed 4 px grey dot — it does not apply the aura × 0.2 formula. This is a deliberate
design decision: null events explicitly bypass the proportional formula and use a fixed
size so they remain visible on the map as a distinct "no data" marker.

### Null-magnitude: first-branch resolution

All three paint dimensions (color, radius, halo radius) resolve null before any class
logic. The null branches produce coherent output: grey color, small fixed radius,
halo radius 0. No null event can fall through into a class encoding.

---

## S — Structure

### Files that change

**`src/components/MapView.jsx`**

- `LAYER_PAINT` constant removed.
- `setupLayer` updated to add TWO layers: `earthquakes-halo` first (below), then
  `earthquakes` (above). Both share the same `geojson` source. Layer order is
  significant — halo must be inserted before the main layer.
- No changes to `toFeatureCollection`, `applyEarthquakes`, or the `useEffect` logic.

**New: `src/lib/magnitudeStyle.js`**

- Exports the class color table (7 entries), the null color, the aura radius constants
  (min 4, max 52, null fixed 4), the radius anchor array (`RADIUS_ANCHORS`), the point
  factor (`POINT_FACTOR = 0.2`), and a pure function `getMagnitudeClass(mag)`.
  `HALO_OFFSET` is removed.
- `getMagnitudeClass` takes a magnitude number (or null) and returns the class name or
  `'null-data'`. This is the testable unit.
- `MapView.jsx` imports from this module to build the paint expressions. The mapping
  logic lives here, not inline in the component.

### Files that do NOT change

`src/lib/api.js`, `src/lib/mappers.js`, `src/lib/validation.js`,
`src/lib/errorMessages.js`, `src/hooks/useEarthquakeQuery.js`,
`src/components/FilterPanel.jsx`, `src/App.jsx`, `src/App.css`, `src/index.css`,
`main.jsx`, all config files.

---

## O — Operations

### Color palette (7 classes + null)

Palette source: YlOrRd-inspired sequential scale. Each step shifts hue toward red AND
decreases lightness, so CVD users can follow the lightness gradient even when hue is
ambiguous.

| Class    | Hex       | Notes                                 |
| -------- | --------- | ------------------------------------- |
| micro    | `#FED976` | Warm yellow, high lightness           |
| minor    | `#FEB24C` | Yellow-orange, slightly darker        |
| light    | `#FD8D3C` | Orange, mid lightness                 |
| moderate | `#FC4E2A` | Red-orange, visibly darker            |
| strong   | `#E31A1C` | Red, high saturation                  |
| major    | `#BD0026` | Dark red, lower lightness             |
| great    | `#800026` | Very dark red/maroon, lowest of scale |

Null-magnitude: `#9E9E9E` (neutral mid-grey, clearly outside the warm scale).

These colors are verified against the blue/green OpenFreeMap liberty basemap — warm
hues contrast strongly against the basemap's cool/neutral palette.

### Radius curve (aura layer)

Piecewise linear interpolation across seven anchor points, producing a concave shape with
more resolution in the 3–6 band. This curve applies to the **aura (`earthquakes-halo`)
layer**. The solid point is derived from it (see Aura section). This is a first-pass
calibration to be tuned after visual review. Out-of-range values are clamped.

| Condition              | Aura radius                    |
| ---------------------- | ------------------------------ |
| Negative magnitude     | 4 px (clamp to mag-0 anchor)   |
| Magnitude 0            | 4 px                           |
| Magnitude 2            | 8 px                           |
| Magnitude 4            | 16 px                          |
| Magnitude 5            | 24 px                          |
| Magnitude 6            | 34 px                          |
| Magnitude 8            | 44 px                          |
| Magnitude 10           | 52 px                          |
| Magnitude > 10         | 52 px (clamp to mag-10 anchor) |
| Null magnitude (fixed) | 0 px (halo absent)             |

Min aura radius: **4 px** (at mag 0). Max aura radius: **52 px** (at mag 10).

### Aura / halo layer

| Layer                 | Property          | Value                                          |
| --------------------- | ----------------- | ---------------------------------------------- |
| `earthquakes-halo`    | Color             | Same per-class / null expression as main layer |
| `earthquakes-halo`    | Opacity           | 0.5                                            |
| `earthquakes-halo`    | Radius (non-null) | From the magnitude curve (4–52 px)             |
| `earthquakes-halo`    | Radius (null)     | 0 px — physically absent                       |
| `earthquakes` (point) | Color             | Same per-class / null expression               |
| `earthquakes` (point) | Opacity           | 0.8                                            |
| `earthquakes` (point) | Radius (non-null) | 20% of the aura radius (POINT_FACTOR = 0.2)    |
| `earthquakes` (point) | Radius (null)     | 4 px fixed — ensures null events stay visible  |

The `POINT_FACTOR` (0.2) is exported from `magnitudeStyle.js`. The solid point's radius
for non-null events is computed as `aura_radius × 0.2`, never independently from the
magnitude curve.

### Main circle opacity

`circle-opacity` remains **0.8** for all events (null and non-null). This is the Story
1 constant; the analysis does not require it to change.

### Null-branch resolution order

For every paint expression, the null check is the first branch. The sequence is:

1. If `mag` is null → apply null styling: grey color, solid point 4 px fixed, aura radius 0.
2. Else → apply class-based color, aura radius from the magnitude curve, solid point = aura × 0.2.

The same ordering applies independently to color, aura radius, and solid-point radius so
that all three dimensions remain coherent. A null event cannot receive a class color with
a null radius, or a class radius with a visible halo from a separate path.

### Negative magnitudes and magnitudes above 10

Negative magnitudes: real earthquakes, not null. They fall in micro class for color (the
micro class covers all values below 3.0, which includes negatives). For radius, the
interpolation clamps at the lower anchor (mag 0 → 4 px aura), so negative values get
a 4 px aura and a 0.8 px solid point.

Magnitudes above 10: fall in great class. For radius, the interpolation clamps at the
upper anchor (mag 10 → 52 px aura). No special handling required beyond the clamp.

An explicit fallback clause in the paint expressions covers any value that does not
match a step condition, preventing undefined rendering.

---

## N — Norms

### ESLint hard rules (enforced, do not disable without flagging)

- Max 25 lines per function (`skipBlankLines`, `skipComments`).
- Max 5 parameters per function.
- Cyclomatic complexity ≤ 10.
- Max 200 lines per file.

`magnitudeStyle.js` must stay well within the 200-line limit (it is a data/lookup
module). `MapView.jsx` must not grow past 200 lines after the paint expressions are
added; if it approaches the limit, extract a helper.

### Visual encoding consistency

- Color is always per-class (step). Never interpolate colors between classes.
- Radius is always a continuous function of the magnitude number. Never assign a fixed
  radius to a class unless the event is null.
- The warm palette is never used for a null event; grey is never used for a non-null
  event.

### No UI copy changes

This story introduces no new user-visible strings. All existing `errorMessages.js`
strings are unchanged.

### Testing (this story)

Tests live in `src/lib/magnitudeStyle.test.js` and cover the pure logic in
`getMagnitudeClass`:

- **Happy path**: one representative magnitude per class (e.g. 1.0, 3.5, 4.5, 5.5,
  6.5, 7.5, 9.0) returns the expected class name.
- **Boundary values**: exactly 3.0, 4.0, 5.0, 6.0, 7.0, 8.0 each return the upper
  class (minor, light, moderate, strong, major, great).
- **Null input**: `getMagnitudeClass(null)` returns `'null-data'` (never a class name).
- **Magnitude 0**: returns `'micro'` (not null-data — magnitude 0 is a real event).
- **Negative magnitude**: returns `'micro'` (not null-data, not an error).
- **Magnitude above 10**: returns `'great'`.
- **AC4 assertion**: null magnitude resolves to the null-data branch exclusively.

Visual ACs (AC1, AC2, AC3) are verified by eye per the story (AC2 states this
explicitly). They are not automated.

---

## S — Safeguards

These are non-negotiable. No implementation may bypass them.

1. **Null magnitude is never classified as micro.** The null-data branch must be
   evaluated before any class comparison. There is no code path where `mag: null` falls
   through to a class encoding.

2. **Null events have no aura.** The `earthquakes-halo` layer must produce a radius of
   0 for null-magnitude features. A non-zero halo on a null event violates AC4 even if
   the fill color and radius are correct.

3. **Boundary values land in exactly one class.** The ≥ comparisons must be consistent:
   3.0 is minor, 4.0 is light, 5.0 is moderate, 6.0 is strong, 7.0 is major, 8.0 is
   great. No boundary value is in the class below.

4. **The Story 1 data/fetch architecture is not modified.** `toEarthquakes`, `api.js`,
   `useEarthquakeQuery`, the `requestId` guard, the count-first flow, and
   `applyEarthquakes` / `setData` logic are unchanged. Only paint properties change.

5. **The map is still initialized exactly once.** The `useRef` guard in `MapView` is
   preserved. `setupLayer` adds two circle layers (`earthquakes-halo` + `earthquakes`);
   neither initialization path runs more than once.

6. **Halo layer is inserted below the main layer.** The `earthquakes-halo` `addLayer`
   call must precede the `earthquakes` `addLayer` call in `setupLayer`. Reversing the
   order renders the aura on top of the solid circle, obscuring it.

7. **All three paint dimensions (color, solid-point radius, aura radius) handle null coherently.**
   A null event must receive grey + solid point 4 px fixed + aura radius 0. Any mismatch
   — e.g. grey color but class-derived radius, or correct size but non-zero aura — is a
   violation of AC4.
