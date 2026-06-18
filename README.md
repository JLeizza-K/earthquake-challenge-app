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

Three stories have been completed: filter by date and magnitude (Story 1),
magnitude-based visual encoding (Story 2), and earthquake detail popups (Story 3).

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

## Available scripts

| Command          | Description                  |
| ---------------- | ---------------------------- |
| `pnpm dev`       | Development server (Vite)    |
| `pnpm build`     | Production build             |
| `pnpm preview`   | Preview the production build |
| `pnpm lint`      | ESLint                       |
| `pnpm format`    | Prettier                     |
| `pnpm test`      | Vitest (unit tests)          |
| `pnpm typecheck` | TypeScript type checking     |
