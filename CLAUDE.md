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

## Capturing new vision paragraphs

The user periodically drops a raw, stream-of-consciousness paragraph
elaborating the vision (new mechanics, lore, tone) — the same way the
original `SCOPE.md` content came in. Do this automatically, without
being asked each time:

1. Append it to `SCOPE.md` under `## Addenda`, as a new `### {date} —
   {short title}` entry: a lightly-edited version first (fix
   grammar/punctuation only — don't reorganize, cut, or reinterpret
   content; preserve deliberate emphasis like ALL-CAPS terms exactly),
   then the original raw text verbatim below it, matching the existing
   `## Vision` / `## Original statement` pattern.
2. Pull anything concrete enough to build from it into `SPEC.md` (how it
   should work) and/or `ROADMAP.md` (noted for later, if not being built
   now) — the addendum is the record of intent; `SPEC.md`/`ROADMAP.md`
   are where it becomes actionable.
3. Then do whatever was actually asked in the same message (implement
   now, plan first, spec-only for later, etc.) — capturing the paragraph
   is a documentation step alongside that, not a replacement for it.

## Project overview

This repo actually contains two unrelated things:

1. **`tui/`** — the real, active project. An Ink (React-for-terminals) app that
   models the universe as a recursive "center + orbiting things" tree you
   navigate: star map → Sol → planets → moons, Sol → asteroid belt →
   asteroids, Sol → comets hub → comets; star map → any other real star →
   its curated real exoplanets. Planets use real Keplerian orbital
   mechanics; moons, asteroids, and exoplanets use a circular mean-motion
   approximation; comets solve the full Kepler equation (their
   eccentricity is too extreme for the circular approximation). Crossing
   between the star map and a star (Sol included) plays a short "diving
   through the star" animated transition instead of an instant jump.
2. **`src/one/`, `tests/`, `pyproject.toml`** — a Python package skeleton
   from the initial repo scaffold. `src/one/__init__.py` and `tests/` are
   still empty and nothing has been built on top of them. Treat this as
   vestigial unless the user says otherwise — the TUI is where the work is.

`README.md` covers the TUI (running it, commands) and links out to
`SCOPE.md`/`ROADMAP.md`/`SPEC.md`/`DEVELOPMENT.md`/this file with a
one-line description of each's scope — keep that list in sync if a doc's
purpose shifts or a new one is added.

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
  `beltFacts.ts`, `cometFacts.ts`, `starFacts.ts` — factual data per body
  category, each exposing an id union type + a `Record<Id, Facts>` + an
  `isXId` guard, following the same shape. `starFacts.ts` is a curated
  static snapshot (~16 real stars, ~27 real exoplanets) — same pattern as
  the rest, no network calls. `planetFacts.ts` and `starFacts.ts` both
  carry real `gravity`/`diameterKm` — used for display, and now also for
  `relativity.ts`'s real gravitational time dilation.
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
  what a real server would hand out (session id + resume key). Default new
  session path is `["starmap", "sun"]`.
- `src/components/WarpTransition.tsx` — the "diving through a star"
  animation played when travel crosses the star-map/star boundary
  (`worldTree.ts`'s `isStarBoundary`). Self-contained frame loop, reuses
  `layout.ts`'s `polarToGrid`, no new position math. The traveler figure
  it draws depends on `playerType` (HUMAN cyan stick figure vs. LLM green
  circuit figure) — see `SPEC.md`'s Player section.
- `src/components/Console.tsx` — the Half-Life-style drop-down console
  (`~` to open, Escape/`close`/`exit` to close, both animated slides).
  Occupies the same top-tile slot as `SolarView`/`ContentView`/
  `WarpTransition`. Handles `become llm`/`become human` commands; the
  former gates on a 5-round token-prediction puzzle. See `SPEC.md`'s
  Console section for the full mechanic and command list.
- `src/relativity.ts` — pure physics/math, no React: real gravitational
  time dilation (`dilationFactor`, the proper non-linearized formula), the
  "seconds since the Big Bang" universe clock, real gravitational
  acceleration (`gravityAtDistance`, plus the fixed `GALACTIC_GRAVITY_MPS2`
  constant), and real circular orbital velocity (`orbitalVelocityAtDistance`,
  plus the fixed `GALACTIC_ORBITAL_SPEED_MPS` constant `GALACTIC_GRAVITY_MPS2`
  is itself derived from). `worldTree.ts`'s `getDilationInputs` maps a node
  id to what this needs; `App.tsx` accumulates drift each tick into
  `session.ts`'s persisted `timeDriftMs`, surfaced via the `time` command
  and continuously on the HUD's Time/Gravity/Velocity rows. See
  `SPEC.md`'s Time, Gravity, and Velocity sections.

Run it: `cd tui && npm install && npm start`
Typecheck: `cd tui && npm run typecheck`
No test framework is configured for the TUI yet.

## Current status (2026-07-30)

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

Also added this session: a star map above Sol (`starFacts.ts` + wiring
through `worldTree.ts`/`ContentView.tsx`) — travel from the Sun to ~16 real
nearby star systems (Proxima Centauri, TRAPPIST-1, 51 Pegasi, PSR
B1257+12, ...) and their real curated exoplanets, with a "diving through
the star" animated transition (`WarpTransition.tsx`) on that specific
boundary crossing only — every other move stays instant. Fixed a real
icon-collision bug along the way: crowded clusters (e.g. inner rocky
planets, or nearby stars on the map) used to silently drop an entry
entirely on overlap; icons are now guaranteed a slot (nudged to the
nearest free cell if needed) and only labels are ever omitted.

Also added this session: a second `playerType`, LLM, alongside the
existing default HUMAN (`session.ts`, persisted, back-filled on old
sessions). Reached through a new Half-Life-style drop-down console
(`~` to open, `Console.tsx`) — `become llm` gates on a 5-round
token-prediction puzzle (3/5 to pass, curated prompt/answer pool,
e.g. "To be or not to be, that is the ___" → "question"); `become human`
reverts instantly, no puzzle. The HUD identity label and the
`WarpTransition` traveler figure (cyan HUMAN stick figure vs. green LLM
circuit figure) both now follow `playerType`. Hit and fixed the same
box-width-math pitfall `SolarView` hit earlier in the project (`DEVELOPMENT.md`):
`Console`'s bordered+padded box needs `gridWidth + 4`, not `+ 2`, to
land at the full tile width — verified via tmux, the undersized version
silently corrupted the input row's rendering.

Added this session: real gravitational time dilation (`relativity.ts`),
surfaced as a three-times model — actual time, universe time (seconds
since the Big Bang), and a persisted, continuously-accumulating drift
between the two — both via the `time` command and now permanently on
its own HUD row (its own 1s-interval `clockNow`, separate from the
coarser 5s position/drift tick, so it visibly runs). Real
`gravity`/`diameterKm` data was added for the Sun and all 16 curated
stars (not just the 8 planets, which already had it) so every system
produces genuine dilation, including a dramatic real strong-field case
at the curated pulsar PSR B1257+12. The existing 5-second
position-recompute tick now also drives drift accumulation — no new
timer for that part. No relativistic effect applies during a SOLAR BASE
JUMP — not a special-cased pause on the accumulator, just nothing
massive nearby while in transit between systems (`SCOPE.md`'s
2026-07-30 addendum: "time doesn't freeze during a jump — it's just
that there's no relativistic effect during transit"), verified via a
precisely-timed tmux test bracketing an entire jump.

Also added this session: a Gravity HUD row alongside Time — real local
(current body's surface gravity), star (the system star's pull at the
real current distance, `relativity.ts`'s `gravityAtDistance`), and
galactic (a fixed real constant derived from the Sun's real distance and
orbital speed around the galactic center, `GALACTIC_GRAVITY_MPS2`)
acceleration in m/s². Along the way, found and fixed a real width-budget
bug the Time row had introduced: cramming Time into the breadcrumb row's
right-hand corner wrapped at 80 columns (an entirely ordinary terminal
width) and silently overflowed the bottom panel's fixed height — caught
via a deliberate narrow-terminal tmux check, not by the wide (220-col)
terminal this session had been testing in by default. Fixed by giving
Time and Gravity each their own dedicated row instead of sharing space.
Also added a Velocity row right alongside Gravity, the real circular
orbital velocity (`v = √(GM/d)`) for the same three sources — verified
against famous real numbers (Earth's ~7.9 km/s low-orbit and ~29.6-29.8
km/s solar orbit, the Sun's own ~436.7 km/s surface velocity matching
its real escape velocity ÷ √2); the curated pulsar's local term comes
out genuinely relativistic (~43% c), shown as a percent of light speed.

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
