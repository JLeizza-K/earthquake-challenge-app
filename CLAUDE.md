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
- Popups may use HTML structure for formatting, but API-sourced or user-derived data
  must be inserted via DOM `textContent` (or equivalent escaping), never interpolated
  into a raw HTML string (`innerHTML` / `setHTML`). The goal is XSS safety, not avoiding
  HTML.

## Error handling

- All user-facing error messages come from a single module: src/lib/errorMessages.js.
- No component, hook, or service may hardcode an error string shown to the user.
  They produce a typed error; only errorMessages.js maps it to display text.
- When a new error case needs custom handling, add it to errorMessages.js — never
  inline elsewhere.

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

### Ask before acting

- Ask before installing any new dependency not already agreed on.
- Ask before changing build config, ESLint/Prettier config, or package.json scripts.

### Design decisions require confirmation

A "design decision" is any choice that affects behavior, architecture, data shape, or
how something looks or reads to the user — and that is NOT already explicitly fixed in
the story, analysis, or Canvas. Examples that ALWAYS count as design decisions:

- Choosing one implementation technique over another when more than one would work
  (e.g. one layer vs two layers, blur vs stroke, linear vs step, inline vs extracted).
- Picking concrete values that shape UX (sizes, colors, thresholds, timings) when the
  source artifact did not specify them.
- Resolving a conflict between an artifact and existing code, or between two artifacts.
- Anything you would label internally as a "judgment call," "assumption," "default,"
  or "for simplicity."

Rules for design decisions:

- STOP and ask before resolving any of them. Do not pick a default and proceed.
- "The analysis implies it" or "it can be inferred" is NOT permission to decide. If the
  artifact does not state it explicitly, treat it as unconfirmed and ask.
- When you ask, present the options you see, the tradeoffs, and your recommendation —
  but wait for my choice before writing it into an artifact or code.
- If you already wrote something that involved an unconfirmed design decision, flag it
  explicitly in your summary as "DESIGN DECISION I made: X (alternatives: Y, Z)" so I
  can catch it. Never report a design decision silently as done.

- When a task is otherwise ambiguous, ask a clarifying question instead of guessing.
