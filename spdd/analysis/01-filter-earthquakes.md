# Analysis — Story 1: Filter and view earthquakes

## Domain concepts

- **FilterCriteria**: `{ starttime: string (YYYY-MM-DD), endtime: string (YYYY-MM-DD), minMagnitude: number }`.
  This is the user's "question" and is what we send to USGS.
- **Earthquake**: a single seismic event. From the USGS GeoJSON feature:
  `place` (string), `mag` (number | null), `time` (Unix ms), `coordinates` ([lng, lat]).
- **QueryResult**: the set of earthquakes for a FilterCriteria, plus count.
- **FetchState**: the request lifecycle as a state machine —
  `idle | loading | success | empty | error`.

---

## Key rules

- USGS FDSNWS event endpoint returns GeoJSON:
  `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=...&endtime=...&minmagnitude=...`
- Validation runs on the client BEFORE any request (fail fast).
- The map updates by replacing the data of an existing GeoJSON source,
  never by recreating the map or the layer.
- **endtime boundary**: USGS treats a bare date (e.g. `2024-01-15`) as `00:00:00 UTC`, which
  silently excludes events for the rest of that day. `endtime` must be made inclusive of the
  full day before building the URL.

---

## Startup behavior

- On load: the map renders with no earthquake data. The form starts blank. `FetchState` starts as `idle`.
- No auto-fetch on mount. No default date range. The first request fires only when the user submits the form.
- Optional polish: a subtle fade-in animation on map load (deferred, not required for AC delivery).

---

## Validation rules (from ACs)

| Field | Rule | Error trigger |
|---|---|---|
| `starttime` | Required, valid date, not in the future | Empty, non-date input, or future date (AC2, AC6) |
| `endtime` | Required, valid date, not in the future | Empty, non-date input, or future date (AC2, AC6) |
| `starttime` vs `endtime` | `starttime` must be ≤ `endtime` | Start after end (AC1) |
| `minMagnitude` | Required, numeric, range 0–10 | Empty, non-numeric, or out of range (AC2, AC6) |

Validation is purely synchronous — no async call. All errors are field-level (shown inline next to the field, not as a banner). On validation failure: no fetch is fired (AC1, AC2, AC6).

> **Note on minMagnitude range**: Real seismic magnitudes can be negative, but 0–10 is a deliberate
> UX constraint — values outside this range are either noise or extraordinary events that fall
> outside the tool's intended use.

---

## State machine

```
idle ──[submit + invalid]──▶ idle  (show field-level errors, fire no request)
idle ──[submit + valid]────▶ loading
                               │
                  ┌────────────┴──────────────────────────┐
                  │ (attempt 1)                            │
                  ▼                                        │
             [response ok, results > 0] ──▶ success        │
             [response ok, results = 0] ──▶ empty          │
             [non-retryable error*]     ──▶ error          │
             [retryable error, attempt < 3]                │
                  │  wait 1s (retry 1) / 2s (retry 2)     │
                  ▼                                        │
             loading (retrying, attempt 2 or 3) ──────────┘
             [retryable error, attempt = 3]     ──▶ error

error ──[manual resubmit]──▶ loading  (AC5)
success / empty ──[resubmit]──▶ loading
```

\* Non-retryable: HTTP 4xx except 429. See **Automatic retry policy** for the full rules.

Single `status` field drives all UI branches. No parallel boolean flags (`isLoading`, `hasError`, etc.).

**Race condition**: tag each fetch with an incrementing `requestId`. On response, discard if
`requestId` is not the latest. This prevents a slow older response from overwriting a newer one.

---

## Automatic retry policy

| Property | Value |
|---|---|
| Total attempts | 3 (1 initial + 2 automatic retries, no user intervention between them) |
| Retryable errors | Network failures, timeouts, HTTP 5xx, HTTP 429 (rate limit) |
| Non-retryable errors | HTTP 4xx except 429 (e.g. 400 for invalid/too-large range) → go straight to error |
| Backoff | 1s before retry 1, 2s before retry 2 |
| Per-attempt timeout | Each attempt has its own timeout (suggested 10s — exact value set in Canvas). A timeout counts as a retryable error. |
| After all 3 attempts fail | Enter `error` state. Restore the form with the original `FilterCriteria`. Show attention-grabbing message at top of the filter panel: "Please try again in a few minutes." |
| `attemptCount` | Exposed alongside `status` (values 1–3) so the UI can show "Retrying (1/2)…" / "Retrying (2/2)…" during automatic retries. |

Manual resubmit (AC5) remains available from the `error` state — the user can submit again at any time.

---

## UI state display

| Status | Behaviour |
|---|---|
| `idle` | Form enabled, no banner |
| `loading` (`attemptCount` = 1) | Semi-transparent grey overlay covers the filter panel; "Loading…" label centered; form disabled |
| `loading` (`attemptCount` > 1) | Same overlay; label shows "Retrying (1/2)…" or "Retrying (2/2)…" |
| `empty` | Attention-grabbing message at the **top** of the filter panel: "No earthquakes found" |
| `error` | Attention-grabbing message at the **top** of the filter panel with error detail + retry button (AC5) |
| `success` | No banner; points visible on map |

---

## Data mapping — USGS GeoJSON → app types

`toEarthquakes(featureCollection)` maps the raw USGS response. It **never throws**; it returns
`{ earthquakes: Earthquake[], skippedCount: number }`.

Null-data rules:

- **Null or missing geometry**: drop the feature (`skippedCount++`). A feature with no coordinates
  cannot be placed on the map.
- **Null `mag`**: keep the feature as-is. Story 1 uses a uniform circle size, so a null mag has
  no rendering effect. Magnitude-based sizing and any "magnitude unavailable" display belong to Story 2.
  A null mag is part of a successful response — re-querying returns the same data, so retry does not apply.

---

## Risks & edge cases

| Risk | Mitigation |
|---|---|
| Large date range → HTTP 400 | Non-retryable — straight to error state, no retries |
| Rapid resubmits (race condition) | `requestId` counter; discard stale responses |
| Features with missing geometry | Dropped by `toEarthquakes`; counted in `skippedCount` |
| Features with null mag | Kept as-is; uniform size in Story 1 means no rendering impact |
| Zero features is a valid success (not an error) | `empty` is a distinct status from `error` (AC4) |
| Network failure / HTTP 429 / HTTP 5xx | Retryable — see Automatic retry policy |
| Per-attempt timeout | Treated as retryable error — see Automatic retry policy |
| Response resolves before the map's `load` event fires | Guard before `setData`: verify the map is loaded and the `'earthquakes'` source exists; otherwise the call crashes. (Lower-probability now that there is no auto-fetch on mount, but kept as a safeguard.) |
| USGS CORS policy | USGS API allows cross-origin requests — no proxy needed |
