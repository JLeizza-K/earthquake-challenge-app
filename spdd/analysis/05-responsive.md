# Analysis — Story 5: Responsive layout — panels adapt to the device

## Domain concepts

### Viewport and breakpoints

This story introduces **responsive breakpoints** to the app for the first time. Three viewport
regions are referenced in the ACs: _narrow_ (phone), _medium_ (tablet portrait), and _wide_
(desktop or landscape tablet). Today the app uses breakpoint logic only for the cluster panel: on viewports narrower than 640 px, it becomes full-screen (`absolute inset-0`). The filter panel always renders as `absolute top-4 left-4 w-[300px]` regardless of viewport. No other responsive logic exists — the two panels do not coordinate with each other.

- `FilterPanel` (`FilterPanel.tsx:39`): `absolute top-4 left-4 z-[1] w-[300px]`
- `ClusterPanel` (`ClusterPanel.tsx:37`): `absolute right-0 top-0 h-full w-80 z-10`

Both panels assume there is always enough horizontal space for them to coexist alongside
the map. On narrow screens this assumption breaks: the two panels would occlude the map or
each other. Breakpoints define at what viewport width the layout switches between
narrow/medium/wide behaviour.

The ACs describe behavioural differences by viewport, not by device pixels — the breakpoint
values are a canvas decision (OQ1).

### `renderWorldCopies` and duplicate-world rendering

MapLibre GL JS renders multiple copies of the world when the user pans or zooms out far
enough, so that the map is always covered by at least one copy. This is controlled by the
`renderWorldCopies` map constructor option, which defaults to `true`. When enabled, a
second copy of the world appears on the right edge of the viewport, competing with the
cluster panel for the same screen area.

The current map initialisation (`MapView.tsx:145`) does not set `renderWorldCopies`,
so duplicates are rendered by default. AC1 requires a single world so the right edge is
clean for the cluster panel.

### Drawer vs sidebar panel model

Two panel-layout patterns appear in the ACs:

- **Drawer/overlay** — the panel appears on top of the map, typically full-screen on
  narrow devices. Examples: phone hamburger menu, full-screen cluster panel.
- **Sidebar** — the panel sits alongside the map, occupying a fixed-width column at the
  edge while the map fills the remainder. Example: cluster panel on desktop.

The choice between modes depends on the available viewport width and the panel type.
AC2 specifies full-screen for narrow, right-edge sidebar for wide. The medium case is
not described for the cluster panel and is OQ4.

### Coexistence of filter panel and cluster panel

The two panels have different z-index positions today (`z-[1]` for filter, `z-10` for
cluster) and are rendered in separate parts of the component tree — `FilterPanel` is a
sibling of `MapView` in `App.tsx`, while `ClusterPanel` is a child of `MapView`. Their
coexistence depends on both the viewport width and whether the cluster panel is open:

- On **narrow**: only one panel should be visible at a time, to avoid occluding the map.
- On **medium** (tablet portrait): AC3 specifies the filter automatically hides when the
  cluster panel opens, and reappears when the cluster panel closes.
- On **wide**: both panels can be visible simultaneously.

This introduces a coordination channel between panels that does not exist today: the
filter panel needs to know whether the cluster panel is open. Currently `FilterPanel`
receives no information about cluster state. A notification mechanism or state lift is
required (OQ2, OQ5).

### Conditional card-click behaviour

Today, clicking a cluster card calls `handleCardClick` (`mapClickHandlers.ts`), which
closes the panel (`onClosePanel()`) then opens a popup. On wide screens (AC4), the panel
should stay open when a card is clicked, allowing the user to browse the list alongside
the popup. This means the `onClosePanel` call in `handleCardClick` must be conditional
on the viewport. The card click signature currently does not accept a breakpoint flag,
so either the component passes a different callback per breakpoint or `handleCardClick`
is adapted.

On narrow and medium screens, the existing behaviour (close panel, open popup) is
preserved. This introduces a point where layout logic crosses component boundaries
(OQ6).

---

## Rules

**R1 — `renderWorldCopies: false` must be set on the map constructor (AC1).**
The current map init at `MapView.tsx:145` passes only `container` and `style` to the
`maplibregl.Map` constructor. Adding `renderWorldCopies: false` disables duplicate-world
rendering. This is a single-option change that does not affect zoom, pan, or click
behaviour. It must be set at construction time; there is no runtime toggle.

**R2 — The cluster panel must be full-screen on narrow viewports (AC2).**
The current `ClusterPanel` uses `w-80` (320 px fixed width). On narrow screens the panel
must cover the full viewport. The change affects the outer container's width and
positioning classes.

**R3 — The cluster panel must be a right-edge sidebar on wide viewports (AC2).**
Same panel, different appearance: `w-80` or another fixed width, tall enough to reach
the bottom (`h-full` already exists), without overlapping earthquake markers. The
gap between the panel and the map marker area is a canvas decision (OQ3).

**R4 — On tablet portrait, the filter panel must auto-hide when the cluster panel opens,
and reappear when the cluster panel closes (AC3).**
This requires a bidirectional communication channel: the cluster panel's open/closed
state must reach `FilterPanel` so it can toggle its visibility. Today `FilterPanel`
receives no such signal from `MapView` or `useClusterPanel`. How this signal flows is
OQ2 (lifted state, context, or callback).

**R5 — On narrow viewports, the filter panel must be hidden by default and openable with
one tap (AC3).**
The filter panel is always visible at `top-4 left-4` when in the idle/loading/success
state. On narrow screens it must live in a tuck-away drawer or hamburger trigger.
The open/close trigger UI is a canvas decision (OQ5).

**R6 — On wide viewports the filter panel is always visible (AC3).**
No change from today's behaviour. The filter panel remains at `top-4 left-4`.

**R7 — Card click must not close the cluster panel on wide viewports (AC4).**
Today `handleCardClick` (`mapClickHandlers.ts`) calls `onClosePanel()` unconditionally.
The close call must be conditional on the viewport width. Options include: passing a
different `onCardClick` callback per breakpoint, or lifting the breakpoint check into
the callback closure.

**R8 — Card click must close the cluster panel on narrow and medium viewports (AC4).**
Same as today's behaviour. No change for narrow/medium.

**R9 — The map must fill all remaining space regardless of panel state (AC5).**
Today the map container uses `{ width: '100%', height: '100vh' }` and the cluster panel
is `absolute` positioned over it. The map does not need to resize when panels open or
close — the panels overlay the map. On wide screens where the cluster panel is a sidebar,
the map should shrink to occupy `100% - panel width`. The implementation approach (CSS
grid, flex, or absolute) is a canvas decision (OQ7).

---

## Panel behaviour by viewport

| Viewport | Filter panel                             | Cluster panel                  | Card click on panel      |
| -------- | ---------------------------------------- | ------------------------------ | ------------------------ |
| Narrow   | Hidden by default; one-tap to open (AC3) | Full-screen overlay (AC2)      | Close panel, popup (AC4) |
| Medium   | Auto-hides when cluster opens (AC3)      | Full-screen or partial (OQ4)   | Close panel, popup (AC4) |
| Wide     | Always visible, top-left (AC3)           | Right-edge sidebar, tall (AC2) | Popup, panel stays (AC4) |

The filter panel's _hidden by default_ vs _auto-hides when cluster opens_ distinction
is important: on narrow, the filter is never visible unless toggled; on medium, it is
normally visible but yields to the cluster panel. This is a different control flow.

---

## Filter ↔ cluster panel coordination

Today the filter panel lives in `App.tsx` and the cluster panel lives inside `MapView`.
They are siblings in the component tree but the cluster state is internal to `MapView`
(via `useClusterPanel`). No shared state or callback connects them.

For AC3 (medium), `FilterPanel` needs to know when the cluster panel is open so it can
auto-hide. This requires one of:

- Lift `panelLeaves` / an `isClusterPanelOpen` flag from `MapView` to `App`, and pass it
  as a prop to both `FilterPanel` and `MapView`.
- Pass a callback from `App` to `MapView` that `MapView` invokes when the panel opens or
  closes, storing the flag in `App` state.
- Use a lightweight context or store.

Each approach affects the component boundary. How `MapView`'s internal cluster panel
state reaches `FilterPanel` is OQ2.

---

## Risks and edge cases

**E1 — Hamburger drawer open + cluster panel open on narrow.**
If the filter drawer is opened while the cluster panel is already open (or vice versa),
the previously open panel closes. Only one overlay at a time — same rule as the medium
breakpoint filter↔cluster coordination. No stacking.

**E2 — Viewport resize while panels are open.**
A user on a tablet in portrait (medium) opens the cluster panel, which auto-hides the
filter. Then they rotate to landscape (wide). The cluster panel should transition to
sidebar mode, and the filter should reappear. The transition must handle the resize
smoothly — debounced or immediate — without dropping panel state. OQ8 covers the
resize-detection mechanism.

**E3 — Cluster panel open at cluster click, then user opens filter on narrow.**
AC3 says the filter is hidden by default and one-tap to open. If the cluster panel is
already open (full-screen), opening the filter would produce two full-screen overlays.
The ACs do not specify whether the cluster panel should close or the two stack. Same
as E1 — the canvas must decide.

**E4 — `renderWorldCopies: false` causes the map to show a blank edge at low zoom.**
When `renderWorldCopies` is disabled and the user zooms/pans far enough, the map ends
and a grey background appears. AC1 does not require the map to always fill horizontally;
it only requires no duplicate world. The grey edge is acceptable MapLibre behaviour.

**E5 — Card click on wide: popup + panel overlap.**
AC4 says the panel stays open and the popup appears on top. The popup will overlap part
of the panel. The popup's auto-positioning should avoid the panel and the edge of the
map. MapLibre's `Popup` placement logic may place the popup over the panel if the
clicked coordinate is near the right edge. Whether this is acceptable, or whether the
popup should be offset, is OQ9.

---

## What this story does NOT touch

- **Year limits in filter validation** — separate story.
- **NavigationControl (zoom buttons)** — separate UX story.
- **Message colours / theming** — separate UX story.
- **Dark mode** — out of scope per the story.
- **Fetching and filtering (Story 1):** `useEarthquakeQuery`, `withRetry`, validation,
  and `errorMessages.ts` are unchanged. The filter panel's form behaviour is unchanged;
  only its layout classes change.
- **Magnitude styling (Story 2):** palette, radius expressions, and paint logic are
  unchanged.
- **Popup content (Story 3):** `buildPopupContent`, `formatEarthquakeTime`,
  `isEqProps`, and the MapLibre `Popup` lifecycle are unchanged.
- **Cluster logic (Story 4):** `useClusterPanel`, `mapLeavesToEarthquakes`,
  `getClusterLeaves`, cluster layer definitions, and the click model are unchanged
  except for the card click's conditional `onClosePanel` call (R7).
- **ESLint max-lines config:** the analysis file may cause lint issues if added but
  the actual code changes are in layout classes and map options only.

---

## Open questions for the canvas

None of these has been answered here; all must be resolved by the canvas before implementation:

1. **Breakpoint pixel values.** What three (or two) breakpoint widths define narrow / medium / wide? Tailwind's default `sm`/`md`/`lg` (`640px`, `768px`, `1024px`) is one option; custom values are another.
2. **How cluster panel state reaches FilterPanel.** Lift `isClusterPanelOpen` to `App`? Pass a callback from `App` to `MapView`? Use React context?
3. **Cluster panel width on wide.** Current `w-80` (320px). Same, wider, or responsive?
4. **Cluster panel layout on medium (tablet portrait).** Full-screen like narrow, or partial like wide? If partial, what width?
5. **Filter panel open/close trigger on narrow.** Hamburger icon? Floating button? Swipe gesture? Also, what icon/position for the filter toggle?
6. **Conditional card-click signal.** How does the card click handler know the viewport breakpoint? Via a responsive hook inside `MapView` (passing different `onCardClick` closures) or via a flag passed down from `App`?
7. **Map resizing on wide sidebar mode.** Should the map shrink via CSS (`calc(100% - panelWidth)`) or remain full-width with the panel overlaying it? Overlaying is the current approach (absolute positioning).
8. **Resize-detection mechanism.** `window.matchMedia`, `ResizeObserver` on the wrapper, or a dedicated responsive hook? Determines how and when panel modes transition (E2).
9. **Popup placement when panel is open on wide.** Should the popup be offset left to avoid overlapping the cluster panel, or is the default placement acceptable?

---

## Acceptance criteria traceability

| AC  | Covered by                                                                                   |
| --- | -------------------------------------------------------------------------------------------- |
| AC1 | R1 (`renderWorldCopies: false`), E4 (grey edge is acceptable)                                |
| AC2 | R2 (full-screen on narrow), R3 (sidebar on wide), Panel behaviour table (medium row OQ4)     |
| AC3 | R4 (medium auto-hide), R5 (narrow one-tap), R6 (wide always visible), Filter↔cluster section |
| AC4 | R7 (wide: panel stays open), R8 (narrow/medium: panel closes), E5 (popup overlap risk)       |
| AC5 | R9 (map fills remaining space), OQ7 (resize strategy)                                        |
