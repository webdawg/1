# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

See `SCOPE.md` for the founding vision statement — the long-term idea behind
this project, well beyond what's currently built. Not a spec, just the
north star for judging where features should eventually head. See
`ROADMAP.md` for the phased plan derived from it — check there for
what's next before starting new work.

## Project overview

This repo actually contains two unrelated things:

1. **`tui/`** — the real, active project. An Ink (React-for-terminals) app that
   models the solar system as a recursive "center + orbiting things" tree you
   navigate: Sun → planets → moons, Sun → asteroid belt → asteroids, Sun →
   comets (in progress). Positions use real Keplerian orbital mechanics for
   the planets and simpler circular approximations for moons/asteroids.
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
- `src/components/SolarView.tsx` — renders the orbit-grid ASCII view.
  Generic over `OrbitEntry`/`DistanceDomain`; new body categories need no
  changes here.
- `src/components/ContentView.tsx` — renders leaf detail screens (Surface /
  Orbit Log / Rings / Notes). Switches on `leaf.owner`'s type, so each new
  body category needs its own `<X>Surface>` / `<X>OrbitLog>` components and a
  branch added to the switch at the bottom.
- `src/layout.ts` — polar-to-grid math, distance scaling.
- `src/session.ts` — local file-based session persistence. Its own comment
  says it's "a stand-in for the future multi-user server" — shape mirrors
  what a real server would hand out (session id + resume key).

Run it: `cd tui && npm install && npm start`
Typecheck: `cd tui && npm run typecheck`
No test framework is configured for the TUI yet.

## Current status (2026-07-28)

Committed and working: navigation engine, planets with real orbital
mechanics, major moons, gas/ice giant rings, the asteroid belt and its
largest asteroids.

**In progress, uncommitted — adding comets as a fourth Sun-child category
(alongside planets/belt):**

- `tui/src/cometFacts.ts` (new, untracked) — comet data (Halley, Encke,
  Hale-Bopp, Hyakutake) and `getCometPosition()`, a full Kepler-orbit
  position calc (unlike moons/asteroids' circular approximation, since comet
  eccentricity is too extreme for that). **Complete.**
- `tui/src/orbital.ts` (modified) — exported `rev()` and
  `solveEccentricAnomaly()` (now takes an `iterations` param) so
  `cometFacts.ts` can reuse the solver with more iterations for
  highly-eccentric orbits. **Complete.**
- `tui/src/worldTree.ts` (modified) — imports the comet module,
  `NodeKind` now includes `"comets" | "comet"`, `getOwnerLabel()` handles
  comet ids, and a `COMET_DISPLAY_DOMAIN` constant is defined.
  **Not yet wired in**: `getOrbitChildren("sun", ...)` doesn't add a comets
  hub entry the way it adds `beltEntry`; there's no `getOrbitChildren` case
  for `COMETS_HUB_ID` to list individual comets; `getNodeKind`,
  `getCenterLabel`, `getBreadcrumbLabel`, `getDistanceDomain`, and
  `applicableLeafKinds` all need comet/comets-hub branches (mirror the
  existing belt/asteroid branches in each). `COMET_DISPLAY_DOMAIN` is
  currently unused — it's meant for `getDistanceDomain` once that's wired.
- `tui/src/components/ContentView.tsx` — **not started.** Needs
  `CometSurface`/`CometOrbitLog` components (mirror `AsteroidSurface`/
  `AsteroidOrbitLog`) and a `CometsHubSurface` (mirror `BeltSurface`), plus
  branches in the switch at the bottom for `isCometId(leaf.owner)` and
  `leaf.owner === COMETS_HUB_ID`.

## How to resume

Say something like "resume the comet work" and Claude should:

1. Finish wiring `worldTree.ts`: add the comets hub to `sun`'s
   `getOrbitChildren`, add a `getOrbitChildren` case for `COMETS_HUB_ID` that
   lists `COMET_ORDER` via `getCometPosition`, and add comet/comets-hub
   branches to `getNodeKind`, `getCenterLabel`, `getBreadcrumbLabel`,
   `getDistanceDomain` (using `COMET_DISPLAY_DOMAIN`), and
   `applicableLeafKinds`.
2. Add the matching components to `ContentView.tsx` and wire them into its
   switch.
3. `cd tui && npm run typecheck && npm start` — navigate Sun → Comets →
   each comet to confirm positions/labels render sanely.
4. Commit (comet data, orbital.ts export changes, and worldTree.ts wiring
   probably as one commit; ContentView.tsx can be the same commit or a
   follow-up).

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
