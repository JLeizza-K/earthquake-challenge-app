# Canvas — Story 3: Show earthquake details in a popup

---

## R — Requirements

### What we deliver

- A popup anchored at the clicked earthquake's geographic coordinates showing three
  fields: place, magnitude with USGS class, and local time.
- Animated map recentering on click (`map.easeTo`) so the popup opens within the
  viewport and is not clipped at the edge (AC7, resolves E3).
- Safe rendering: API-sourced `place` text inserted via `textContent` only — never via
  `innerHTML`, `setHTML`, or string interpolation into markup.
- Clean close behavior: close control, click another earthquake, or click empty map —
  at most one popup at a time, no stale instances.

### Out of scope (explicit)

- Responsive layout → later story.
- Clustering → future story.
- Dark mode and UX polish → not in scope.
- Any change to filtering, fetching, or marker styling from Stories 1–2.
- No new API call, cache layer, or React state — the popup reads from the
  already-loaded `earthquakes[]` array.

### Definition of done (AC mapping)

| AC  | Condition                                          | Pass when                                                                                         | Verified by |
| --- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------- |
| AC1 | Click on an earthquake aura                        | Popup opens at the clicked location showing place, magnitude+class, and time                      | Interaction |
| AC2 | Any earthquake time value                          | Time shows as day + full month + year + 24h + no seconds (comma separator); never a raw timestamp | Unit test   |
| AC3 | Earthquake with a known magnitude                  | Shows `"{mag} — {class}"` using the same classification as Story 2                                | Unit test   |
| AC4 | Null magnitude / null or empty place               | Shows "Magnitude data unavailable" / "Location unknown"; popup always renders                     | Unit test   |
| AC5 | `place` contains markup characters (`<`, `>`, `"`) | Characters appear as plain text; not parsed as HTML                                               | Unit test   |
| AC6 | Open popup → close / click another / click empty   | Popup dismisses cleanly; no stale or duplicate popups                                             | Interaction |
| AC7 | Click earthquake near a map edge                   | Map animates smoothly to center on that earthquake; popup opens within the viewport               | Interaction |

---

## E — Entities

### Earthquake (unchanged from Stories 1–2)

```
Earthquake {
  place:       string | null
  mag:         number | null   // null is valid, already kept by toEarthquakes
  time:        number          // Unix ms, UTC
  coordinates: [number, number, number]
}
```

`MapView` already receives `earthquakes: Earthquake[]` as a prop. Story 3 is a pure
presentation layer — no new fetch, cache, or state is introduced.

### GeoJSON feature click event

Inside the general `map.on('click', handler)`, a call to
`map.queryRenderedFeatures(e.point, { layers: ['earthquakes-halo'] })` returns a
hit-test array. When the array is non-empty, `feature` is its first element. Relevant
values on that feature:

| Value                          | Source                     | Used for                                       |
| ------------------------------ | -------------------------- | ---------------------------------------------- |
| `feature.properties.mag`       | `queryRenderedFeatures[0]` | Magnitude display and `getMagnitudeClass` call |
| `feature.properties.place`     | `queryRenderedFeatures[0]` | Place display                                  |
| `feature.properties.time`      | `queryRenderedFeatures[0]` | Time conversion and display                    |
| `feature.geometry.coordinates` | `queryRenderedFeatures[0]` | Popup anchor and `easeTo` target               |

All three property values are present on the GeoJSON feature because `toFeatureCollection`
stores them verbatim from the `Earthquake` object. No new transformation is required.

---

## A — Approach

### Click model: a single handler, atomic open/replace/close

A SINGLE `map.on('click', handler)` listener drives all popup behavior. Inside the
handler, `queryRenderedFeatures(e.point, { layers: ['earthquakes-halo'] })` determines
what was clicked:

- **Hit (`queryRenderedFeatures` returns a non-empty array):** `feature` is that
  array's first element — there is no `e.features` in this pattern. Remove any existing
  open popup, recenter the map with `map.easeTo`, build popup content, and attach the
  new popup. These steps happen atomically — there is never a moment where two popups
  coexist.
- **Miss (no feature):** close any open popup and do nothing else.

This single code path prevents stale/duplicate popups (AC6) and rapid-click races (E1):
the last-clicked earthquake always wins, with no residual state from a prior click.

**Dataset change (new query):** the no-stale-popups invariant extends beyond map clicks.
When the earthquakes dataset changes (a new query runs), any open popup must also be
closed — a popup for an earthquake no longer in the dataset would otherwise linger over
an empty or changed map. This is not a new feature; it is a direct consequence of AC6's
intent and the existing "at most one popup / no stale popups" safeguard (see Safeguard
#3 and #8).

### Centering (AC7)

On a hit, `map.easeTo` is called with `feature.geometry.coordinates`. The popup also
anchors at that same value — the earthquake's geographic coordinates, not the click point
(`e.lngLat`). A click can land anywhere within the aura's radius, so using the click
point would misplace both the recentering target and the popup anchor away from the actual
epicenter. This produces a smooth animated transition — not `flyTo` (a dramatic
zoom-and-pan) and not an instant camera jump. The map moves the clicked earthquake toward
the viewport center so the popup opens within the visible area and is not clipped at the
edge. This resolves E3.
The specific transition options (duration, padding) are tuning parameters to be adjusted
after visual review, not design decisions.

### Content building: separated from MapView wiring

Popup content is built in `src/lib/earthquakePopup.js`, not inline in `MapView`.
`MapView` handles only MapLibre wiring: the click listener, `queryRenderedFeatures`,
`maplibregl.Popup` creation, `setDOMContent`, `easeTo`, and the open-popup reference.
The content functions are pure and carry no MapLibre dependency, making them
independently unit-testable.

### Time conversion (AC2)

Converted app-side at render time using `Intl.DateTimeFormat` with:

- Locale: `undefined` (browser locale — month names follow the user's locale)
- No `timeZone` option (output is in the user's local timezone)
- Format components:
  `{ day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }`

Explicit format components (not `dateStyle`/`timeStyle`) are required to produce the
comma separator and the exact "16 June 2026, 14:30" shape. `dateStyle`/`timeStyle` would
produce "...at 14:30" without the comma.

### Magnitude + class (AC3)

The popup reuses `getMagnitudeClass` from `magnitudeStyle.js` as a read-only dependency,
but ONLY for the happy path: when `mag` is a number, `getMagnitudeClass(mag)` returns
the class label (e.g. `"moderate"`) and the popup shows `"{mag} — {class}"`. When
`mag === null` (detected directly, not via `getMagnitudeClass`), the popup shows the
`MSG_MAGNITUDE_UNAVAILABLE` constant imported from `errorMessages.js`. `getMagnitudeClass`
is never called for null magnitudes.

### Safe rendering (AC5)

The popup may use static HTML structure for layout (labels in `<strong>`, rows in `<p>`
elements, etc.). Every API-sourced or app-derived value is inserted via the DOM
`textContent` property on a created node — never via `innerHTML`, `setHTML`, or string
interpolation into markup. This ensures that markup characters in a `place` value
(e.g. `<script>`) are always rendered as text.

---

## S — Structure

### New file: `src/lib/earthquakePopup.js`

Exports two pure functions:

- **`formatEarthquakeTime(timeMs)`** — takes a Unix millisecond timestamp and returns a
  locale-aware formatted string using the exact `Intl.DateTimeFormat` options specified
  in Approach. Unit-tested for AC2. Splitting this out of `buildPopupContent` keeps both
  functions under the 25-line limit and makes AC2 testable in isolation.
- **`buildPopupContent(earthquake)`** — takes an `{ mag, place, time }` object and
  returns a DOM `HTMLElement` with all three fields set via `textContent`. Calls
  `formatEarthquakeTime` and `getMagnitudeClass` internally. Unit-tested for
  AC3/AC4/AC5.

Field labels (`Place:`, `Magnitude:`, `Time:`) and the `"Location unknown"` fallback
string live as module-top constants in this file.

### Changed file: `src/components/MapView.jsx`

Additions only — no removal of existing logic:

- One `map.on('click', handler)` call in the existing `useEffect`, registered after
  layers are set up.
- Inside the handler: `queryRenderedFeatures` hit-test → conditional branch (hit/miss) →
  `easeTo` + popup create/replace, or popup close.
- A ref (or module-scoped variable) to track the currently open popup so it can be
  removed atomically before a new one is shown.
- The map is still initialized exactly once — the `useRef` guard is preserved.

### Changed file: `src/lib/errorMessages.js`

Adds one exported constant: `MSG_MAGNITUDE_UNAVAILABLE = "Magnitude data unavailable"`.
The popup module imports this constant directly and uses it when `mag === null`. It does
NOT go through `toUserMessage` — that function handles typed fetch errors
(`TOO_MANY_RESULTS`, `nonRetryable`) and must not be extended to cover magnitude labels.

**String asymmetry — intentional and principled:**

- `"Magnitude data unavailable"` lives in `errorMessages.js` as an exported constant
  (`MSG_MAGNITUDE_UNAVAILABLE`) because the codebase convention centralises all
  user-facing strings there, even those consumed by presentation logic.
- `"Location unknown"` lives in `earthquakePopup.js` as a module-top constant because it
  is a raw presentation fallback for a null/empty value with no cross-module consumers.
  There is no reason to export it from `errorMessages.js`.

**Important:** adding `'null-data'` to `errorMessages.js` does NOT affect the fetch state
machine. A null magnitude is a property of a single datum, not an app-level error
condition. The `status` field (`idle | loading | success | empty | error`) is untouched.
This entry is a display-string lookup, not an error handler.

### Files that do NOT change

`src/lib/api.js`, `src/lib/mappers.js`, `src/lib/validation.js`,
`src/hooks/useEarthquakeQuery.js`, `src/lib/magnitudeStyle.js` (read-only reuse of
`getMagnitudeClass`), `src/components/FilterPanel.jsx`, `src/components/FilterForm.jsx`,
`src/App.jsx`, `src/App.css`, `src/index.css`, `main.jsx`, all config files.

---

## O — Operations

### Time format

| Input (Unix ms) | Locale | Output                 |
| --------------- | ------ | ---------------------- |
| `1750082400000` | `en`   | `16 June 2026, 14:30`  |
| `1750082400000` | `es`   | `16 junio 2026, 14:30` |

Exact `Intl.DateTimeFormat` options:

```js
{
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
}
```

Locale: `undefined` (resolved from the browser). No `timeZone` option (uses the user's
local timezone). The comma between the date and time parts is produced by the `Intl`
implementation for these explicit component options — this behavior is asserted in the
unit test.

### Popup field layout

| Field             | Happy path                                                                   | Degraded path                                      |
| ----------------- | ---------------------------------------------------------------------------- | -------------------------------------------------- |
| Place             | Place string as returned by the USGS API (e.g. `"25 km SE of Hilo, Hawaii"`) | `"Location unknown"` when `place` is null or empty |
| Magnitude + class | `"{mag} — {class}"` (e.g. `"5.4 — moderate"`)                                | `"Magnitude data unavailable"` when `mag` is null  |
| Time              | Locale-aware formatted string (e.g. `"16 June 2026, 14:30"`)                 | — (`time` is always a number; no degraded path)    |

The popup always opens. Missing fields degrade independently — a null magnitude does not
affect the place row, and vice versa.

### Magnitude display format

For a known magnitude: `"{mag} — {class}"`. The `mag` value is the raw number from the
feature properties (e.g. `5.4`); the class label is the string returned by
`getMagnitudeClass` (e.g. `"moderate"`).

For a null magnitude: `mag === null` is detected directly. The popup imports the
`MSG_MAGNITUDE_UNAVAILABLE` constant from `errorMessages.js` and shows it in place of
the `"{mag} — {class}"` row. `getMagnitudeClass` is not called for this branch.

---

## N — Norms

### ESLint hard rules (enforced, do not disable without flagging)

- Max 25 lines per function (`skipBlankLines`, `skipComments`).
- Max 5 parameters per function.
- Cyclomatic complexity ≤ 10.
- Max 200 lines per file.

Splitting `formatEarthquakeTime` out of `buildPopupContent` keeps both functions under
the 25-line limit and makes each independently testable. `MapView.jsx` must not exceed
200 lines after the click handler is added; if it approaches the limit, extract a helper.

### Testing (this story)

Tests live in `src/lib/earthquakePopup.test.js` (Vitest). Covers the pure functions in
`earthquakePopup.js`:

**`formatEarthquakeTime` (AC2):**

- A known timestamp returns a string containing the expected day, year, and 24h time
  components.
- Verify: no seconds in the output; a comma separator between the date and time parts;
  `hour12: false` (no AM/PM suffix).

**`buildPopupContent` (AC3/AC4/AC5):**

- Happy path: given a full earthquake object, the returned node contains the place
  string, `"{mag} — {class}"`, and the formatted time, each as `textContent`.
- Null magnitude: the magnitude row shows `"Magnitude data unavailable"` and does not
  contain `'null-data'`, `null`, `NaN`, or an empty string.
- Null place: the place row shows `"Location unknown"`.
- Empty string place: the place row shows `"Location unknown"`.
- AC5 assertion: a `place` value containing `<script>alert(1)</script>` is present as a
  literal text string in the node's text content and is NOT present as a parsed HTML
  element in the DOM tree.

**AC1, AC6, AC7** (map wiring, popup open/replace/close, `easeTo`) are verified by
interaction — not automated. Mirroring Story 2's treatment of visual ACs: these behaviors
depend on MapLibre lifecycle and cannot be meaningfully asserted in a pure unit test.

**Test environment:** `earthquakePopup.test.js` runs under the `happy-dom` Vitest
environment, declared via a per-file pragma (`// @vitest-environment happy-dom`).
`buildPopupContent` produces real DOM nodes (`document.createElement`) and the tests
assert on `textContent` and DOM-tree queries — neither available in Node. `happy-dom` is
a devDependency; the global Vitest environment stays `'node'` for all other (pure-logic)
test files. This was an infrastructure requirement discovered during implementation, not a
design change.

---

## S — Safeguards

These are non-negotiable. No implementation may bypass them.

1. **API-sourced data is inserted only via `textContent`.** The `place` property from the
   USGS API is set on DOM nodes via `textContent` — never via `innerHTML`, `setHTML`, or
   string interpolation into markup. Static structural HTML (labels, containers) is safe;
   external text is not.

2. **The popup always opens on a valid click.** Missing fields (`null` magnitude,
   `null`/empty `place`) degrade to their fallback strings and never prevent the popup
   from rendering.

3. **At most one popup exists at a time.** Opening a new popup removes the prior one
   atomically before creating the replacement. Clicking empty map removes the active
   popup with no ghost instance remaining.

4. **A null magnitude never displays as `'null-data'`, `null`, `NaN`, or blank.** It
   shows the `MSG_MAGNITUDE_UNAVAILABLE` constant exported from `errorMessages.js`. A
   null magnitude never changes the app's fetch `status` — the
   `idle | loading | success | empty | error` state machine is untouched.

5. **The time is never shown as a raw timestamp.** Every time display passes through
   `formatEarthquakeTime` and resolves to the locale-aware formatted string in the user's
   local timezone.

6. **Stories 1–2 architectures are untouched.** `useEarthquakeQuery`, `api.js`,
   `mappers.js`, `validation.js`, the `requestId` guard, the count-first flow, and
   `magnitudeStyle.js` are unchanged. `getMagnitudeClass` is reused read-only. The map is
   still initialized exactly once — the `useRef` guard in `MapView` is preserved.

7. **The click hit-test targets `'earthquakes-halo'` exclusively.** The layer ID matches
   the exact ID established in Story 2. The popup anchors at the feature's geographic
   coordinates (`feature.geometry.coordinates`).

8. **Any open popup is closed when the earthquakes dataset changes (a new query).** A
   popup for an earthquake no longer present must never remain on the map. This extends
   the "at most one popup / no stale popups" invariant (Safeguard #3) to dataset changes,
   not just map clicks. It is a consequence of AC6's intent, not an additional feature.
