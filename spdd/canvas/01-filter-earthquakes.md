# Canvas — Story 1: Filter and view earthquakes

---

## R — Requirements

### What we deliver

- Filter form with three fields: `starttime`, `endtime`, `minMagnitude`.
- Client-side validation before any request is made.
- Fetch from the USGS FDSNWS event endpoint and render results as circle points on the map.
- Loading, empty, and error states with defined UI copy.

### Out of scope (explicit)

- Marker sizing by magnitude → Story 2
- Popups → Story 2
- Responsive layout → Story 3
- Caching → bonus

### Definition of done (AC mapping)

| AC  | Condition                               | Pass when                                          |
| --- | --------------------------------------- | -------------------------------------------------- |
| AC1 | start date after end date               | Field-level error shown; no request fired          |
| AC2 | Missing field or magnitude out of range | Field-level error shown; no request fired          |
| AC3 | Valid filters, results found            | Loading indicator shown; points rendered on map    |
| AC4 | Valid filters, no results               | "No earthquakes found" message; no points rendered |
| AC5 | API failure or unreachable              | Error message shown; user can retry                |
| AC6 | Invalid input (letters, special chars)  | Field-level error shown; no request fired          |

---

## E — Entities

```
FilterCriteria {
  starttime:    string        // YYYY-MM-DD, user input
  endtime:      string        // YYYY-MM-DD, user input
  minMagnitude: number        // 0–10 inclusive
}

Earthquake {
  place:       string
  mag:         number | null  // null is valid — kept as-is in Story 1
  time:        number         // Unix ms
  coordinates: [number, number, number]  // [lng, lat, depth]
}

QueryResult {
  earthquakes:  Earthquake[]
  skippedCount: number        // features dropped due to null/missing geometry
}

FetchState = 'idle' | 'loading' | 'success' | 'empty' | 'error'
```

`attemptCount: number` (1–3) is carried alongside `FetchState` inside `useEarthquakeQuery`
to distinguish first load from retries in the UI — it is not a separate state.

---

## A — Approach

**Client-side fetch, no backend.** The USGS API allows cross-origin requests; we build
the URL on the client and fetch directly. No proxy, no server.

**Single source of truth for FetchState.** `App` owns `FetchState` and `FilterCriteria`
via the `useEarthquakeQuery` hook. Both `MapView` and `FilterPanel` are children of `App`,
so state is threaded down as props — no context, no store needed at this scale.

**MapView as a pure receiver.** `MapView` receives `earthquakes[]` as a prop and syncs
them to the map source inside a `useEffect`. No imperative handle (`useImperativeHandle`)
is needed because `App` is the coordinator.

**GeoJSON source + circle layer, uniform size in Story 1.** The layer structure is
forward-compatible with magnitude-based sizing in Story 2 (paint expressions are already
supported by MapLibre; we simply use a constant value now).

**Automatic retry for transient errors.** 3 total attempts, 1s/2s backoff, retryable on
network failure / timeout / HTTP 5xx / HTTP 429. Non-retryable on HTTP 4xx ≠ 429 (e.g.
a 400 from an invalid or too-large date range goes straight to error with no retries).

**Deployment:** The app is a static build served by nginx in a multi-stage Docker image
(Node build stage → nginx:alpine serve stage). nginx serves the compiled SPA only; USGS
calls still go directly from the browser, so this does NOT introduce a backend or proxy
in the data path — it stays consistent with the client-side-fetch approach. The Dockerfile
and nginx config are infrastructure artifacts that live at the repo root, not part of this
story's code.

**Tradeoffs accepted:**

- Large date ranges may produce slow responses or a USGS HTTP 400. We surface this as an
  error state with a clear message; we do not add client-side range limiting in Story 1.
- No caching: every submit fires a fresh request. Deferred to bonus.

---

## S — Structure

### Component tree

```
App                        (owns FetchState + FilterCriteria via useEarthquakeQuery)
├── MapView                (prop: earthquakes[])
└── FilterPanel            (props: status, attemptCount, criteria, errors, onSubmit)
    ├── FilterForm         (controlled; props: values, errors; emits: onSubmit)
    └── StatusBanner       (presentational; props: status, attemptCount)
```

### Hook

**`src/hooks/useEarthquakeQuery.js`**
Owns: `FilterCriteria`, `status: FetchState`, `earthquakes: Earthquake[]`,
`attemptCount: number`, `requestId` counter, per-attempt timeout logic.
Exposes: `{ status, earthquakes, attemptCount, criteria, submit, retry }`.

`retry` reuses the last submitted `FilterCriteria`; it does not re-open the form.

### Services and lib modules

| Module                  | Exports                                                         |
| ----------------------- | --------------------------------------------------------------- |
| `src/lib/validation.js` | `validateFilters(criteria)`                                     |
| `src/lib/api.js`        | `buildQueryUrl(criteria)`, `fetchEarthquakes(criteria, signal)` |
| `src/lib/mappers.js`    | `toEarthquakes(featureCollection)`                              |

---

## O — Operations

Numbered in execution order. Each is independently testable.

**1. `validateFilters(criteria: FilterCriteria) → { valid: boolean, errors: Record<string, string> }`**

- Check each field is present and non-empty.
- Check `starttime` and `endtime` are valid calendar dates (no letters / special chars).
- Check neither date is in the future.
- Check `starttime` ≤ `endtime`.
- Check `minMagnitude` is numeric and within [0, 10].
- Returns `{ valid: true, errors: {} }` or `{ valid: false, errors: { fieldName: 'message' } }`.
- Pure function, no side effects.

**2. `buildQueryUrl(criteria: FilterCriteria) → string`**

- Appends `T23:59:59` to `criteria.endtime` to make the end day inclusive
  (USGS treats a bare date as `00:00:00 UTC`).
- Returns the full USGS FDSNWS URL:
  `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime={starttime}&endtime={endtime}T23:59:59&minmagnitude={minMagnitude}`

**3. `fetchEarthquakes(criteria: FilterCriteria, signal: AbortSignal) → Promise<GeoJSON FeatureCollection>`**

- Calls `buildQueryUrl(criteria)` to construct the URL.
- Per-attempt timeout: **10 seconds** (implemented via `AbortSignal.timeout` or equivalent).
- Retry policy (3 total attempts):
  - Retryable: network failure, timeout, HTTP 5xx, HTTP 429 → wait 1s (retry 1) or 2s (retry 2), then retry.
  - Non-retryable: HTTP 4xx ≠ 429 → throw immediately, no retries.
  - After 3 failed retryable attempts → throw.
- Throws on any terminal failure; caller maps the error to `FetchState = 'error'`.

**4. `toEarthquakes(featureCollection) → { earthquakes: Earthquake[], skippedCount: number }`**

- Iterates over `featureCollection.features`.
- Drops any feature where `feature.geometry` is null or missing (`skippedCount++`).
- Keeps features where `feature.properties.mag` is null — uniform circle size in Story 1 means no rendering impact.
- Maps each kept feature to `Earthquake { place, mag, time, coordinates }`.
- **Never throws.** All null/missing property access is guarded.

**5. FetchState transitions (inside `useEarthquakeQuery`)**

- On `submit(criteria)`:
  - Run `validateFilters`. If invalid: stay `idle`, surface errors to `FilterPanel`. No fetch.
  - If valid: increment `requestId`, set `status = 'loading'`, `attemptCount = 1`, call `fetchEarthquakes`.
- On successful response (and `requestId` still current):
  - `toEarthquakes(response)` → if `earthquakes.length > 0`: `status = 'success'`; else: `status = 'empty'`.
- On retryable failure: increment `attemptCount`, wait backoff, retry. UI shows "Retrying…" label.
- On terminal failure (retries exhausted or non-retryable): `status = 'error'`. The form retains the `FilterCriteria` the user submitted — inputs are not cleared. `FilterPanel` syncs its local field state from the stored `criteria` prop rather than resetting.
- On stale response (`requestId` mismatch): discard silently, make no state change.
- On `retry()`: reuse last submitted `FilterCriteria`, reset `attemptCount = 1`, set `status = 'loading'`.

**6. Map source and layer setup (inside `MapView`, on `map.on('load')`)**

- `map.addSource('earthquakes', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })`
- `map.addLayer({ id: 'earthquakes', type: 'circle', source: 'earthquakes', paint: { 'circle-radius': 5, 'circle-color': '#e74c3c', 'circle-opacity': 0.8 } })`

**7. Guarded `setData` (inside `MapView`, in the `useEffect` watching `earthquakes` prop)**

- Before calling `map.getSource('earthquakes').setData(...)`:
  - Check `map.loaded() === true`.
  - Check `map.getSource('earthquakes') !== undefined`.
  - If either check fails, skip silently (guards against a fast response resolving before `map.load`).
- Convert `earthquakes[]` back to a GeoJSON `FeatureCollection` and pass to `setData`.
- On `empty` result: `setData({ type: 'FeatureCollection', features: [] })` clears the layer.

---

## N — Norms

### ESLint hard rules (enforced, do not disable without flagging)

- Max 25 lines per function (`skipBlankLines`, `skipComments`)
- Max 5 parameters per function
- Cyclomatic complexity ≤ 10
- Max 200 lines per file

### State conventions

- A single `status` field drives all UI branches.
- No parallel boolean flags (`isLoading`, `hasError`, `isEmpty`, etc.).

### Code style

- Small, single-purpose functions with descriptive names.
- No comments that restate the code — only comments that explain _why_.

### UI copy (fixed strings — do not vary)

| State                             | Copy                                                         |
| --------------------------------- | ------------------------------------------------------------ |
| `loading`, `attemptCount = 1`     | "Loading…"                                                   |
| `loading`, `attemptCount = 2`     | "Retrying (1/2)…"                                            |
| `loading`, `attemptCount = 3`     | "Retrying (2/2)…"                                            |
| `empty`                           | "No earthquakes found"                                       |
| `error` (after retries exhausted) | "Please try again in a few minutes."                         |
| `error` (non-retryable, e.g. 400) | "The request was invalid. Check your filters and try again." |

### Testing (this story)
- **`validateFilters`**: cover AC1 (start > end), AC2 (missing / out-of-range), AC6 (non-date / non-numeric input), future-date rejection, and the valid case.
- **`buildQueryUrl`**: assert `endtime` always gets `T23:59:59` appended (Safeguard 4).
- **`toEarthquakes`**: cover null/missing geometry (dropped + `skippedCount`), null mag (kept), and that it never throws on malformed input (Safeguard 8).
- **`fetchEarthquakes`**: retry fires on transient errors, does NOT fire on 4xx ≠ 429, and respects the 3-attempt limit.

---

## S — Safeguards

These are non-negotiable. No implementation may bypass them.

1. **No request on invalid input (AC1 / AC2 / AC6).** `validateFilters` must return `{ valid: true }` before any call to `fetchEarthquakes`. A failed validation keeps `status = 'idle'` and surfaces field-level errors.

2. **Empty is a success state, never an error (AC4).** When the USGS response is valid but contains zero features, `status` transitions to `'empty'`, not `'error'`. These are distinct branches in `useEarthquakeQuery`.

3. **Only the latest request may update the map.** Each call to `submit` increments a `requestId`. Any response whose `requestId` does not match the current value is silently discarded before any state or map update.

4. **`endtime` is always made inclusive.** `buildQueryUrl` appends `T23:59:59` to `endtime` unconditionally. There is no code path where a bare date reaches the USGS URL for `endtime`.

5. **Map-readiness guard before `setData`.** The `useEffect` in `MapView` must check `map.loaded() === true` and `map.getSource('earthquakes') !== undefined` before calling `setData`. If either check fails, the call is skipped.

6. **The map is initialized exactly once.** `MapView` uses `useRef` to hold the map instance and guards the `useEffect` with `if (mapRef.current) return`. The map is never recreated on re-render.

7. **Automatic retry fires only on transient errors.** `fetchEarthquakes` retries exclusively on: network failure, timeout, HTTP 5xx, HTTP 429. Any other HTTP 4xx bypasses the retry loop and throws immediately.

8. **`toEarthquakes` never throws.** All property accesses on raw USGS features are guarded. The function always returns `{ earthquakes: [], skippedCount: 0 }` at minimum, regardless of malformed input.

9. **On entering the error state, the form retains the FilterCriteria the user submitted — inputs are never cleared on failure.** `FilterPanel` syncs its local field state from the `criteria` prop rather than resetting to blank.
