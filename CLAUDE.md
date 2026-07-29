# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

See `SCOPE.md` for the founding vision statement — the long-term idea behind
this project, well beyond what's currently built. Not a spec, just the
north star for judging where features should eventually head. See
`ROADMAP.md` for the phased plan derived from it — check there for
what's next before starting new work. See `SPEC.md` for the technical
specification of how the engine currently works (world model, layout,
icon/placement rules, spatial nav, session model) — the concrete design
to keep in sync with the code, distinct from `SCOPE.md`'s vision and
`ROADMAP.md`'s plan. See `DEVELOPMENT.md` for the development
environment: prerequisites, setup, running, and how TUI changes get
verified (no test framework yet, so this matters more than usual).

## Project overview

This repo actually contains two unrelated things:

1. **`tui/`** — the real, active project. An Ink (React-for-terminals) app that
   models the solar system as a recursive "center + orbiting things" tree you
   navigate: Sun → planets → moons, Sun → asteroid belt → asteroids, Sun →
   comets hub → comets. Planets use real Keplerian orbital mechanics; moons
   and asteroids use a circular mean-motion approximation; comets solve the
   full Kepler equation (their eccentricity is too extreme for the circular
   approximation).
2. **`src/one/`, `tests/`, `pyproject.toml`** — a Python package skeleton
   from the initial repo scaffold. `src/one/__init__.py` and `tests/` are
   still empty and nothing has been built on top of them. Treat this as
   vestigial unless the user says otherwise — the TUI is where the work is.

`README.md` still only describes the Python skeleton and is stale in the same
way this file was; ask before rewriting it if you want it to match.

## `tui/` structure

- `src/index.tsx` — entry point, session bootstrap.
- `src/App.tsx` — main loop: arrow-key navigation, `/`-command mode
  (`help`, `back`, `save <text>`, `notes`, `whoami`, `quit`), local session
  persistence via `session.ts`.
- `src/worldTree.ts` — the core model. Given a node id, returns what orbits
  it (`getOrbitChildren`), plus id classification/labeling helpers
  (`getNodeKind`, `getCenterLabel`, `getBreadcrumbLabel`, `getDistanceDomain`).
  This is the one file that has to know about every body category, so new
  categories are wired in here.
- `src/orbital.ts` — real orbital elements + Kepler's equation solver
  (Newton's method) for the 8 planets.
- `src/planetFacts.ts`, `moonFacts.ts`, `ringFacts.ts`, `asteroidFacts.ts`,
  `beltFacts.ts`, `cometFacts.ts` — factual data per body category, each
  exposing an id union type + a `Record<Id, Facts>` + an `isXId` guard,
  following the same shape.
- `src/components/SolarView.tsx` — renders the orbit-grid ASCII view: a
  full-width tile of nothing but icons+labels (no text list — that's the
  bottom panel's job). Generic over `OrbitEntry`/`DistanceDomain`; new body
  categories need no changes here, just a `glyph` in `worldTree.ts`. Takes
  `gridWidth`/`gridHeight` as props (sized dynamically by `App.tsx` from
  the real terminal size) — **its box has `paddingX={1}` and a border, so
  `gridWidth` must already have 4 columns subtracted for those (2 border +
  2 padding), not just the border's 2. Getting this wrong doesn't error or
  warn — it silently corrupts the box's bottom border in this Ink version
  when a row's text overflows the actual content width.** See
  `DEVELOPMENT.md` for how this was diagnosed if it resurfaces.
- `src/spatialNav.ts` — `pickNextFocus`: given the currently-focused entry's
  plotted grid position and an arrow-key direction, picks whichever *other*
  entry is actually positioned that direction on screen (nearest-neighbor
  scoring, angle-order wraparound if nothing lies that direction). This is
  what makes navigation spatial instead of a hidden sorted-list cycle.
- `src/components/ContentView.tsx` — renders leaf detail screens (Surface /
  Orbit Log / Rings / Notes). Switches on `leaf.owner`'s type, so each new
  body category needs its own `<X>Surface>` / `<X>OrbitLog>` components and a
  branch added to the switch at the bottom.
- `src/layout.ts` — polar-to-grid math, distance scaling, plus
  `computeGridPositions` (single source of truth for where each entry
  lands on the grid — used by both `SolarView` for rendering and
  `spatialNav` for direction decisions) and the shared `toClockHour`.
- `src/session.ts` — local file-based session persistence. Its own comment
  says it's "a stand-in for the future multi-user server" — shape mirrors
  what a real server would hand out (session id + resume key).

Run it: `cd tui && npm install && npm start`
Typecheck: `cd tui && npm run typecheck`
No test framework is configured for the TUI yet.

## Current status (2026-07-29)

Committed and working: planets with real orbital mechanics, major moons,
gas/ice giant rings, the asteroid belt and its largest asteroids, and
comets (Halley, Encke, Hale-Bopp, Hyakutake) as a fourth Sun-child
category with full Kepler-orbit positions.

Layout was reworked this session from a small fixed-size grid + text list
into two full-width tiles: a top tile that dynamically fills the real
terminal (via Ink's `useWindowSize`) showing nothing but multi-character
icon+label pairs for every orbiting body, and a fixed-height bottom panel
holding the breadcrumb, the currently-focused body's o'clock/distance
readout, the log, and the command prompt. Navigation is now spatial
(arrow keys jump to whatever's actually up/down/left/right on screen via
`spatialNav.ts`) instead of cycling a hidden angle-sorted list. See
`DEVELOPMENT.md` for the Ink border-corruption pitfall hit and fixed
during this rework (box padding vs. content-width math).

Nothing in-progress/uncommitted right now — check `ROADMAP.md` Phase 2 for
what's next (dwarf planets, bots/NPCs, BBS-style messages, tests).

## Long-term roadmap

See `ROADMAP.md` — phased plan (Phase 1: core single-player loop, mostly
done; Phase 2: fill out the world, comets in progress now; Phase 3+:
multi-user server, accessibility, real-space grounding, narrative layer).
Update it as phases complete or scope shifts; keep this file's Current
status section for the tactical, uncommitted-right-now detail instead.

One item worth flagging here since it's not really a roadmap phase: the
Python skeleton (`src/one/`, `tests/`, `pyproject.toml`) is unrelated to the
TUI and has had zero work since the initial scaffold commit. Its fate
(repurpose vs. remove) should get decided at some point so the repo stops
describing two projects.

Since no test runner or linter is configured for either the Python skeleton
or the TUI, don't assume commands like `pytest`, `ruff`, or `eslint` are
available until they're added — check `pyproject.toml` / `tui/package.json`
first.
