# Spec

Technical specification of how the `tui/` engine actually works right now —
the concrete *how*, as opposed to `SCOPE.md` (the *why*, founding vision) or
`ROADMAP.md` (the *what's next*, phased plan). This is a snapshot of the
current design; update it as the design changes, and if the code and this
file ever disagree, the code is authoritative until this file catches up.

## World model

A single recursive rule: whatever node you're centered on, you see what
orbits it. The root is the star map (`starmap`) → stars (Sol, id `"sun"`,
plus ~16 real nearby stars) → for Sol: `planet` → `moon`; `sun` → `belt` →
`asteroid`; `sun` → `comets` (hub) → `comet`; for every other star:
`exoplanet`. Any of those → leaf nodes (`surface`, `orbit-log`, `rings` —
only on ringed planets, `notes`). Leaves are generic detail screens, not
physical bodies.

Position math, by category:
- **Planets** — real orbital elements + Kepler's equation (Newton's
  method), time-of-now based. `tui/src/orbital.ts`.
- **Moons, asteroids, exoplanets** — circular mean-motion approximation (a
  per-body phase offset + period), not full ephemeris. `getMoonPosition`/
  `getAsteroidPosition`/`getExoplanetPosition` in `worldTree.ts`. Used for
  exoplanets specifically because most confirmed exoplanets don't have
  well-constrained full Keplerian elements the way our own planets do —
  claiming otherwise would misrepresent the data.
- **Comets** — full Kepler equation like planets, not the circular
  approximation, because their eccentricity is too extreme for that to
  look sane. `cometFacts.ts`'s `getCometPosition`.
- **Belt, comets hub, star map** — a single fixed representative point
  each: the real belt/comet population spans every angle at once, and the
  star map has no orbit to compute at all (stars are just plotted by real
  distance from the Sun, at a hand-assigned display angle).
- **Stars** (other than Sol) — plotted at their real distance from the Sun
  (light-years) and a hand-assigned angle, same "fixed representative
  point" treatment as the belt — there's no orbital motion to model on
  human timescales. `tui/src/starFacts.ts` is the curated data source (a
  static snapshot, not a live feed — same pattern as every other
  `*Facts.ts` file in this codebase).

## Layout

Two full-width **tiles** — that's the official term, used consistently
in code comments and here — stacked vertically. Each is exactly one
bordered box; nothing renders outside a tile's own frame. (The sole
exception is the `~` drop-down console — see the Console section — which
deliberately draws its own distinct double-border overlay instead of
living inside either tile, since it represents a different mode
entirely, not part of the universe/HUD split.) Each tile carries its
official name as a dim label placed *inside* its own border, in a
corner:

- **NAVIGATION (top tile) — the universe.** One bordered box
  (`App.tsx`, `borderStyle="round"`, `paddingX={1}`), dynamically sized
  to fill the actual terminal window (Ink's `useWindowSize`, reacting
  live to resize). Inside that single frame, top to bottom: the
  `NAVIGATION` label (its own row, right-aligned — top-right corner);
  the main content, either `SolarView`'s plotted icon+label grid,
  `ContentView`'s leaf detail screen, or `WarpTransition`'s cinematic
  (each renders bare content now, no border of its own — the tile
  supplies the one frame around all three); and a footer row, the
  currently-focused entry's quick info, centered (`CATEGORY - label — N
  o'clock, distance` — the all-caps category prefix is `worldTree.ts`'s
  `getCategoryLabel`, e.g. `PLANET - Earth`, `STAR - TRAPPIST-1`,
  `EXOPLANET - TRAPPIST-1 b`; updates live as focus moves, blanked
  mid-transition). `ContentView`'s own leaf sub-components (`PlanetSurface`,
  `MoonOrbitLog`, etc.) still draw their own small bordered "card" inside
  this tile — a nested frame for that detail content, not a second tile.
  When the console is open, this whole bordered box is skipped entirely
  in favor of `Console`'s own overlay (see above).
- **HUD (bottom tile) — everything else.** Fixed height (`App.tsx`'s
  `BOTTOM_PANEL_HEIGHT`, grown as more rows were added — see Time,
  Gravity, and Velocity below), full width, one bordered box containing,
  in order: the breadcrumb, split across two rows — `Centered on X` plus
  the zoom indicator on the first, and the path list (`(Sun > ... > X)`)
  on its own dedicated row below; the Time row, the Gravity row, the
  Galactic Gravity Constant row, the Velocity row, the log (always
  exactly `MAX_LOG_LINES` rows, padded with a single space rather than
  an empty string so padding rows don't collapse to zero height — see
  `DEVELOPMENT.md`), the command prompt, and finally the `HUD` label
  (right-aligned, the tile's actual last row so it lands in the literal
  bottom-right corner rather than floating above the prompt). Unlike
  every other row here, the path list has no natural length cap — it
  grows with navigation depth (star map > star > planet > moon > leaf is
  already 5 segments) — so it's truncated to the tile's actual width
  (`App.tsx`'s `truncateBreadcrumb`) rather than just given a row and
  trusted to fit: it keeps the tail (the segments closest to the
  player's current position — the most relevant ones) and prefixes an
  ellipsis when the full path doesn't fit.

Position math for the top tile lives in one place — `layout.ts`'s
`computeGridPositions` — used both by `SolarView` for rendering and by
`spatialNav.ts` for direction decisions, so they can never disagree about
where something is.

**Known constraint:** the NAVIGATION tile's own border (2 cols) and
`paddingX={1}` (2 more cols) are the *only* source of that 4-column
budget now — `gridWidth` must subtract all 4, not just the border, and
`SolarView`/`WarpTransition` must stay border-less so that budget isn't
double-counted. Getting this wrong doesn't error; it silently corrupts
the box's bottom border in this Ink version. See `DEVELOPMENT.md`. The
same document also covers a related but distinct pitfall: cramming too
much into one HUD row can silently wrap and overflow the fixed-height
bottom tile even without any width-math bug, which is why Time/Gravity/
Velocity each get their own dedicated row rather than sharing space —
and why `Prompt.tsx`'s inactive hint text is kept deliberately short
(it lives inside a height-budgeted tile too).

## Zoom

Real distances can span orders of magnitude within one view (the star map
alone runs from Sol at ~0 ly to PSR B1257+12 at 2300 ly) — sqrt scaling
softens that, but a genuine outlier still leaves everything else
compressed into a small fraction of the display no matter how gentle the
curve. `+`/`=` and `-`/`_` step a per-view `zoomLevel` (`App.tsx`, clamped
to `layout.ts`'s `ZOOM_MIN`/`ZOOM_MAX`, currently -2..6) through
`applyZoom(domain, zoomLevel)`: a `2 ** zoomLevel` multiplier that shrinks
(zoom in) or grows (zoom out) the domain's span around its minimum,
leaving `minRadius`/`maxRadius` untouched. The resulting `zoomedDomain` is
used for *both* `SolarView`'s rendering and `App.tsx`'s own
`computeGridPositions` call for spatial-nav positions, so what you see and
what arrow keys navigate to never disagree. Zooming in spreads out
whatever's near you, at the cost of pinning anything beyond the new
effective max to the outer rim — the same clamp-to-edge behavior
out-of-domain distances already had, just reachable interactively instead
of only happening to comets. Zoom is a property of the current view, not
a global setting: it resets whenever `centerId` changes — not to a flat
1.00x, but to `layout.ts`'s `computeAutoZoomLevel`, which zooms in enough
that `AUTO_ZOOM_KEEP_FRACTION` (75%) of the view's *real* distances
(leaves and the distance-0 "home" entry excluded — neither is a spread
target) fit inside the visible radius, sacrificing the most extreme ~25%
to the rim. A "sacrifice only the single farthest thing" rule sounds
tighter but falls apart the moment a view has more than one outlier
(the star map has several stars all hundreds of light-years past the
near cluster) — a fixed fraction stays predictable regardless of how the
outliers happen to be clustered. Manual `+`/`-` still adjusts from
whatever level a view auto-lands on. Zoom has no effect (and shows no
indicator) on a leaf's `ContentView` screen, where there's no spatial
grid for it to apply to. The current multiplier is shown top-right of
the bottom panel's breadcrumb row (a `Box` with
`justifyContent="space-between"`).

## Icon system

Every `OrbitEntry` renders as `{glyph} {label}`, one grid row, glyph
bracket-style signaling category before you even read the letter inside:

| Category | Motif | Glyphs |
|---|---|---|
| Sun | `(*)` | `(*)` — as an orbit entry in the star map, or as the selectable center-of-view entry when you're centered on it (see Star travel transition) |
| Terrestrial planet | `(x)` | Mercury `(.)`, Venus `(v)`, Earth `(O)`, Mars `(r)` |
| Gas/ice giant (all 4 — Jupiter/Saturn/Uranus/Neptune all have real rings) | `=x=` | `=J=` `=S=` `=U=` `=N=` |
| Moon | `.m.` | shared across all moons |
| Belt hub | `{:}` | `{:}` |
| Individual asteroid | `{.}` | `{.}` |
| Comets hub | `~^~` | `~^~` |
| Individual comet | `~'~` | `~'~` |
| Star map (center marker only — it's the root, nothing further out to select) | `{*}` | `{*}` |
| Star (other than Sol) | `*x*` | one distinct letter/digit per star, e.g. `*7*` TRAPPIST-1, `*1*` 51 Pegasi — see `starFacts.ts`. Same dual role as the Sun: orbit entry in the star map, or selectable center-of-view entry when centered on it |
| Exoplanet | `(x)` rocky / `=x=` gas giant | `(e)` / `=g=` |
| Leaf (Surface/Orbit Log/Rings/Notes) | `»` | shared `»` — menu-styled, not body-styled; the label disambiguates which leaf |

`getCenterGlyph(nodeId)` in `worldTree.ts` returns the same glyph a body
uses as an orbit entry, so centering on a body shows *its* icon as the
grid's center marker, not a generic one.

## Placement rules — nothing is ever drawn on top of anything else

Two-pass stamping per frame, in `SolarView.tsx`:

1. **Icons first, for every entry**, in priority order (the currently
   focused entry, then the rest). Each icon is placed at its exact
   orbital `(x, y)` if free; if that cell is already claimed, `
   findFreeSlot` searches outward (±3 rows, ±8 columns) for the nearest
   open cell and places it there instead. **An icon is never skipped and
   never overlaps another glyph** — in a crowded cluster (e.g. the inner
   rocky planets) it may land slightly off its precise orbital spot
   rather than disappear or collide.
2. **Labels second**, only for entries whose icon was placed. Each
   attempts to stamp immediately after its own icon; if that would
   collide with anything already on the grid, the label is simply
   skipped for that frame — the icon stays visible either way. Labels are
   best-effort; icons are guaranteed.

In views without a selectable self-entry (planets, moons, the belt, ...),
a fixed center marker is stamped before both passes, unmoved (it's "where
you are," not something that should drift). When centered on a star,
there's no separate fixed marker — the star's own self-entry (distance 0,
see Star travel transition) goes through the same two passes as
everything else, landing exactly at the grid center.

## Spatial navigation

Arrow keys move focus to whichever *other* plotted entry is actually
positioned in that direction on screen — not the next item in a hidden
angle-sorted list. `spatialNav.ts`'s `pickNextFocus`:

- Filter candidates strictly in the pressed direction (`right`: `dx>0`,
  etc.).
- Score survivors `primary + perpendicular * penalty` (primary = delta
  along the pressed axis, perpendicular = the other axis's delta — grid
  coords already include the display's aspect-ratio stretch, so this
  weighting is what favors "almost straight" over "diagonal"). Pick the
  minimum; tie-break by id. `penalty` is 3 normally, but 0.5 for a
  distance-0 ("home") entry — a genuinely-closer neighbor can otherwise
  consistently outscore it from every direction, creating a 2-cycle
  between two other entries that permanently strands it (hit in practice:
  Mars ↔ Mercury excluding the Sun). The lighter penalty keeps it
  reachable from a wide cone of directions without making it an
  unconditional magnet.
- If nothing lies in that direction at all, fall back to angle-order
  wraparound (step ±1 through the angle-sorted entries, wrapping) so
  arrow keys always do *something* rather than going dead at layout
  edges.

Enter travels to the focused entry, pushing it onto the navigation path;
children rebuild for the new center via `getOrbitChildren`, and focus
resets to the new set's first entry.

## Player

The player has a `playerType`, currently either **HUMAN** or **LLM** —
always shown in capital letters, matching every other emphasized term
from `SCOPE.md`'s addenda (SHIP, SOLAR BASE JUMP, GRAVITATIONAL WELL,
STAR, DARK SPOT, QUANTUM, UNIVERSE). `session.ts`'s `SessionData` persists
it (`createSession()` defaults to `HUMAN`; `loadSession()` back-fills a
missing field on older saved sessions to `HUMAN`). `App.tsx` shows it
permanently in the bottom panel's top row, leftmost of a 3-way
`justifyContent="space-between"` split (type — breadcrumb/transition
status — zoom indicator) — persistent identity, not view state, so it's
visible on every screen including leaf `ContentView` pages and mid-jump.
Selectable/creatable entity types beyond these two remain future work
(`ROADMAP.md` Phase 6).

During a SOLAR BASE JUMP, the player is drawn as a small ASCII figure —
which one depends on `playerType` (`WarpTransition.tsx`'s
`TRAVELER_FIGURES` lookup, stamped by the type-agnostic `stampTraveler`):
```
HUMAN            LLM
 o                ◆
/|\              <#>
/ \              ===
```
Both 3 rows × 3 cols, anchored by their vertical center — HUMAN cyan/bold
(arms and legs), LLM green/bold (a core, a circuit-marked body, a
hovering base instead of legs — deliberately not humanoid). See Star
travel transition below for when it appears. Neither is a persistent map
icon; the figure only exists inside the jump animation itself.

## Console — converting to LLM

`~` slides a Half-Life-style console down from the top of the screen
(`Console.tsx`), occupying the same top-tile slot as `SolarView` /
`ContentView` / `WarpTransition` in `App.tsx`'s render ternary. It only
opens when `mode === "nav" && !transition && !consoleOpen` — a jump in
progress or command-mode blocks it, same gating pattern as other nav
keys. Visually distinct from the rest of the app on purpose: double
border, green throughout (every other bordered tile uses round borders,
cyan/yellow). Opening and closing both slide (`openStep` ramps 0→5 over
~70ms/step — snappier than `WarpTransition`'s 200ms/frame cinematic
pace); closing reverses the ramp and only calls `onClosed()` (which flips
`App.tsx`'s `consoleOpen` back to `false`, unmounting `Console`) once
`openStep` reaches 0, so the close animation actually plays instead of an
instant cut. Escape (or the `close`/`exit` command) starts the close;
`Console`'s own narrow `useInput` only checks `key.escape`, so it never
conflicts with the `TextInput` (from `ink-text-input`, same component
`Prompt.tsx` uses) that handles the actual typed line.

Like every other top-tile box in this app (`SolarView`, the bottom
panel), `Console`'s outer `Box` has `borderStyle` + `paddingX={1}` — 4
columns of overhead (2 border + 2 padding) — so its `width` must be
`gridWidth + 4` to land back at the full tile width `App.tsx` already
computed (`cols - 4`) for a box with that same overhead. Getting this
wrong (e.g. `+2`, accounting for only the border) doesn't error — it
silently corrupts that row's rendering in this Ink version, the same
pitfall `SolarView`'s own width math hit (see `DEVELOPMENT.md`).

Commands, typed + Enter:
- `help` — lists commands.
- `become llm` (aliases `llm`, `convert`) — starts the puzzle below if
  not already LLM, else prints "Already LLM.".
- `become human` (aliases `human`, `revert`) — instant, no puzzle
  (reverting to the default isn't gated); no-ops with a message if
  already HUMAN.
- `close` / `exit` — same as Escape.
- anything else — echoed as an "unknown command" line.

**The puzzle**: `become llm` picks 5 distinct random entries from a
curated `PUZZLE_POOL` (~15 iconic, near-100%-predictable completions —
the exact thing a language model is good at, e.g. `"To be or not to be,
that is the ___"` → `question`, `"E equals m c ___"` → `squared`/`^2`/`2`).
Each round prints `Round N/5: {prompt}`, waits for the next submitted
line, normalizes both sides (lowercase, trim, strip trailing
punctuation) and compares against the answer list, prints
`Correct!`/`Incorrect — it was "{answer}".`, advances. After 5 rounds:
score `>= 3` (`PASS_THRESHOLD`) prints a success banner and fires
`onBecomeLLM()` (parent flips `playerType`, persists via
`setAndPersistPlayerType`, logs it); otherwise a failure line, back to
idle — re-running `become llm` starts a fresh attempt with no penalty or
cooldown. Closing the console mid-puzzle just abandons the attempt.

## Star travel transition

Leaving a star (Sol included) back to the star map isn't only an Escape
shortcut — the star itself is a real, selectable orbit entry among its
own children, not a separate icon: `worldTree.ts`'s `starSelfEntry()`
adds an entry using the star's *own* glyph and name (id `STARMAP_ID`),
at distance 0. `computeGridPositions` treats distance 0 as a deliberate
signal — "the reference point itself" — plotting it at the exact grid
center (bypassing the usual `minRadius` floor), which is also why
`SolarView` skips drawing its normal fixed, unselectable center marker
whenever an entry claims that spot (`hasSelfEntry` check). You aim at it
with arrow keys and press Enter like any other object; `App.tsx`'s
`key.return` handler special-cases `focused.id === STARMAP_ID` to call
the same `goBack()` path-popping logic Escape and `/back` use, rather
than pushing it as a new child (which would nest the star map inside
itself). The star map's own center marker has no such self-entry — it's
the root, there's nothing further out to select — so it stays the plain
fixed marker every other (non-star) view uses.

Every Enter/Escape (and the `/back` command) is instant *except* one
specific crossing: moving between the star map and a star (Sol included),
in either direction — `worldTree.ts`'s `isStarBoundary(fromId, toId)`
detects this. That move is the default travel method, a **SOLAR BASE
JUMP**: every HUMAN can jump personally through a star's GRAVITATIONAL
WELL to slingshot to the next STAR — no ship required. (**SHIPS** are an
alternate method, not yet implemented — `ROADMAP.md` Phase 6.) It plays a
multi-phase cinematic (`WarpTransition.tsx`) instead of an instant jump.
While it plays: the top tile shows the animation instead of
`SolarView`/`ContentView`, the bottom panel's middle slot shows a
phase-specific status line instead of the breadcrumb (`App.tsx`'s
`PHASE_MESSAGES` lookup), and `useInput` is gated off (`isActive: mode
=== "nav" && !transition`) so no navigation input is processed
mid-animation. The pending `{ nextPath, label, logLine, travelMs }` is
held in `App.tsx`'s `transition` state and only committed
(`setPath`/`persist`/`pushLog`) when `WarpTransition` calls its
`onComplete` callback — there's no independent timer to keep in sync with
the animation's actual length.

Five phases, reported to `App.tsx` via `onPhaseChange` as they happen:

1. **approach** (3 × 200ms) — a star ring (points on a circle at ~35% of
   max radius) appears; the traveler's figure (HUMAN or LLM, per
   `playerType`) steps inward toward it over the 3 frames, fixed at a
   straight-up angle so its shape never needs to rotate. *"Approaching
   {label}..."*
2. **rotate** (3 × 200ms) — the ring's points shift a few degrees each
   frame (a simple spin illusion); the traveler arrives at the ring's
   edge. *"{label} begins to turn..."*
3. **open** (3 × 200ms) — a filled disk grows at the ring's center
   (`▒`→`▓`→`█`, radius 1→2→3); the traveler is drawn once more on this
   phase's first frame, then dropped (it's entering the opening).
   *"A path opens at its heart..."*
4. **darkspot** (3 × 200ms) — a solid-block disk expands from center
   until it covers the grid; no traveler figure (already consumed).
   *"Pulled into the GRAVITATIONAL WELL..."*
5. **traveling** (`travelMs`, sqrt-scaled by real distance — see below;
   *not* frame-counted) — blank grid, `QUANTUM_WORDS` (a curated mix of
   single evocative words, binary-ish noise, and short alien/machine
   phrases) flicker in at random positions every ~450ms, representing
   quantum data emerging as the traveler's mind becomes part of the
   universe. *"SOLAR BASE JUMP in progress — quantum data drifting
   past..."*

The first four phases are always a fixed ~2.4s total, regardless of
distance — only the travel phase scales:
`layout.ts`'s `computeTravelDurationMs(distanceLy)` sqrt-scales real
light-year distance (`worldTree.ts`'s `getStarDistanceLy`, 0 for Sol)
between `MIN_TRAVEL_MS` (5000, at 0 ly) and `MAX_TRAVEL_MS` (10000, at
the farthest curated star, PSR B1257+12's 2300 ly) — matching the vision
text's "5-10 seconds depending on the distance" precisely. Computed once
per jump (`App.tsx`'s `startStarTransition`, shared by both the forward
`key.return` case and `goBack()`) from whichever id involved in the
crossing is the star.

## Time — three times

`SCOPE.md`'s 2026-07-30 addenda: the engine tracks three times at once,
surfaced via the `time` command (`App.tsx`'s `runCommand`):

1. **Actual** — real time, the user's computer clock (`now.toLocaleString()`;
   an NTP server is future work).
2. **Universe** — seconds since the Big Bang, in human units.
   `relativity.ts`'s `universeAgeSeconds(now)` anchors a Planck-2018
   estimate (~13.797 billion years) to a fixed reference instant and adds
   elapsed real time from there, so it never needs to recompute the whole
   age; `formatUniverseAge` breaks the result into years/days/H:M:S.
3. **Drift** — Times 1 and 2, but continuously altered by real
   gravitational time dilation as the player dwells at a body. Shown as a
   single accumulated offset (`formatDriftMs`) applying to both clocks
   equally, rather than spelling out two full adjusted timestamps.

**Physics** (`relativity.ts`): the proper (non-linearized) formula, not
the weak-field shortcut — `factor = sqrt(1 - 2GM/(rc²))`, with
`GM = gravity * radius²` computed from each body's real surface gravity
and radius (the same `gravity`/`diameterKm` shape `planetFacts.ts` and
now `starFacts.ts` both use), clamped so the inner term never reaches 1.
The proper formula matters because it stays correct even in the strong-field
regime — the curated pulsar PSR B1257+12 is a real neutron star
(~1.4 solar masses, ~11km radius) where `2GM/(rc²) ≈ 0.38`, giving a
factor of ~0.79 (a clock there runs at ~79% speed). The weak-field linear
approximation would quietly break down at that scale.

A node's total dilation factor (`dilationFactor`) multiplies two
independent terms: a **local** term (the node's own surface gravity, if
it's a body with known local physics — currently the 8 planets and every
star, including Sol) and a **remote** term (the pull of the node's
system star at the node's real distance from it). `worldTree.ts`'s
`getDilationInputs(nodeId, date)` resolves which terms apply per node,
reusing existing position machinery rather than adding new position
math: planets use `getPlanetPosition`'s live `distanceAU`; moons
approximate via their parent planet's distance (`MoonFacts.parent`);
asteroids/comets/exoplanets use their own already-curated `distanceAU`;
a star itself uses only its local term (no remote term — meaningless at
distance 0); the star map, belt, and comets hub — nothing with a single
real position — get no dilation (factor 1, baseline).

**Accumulation**: no dedicated timer — the existing `TICK_MS` (5000ms)
interval that already drives `now`/position recompute also advances a
persisted `timeDriftMs` (`session.ts`) each tick, scaled by elapsed real
time and how far the current node's factor is from 1 (`advanceDrift`).
Mid SOLAR BASE JUMP (`App.tsx`'s `transition` state truthy), the factor
is taken to be exactly 1 rather than computed from wherever the player
was or will be — this isn't a special-cased pause on the accumulator;
time doesn't "freeze" during a jump. The player simply isn't within any
gravity well while in transit between systems, so there's genuinely no
relativistic effect to accumulate ("sun transport does not alter time,"
per the addendum, clarified further the same day: "time doesn't freeze
during a jump — it's just that there's no relativistic effect during
transit"). Verified via tmux with a precisely-timed sleep bracketing an
entire jump: `timeDriftMs` is bit-for-bit unchanged across transit, even
though the departure star's own dilation would otherwise contribute
measurably over that many seconds.

**Display**: `App.tsx`'s bottom panel shows all three times *continuously*
on their own dedicated row (not just via `time`) — actual time
(`HH:MM:SS`, ticking every second off its own dedicated `clockNow`
interval, deliberately separate from the coarser 5s position/drift tick
so the clock visibly runs), a compact universe age
(`formatUniverseAgeCompact`, e.g. `13.797B yrs` — the full
years/days/H:M:S breakdown is `formatUniverseAge`, reserved for the
`time` command's more detailed output), and the current drift
(`formatDriftMs`, read directly off `sessionRef.current.timeDriftMs`).
Visible on every screen, including leaf views and mid-jump. This row
originally shared the breadcrumb row's right-hand corner with the zoom
indicator; that wrapped at 80 columns (an entirely ordinary terminal
width) and silently overflowed the bottom panel's fixed, `overflow:
hidden` height, so it was moved to its own row — see Gravity below,
which follows the same one-row-per-concern shape.

## Gravity

Alongside Time, the bottom panel has a dedicated Gravity row, always
visible, showing three real accelerations in m/s² (`formatGravity`,
auto-scaled between fixed and scientific notation — these span ~1e-10 to
~1e12): **local** (the current node's own surface gravity —
`dilationInputs.localGravity` directly, `—` where unknown, e.g. moons/
asteroids/comets/the star map), **star** (the pull of the current
system's star at the node's real distance —
`relativity.ts`'s `gravityAtDistance(starGravity, starRadiusM,
distanceFromStarM)`, Newtonian `GM/d²` using the same `GM = gravity *
radius²` construction `dilationFactor` uses; `—` when centered on the
star itself, where distance is undefined), and **galactic** (a fixed
constant — see below). Sanity-checked against real physics: Venus reads
`local 8.870` (its real catalog surface gravity) and `star 0.011`,
matching `GM_sun/d²` at Venus's real 0.73 AU.

**Galactic**: `relativity.ts`'s `GALACTIC_GRAVITY_MPS2`, from
`SCOPE.md`'s 2026-07-30 addendum ("a gravitational constant... from the
distance from the center of the galaxy... we just need to know distance
for now"). Rather than modeling the galaxy's actual (non-point-mass)
enclosed mass distribution, it's derived from two real, independently
curated numbers — the Sun's real distance from the galactic center
(`GALACTIC_CENTER_DISTANCE_LY`, ~26,673 ly, GRAVITY collaboration 2019)
and its real orbital speed around it (220 km/s, IAU 1985 recommended
value) — as centripetal acceleration, `v²/r`. A fixed background
constant for now: the engine doesn't yet model galactic position or
motion (`ROADMAP.md` Phase 5), and AU-scale movement within a star
system is negligible at this distance regardless. Not yet fed into
`dilationFactor`/drift accumulation — display-only until that's wired up.

**Galactic Gravity Constant**: a second, distinct row, directly below
Gravity — `SCOPE.md`'s 2026-07-30 addendum, which asked for "two types
of gravity": Gravity above is what the three sources are *individually*;
this is their sum, shown as the literal running formula rather than
collapsed to just the total (`relativity.ts`'s `formatGravityFormula`) —
`{galactic} + {star} + {local} = {sum}` m/s², null terms contributing 0.
Explicitly **not** meant to represent anything actually felt — real
gravity doesn't compound additively like this (each term already has
its own distance falloff baked in, and standing on a planet you
obviously don't perceive the Sun's or the galaxy's pull as weight). It's
a raw building block reserved for a later calculation, not a physical
quantity in its own right — which is also why the formula (not just the
number) stays visible: the point is seeing the terms and how wildly
they're scaled relative to each other, not the sum itself.

## Velocity

Another dedicated row, directly below the Galactic Gravity Constant,
showing real circular orbital velocities (`relativity.ts`'s `orbitalVelocityAtDistance`,
`v = √(GM/d)`) for the same three sources Gravity does, formatted in
km/s (`formatVelocity`) except genuinely relativistic cases (≥10,000
km/s — only the curated pulsar reaches this), which switch to a percent
of light speed instead of an unwieldy six-digit km/s figure: **local**
(the current body's own surface circular velocity, i.e. the "first
cosmic velocity" — pass its own radius as the distance), **star** (the
node's real orbital velocity around its system's star, at its real
distance), and **galactic** (`GALACTIC_ORBITAL_SPEED_MPS`, the fixed
220 km/s constant Gravity's galactic term is itself derived from).
Sanity-checked against real, famous numbers: Earth's local reads
`7.906 km/s` (real low-Earth-orbit velocity) and its star reads
`~29.6 km/s` (Earth's well-known real solar orbital velocity, ~29.78
km/s at exactly 1 AU); the Sun's own local reads `436.697 km/s`
(matches its real surface escape velocity, 617.5 km/s, divided by √2);
the curated pulsar's local reads `~42.85% c`, a genuinely relativistic
value consistent with its strong-field dilation factor (`SPEC.md`'s
Time section) — a reminder that this is the classical `v = √(GM/d)`
approximation everywhere (the same simplification the engine already
uses for moon/asteroid/exoplanet positions), not a relativistically
corrected velocity.

## Session model

A session is a `sessionId` + `resumeKey` pair, generated locally and
persisted to `~/.solar-tui/sessions/<sessionId>.json` — explicitly a
stand-in for a future multi-user server (`session.ts`'s own comment: the
shape mirrors what a real server would eventually hand out). Resume with
`npm start -- --resume <sessionId> <resumeKey>`; a mismatched id/key pair
fails immediately rather than silently starting a new session. Notes are
freeform per-node-id text arrays, saved via the `save <text>` command and
persisted the same way.

## Commands

`/` or `:` enters command mode. `help`, `back`, `save <text>`, `notes`,
`whoami`, `time`, `quit`/`exit`. Unknown commands log an error and
return to nav mode. `~` (available directly from nav mode, no `/`
needed) opens the Console instead — see Console above for its own
separate command set (`become llm`, `become human`, ...).

Discoverability: nothing in the UI required a player to already know
`help` existed. The persistent bottom-prompt hint (`Prompt.tsx`, shown
whenever not actively typing a command) lists `~` alongside the other
keys; `/help`'s own response now also mentions `~` and the console;
and every "unknown command" message — in both the main command mode
(`App.tsx`) and inside the Console (`Console.tsx`) — points back to
`help` rather than just failing silently, so a mistyped command is
itself the way a player finds the real command list.
