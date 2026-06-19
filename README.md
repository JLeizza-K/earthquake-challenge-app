# Earthquake Map

Interactive map of recent earthquakes using data from the USGS Earthquake
Catalog. Filter by date range and magnitude, visualise severity through size
and colour, and click any event for details.

## Stack

- **React 19** + **Vite** — frontend framework and build tool
- **MapLibre GL JS** — map rendering (circle layers, no DOM markers)
- **Tailwind CSS v4** — utility-first styling
- **TypeScript** — type safety across the codebase
- **pnpm** — package manager
- **nginx** — production serving (via Docker)

## Methodology

This project follows **Spec-Driven Development (SPDD)**. Every feature starts
as a user story, goes through an analysis phase, and is specified in a canvas
before any code is written. Artifacts live in `spdd/`:

| Folder      | Contents                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------ |
| `stories/`  | User stories in the "As a… I want… So that…" format, with acceptance criteria                    |
| `analysis/` | Domain exploration, key rules, risks, and edge cases for each story                              |
| `canvas/`   | Executable specification: what we deliver, entities, approach, operations, norms, and safeguards |

Five stories have been completed: filter by date and magnitude (Story 1),
magnitude-based visual encoding (Story 2), earthquake detail popups
(Story 3), cluster panel with leaf browsing (Story 4), and responsive
layout across narrow, medium, and wide viewports (Story 5).

## Quick start (local)

```bash
pnpm install
pnpm dev
```

Open http://localhost:5173.

## Docker

```bash
docker build -t earthquake-challenge .
docker run -p 8080:80 earthquake-challenge
```

Open http://localhost:8080.

Multi-stage build (Node → nginx:alpine). No local dependencies required.

Or using the pnpm scripts:

```bash
pnpm docker:up    # build and start
pnpm docker:down  # stop and remove
```

## Running tests

```bash
pnpm test          # run all tests once
pnpm test:watch    # watch mode — re-runs on changes
```

Tests use Vitest (https://vitest.dev/) with jsdom for component tests.
Every feature ships with unit tests covering its acceptance criteria.
Pure logic (validation, mappers, URL building) is tested independently
of React.

## Available scripts

| Command               | Description                      |
| --------------------- | -------------------------------- |
| `pnpm dev`            | Development server (Vite)        |
| `pnpm build`          | Production build                 |
| `pnpm preview`        | Preview the production build     |
| `pnpm lint`           | ESLint                           |
| `pnpm format`         | Prettier                         |
| `pnpm test`           | Vitest (unit tests)              |
| `pnpm typecheck`      | TypeScript type checking         |
| `pnpm test:watch`     | Vitest in watch mode             |
| `pnpm format --check` | Prettier check (no write)        |
| `pnpm docker:up`      | Build Docker image and start     |
| `pnpm docker:down`    | Stop and remove Docker container |

## Known limitations & roadmap

### UX

- **Zoom on cluster card click** — clicking a card in the cluster panel
  should zoom the map until the earthquake separates from its cluster.
  Currently it opens the popup without zooming.
- **Date picker year limits** — the calendar input accepts any year;
  adding a lower bound of 1900 and an upper bound of the current year
  would prevent queries that return no results by definition.
- **Zoom controls** — no on-screen zoom buttons; users rely on scroll
  or pinch gestures only.

### Performance

- **React.memo** — high-frequency re-render paths (ClusterPanel cards,
  FilterForm fields) have not been memoised. Adding memo wrappers is
  recommended.

### Visual

- **Dark mode** — Tailwind's `dark:` prefix would cover UI components,
  but the map itself requires a separate dark style for MapLibre layers
  (or CSS filters on the canvas element). Both pieces are needed for a
  complete dark mode.
