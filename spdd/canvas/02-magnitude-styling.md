# Canvas — Story 2: Reflect magnitude visually on the map

---

## R — Requirements

### What we deliver

- Marker radius driven by the `mag` property of each GeoJSON feature, following a
  calibrated linear curve (min/max defined in Operations).
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

| Class    | Magnitude range   | Boundary rule               |
| -------- | ----------------- | --------------------------- |
| micro    | < 3.0             | default / below-minor catch |
| minor    | 3.0 – 3.9         | ≥ 3.0                       |
| light    | 4.0 – 4.9         | ≥ 4.0                       |
| moderate | 5.0 – 5.9         | ≥ 5.0                       |
| strong   | 6.0 – 6.9         | ≥ 6.0                       |
| major    | 7.0 – 7.9         | ≥ 7.0                       |
| great    | ≥ 8.0             | ≥ 8.0                       |

### Null-magnitude as a distinct visual state

`null` is not a class. It is a separate rendering branch that resolves before any class
logic. A null-magnitude event receives its own fixed color, fixed radius, and no aura
(blur 0 — hard edge). It never receives a class color or class radius.

---

## A — Approach

### Builds on the Story 1 circle layer

Story 1 established a `geojson` source and a `circle` layer with uniform paint
constants (`circle-radius: 5`, `circle-color: '#e74c3c'`, `circle-opacity: 0.8`). Story
2 replaces those constants with data-driven expressions driven by `properties.mag`.
Everything else in the Story 1 architecture — source ID, layer ID, `setData` flow,
`requestId` guard, count-first pattern, and `toEarthquakes` mapper — is untouched.

### Size: linear interpolation over the magnitude number

Radius is a linear function of the raw magnitude number (not energy, which would produce
extreme ratios). A continuous linear curve lets events within the same class still differ
slightly in size, giving a richer representation than a step function would. The minimum
and maximum radii are calibrated so a magnitude-3 and magnitude-7 event are visually
distinguishable at a glance (see Operations for exact values).

Out-of-range values are clamped: negative magnitudes get the minimum radius, and
magnitudes above 10 get the maximum.

**Tradeoff accepted:** color is step-function (discrete per class) while radius is
continuous (linear interpolation). This slight inconsistency is the correct trade-off
— radius encodes a continuous quantity while color encodes a categorical one. A step
radius would discard within-class information unnecessarily.

### Color: discrete step function by class

Each class maps to exactly one color regardless of where within the class the magnitude
falls. A gradient would falsely imply that 3.9 and 4.0 are visually similar; a step
function reflects the categorical nature of the classification.

The palette varies lightness and saturation across classes (not hue shift alone), so
differences remain readable for users with red-green color vision deficiencies.

### Aura: circle-blur on the single circle layer

The aura is achieved via `circle-blur` on the existing `earthquakes` layer — no
additional layer is added. `circle-blur` makes the circle's edges fade to transparent
within the radius, producing a soft translucent glow of the same color as the fill.
The center of the circle retains high opacity while the outer portion fades, reading as
a solid point surrounded by a translucent aura. The exact blur value is in Operations.

For null-magnitude events `circle-blur` is set to 0, giving a hard-edged point with no
soft glow — the aura is absent, not merely reduced.

### Null-magnitude: first-branch resolution

All three paint dimensions (color, radius, circle-blur value) resolve null before any
class logic. The null branches produce coherent output: grey color, small fixed radius,
blur 0. No null event can fall through into a class encoding.

---

## S — Structure

### Files that change

**`src/components/MapView.jsx`**
- `LAYER_PAINT` constant removed.
- `setupLayer` updated to add the single `earthquakes` layer with data-driven paint
  expressions (color, radius, circle-blur). One layer, same as Story 1.
- No changes to `toFeatureCollection`, `applyEarthquakes`, or the `useEffect` logic.

**New: `src/lib/magnitudeStyle.js`**
- Exports the class color table (7 entries), the null color, the radius constants (min,
  max, null fixed size), the blur constants (non-null blur value, null blur value = 0),
  and a pure function `getMagnitudeClass(mag)`.
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

### Radius curve

Linear interpolation between two anchor points. Out-of-range values are clamped.

| Condition               | Radius  |
| ----------------------- | ------- |
| Null magnitude (fixed)  | 4 px    |
| Negative magnitude      | 5 px (clamp to lower anchor) |
| Magnitude 0             | 5 px    |
| Magnitude 5 (mid-scale) | ~15 px  |
| Magnitude 10            | 24 px   |
| Magnitude > 10          | 24 px (clamp to upper anchor) |

Min radius: **5 px** (at mag 0). Max radius: **24 px** (at mag 10). Formula:
`radius = 5 + (mag / 10) × 19`, clamped to [5, 24] for non-null events.

The area ratio between the minimum (r=5, area≈79 px²) and the maximum (r=24, area≈1810
px²) is ~23×, giving an unambiguous visual spread without oversized circles at country
zoom levels.

The null fixed size (4 px) is intentionally below the non-null minimum (5 px), so a
null event is always smaller than the smallest measurable earthquake.

### Aura / blur

Implemented via `circle-blur` on the single `earthquakes` layer. The blur fades the
circle's edges toward transparent within the radius, producing a soft glow of the same
color as the fill. No second layer is added.

| Property              | Value                                                   |
| --------------------- | ------------------------------------------------------- |
| `circle-blur` (non-null) | **0.4** — outer ~40% of radius fades to transparent  |
| `circle-blur` (null)  | 0 — hard edge, no soft glow                             |

`circle-opacity` remains 0.8 for all events (null and non-null). The blur operates on
top of that opacity — the center of a non-null circle reads as ~80% opaque; the edge
fades from there.

The blur value 0.4 is a first-pass proposal. It produces a visible, soft aura while
keeping the solid-center read of the circle. Adjust up (more diffuse) or down (harder
edge) based on visual review against the basemap.

### Main circle opacity

`circle-opacity` remains **0.8** for all events (null and non-null). This is the Story
1 constant; the analysis does not require it to change.

### Null-branch resolution order

For every paint expression, the null check is the first branch. The sequence is:

1. If `mag` is null → apply null styling (grey, 4 px, blur 0).
2. Else → apply class-based color, linear radius, and blur 0.4.

The same ordering applies independently to color, radius, and circle-blur so that the
three dimensions remain coherent. A null event cannot receive a class color with a null
radius, or a class radius with a soft aura from a separate path.

### Negative magnitudes and magnitudes above 10

Negative magnitudes: real earthquakes, not null. They fall in micro class for color (the
micro class covers all values below 3.0, which includes negatives). For radius, the
linear interpolation clamps at the lower anchor (mag 0 → 5 px), so negative values get
5 px.

Magnitudes above 10: fall in great class. For radius, the interpolation clamps at the
upper anchor (mag 10 → 24 px). No special handling required beyond the clamp.

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

2. **Null events have no aura.** The `circle-blur` paint expression must resolve to 0
   for null-magnitude features. Any non-zero blur on a null event violates AC4 even if
   the fill color and radius are correct.

3. **Boundary values land in exactly one class.** The ≥ comparisons must be consistent:
   3.0 is minor, 4.0 is light, 5.0 is moderate, 6.0 is strong, 7.0 is major, 8.0 is
   great. No boundary value is in the class below.

4. **The Story 1 data/fetch architecture is not modified.** `toEarthquakes`, `api.js`,
   `useEarthquakeQuery`, the `requestId` guard, the count-first flow, and
   `applyEarthquakes` / `setData` logic are unchanged. Only paint properties change.

5. **The map is still initialized exactly once.** The `useRef` guard in `MapView` is
   preserved. `setupLayer` adds one circle layer, the same count as Story 1.

6. **All three paint dimensions (color, radius, circle-blur) handle null coherently.**
   A null event must receive grey + 4 px + blur 0. Any mismatch — e.g. grey color but
   class-derived radius, or correct size but non-zero blur — is a violation of AC4.
