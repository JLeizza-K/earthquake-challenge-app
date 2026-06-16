# Analysis — Story 2: Reflect magnitude visually on the map

## Domain concepts

### Magnitude as a logarithmic quantity

Earthquake magnitude is already a **logarithmic scale**. Each integer step represents roughly a tenfold increase in ground-motion amplitude and about 31.6× more energy released. Because the scale is inherently logarithmic, the raw magnitude number (e.g. 4.5) is the correct input for visual encoding — there is no need to reverse-compute energy or amplitude. A mapping of the magnitude number directly onto radius produces a perceptually meaningful size progression without the extreme size ratios that mapping raw energy would create.

### The story's magnitude classes (7 classes)

The story defines seven named classes using a deliberate simplification: all events below 3.0 are grouped under "micro," which covers the full filter range (0–10) without orphan classes. This differs slightly from the official USGS micro cutoff (~2.0), an accepted trade-off for scale simplicity:

| Magnitude   | Class    |
| ----------- | -------- |
| < 3.0       | micro    |
| 3.0 – 3.9   | minor    |
| 4.0 – 4.9   | light    |
| 5.0 – 5.9   | moderate |
| 6.0 – 6.9   | strong   |
| 7.0 – 7.9   | major    |
| ≥ 8.0       | great    |

Each class is a **discrete category**. A feature belongs to exactly one class, determined by its `mag` value. There is no blending between classes.

Because the Story 1 `minMagnitude` filter accepts values from 0 to 10, all seven classes are reachable through normal filter usage. The micro class (< 3.0) will appear whenever `minMagnitude` is set to 0, 1, or 2.

### "Size by magnitude" — data-driven radius

The story requires the marker radius to be a function of the feature's `mag` property, not a constant. Story 1 sets `circle-radius` to the constant `5`. This story replaces that constant with an expression driven by the `mag` value. The visual intent is that a viewer can distinguish a magnitude-3 event from a magnitude-7 event by circle area at a glance. Because human perception of area is nonlinear (we underestimate large areas), the radius mapping must be calibrated so differences remain readable at typical map zoom levels. The exact radius curve is a Canvas decision.

### "Color by class" — discrete categorical encoding

The story specifies a discrete warm palette: one color per class, ranging yellow (lower magnitude) to red (higher magnitude). This is a **categorical** encoding, not a gradient. Every event in the "minor" class gets the same color regardless of whether its magnitude is 3.0 or 3.9. A gradient would falsely imply that 3.9 and 4.0 are similar in color when they belong to different categories. The exact hex values are deferred to the Canvas, but the story constrains the palette to warm hues that contrast against the blue/green OpenFreeMap basemap.

### Halo / aura effect (AC3)

The halo is a translucent aura of the same color as the circle, at approximately 50% opacity, that surrounds each point. Its purposes are: (1) improving contrast against varied map backgrounds — a point that would otherwise blend into the basemap becomes distinguishable, (2) helping visually separate nearby points at moderate densities. The story specifies "same color, ~50% opacity." The implementation technique is a Canvas decision.

---

## Key rules

**R1 — Radius encodes the magnitude number, not the energy.**
Mapping energy would produce circles orders of magnitude larger for great events than for micro events, making the map unreadable. The magnitude number already incorporates the logarithmic compression.

**R2 — Color is discrete, not a gradient.**
Class boundaries are hard thresholds. A step-function assignment (each class → exactly one color) is the correct encoding for a categorical variable. A continuous gradient would misrepresent the nature of the classification.

**R3 — Both encodings operate on the existing circle layer.**
Story 1 established a `geojson` source and a `circle` layer with constant paint properties. This story replaces those constants with data-driven values based on the `mag` property. The source ID, layer ID, `setData` flow, and requestId/count-first architecture are unchanged.

**R4 — Null magnitude is distinct from magnitude 0.**
A magnitude-0 event is a real, measurable micro-class earthquake. Treating null as zero would silently misclassify "no data" events as detected low-magnitude earthquakes and render them with a class color and a meaningful radius.

**R5 — Class boundary values belong to the upper class.**
Exactly 3.0 is "minor" (≥ 3.0), not "micro." Exactly 4.0 is "light," not "minor." The boundary belongs to the lower end of the higher class. This must be encoded consistently so that boundary-value events are never ambiguously classified.

**R6 — Null-magnitude events must have no halo.**
AC4 explicitly excludes the halo for null-magnitude events. The halo is part of the normal encoding for events with a magnitude. Null events have a distinct grey style and omit the halo entirely, reinforcing the "no data" read.

---

## The null-magnitude case (AC4)

### Why null magnitude exists

USGS returns `mag: null` for events where a magnitude estimate is pending, where conflicting estimates cannot be resolved, or for certain event types without a standard magnitude. Story 1 already retains these events — `toEarthquakes` keeps features with null mag and only drops features with null or missing geometry.

### Null magnitude ≠ magnitude 0

A magnitude-0 event belongs to the micro class and has a meaningful radius and a class color. Treating null as 0 would:
- Assign it the micro class color (implying the magnitude is known to be low).
- Render it with a radius implying a measured magnitude.
- Apply the halo that AC4 explicitly forbids.

This conflation is incorrect and misleading.

### AC4 requirement

Null-magnitude events must render as "no data": neutral grey, small fixed size, no halo. The rendering path must branch on whether `mag` is null before applying any class-based logic. The null branch must not fall through to any of the seven class encodings. Both `circle-color` and `circle-radius` must handle the null case symmetrically — the same event must receive the grey color and the small fixed radius, not one or the other. The exact grey value and fixed radius are Canvas decisions.

### Data flow implication

The null-magnitude case must be resolved before any class logic, and must apply coherently to color, radius, and halo together. An event with null mag must receive the grey style in all three dimensions — it must not get the grey color but a class-derived radius, or the correct size but a visible halo. How this is implemented is a Canvas decision.

---

## Risks and edge cases

**E1 — Magnitudes outside the 0–10 range.**
USGS data includes events with negative magnitudes (very small events in highly sensitive networks) and historically has reached 9.5. The encoding must handle these gracefully:
- Negative magnitudes: they are real earthquakes, not null. They should fall into the micro class (< 3.0) — the expression must not break or produce undefined rendering for negative values.
- Magnitudes ≥ 8.0 up to extreme values (9.5+): these fall in the great class. The expression should not break for values above 8.0.
The safest approach is an explicit fallback/`otherwise` clause in the paint expression.

**E2 — Boundary values (exactly 3.0, 4.0, 5.0, 6.0, 7.0, 8.0).**
These must be assigned to exactly one class (see R5). Ambiguity causes inconsistent rendering. The comparison operators must be chosen so that the boundary value is unambiguously included in the higher class.

**E3 — Dense overlap in seismic zones.**
Aftershock sequences and volcanic swarms can produce dozens to hundreds of overlapping circles at normal zoom levels. The halo reduces confusion at moderate densities but does not solve the fundamental overlap problem. Dense overlap is a known, accepted limitation of this story's scope.

**E4 — Interaction with the Story 1 circle layer.**
Story 1 adds the source and layer once at map load. Story 2 modifies the paint properties of that layer. The `setData` flow that updates the source on each successful query remains unchanged — paint properties are set at layer creation (or updated via `setPaintProperty`) and are independent of the data update cycle. This architecture must be preserved.

**E5 — Halo separation for null-magnitude events.**
AC4 requires no halo for null events. The aura effect must be absent for null-magnitude events, not merely reduced. Leaving any visible aura on null events would contradict AC4 even if the fill color is correct.

**E6 — Color accessibility.**
Seven distinct hues across the yellow-to-red warm range can be difficult to distinguish for users with red-green color vision deficiencies. Using hue alone is insufficient. The palette should vary lightness and/or saturation across classes, not rely on hue shift alone. This is a Canvas-level constraint.

**E7 — Floating-point precision at class boundaries.**
USGS magnitudes are reported to one decimal place (e.g. 3.7, 4.0). One-decimal values in the JavaScript number range have exact binary representations, so comparisons like `>= 3.0` are safe for typical USGS data. This risk is theoretical and does not require active mitigation, but it should be kept in mind if the data source ever changes.

---

## What this story does NOT touch

- **Popups / detail view** (Story 3): clicking a circle to reveal place, magnitude, and time is out of scope. The `setText`/`setHTML` distinction and popup lifecycle belong to Story 3.
- **Responsive layout** (Story 3): the panel/map split at different viewport sizes is out of scope.
- **Fetch, validation, and error logic** (Story 1): the count-first flow, `withRetry` wrapper, `errorMessages.js`, requestId guard, and all `FetchState` transitions are unchanged. This story modifies only how the already-fetched `earthquakes[]` are visually rendered.
- **Legend UI**: not mentioned in the story. A color/size key alongside the map is not in scope.
- **Filter criteria changes**: the three filter fields (`starttime`, `endtime`, `minMagnitude`) and their validation rules are unchanged. This story only affects how matching results are displayed.
