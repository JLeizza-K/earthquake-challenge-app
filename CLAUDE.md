# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Project: Earthquake Map (challenge)

## Stack
- React + Vite
- MapLibre GL JS for the map (required, non-negotiable)
- Basemap: OpenFreeMap, style "liberty"
- ESLint + Prettier

## Package manager
Use **pnpm** (not npm or yarn).

## Commands
```bash
pnpm dev         # development server
pnpm build       # production build
pnpm preview     # preview the build
pnpm lint        # ESLint
pnpm format      # Prettier
```

## Methodology: SPDD
- We work story by story. Artifacts live in /spdd.
- GOLDEN RULE: if a requirement changes, update the Canvas in /spdd/canvas BEFORE touching code.
- Do not generate code for a feature without an existing Canvas for it.

## Conventions
- Fetch state as a state machine: a single "status" field with values `idle | loading | success | empty | error`.
- The map renders with a circle layer (source + layer), NOT DOM markers.
- The map is initialized ONCE (useRef to the container + useEffect). Do not recreate the map on every render.
- Popups use `setText`, not `setHTML` (XSS safety).

## Testing
- Every feature must ship with tests. No story is "done" without them.
- Use Vitest. Pure logic (validation, mappers, URL building) gets unit tests
  covering happy path, edge cases, and the relevant acceptance criteria.
- A story's tests must cover its acceptance criteria explicitly.

## Guardrails

### Deny rules
- Do not execute the following commands never without asking for permission and giving a warning: git, curl, rm.

### File protection
- NEVER overwrite or delete CLAUDE.md, README.md, or anything under spdd/.
- Before running any scaffolding or init command (e.g. create vite, npm init),
  check whether it will overwrite existing files. If so, STOP and ask first.
- Never edit files inside .git/, node_modules/, or any lockfile by hand.

### Scope discipline
- Make changes only within the scope of the current story.
- Do not refactor, rename, or touch files unrelated to the current task without asking.
- Do not implement features from future stories ahead of time.
- If a change requires touching more than the files we discussed, stop and explain first.

### Ask before acting
- Ask before installing any new dependency not already agreed on.
- Ask before changing build config, ESLint/Prettier config, or package.json scripts.
- When a task is ambiguous, ask a clarifying question instead of guessing.

### Code conventions
- Follow the ESLint hard rules. Do not disable a lint rule to make code pass without flagging it to me.
- No secrets, API keys, or credentials in the codebase.
- Do not add comments that just restate the code; explain "why", not "what".
- Prefer small, single-purpose functions and descriptive names.
- Keep always an eye out on security. Avoid known vulnerabilities and escape cross-site scripting, prompt injection, and SQL injection as frequently as possible.

### Git
- Never run git push, git commit, or any destructive git command (reset --hard, clean -fd) without me asking explicitly.
- Never commit node_modules/, .env, or build output.

### Definition of done
- Before declaring any feature or implementation complete, run `pnpm lint` and `pnpm format --check`.
  Both must pass with no errors. If either fails, fix the issues first and do not report success until they do.

### Honesty
- If you are unsure whether something works, say so — do not claim it works without verifying. Always check twice before making a statement.
- Do not invent file paths, library APIs, or function names. If you don't know, check or ask.
