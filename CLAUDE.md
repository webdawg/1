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
  (`help`, `back`, `save <text>`, `notes`, `load <id> <key>`, `whoami`,
  `time`, `pause`, `quit`) — `pause` freezes the screen for copy/paste,
  `load` swaps to a different saved session live without restarting the
  process, both via `session.ts` — see `SPEC.md`'s Pause and Keys-and-
  commands sections. Renders the two official tiles —
  each one a single bordered box with nothing outside its own frame
  (the `~` console is the sole exception, its own floating overlay):
  NAVIGATION (top), labeled top-right, with the focused-entry footer
  readout inside the same frame; HUD (bottom), labeled bottom-right as
  its actual last row — see `SPEC.md`'s Layout section.
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
  static snapshot (~16 real stars, ~27 real exoplanets, plus Sagittarius
  A* — the Milky Way's real central black hole, curated as one more
  `StarId`/`STAR_FACTS` entry rather than a new category, same precedent
  PSR B1257+12 already set) — same pattern as the rest, no network calls.
  `planetFacts.ts` and `starFacts.ts` both
  carry real `gravity`/`diameterKm` — used for display, and now also for
  `relativity.ts`'s real gravitational time dilation.
- `src/components/SolarView.tsx` — renders the orbit-grid ASCII view: a
  full-width tile of nothing but icons+labels (no text list — that's the
  bottom panel's job). Generic over `OrbitEntry`/`DistanceDomain`; new body
  categories need no changes here, just a `glyph` in `worldTree.ts`. Takes
  `gridWidth`/`gridHeight` as props (sized dynamically by `App.tsx` from
  the real terminal size). Renders bare content, no border of its own —
  `App.tsx` owns the one NAVIGATION tile border that wraps this (and
  `ContentView`/`WarpTransition`) — so **`gridWidth` must already have 4
  columns subtracted for that tile's border+`paddingX={1}` (2 border + 2
  padding). Getting this wrong doesn't error or warn — it silently
  corrupts the box's bottom border in this Ink version when a row's text
  overflows the actual content width.** See `DEVELOPMENT.md` for how this
  was diagnosed if it resurfaces.
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
  `spatialNav` for direction decisions), the shared `toClockHour`, and
  `pinnedEdge` (an entry can request a fixed grid edge instead of the
  normal distance/angle math — currently only Sagittarius A* uses it,
  see `SPEC.md`'s Placement rules section).
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
  constant, and `formatGravityFormula` for the summed "Galactic Gravity
  Constant" — not a felt quantity, a building block for a later
  calculation), and real circular orbital velocity
  (`orbitalVelocityAtDistance`, plus the fixed `GALACTIC_ORBITAL_SPEED_MPS`
  constant `GALACTIC_GRAVITY_MPS2` is itself derived from), and the
  Sun's real galactic position — `SUN_HEIGHT_ABOVE_GALACTIC_PLANE_LY`
  (~67.8 ly, Bennett & Bovy 2019, shared by the whole curated star
  cluster — see `SPEC.md`'s Galactic position section for why one real
  number, not sixteen) plus `galacticOrbitPhaseDeg`, an explicitly
  illustrative (not measured) orbital phase derived from the real
  `GALACTIC_ORBIT_PERIOD_SECONDS`. `worldTree.ts`'s `getDilationInputs`
  maps a node id to what this needs; `App.tsx` accumulates drift each
  tick into `session.ts`'s persisted `timeDriftMs`, surfaced via the
  `time` command and continuously on the HUD's Time/Gravity/Velocity/
  Galactic position rows. See `SPEC.md`'s Time, Gravity, Velocity, and
  Galactic position sections.

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

Also added this session: official names for the two tiles, shown as a
dim label in each one's own bottom-right corner — NAVIGATION (top) and
HUD (bottom). The focused-entry readout (`CATEGORY - label — N o'clock,
distance`) moved out of the HUD tile into a new footer row on the
NAVIGATION tile itself, centered, paired with the `NAVIGATION` label
(`gridHeight` now reserves one more row for this — see `App.tsx`'s
`gridHeight`/`MIN_TOP_HEIGHT` comments). Also added a second gravity
row, the "Galactic Gravity Constant" — the same local/star/galactic
terms the Gravity row shows individually, but summed and displayed as
the literal running formula (`relativity.ts`'s `formatGravityFormula`).
Explicitly not meant to represent anything actually felt (real gravity
doesn't compound additively like this) — it's a raw building block
reserved for a later calculation. Re-verified the whole HUD restructure
at both wide and 80-column widths, and across every top-tile variant
(`SolarView`, a leaf `ContentView`, `Console`, mid-`WarpTransition`).

Also added this session: a follow-up correction to the tile labeling
above — the NAVIGATION footer readout and the `NAVIGATION` label had
been placed in the same outer flex slot as the tile's content, but
*outside* that content's own bordered box (confirmed via an 80-column
tmux capture on the prior commit: both floated as bare text between the
two tiles' borders, not inside either). Fixed by moving the border
itself up to `App.tsx`'s wrapping box — `SolarView`/`WarpTransition` now
render bare content, no border of their own — so one frame encloses the
`NAVIGATION` label (moved to top-right), the content, and the footer
readout together; `ContentView`'s leaf sub-components keep their own
small bordered "card" nested inside that same tile. The `~` console is
the deliberate exception, staying a separate floating overlay with its
own distinct double border, per how it represents a different mode
rather than tile content. Also moved the `HUD` label to after the
prompt so it's the tile's literal last row (true bottom-right corner)
instead of floating above the prompt with slack below it. Along the
way, fixed two real Ink layout bugs this surfaced: an empty-string
`Text` collapses to zero height in this Ink version (log padding now
uses a single space instead), and `Prompt.tsx`'s inactive hint text had
grown too long to fit one line at 80 columns, silently overflowing its
budgeted row count once the empty-string bug above stopped masking it
(hint text shortened). See `DEVELOPMENT.md` for both. Re-verified at
both wide and 80-column widths across `SolarView`, a leaf `ContentView`
(including nested-card leaves), `Console`, and mid-`WarpTransition`.

Also fixed this session: the breadcrumb path truncation flagged (but not
fixed) last session. The HUD breadcrumb's `(Sun > ... > X)` path list has
no natural length cap — it grows with navigation depth — and was
corrupting the breadcrumb/Time rows at 80 columns for sufficiently deep
paths. Fixed with two changes: the path list moved to its own dedicated
row (previously crammed alongside `Centered on X` and the zoom
indicator), and it's now actively truncated to the tile's real width
(`App.tsx`'s `truncateBreadcrumb`, keeping the segments nearest the
player's current position, prefixed with an ellipsis when it doesn't
fit) rather than just given room and trusted to fit. Verified via a
hand-crafted session file (`~/.solar-tui/sessions/*.json` +
`--resume`) forcing a path deep enough to actually trigger truncation —
faster and more reliable than navigating that deep via arrow keys — plus
the real 5-segment case (a moon's Surface leaf) and the original
4-segment repro, at both 80 and wide columns.

Also added this session: a `p` pause key so the player can select and
copy text out of the terminal without it changing mid-selection — the
always-ticking HUD clock and the coarser 5s position/drift tick meant
nothing stayed visually still for long otherwise. Implemented by gating
both interval callbacks on a `pausedRef` (the timers keep firing, they
just skip the state update) and having the main nav `useInput` swallow
every key except `p`/Escape while paused, so the frame is genuinely
frozen rather than just visually stale. Time dilation drift doesn't
accumulate while paused, by the same reasoning a SOLAR BASE JUMP already
gets no relativistic effect — see `SPEC.md`'s new Pause section. Also
added, since the project had no single place documenting every key
(only a short `Prompt.tsx` hint and a one-line `/help`): `SPEC.md`'s
"Commands" section became "Keys and commands," now the canonical list
of every nav-mode key, command-mode command, and Console command in one
place; `/help` itself was split into four short single-line `pushLog`
calls (a long combined string was tried first and immediately hit the
documented Ink wrap/overflow gotcha — corrupted the breadcrumb row and
the Prompt's own border — see `DEVELOPMENT.md`) rather than one long
one. Verified via tmux at both 80 and wide columns: pause freezing the
clock across several real seconds, arrow keys doing nothing while
paused, both `p` and Escape resuming it, and `/help`'s new output
rendering cleanly with no border corruption at 80 columns.

Also fixed this session: pause was switched from the bare `p` key above
to a `/pause` command instead, per direct user feedback — a bare key
risks accidentally firing during ordinary nav-mode play (a stray
keypress while looking around) in a way a slash command can't, and it
now matches every other non-movement action (`save`, `time`, `quit`,
...) already being a command rather than a hotkey. (Confirmed via tmux
first that the old `p` key was never actually reachable while typing in
the prompt or console — both already ignore the nav `useInput` hook
entirely while active — so this wasn't fixing a real input-collision
bug, just a design preference.) Escape still resumes instantly, and `/`
or `:` still work while paused specifically so `/pause` can be typed
again to resume. `SPEC.md`'s Pause and Keys-and-commands sections,
`/help`'s output, and `Prompt.tsx`'s hint text (reverted to its
pre-pause wording, since pause is no longer a key worth advertising
there) were all updated to match.

Also added this session: a UTC offset on the HUD's actual-time reading
(`relativity.ts`'s `formatUtcOffset`, e.g. `UTC-7`/`UTC+5:30` — computed
directly from `getTimezoneOffset()` rather than `Intl`'s
`timeZoneName: "shortOffset"`, which formats as `GMT±H`, not `UTC±H`),
and a fast-ticking detail on the HUD's universe-age reading
(`formatUniverseAgeCompactDetailed`, e.g.
`13.797B yrs.211d 16:19:20.953`) since the plain billions-of-years
figure barely visibly moves within a play session. HUD-only by explicit
user decision — the `time` command's own output is untouched. Hit a
real bug building the detail field: naively reusing `formatUniverseAge`'s
breakdown of the huge `universeAgeSeconds()` total (~4.35e17 seconds)
produced a millisecond field that silently never changed, since a
float64's precision near that magnitude only resolves to about ±64
seconds — caught via a throwaway `npx tsx` check (two calls 300ms apart
came back byte-identical) before it shipped, not by visual inspection.
Fixed by re-deriving the remainder from elapsed real seconds since a
fixed reference epoch directly (a small number, full float precision)
instead of ever summing it into the huge total. The HUD's dedicated
clock interval was also sped up from 1s to 100ms so the millisecond
field actually ticks rather than jumping in 1000ms steps; still gated
by the same `pausedRef` `/pause` already used, confirmed via tmux to
still freeze completely. Also separately found and fixed (flagged to
the user first, since it was unrelated to this session's scoped work,
then fixed on request): the `time` command's own Time 2/Time 3 log
lines were long enough to wrap at 80 columns and corrupt the breadcrumb
row and Prompt border below them — the same class of bug `/help` hit
and was fixed for earlier this session. Fixed the same way: shortened
wording (dropped "since"/"both clocks"/the in-line jump-drift aside)
plus a new fourth short log line for the jump-drift note that no longer
fit inline, each independently checked against the longest curated
center label (a composed breadcrumb-style label like "Nearby Stars —
Teegarden's Star", not just the raw star name — the actual worst case,
found by testing at that label rather than assuming a short one).
Verified via the session-file-resume technique to reach that label
directly, at both 80 and wide columns.

Also relabeled this session, per the user's own naming: the HUD's Time
row split into two labeled bracketed rows, `[GALACTIC TIMES - ...]`
(actual time + universe age) and `[ACCUMULATED DILATION - ...]` (drift). Tried
fitting both on one row first (the user's initial ask), but the
combined `[LABEL - value]` form runs ~91 characters against the
~76-character budget at 80 columns even after aggressively trimming
the drift/universe-age precision — laid the arithmetic out for the
user rather than silently picking a truncation, since further trimming
would have gutted the millisecond ticking just added. User chose two
rows over shortening the content. Verified via tmux at both 80 and wide
columns, including watching it tick over several renders.

Also added this session: made resuming a session actually usable.
`whoami` used to print only the session id — now prints the resume key
and a ready-to-run `npm start -- --resume <id> <key>` line too, since
the key was previously shown exactly once (at session creation) and
nowhere else, making it easy to lose; pairs naturally with `/pause` to
freeze the screen and copy real credentials mid-session. Also added a
`load <sessionId> <resumeKey>` command — the in-game counterpart to
launching with `--resume`, calling the same `session.ts` `loadSession`
`index.tsx` uses at startup, then swapping `sessionRef.current` plus
`setPath`/`setPlayerType` live, no process restart; a bad id/key pair
just logs an error and leaves the current session alone. Verified
end-to-end via tmux: created a session, traveled to Mercury, grabbed its
id/key via `whoami`, started a second fresh session, and `/load`ed the
first one into it — HUD and NAVIGATION both switched live to the loaded
state, breadcrumb and all, and normal navigation (Escape back to Sun)
kept working afterward; also confirmed a bad id/key pair leaves the
current session untouched.

Also simplified this session, per the user's explicit ask ("just the
seconds and that is it"): GALACTIC TIMES' universe-age reading dropped
the billions-of-years/day/H:M:S.mmm breakdown in favor of a single
exact whole-seconds-since-the-Big-Bang count, comma-grouped (e.g.
`435,400,207,218,294,234s`), ticking by 1 every real second. Getting
"ticks every second" actually right needed a different underlying
representation, not just a different format string: the naive version
(reading the count straight off the existing `universeAgeSeconds()`
float64 total) came back bit-for-bit frozen across a 300ms test — the
same float64 precision wall discovered earlier this session while
building the now-removed millisecond field, this time biting the whole
seconds digit instead of just milliseconds. Fixed with `bigint`
arithmetic instead (`universeAgeWholeSeconds`): the huge reference age
converts to `bigint` exactly since `SECONDS_PER_JULIAN_YEAR` has no
fractional part, so only the small, already-precise elapsed-seconds
term needs adding — confirmed via a throwaway script ticking cleanly by
exactly 1 across three real seconds. `formatUniverseAgeCompactDetailed`
and `formatUniverseAgeCompact` were removed outright (nothing else
called them); the HUD's `clockNow` interval also reverted from 100ms
back to 1s, since nothing sub-second is displayed anymore. Verified via
tmux at both 80 and wide columns, shown to the user as a mockup before
committing per their request.

Also added this session, from a captured vision addendum (`SCOPE.md`'s
2026-07-31 entry): Sagittarius A*, the Milky Way's real central
supermassive black hole, as one more curated `starFacts.ts` entry ("just
a black blob," per the request) — following the exact precedent
PSR B1257+12 already set (a non-star curated as a `StarId` anyway), so
every mechanic keyed off `isStarId` worked with zero changes to
`worldTree.ts`: glyph, leaves, the SOLAR BASE JUMP star-dive transition,
`getDilationInputs`. Its `gravity`/`diameterKm` are derived from its
real Schwarzschild radius (EHT-2022 mass ~4.297M M☉, `Rs ≈ 12.69M km`)
via the same `GM = gravity·radius²` construction used everywhere else —
"standing" on it means standing at the event horizon, where
`2GM/(rc²) = 1` by definition, so `dilationFactor` hits its cap and
returns a factor of ~0.001 — an order of magnitude more extreme than
the previous most-extreme case (the pulsar's ~0.79), matching the
addendum's "a few years there, decades back home" framing; confirmed
live via tmux that a single 5s tick there accumulated ~5s of drift.
Two real bugs found and fixed along the way, both against this
session's own established gotchas: (1) tried widening
`STARMAP_DISPLAY_DOMAIN`'s max to fit its real 26,673 ly distance,
which forced auto-zoom to 64x and crowded all 16 existing stars into
unreadable overlap — reverted; it instead clamps to the same outer rim
any out-of-domain distance already does, same as PSR B1257+12's own
distance already maxes the domain at. (2) the first description (538
chars, nearly 3x the longest existing star's 177) overflowed the leaf
card's fixed height at 80 columns and corrupted its border — shortened
to 149 chars, in line with the rest of `starFacts.ts`. Also iterated on
`displayAngleDeg` twice after visually confirming collisions via tmux
(a request mid-session, "put the black blob way off in the distance,"
landed it at 270°, the star map's single largest open angular gap) —
genuinely isolated at a typical terminal height (confirmed at 100×45),
though an 80×30 floor still crowds it against whatever else is near
that rim position, the same accepted trade-off every crowded cluster in
this view already has.

Also added this session: a "GALACTIC POSITION" HUD group answering
"where are we relative to the black hole" — real distance from the
galactic center (already-curated `GALACTIC_CENTER_DISTANCE_LY`) plus
real height above the galactic midplane (new:
`SUN_HEIGHT_ABOVE_GALACTIC_PLANE_LY`, ~67.8 ly, Bennett & Bovy 2019).
Deliberately one real number shared by the whole curated star cluster
rather than 16 fabricated per-star ones: every curated star sits within
~2300 ly of the Sun, negligible against the ~26,673 ly to the galactic
center, so the entire cluster is honestly at the same height on this
scale — flagged directly to the user before building, rather than
silently approximating data this codebase otherwise always cites
precisely. A second row, `[ORBITAL PHASE (illustrative) - ...]`, adds
an explicitly-labeled non-real companion: real astronomy has no agreed
reference epoch for where the Sun sits in its ~228-million-year lap
around the galactic center (period itself derived, not fetched, from
already-curated circumference/speed constants — a good sanity check
against the real ~225–250 Myr textbook range), so this advances a phase
angle in real time at the real rate from an arbitrary zero point, the
same hand-assigned convention `starFacts.ts`'s `displayAngleDeg`
already uses. Deliberately not engineered to visibly tick the way
GALACTIC TIMES' universe-age reading was — the real rate is
~5×10⁻¹⁴°/second, and a static-looking number is correct here, not a
bug. Also swapped Sagittarius A*'s glyph from `(●)` to `▓█▓` on direct
feedback that a plain circle "wasn't cutting it" — verified via tmux
that Unicode block-drawing characters render single-width, same as
every other glyph in this codebase, so no new column-math risk.

Also iterated on Sagittarius A*'s star-map position twice more this
session, both times on direct follow-up request. First, moved it to the
star map's exact center (`worldTree.ts`'s `getOrbitChildren` overriding
its display distance to `0` — the same "distance 0 takes over the fixed
center marker" convention `starSelfEntry` already uses for a star
you're standing on — with the Sun pushed out to its own real,
precisely known distance from the galactic center,
`GALACTIC_CENTER_DISTANCE_LY` = 26,673 ly, clamped to the same domain
rim PSR B1257+12 already gets). Verified via tmux (including the
session-file-resume technique to reach both directly) that this worked
exactly as designed — `0.00 ly` for Sgr A*, `26673.00 ly` for the Sun.
Then reverted on a second follow-up ("should be on the left or right...
and farthest away from the cluster") — a literal left/right position is
incompatible with distance 0 (angle is meaningless at zero radius), so
this genuinely couldn't be layered on top of the center-placement; the
Sun moved back to its original near-center spot, and Sgr A* went back
to being a spread orbit entry, now at `displayAngleDeg: 180` (left side
of the NAVIGATION tile) rather than its original 270° (bottom).
Confirmed via tmux at 100×45 that 180° doesn't collide with TRAPPIST-1
despite sharing the same angle — different radius keeps them apart on
screen. The other 16 curated stars were never touched by either
round-trip; their distances are still each star's real distance *from
the Sun* (the only real number available for them — real
distance-from-Sgr-A* isn't curated and would cluster them all within a
narrow band anyway, flagged to the user during the center-placement
round).

One more follow-up landed Sgr A*'s position for good this session: "it
should always be on the very edge of the screen... you could make it
part of the tile border." The 180°/clamp-to-rim placement above was
still ordinary distance/angle math underneath — same as any other star,
just with a distance so large it always clamps — so it could still
drift with zoom level or get nudged by the icon-crowding system, same
as anything else. Built a genuinely new positioning mode instead:
`OrbitEntry` gained an optional `pinnedEdge: "left" | "right" | "top" |
"bottom"` field (`worldTree.ts`), resolved in `layout.ts`'s
`computeGridPositions` ahead of the normal polar math — a fixed grid
column/row that zoom, domain, and grid-size changes can't move.
Sagittarius A* is the only entry that sets it (`"left"`). Also updated
`App.tsx`'s auto-zoom input to exclude pinned entries, the same way it
already excludes leaves and the distance-0 home entry, since a fixed
position isn't a real spread target. Verified via tmux at both 100×45
and 80×30: the glyph now sits flush against the NAVIGATION tile's
actual border column, full label visible even at the small floor where
it used to crowd against neighbors; confirmed still selectable via
arrow-key spatial nav and still travelable (session-file-resume to
reach it directly, `Enter`, real dilation/gravity/velocity figures all
came through correctly on arrival).

Nothing else in-progress/uncommitted right now — check `ROADMAP.md`
Phase 2 for what's next (dwarf planets, bots/NPCs, BBS-style messages,
tests).

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
