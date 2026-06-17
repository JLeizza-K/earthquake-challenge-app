# Analysis — Story 3: Show earthquake details in a popup

## Domain concepts

### What a popup shows

A popup surfaces three fields from a single `Earthquake` object:

- **Place** — a human-readable location string (e.g. "25 km SE of Hilo, Hawaii"), sourced
  verbatim from the USGS API response. It is the only text field; the other two are derived
  values computed by the app.
- **Magnitude with class** — the raw `mag` number paired with its USGS class name as
  computed by Story 2's classification logic. For events with null magnitude, the popup
  shows a fixed "unavailable" label (AC4) rather than any magnitude or class value.
- **Local time** — the `time` Unix millisecond timestamp converted to the user's local
  timezone and browser locale into a human-readable string (AC2). The raw timestamp is
  never shown.

The popup is anchored at the earthquake's geographic coordinates (the same coordinates
used to place the circle markers).

### Data source: no new API calls

All three fields are present on the `Earthquake` objects already returned by
`useEarthquakeQuery`. Story 3 does not introduce any new fetch, cache, or state — it is
purely a presentation layer over the data that Stories 1–2 already put in memory. The
fetch/filter architecture from Story 1 is untouched.

### Click interaction model

The user interaction is a single left-click on an earthquake marker on the map. The click
target is the **aura layer** (`earthquakes-halo`), as specified by the story scope. MapLibre
GL JS exposes a `map.on('click', layerId, handler)` pattern that fires only when the click
falls within a feature on the named layer, delivering the clicked feature's properties in
the event object — including `mag`, `place`, and `time`. The geographic coordinate for
popup placement is also available from the click event.

---

## Rules

**R1 — Local-time conversion is app-side work, rendered in the browser locale.**
The `time` property on every `Earthquake` is a Unix timestamp in **milliseconds, UTC**
(as delivered by the USGS API and stored verbatim by `toEarthquakes`). The popup must
display it in the **user's local timezone and browser locale**, formatted as:

> day + full month name + year + 24h time + no seconds

The month name follows the browser locale — "June" in an English locale, "junio" in a
Spanish locale. The format "16 June 2026, 14:30" illustrates English output; the actual
string varies by locale. This is a finding, not an implementation choice; the exact API
(`Intl.DateTimeFormat`, etc.) is a Canvas decision.

This conversion — from UTC milliseconds to a locale-aware formatted string — is performed
by the app at render time. The USGS API does not provide a pre-formatted local-time string.

**R2 — Magnitude class must match the marker color.**
The class label shown in the popup (e.g. "moderate") must be produced by the same
classification function used in Story 2 (`getMagnitudeClass`). Using a separate or
inconsistent classification would create a visual contradiction: the marker color
communicates one class while the popup text states another. This story depends on that
existing export.

**R3 — API-sourced text must never be interpolated into markup.**
`place` is a string received from an external API. A real `place` value from the USGS
feed can contain characters such as `<`, `>`, `"`, and `'`. If this string is inserted
into an HTML template via string interpolation (e.g. with template literals written into
`innerHTML` or passed to `setHTML`), any markup characters in the value are interpreted
by the browser as HTML rather than text — enabling script injection or layout corruption
from a malformed or adversarially crafted API response. The correct mitigation is to
assign API-sourced values via the DOM `textContent` property, which treats the value as
plain text unconditionally. This rule applies to `place`; the derived fields (class name,
formatted time) are produced entirely by app logic and carry no external injection risk by
themselves, but they should still be handled consistently.

AC5 states explicitly that the popup **may use HTML structure for formatting** (e.g. a
`<strong>` label) while requiring that API-sourced data be inserted as text. This is the
correct model: static markup is safe; dynamic content from external sources is the risk
vector.

**R4 — Click resolves to the topmost feature on the aura layer.**
Story 2 renders each earthquake as two circle layers sharing the same GeoJSON source. The
story designates the aura layer (`earthquakes-halo`) as the click target. Where auras
overlap, MapLibre returns the topmost rendered feature — the one drawn last, which
corresponds to a feature later in the GeoJSON `features` array. This is a **known,
accepted limitation**: in a dense aftershock cluster, a click in the overlapping region
may not open the popup for the visually closest epicenter. Resolution is deferred to the
future clustering story. No workaround is in scope here.

---

## Missing data fields (AC4)

Both `mag` and `place` can be absent; the popup handles each with a graceful fallback
rather than an error. In both cases the popup opens normally — only the affected field
degrades.

**Null magnitude.** The `mag` property can be `null` for events where the USGS has not
yet assigned a magnitude estimate:

- The popup must not show a blank field, a `null` literal, or `NaN`.
- AC4 requires the fixed string "Magnitude data unavailable" in place of a magnitude
  value or class label.
- `getMagnitudeClass(null)` returns `'null-data'` (Story 2 rule). The popup must not
  display `'null-data'` as a visible string — that is an internal sentinel, not a
  user-facing label. Mapping from `'null-data'` to a human-readable string follows the
  same convention as all other user-facing messages in this codebase (`errorMessages.js`).

**Null or empty place.** Location comes from the earthquake's coordinates, not from the
`place` string, so a missing place does not affect rendering or popup positioning. The
`place` field is descriptive only. When it is null or empty, the popup shows "Location
unknown" as a fallback — mirroring the null-magnitude treatment. This is a handled edge
case (see also E4), not an error condition.

---

## Close behavior

AC6 defines three triggers that dismiss the popup:

1. **Close control** — the built-in close button rendered by the MapLibre `Popup` component.
2. **Click another earthquake** — opening a new popup implicitly replaces the existing one.
3. **Click empty map** — a click that does not land on any earthquake feature.

**Risk — stale or duplicate popups.**
If the open-popup reference is not tracked and closed before creating a new one, multiple
popups can accumulate on the map simultaneously. This produces visual clutter and may
cause state inconsistencies (e.g. two popups for two different earthquakes both visible).
The open popup must be dismissed or replaced atomically whenever a new one is requested.
Similarly, clicking empty map must close the active popup without leaving a ghost instance
attached to the map.

---

## Risks and edge cases

**E1 — Rapid clicks on different earthquakes.**
If a user clicks a second earthquake before the first popup has fully rendered, the popup
lifecycle must still produce a single, correct popup for the most-recently-clicked
earthquake. Any intermediate state that could leave a stale popup is a risk.

**E2 — Click exactly on overlapping aura regions.**
Where two auras overlap, both features exist under the cursor. MapLibre's layer-click
event returns one feature (the topmost). The popup will open for that one feature, which
may not be the one the user intended. This is the same limitation documented in R4 and is
accepted for this story.

**E3 — Popup position at map edges (resolved).**
On click, the map recenters on the selected earthquake's coordinates with an animated
transition before the popup opens, keeping the popup within the viewport. The popup is
no longer left to clip at edges. The concrete map method is a Canvas-level decision. See
AC7.

**E4 — Empty or missing place field (resolved).**
Location comes from the earthquake's coordinates, not from `place`, so a null or empty
place does not prevent the popup from opening or the marker from rendering. The popup
shows "Location unknown" as a fallback. See the Missing data fields section for full
treatment.

**E5 — Month name language (resolved).**
The month name follows the user's browser locale. A user in a Spanish-locale browser sees
"16 junio 2026, 14:30"; a user in an English-locale browser sees "16 June 2026, 14:30".
This is consistent with R1 and the updated AC2. No special handling is required beyond
using locale-aware date formatting.

---

## CLAUDE.md popup convention (resolved)

CLAUDE.md has been updated. The rule now reads: popups may use HTML structure for
formatting, but API-sourced or user-derived data must be inserted via DOM `textContent`
(or equivalent escaping), never interpolated into a raw HTML string (`innerHTML` /
`setHTML`). This aligns with AC5 and closes the prior contradiction between the
convention and the story. The Canvas may proceed on the basis of HTML structure with
`textContent` for data insertion.

---

## What this story does NOT touch

- **Filtering and fetching (Story 1):** `useEarthquakeQuery`, `api.js`, `validation.js`,
  `mappers.js`, the count-first flow, the `requestId` guard, and `errorMessages.js` are
  unchanged. The popup reads from the already-loaded `earthquakes[]` array, not from a
  new fetch.
- **Marker styling (Story 2):** circle colors, radii, the two-layer paint expressions, and
  `magnitudeStyle.js` are unchanged by this story. The popup reuses `getMagnitudeClass`
  as a read-only dependency — it does not modify it.
- **Responsive layout:** panel/map split at different viewport sizes is out of scope.
- **Clustering:** the dense-overlap limitation (R4, E2) is accepted and deferred.
- **Dark mode, theming, and UX polish:** not in scope for this story.

---

## Acceptance criteria traceability

| AC  | Covered by                                                          |
| --- | ------------------------------------------------------------------- |
| AC1 | Domain concepts (popup content + location), click interaction model |
| AC2 | R1 (time conversion + browser locale), E5                           |
| AC3 | R2 (class dependency on Story 2)                                    |
| AC4 | Missing data fields section (null mag + missing place), E4          |
| AC5 | R3 (XSS / textContent rule), CLAUDE.md convention section           |
| AC6 | Close behavior section, E1 (rapid clicks), stale-popup risk         |
| AC7 | AC1 (popup placement), E3 (resolved)                                |
