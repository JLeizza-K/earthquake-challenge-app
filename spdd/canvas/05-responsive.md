# Canvas — Story 5: Responsive layout — panels adapt to the device

---

## R — Requirements

### What we deliver

- `renderWorldCopies: false` on the map constructor so the right edge is clean for the cluster panel (AC1).
- Cluster panel layout adapts: full-screen on narrow (`absolute inset-0`), right-edge sidebar on wide (`absolute right-0 top-0 h-full w-80`), and full-screen on medium (tablet portrait) — matching the narrow behaviour (AC2).
- Filter panel layout adapts: on narrow it is hidden by default and openable via a hamburger toggle; on medium it auto-hides when the cluster panel opens and reappears when it closes; on wide it is always visible at `top-4 left-4` (AC3).
- Card click on wide viewports (≥ 1024 px) keeps the cluster panel open alongside the popup; on narrow and medium (< 1024 px) it closes the panel (AC4).
- The map always fills the remaining viewport space — no layout shift, no clipping (AC5).

### Out of scope (explicit)

- Year limits in filter validation → separate story.
- NavigationControl (zoom buttons) → separate UX story.
- Message colours / theming → separate UX story.
- Dark mode → out of scope per the story.
- No changes to fetching (Story 1), magnitude styling (Story 2), popup content (Story 3), or cluster logic (Story 4) — except the card click's conditional `onClosePanel` call.

### Definition of done (AC mapping)

| AC  | Condition                                       | Pass when                                                                       | Verified by |
| --- | ----------------------------------------------- | ------------------------------------------------------------------------------- | ----------- |
| AC1 | Map at any zoom level                           | Only one world copy visible — `renderWorldCopies: false` set on map constructor | Interaction |
| AC2 | Cluster panel open on narrow                    | Panel fills entire screen (`absolute inset-0`)                                  | Interaction |
| AC2 | Cluster panel open on wide                      | Panel is right-edge sidebar, full height, does not hide markers                 | Interaction |
| AC3 | Filter panel on narrow                          | Hidden by default; hamburger tap opens it                                       | Interaction |
| AC3 | Filter panel on medium, cluster opens           | Filter auto-hides; reappears when cluster closes                                | Interaction |
| AC3 | Filter panel on wide                            | Always visible in top-left position                                             | Interaction |
| AC4 | Cluster panel open on wide, card click          | Panel stays open; popup appears on top                                          | Interaction |
| AC4 | Cluster panel open on narrow/medium, card click | Panel closes; popup opens                                                       | Interaction |
| AC5 | Any combination of open/closed panels           | Map fills remaining space — not clipped or pushed off-screen                    | Interaction |

---

## E — Entities

### `ClusterPanelOpenContext` (co-located with cluster module)

A React context that carries a single boolean: `true` when the cluster panel is open, `false` otherwise. The context is defined and exported from the cluster module (co-located with `useClusterPanel` or `ClusterPanel`). `App` owns the state, writes via a provider, and `FilterPanel` reads it to decide auto-hide behaviour on medium. No additional payload.

```
type ClusterPanelOpenContextValue = boolean
```

### `FilterDrawerState` (local to `FilterPanel`)

A plain `useState<boolean>` in `FilterPanel`. `true` when the hamburger drawer is open on narrow or medium. Reset to `false` when the cluster panel opens on medium (via the context listener). On narrow the drawer and the cluster panel are mutually exclusive — opening one closes the other.

### Viewport breakpoint (runtime, not stored)

Determined inline via `window.innerWidth`:

- **Narrow:** `< 640 px`
- **Medium:** `≥ 640 px` and `< 1024 px`
- **Wide:** `≥ 1024 px`

The breakpoint is computed at event time (card click, panel toggle) and inside `ClusterPanel` / `FilterPanel` render for CSS behaviour. No breakpoint state is stored.

### Breakpoint Tailwind class mapping

| Viewport | Cluster panel                             | Filter panel                                            |
| -------- | ----------------------------------------- | ------------------------------------------------------- |
| Narrow   | `fixed inset-0 z-20`                      | hidden by default; hamburger toggles drawer             |
| Medium   | `fixed inset-0 z-20`                      | `absolute top-4 left-4 z-[1]`; auto-hide via visibility |
| Wide     | `absolute right-0 top-0 h-full w-80 z-10` | `absolute top-4 left-4 z-[1]` (always visible)          |

### Card-click delegate (in `mapClickHandlers.ts`)

`handleCardClick` gains a conditional guard: it calls `onClosePanel()` only when `window.innerWidth < 1024` (narrow or medium). On wide the panel stays open; the popup still opens and `map.easeTo` still runs.

---

## A — Approach

### `renderWorldCopies: false` (R1)

Add `renderWorldCopies: false` to the `Map` constructor call in `MapView.tsx`. Single-line change. No runtime toggle.

### Responsive cluster panel (R2, R3, OQ4)

`ClusterPanel` receives an optional `onToggleFilter` callback (or the outward open/close signal is managed via the context). The outer container classes switch based on the viewport:

- Narrow (`< 640px`) and medium (`≥ 640px` and `< 1024px`): `fixed inset-0 z-20` — full-screen overlay.
- Wide (`≥ 1024px`): `absolute right-0 top-0 h-full w-80 z-10` — same as today.

The classes can be chosen via a `useMemo` inside `ClusterPanel` that reads `window.innerWidth`, or via Tailwind responsive prefix classes. Since `ClusterPanel` is `position: absolute` inside `MapView`'s relative container, the switch to `fixed` on narrow/medium is needed to escape the container and cover the full viewport. On wide it remains `absolute` within the map container.

### Responsive filter panel with hamburger (R5, OQ5)

`FilterPanel` gains:

1. A local `isDrawerOpen` state (`useState<false>`).
2. A `useEffect` that responds to `ClusterPanelOpenContext` — on medium, when the cluster panel opens, set `isDrawerOpen = false`.
3. A hamburger button (`<button>☰</button>` or SVG) visible on narrow and medium only, positioned at `top-4 left-4 z-[2]`.
4. The filter panel body is wrapped in a conditional that either renders it inline (wide), as a drawer overlay (narrow + drawer open), or collapsed (narrow without drawer open, or medium while cluster is open).

On wide: the hamburger is hidden; the filter panel renders at its normal position.

On narrow: the hamburger is always visible. Tapping it toggles `isDrawerOpen`. When open, the drawer renders as `fixed inset-0 z-20` covering the map. If the cluster panel is already open, toggling the hamburger closes the cluster panel first (calls `onCloseClusterPanel` or resets context).

On medium: the hamburger is visible only when the filter body is hidden (cluster panel open). When the cluster panel is closed and the filter is visible, no hamburger is shown — the filter toggle is redundant. When the cluster panel opens, the filter body hides and the hamburger appears; tapping it opens the filter drawer (which closes the cluster panel — same mutual-exclusion rule as narrow).

### Filter ↔ cluster coordination via Context (OQ2)

`App` owns `useState<boolean>` for `isClusterPanelOpen`. It passes `panelLeaves: Earthquake[] | null` and `onClusterPanelChange: (open: boolean) => void` as props to `MapView`. `MapView` calls `onClusterPanelChange` when `panelLeaves` changes. `App` renders a `<ClusterPanelOpenContext.Provider>` (context defined co-located with the cluster module) wrapping both children.

```
App  (owns isClusterPanelOpen state)
 ├─ FilterPanel  ← reads ClusterPanelOpenContext to auto-hide on medium
 └─ MapView      ← receives panelLeaves + onClusterPanelChange as props
     └─ ClusterPanelOpenContext.Provider value={isClusterPanelOpen}
```

`MapView` does NOT write the context directly. It receives `panelLeaves` as a prop and emits `onClusterPanelChange` upward. `App` updates its state and the provider propagates the value to `FilterPanel`.

### Conditional card click (R7, R8, OQ6)

`handleCardClick` in `mapClickHandlers.ts` now guards `onClosePanel`:

```ts
if (window.innerWidth < 1024) {
  onClosePanel();
}
// El resto del flujo sigue igual que hoy (openAtCoords)
```

No breakpoint argument is threaded through the component tree. `window.innerWidth` is read at click time, which is correct for all resize scenarios (E2).

### No map resize on sidebar (OQ7)

The map container remains `{ width: '100%', height: '100vh' }`. The cluster panel overlays it on all viewports. On wide, the panel is `absolute right-0` covering 320 px — the map does not shrink. AC5 ("map fills remaining space") is satisfied because the map fills its container, and the panel overlays it. No CSS grid or calc needed.

### Resize handling (OQ8)

Not needed with the chosen approach:

- Card click reads `window.innerWidth` at event time — always current.
- CSS responsive classes (Tailwind `sm:`/`md:`/`lg:`) are applied at render time — React re-renders on state changes, and on resize the classes react automatically.
- If panels are open during a resize (E2), the next render picks up the new Tailwind class set. No debounce or matchMedia listener needed.

No dedicated resize-detection hook.

### Popup placement on wide (OQ9)

Default MapLibre `Popup` placement. The popup may overlap the panel if the clicked feature is near the right edge — accepted and documented. No offset.

### Mutual exclusion on narrow/medium (E1, E3)

Both panels enforce: only one overlay at a time. The rule is:

- Opening the filter drawer on narrow/medium closes the cluster panel (if open).
- Opening the cluster panel on narrow/medium closes the filter drawer (if open).

Implemented via:

- Filter drawer toggle calls a `onCloseClusterPanel` prop (from `App` via `MapView`) before opening.
- `MapView`'s `handleClick` (which opens the panel) sets `panelLeaves` — `FilterPanel`'s context listener then resets `isDrawerOpen`.

### Filter auto-hide on medium preserves form state

On medium, when the filter auto-hides (cluster panel opens), the filter form DOM is kept alive but visually hidden (`invisible` or `opacity-0 pointer-events-none` — not `display: none` or conditional render). This preserves all input values and refs. When the cluster panel closes, the filter reappears in the same state.

### Hamburger button visibility

Visible on narrow (always) and on medium only when the filter body is hidden (cluster panel open). On wide (`lg:` breakpoint), the hamburger is `hidden` and the filter is always visible.

---

## S — Structure

### Files that change

**`src/App.tsx`** — introduces `useState<boolean>` for `isClusterPanelOpen`, owns `panelLeaves: Earthquake[] | null` state (lifted from `MapView`). Passes `panelLeaves` and `onClusterPanelChange: (open: boolean) => void` as props to `MapView`. Renders `<ClusterPanelOpenContext.Provider>` (context co-located with cluster module) around both children, providing `isClusterPanelOpen` to `FilterPanel`.

**`src/components/MapView.tsx`** — receives `panelLeaves: Earthquake[] | null` and `onClusterPanelChange: (open: boolean) => void` as props instead of managing panel state internally. Adds `renderWorldCopies: false` to map constructor. Calls `onClusterPanelChange(leaves !== null)` in the `useEffect` and `setPanelLeaves` callbacks. The `handleCardClick` callback passed to `ClusterPanel` is a wrapper that conditionally calls `onClosePanel()` based on `window.innerWidth`.

**`src/components/ClusterPanel.tsx`** — outer container classes switch between `fixed inset-0 z-20` (narrow/medium) and `absolute right-0 top-0 h-full w-80 z-10` (wide). Responsive via Tailwind breakpoint prefixes or a `useMemo` + `window.innerWidth` check. On narrow and medium, the panel is `fixed` to escape the map container and cover the full viewport. Accepts optional `onCloseFilterPanel` prop (to close filter drawer when cluster panel opens on narrow).

**`src/components/FilterPanel.tsx`** — gains local `isDrawerOpen` state, hamburger toggle button, `useEffect` reading `ClusterPanelOpenContext` to auto-hide on medium, and responsive class switching. Form body uses `invisible`/`opacity-0` (not conditional render) on medium auto-hide to preserve state. On narrow, the drawer renders `fixed inset-0 z-20`. Accepts `onCloseClusterPanel` prop from `App`.

**`src/lib/mapClickHandlers.ts`** — `handleCardClick` guards `onClosePanel` with `if (window.innerWidth < 1024)` — on wide (≥ 1024) the panel stays open. No signature change.

### Files that do NOT change

`src/lib/errorMessages.ts`, `src/lib/api.ts`, `src/lib/mappers.ts`, `src/lib/validation.ts`, `src/lib/earthquakePopup.ts`, `src/hooks/useEarthquakeQuery.ts`, `src/components/StatusBanner.tsx`, `src/components/FilterForm.tsx`, all config files.

---

## O — Operations

### Panel behaviour by viewport

| Viewport | Filter panel                                                                                                              | Cluster panel                                | Card click on panel      | Mutual exclusion                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------ | ---------------------------------------------------------------- |
| Narrow   | Hamburger visible. Hidden by default. Drawer `fixed inset-0` when open. Form state preserved when closed                  | Full-screen overlay (`fixed inset-0 z-20`)   | Close panel, popup       | Only one overlay at a time                                       |
| Medium   | Hamburger visible only when cluster open (filter hidden). Visible when cluster closed. Auto-hides (`invisible`) otherwise | Full-screen overlay (`fixed inset-0 z-20`)   | Close panel, popup       | Cluster open → filter hides; filter drawer open → cluster closes |
| Wide     | Hamburger hidden. Always visible `top-4 left-4`                                                                           | Right-edge sidebar (`absolute right-0 w-80`) | Popup opens, panel stays | Not applicable (both visible)                                    |

### Hamburger button lifecycle

| Trigger                                              | Counterpart behaviour                            |
| ---------------------------------------------------- | ------------------------------------------------ |
| Tap hamburger (cluster closed) on narrow             | Opens filter drawer                              |
| Tap hamburger (cluster open) on narrow               | Closes cluster panel, opens filter drawer        |
| Tap hamburger (cluster open) on medium               | Closes cluster panel, opens filter drawer        |
| Cluster click (filter drawer open) on narrow         | Closes filter drawer, opens cluster panel        |
| Cluster click (filter drawer open) on medium         | Closes filter drawer, opens cluster panel        |
| Cluster click (filter visible) on medium             | Filter auto-hides (`invisible`), state preserved |
| Cluster panel close (filter auto-hid) on medium      | Filter reappears (same state)                    |
| Cluster panel close (filter drawer closed) on narrow | No change (filter stays hidden)                  |
| Cluster panel close (filter drawer open) on narrow   | Filter drawer stays open                         |

---

## N — Norms

### ESLint hard rules

- Max 25 lines/function, max 5 parameters, complexity ≤ 10, max 200 lines/file.
- `App.tsx` currently minimal — adding context state and provider wrapping must stay under 200 lines.
- `MapView.tsx` is already tight (200 lines after Story 4 refactor). Adding `onClusterPanelChange` wiring, conditional card click wrapper, and `renderWorldCopies` must not exceed the limit. Extract helpers or use inline callbacks.
- `FilterPanel.tsx` is new to responsive logic — keep it under 200 lines. The hamburger, drawer, and responsive class logic can remain in one file.
- `ClusterPanel.tsx` — the responsive class switch is small; keep it under 200 lines.

### Testing (this story)

Responsive behaviour is inherently visual and depends on viewport size. Automated tests:

- **`ClusterPanelOpenContext` behaviour** — minimal unit test verifying the context provides the expected boolean and updates propagate.

**Interaction-verified (not automated):** AC1, AC2, AC3, AC4, AC5 (viewport-dependent layout). Manual testing across three viewport sizes in browser dev tools.

### Integration notes

- On medium, `FilterPanel` uses CSS `invisible` + `pointer-events-none` (not conditional `&&`) for auto-hide so form state (input values, refs) is preserved. Resetting `isDrawerOpen` is fine — the drawer and the auto-hide are separate visuals.
- The hamburger icon: use an accessible `<button>` with `aria-label="Toggle filter panel"`. The icon can remain `☰` (Unicode) for this story; a future UX story may replace it with an SVG.
- `renderWorldCopies: false` is set once at construction; no runtime toggle. Verify the grey edge at low zoom (E4) is acceptable.

---

## S — Safeguards

These are non-negotiable. No implementation may bypass them.

1. **`renderWorldCopies: false` is set on the map constructor.** No runtime toggle — set once at init. The grey edge at low zoom (E4) is acceptable MapLibre behaviour.

2. **Filter form state is preserved on medium auto-hide.** The form DOM is kept alive (`invisible` + `pointer-events-none`, not `display: none` or conditional render). Input values, refs, and validation state survive cluster panel open/close cycles.

3. **No stacking of overlays on narrow/medium.** Opening the filter drawer closes the cluster panel; opening the cluster panel closes the filter drawer. Only one overlay at a time.

4. **Card click on wide does not close the cluster panel.** `onClosePanel` in `handleCardClick` is only called when `window.innerWidth < 1024`. On wide (≥ 1024) the panel stays open — browse-while-detail interaction.

5. **Cluster panel layout on narrow/medium uses `fixed` positioning** (not `absolute`) to escape the map container and cover the full viewport. On wide it uses `absolute` within the map container.

6. **No new dependencies.** React Context is built-in. No additional npm packages for responsive behaviour. Tailwind responsive prefixes are already available.

7. **No secrets, API keys, or credentials.** The story touches only UI layout, map options, and a new context — no data, no network.
