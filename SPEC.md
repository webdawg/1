# Starsystem — Spec

Technical specification of how the `tui/` engine — this project's name is
**Starsystem**, per `SCOPE.md`'s 2026-08-06 addendum — actually works
right now. The concrete *how the engine behaves*, as opposed to
`SCOPE.md` (the *why*, founding vision), `ROADMAP.md` (the *what's
next*, phased plan), or `CODEBOT.md` (the *how code gets written*,
general principles for code generation rather than the engine's design).
This is a snapshot of the current design; update it as the design
changes, and if the code and this file ever disagree, the code is
authoritative until this file catches up.

> "There are infinite connections between stars." — and, less
> explicably: "when you perform tensor-like calculations using the
> particle accelerator sun, you get strange results." Both are quoted
> verbatim from `SCOPE.md`'s 2026-08-06 addendum, preserved here
> deliberately as lore, not as a spec item — nothing in this codebase
> performs "tensor-like calculations" on the Sun, and nothing should be
> built to make that sentence literally true. The first half *is*
> reflected below: the star map's real connections (every curated star,
> plus Sagittarius A*) already form a graph with no fixed edge count,
> and Sagittarius A* alone connects to a genuinely unbounded space of
> destinations — a fresh, never-repeating system on every single crossing
> (see Random landing below). "Infinite connections between stars" is
> true of this engine today, not just aspirationally.

## World model

A single recursive rule: whatever node you're centered on, you see what
orbits it. The root is the star map (`starmap`) → stars (Sol, id `"sun"`,
plus ~16 real nearby stars, plus Sagittarius A* — see below) → for Sol:
`planet` → `moon`; `sun` → `belt` → `asteroid`; `sun` → `comets` (hub) →
`comet`; for every other star: `exoplanet`. Any of those → leaf nodes
(`surface`, `orbit-log`, `rings` — only on ringed planets, `notes`).
Leaves are generic detail screens, not physical bodies. Sagittarius A*
specifically is a connection to an unbounded space of further systems,
not a fixed leaf of this tree — see Random landing below.

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

**Sagittarius A***, the Milky Way's real central supermassive black
hole, is curated as one more `StarId`/`STAR_FACTS` entry (id
`sagittarius-a-star`) — not a new category, following the same precedent
`STAR_FACTS` already set for PSR B1257+12 (a pulsar, not a true star,
handled the same way). Every mechanic keyed off `isStarId` — glyph,
labels, leaves, the "diving through a star" SOLAR BASE JUMP transition,
`getDilationInputs` — works for it with zero changes elsewhere, since
`worldTree.ts` only ever branches on `isStarId(id) && id !== "sun"`, not
on which specific star. Its `gravity`/`diameterKm` aren't a literal
surface (a black hole has none) — they're derived from its Schwarzschild
radius (`Rs = 2GM/c²`, real EHT-2022 mass ~4.297 million M☉, giving
`Rs ≈ 12.69 million km`) via the same `GM = gravity·radius²`
construction `dilationFactor` uses everywhere else, so "standing" on it
means standing at the event horizon — the real physics reads exactly as
dramatic as the concept demands (see Time below).

Real distance (26,673 ly) intentionally matches `relativity.ts`'s
`GALACTIC_CENTER_DISTANCE_LY`, since Sgr A* *is* the object that
constant already measures the Sun's distance from — but it's **not**
folded into `STARMAP_DISPLAY_DOMAIN`'s max (still 2300 ly, PSR
B1257+12's real distance): widening the shared domain to fit one object
11x farther than the next-farthest curated star was tried and reverted,
since it forced auto-zoom to max out (64x) and crowded all 16 other
stars into unreadable overlap.

**Position went through several revisions** before landing on a
mechanism built specifically for it (`layout.ts`'s `pinnedEdge` —
see Layout below): initially 5° with the ordinary distance/angle math
(collided with the tightest gap in the whole map, between PSR B1257+12
and Proxima Centauri, clamped to the rim like any out-of-domain
distance); then briefly moved to be the star map's exact *center*
(`distance` overridden to `0`, the same convention `starSelfEntry` uses
for a star you're standing on, with the Sun pushed out to the rim
instead) and reverted; then to 180° (left side of the NAVIGATION tile)
still via the ordinary clamp-to-rim math, still subject to zoom level
and the same icon-crowding nudges any other star gets. Landed for good
on a fourth, qualitatively different approach — a literal pin to the
grid's left edge column, immune to all of that — per "should always be
on the very edge of the screen... you could make it part of the tile
border." `worldTree.ts`'s `getOrbitChildren`, for `STARMAP_ID`, sets
`pinnedEdge: "left"` only on this one entry; every other star still
uses the normal math untouched. Confirmed via tmux at both 100×45 and
80×30: the glyph now sits flush against the tile's actual border
column, with its full label visible even at the small floor where every
other far-out star still crowds.

## Physics rules

Foundational laws the engine itself is built to uphold, distinct from the
real-world physics simulated elsewhere (gravitational time dilation,
orbital mechanics, etc. — see Time, Gravity, Velocity below). These are
rules of *this* universe's engine, not physical constants borrowed from
ours.

1. **Data cannot be destroyed.** Nothing a player saves — notes, session
   state, anything persisted via `session.ts` — is ever deleted by the
   engine. This is a law, not a feature to be weighed against others when
   implementing future mechanics (deletion/reset/overwrite commands, bot
   interactions, etc.).

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
  Gravity, Velocity, and Galactic position below), full width, one
  bordered box containing, in order: the breadcrumb, split across two
  rows — `Centered on X` plus the zoom indicator on the first, and the
  path list (`(Sun > ... > X)`) on its own dedicated row below; the two
  Time rows (`[GALACTIC TIMES - ...]`, `[ACCUMULATED DILATION - ...]`),
  the Gravity row, the Galactic Gravity Constant row, the Velocity row,
  the two Galactic position rows (`[GALACTIC POSITION - ...]`,
  `[ORBITAL PHASE (illustrative) - ...]`), the log (always exactly
  `MAX_LOG_LINES` rows, padded with a single space rather than an empty
  string so padding rows don't collapse to zero height — see
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
| Sagittarius A* (deliberately off-motif) | `▓█▓` | `▓█▓` — a dense block cluster, not a star's `*x*` bracket, so the one non-star entry in the star map reads as visually distinct at a glance. Started as a plain `(●)` circle; replaced on direct feedback that it "wasn't cutting it." Unicode block-drawing characters (U+2580 range) render as one terminal column each, same as any ASCII glyph — confirmed via tmux, since this codebase's glyph column-math is otherwise strict about single-width characters only (see `DEVELOPMENT.md`) |
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

**Pinned-edge entries** are a third, narrower positioning mode —
`OrbitEntry`'s optional `pinnedEdge: "left" | "right" | "top" | "bottom"`
(`worldTree.ts`), resolved in `layout.ts`'s `computeGridPositions`
*before* the normal distance/angle branch runs: instead of
`polarToGrid`, the entry gets a fixed column/row (`x: 0` for `"left"`,
`gridWidth - 1` for `"right"`, etc., vertically/horizontally centered on
the other axis) that doesn't move with zoom, domain changes, or grid
size. Currently used for exactly one entry, Sagittarius A* in the star
map (see World model above) — an ordinary out-of-domain distance
already clamps to the outer rim, but that rim's radius still depends on
`gridWidth`/`gridHeight` and can still drift or get nudged by the
crowding system in `findFreeSlot`; `pinnedEdge` guarantees a specific
screen position no matter what, reading as attached to the tile's own
border rather than just near it. Still goes through the normal two-pass
icon/label stamping above (not exempt from collision — it just starts
from a different fallback position). `App.tsx`'s auto-zoom input
(`computeAutoZoomLevel`) excludes pinned entries the same way it already
excludes leaves and the distance-0 home entry, since their position
doesn't respond to zoom at all — including one in "what needs to fit"
wouldn't mean anything.

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

### The portal variant — Sagittarius A* only

Crossing to or from Sagittarius A* specifically plays a different setup
sequence — "a man stepping through a portal, just a clear door to
another world," per direct request, not the star-ring/dive one above.
`App.tsx`'s `startStarTransition` sets a `portal` flag (`starId ===
"sagittarius-a-star"`) alongside the existing `travelMs`, carried in
`transition` state and passed straight through to `WarpTransition` as a
prop; the component picks `buildPortalSetupFrame`/`PORTAL_SETUP_PHASES`
over the star versions when it's set. The shared **traveling** phase
(quantum words) and its real-distance-scaled duration are unaffected —
only the four-phase setup cinematic before it differs:

1. **portalApproach** (4 × 200ms) — a plain rectangular door frame
   (`┌─────┐`/`│ │`/`└─────┘`, `stampDoorFrame`) appears center-grid; the
   traveler walks toward it from below, decreasing distance each frame
   (`stampTravelerAt`, anchored by its feet rather than polar-positioned
   — a door isn't circular). *"Approaching a door to {label}..."*
2. **portalOpen** (3 × 200ms) — the door's interior fills in
   (`░`→`▒`→`▓`, `stampDoorInterior`) while the traveler stands at the
   threshold. *"The door opens onto {label}..."*
3. **portalStep** (5 × 200ms) — traveler still visible at the threshold
   for the first 2 frames, then gone (stepped through) for the
   remaining 3, leaving just the fully "open" glowing doorway.
   *"Stepping through..."*

Same 12-step, ~2.4s total shape as the star sequence (4+3+5 vs. 3+3+3+3)
so the two modes take identical real time regardless of which one plays;
only `TransitionPhase` names, the drawing functions, and
`PHASE_MESSAGES` entries differ. Verified via tmux at both 80×30 and
100×45, for both directions (arriving at and leaving Sgr A*) and both
`playerType`s (the HUMAN/LLM figure swap works here exactly like it
does for the star sequence, since both call the same
`TRAVELER_FIGURES` lookup).

## Random landing — what's through Sagittarius A*

Per `SCOPE.md`'s 2026-08-05 addendum (and a same-day follow-up): arriving
at Sagittarius A* doesn't land on a real destination the way every other
star does — it generates a brand-new, wholly fictional star system (a
handful of planets, one of them home to a randomly generated
civilization) and lands you directly on that civilization's planet, with
its own brief landing animation. From there you can back out to see and
explore the rest of the generated system, then leave through Sagittarius
A* again to roll an entirely new one. **Fresh every single trip** — an
explicit choice, confirmed directly with the user over the alternative
(a stable, seeded-once, revisitable destination): nothing generated here
is persisted anywhere, and you can never return to the same generated
system twice. This is the one deliberately fictional corner of the
engine — everywhere else (planets, moons, real stars, curated
exoplanets, Sgr A* itself) is real, curated data; `randomSystem.ts`'s
own file comment makes this contrast explicit so it doesn't get mistaken
for another curated `*Facts.ts` file later. Fictional planets
deliberately carry no fabricated stats (diameter, gravity, ...) the way
real bodies do — just a name and a line of flavor text — so as not to
blur the line between real and made-up data elsewhere in this codebase.

**Generation** (`randomSystem.ts`'s `generateRandomSystem()`, pure, no
React): mad-libs a `RandomSystem` — a star name, 3–6 `RandomPlanet`s
(name, glyph, an AU-like display distance and angle spread evenly around
the circle with jitter, same spirit as the real star map's hand-placed
angles), and exactly one of them flagged as the civilization's home
(its own name plus one of ten curated trait lines, e.g. "who trade in
memories instead of currency"). The other planets each get a plain
flavor line from a separate small pool (no civilization). Every call is
a fresh set of `Math.random()` rolls — nothing seeded or reproducible.

**Arrival** (`App.tsx`'s `completeTransition`): on arrival specifically
(checking `current.nextPath`'s last segment is `"sagittarius-a-star"` —
leaving doesn't touch it) generates a system, stores it in `randomSystem`
state, resets `hasPlayedLanding` to `false`, and — instead of just
landing on the hub — immediately extends the path one level further onto
the civilization planet's id, so you land *in* the system already
standing on the world that matters. Neither `randomSystem` nor
`hasPlayedLanding` is added to `session.ts`'s persisted `SessionData`,
matching "not persisted anywhere." A safety-net effect covers resuming a
session saved mid-visit (`path` itself *is* persisted): if `centerId` is
the hub or a generated-planet id with no `randomSystem` in memory, it
generates a fresh one immediately: at the hub, that's it; three levels
deep, the *specific* planet id from the discarded system can't possibly
match the fresh roll's ids, so it falls back to the hub instead of
pointing at a planet nothing generated. `hasPlayedLanding` is forced
`true` in this path — a resume shouldn't replay the animation.

**Exploring the system**: while centered on `"sagittarius-a-star"` with a
`randomSystem` set, `App.tsx` overrides both `children` and `domain`
(worldTree.ts's real, curated-exoplanet-based versions don't know about
generated planets) — `children` becomes the usual "travel back out"
self-entry, Sgr A*'s own *real* Surface/Notes leaves (unchanged — still
the genuine curated black-hole facts, just no longer the only thing
here), and every generated planet as an ordinary selectable orbit entry.
Moving between the hub and any planet is instant, exactly like moving
between Sol and a real planet — `isStarBoundary` only fires on the
star-map ↔ star crossing itself, never on this inner navigation, so the
portal sequence never replays just from browsing the system. The
breadcrumb resolves generated-planet ids to their names via a small
wrapper around `getBreadcrumbLabel` (checking `randomSystem.planets`
first) rather than teaching `worldTree.ts` about fictional ids.

**Standing on a planet** (`RandomPlanetCard.tsx`, rendered whenever
`centerId` matches one of `randomSystem.planets`, `key`ed by planet id so
navigating to a different planet gets a fresh component instance): the
civilization planet, on its first-ever landing only (`animate` prop,
gated on `!hasPlayedLanding`), plays a short (~1s) self-contained landing
beat — a green disk grows to fill the grid (reusing the same
Euclidean-distance/`ASPECT_RATIO` approach `WarpTransition`'s star-dive
disk uses), then the traveler figure (`WarpTransition.tsx`'s exported
`TRAVELER_FIGURES`, so the HUMAN/LLM swap works identically here) appears
standing on it — before settling into a static bordered card (matching
`ContentView`'s leaf-card style) with the touchdown line and description.
Every other planet, and every revisit to the civilization planet within
the same system-visit, skips straight to the settled card — the intro is
a first-arrival flourish, not a per-visit one. Deliberately
lighter-weight than `WarpTransition`'s full cinematic (no HUD phase
messages, no `onPhaseChange` plumbing) since this isn't a mode transition
the rest of the app needs to react to.

**Leaving** works exactly like leaving any other star — `isStarBoundary`
doesn't know or care what's currently on screen inside the system, so
Escape/`back` from the hub still plays the same portal-departure sequence
(see above) back out to the star map, and going back in rolls an entirely
new system from scratch. Verified via tmux at both 80×30 and 100×45: the
full loop (portal in → animated touchdown → back out to the system view →
visit a different, non-civilization planet → back to the hub → confirm
Sgr A*'s own real Surface facts are still reachable → leave → re-enter →
confirm a genuinely different system), plus the direct-resume safety net
at both the hub and a (deliberately stale) three-levels-deep path.

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
approximation would quietly break down at that scale. Sagittarius A*
(see World model above) is the genuinely extreme case: at its
Schwarzschild radius, `2GM/(rc²) = 1` by definition (that's the
Schwarzschild radius's actual definition), so `dilationFactor` hits
`MAX_SCHWARZSCHILD_TERM`'s cap and returns a factor of ~0.001 — a clock
there runs at roughly 1/1000th speed, an order of magnitude more
extreme than the pulsar. Verified live via tmux: dwelling there for a
single 5s tick accumulated ~5 real seconds of drift (`factor - 1 ≈
-0.999`, so almost the entire elapsed tick is lost) — matching the "a
few years there, decades back home" framing the object was added for.

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
(not just via `time`), across two dedicated rows, each a labeled
bracketed group:

- `[GALACTIC TIMES - ...]` — actual time (`HH:MM:SS` plus a UTC offset
  like `UTC-7`/`UTC+5:30`, `relativity.ts`'s `formatUtcOffset`) and the
  universe age as an exact whole-seconds count since the Big Bang
  (`formatUniverseAgeSeconds`, comma-grouped, e.g.
  `435,400,207,218,294,234s`), e.g. `[GALACTIC TIMES - 1:43:54 PM UTC-4 ·
  435,400,207,218,294,234s]`. Per the user's explicit choice — "just the
  seconds and that is it" — over the years/days/H:M:S.mmm breakdown an
  earlier version of this row showed.
- `[ACCUMULATED DILATION - ...]` — the current drift (`formatDriftMs`, read directly
  off `sessionRef.current.timeDriftMs`), e.g. `[ACCUMULATED DILATION - -197.334ns]`.

Two rows, not one: the combined single-line form (`[GALACTIC TIMES -
...] [ACCUMULATED DILATION - ...]`) runs past the ~76-character
content-width budget at 80 columns — the exact overflow-corruption class
this session kept hitting elsewhere (`DEVELOPMENT.md`'s Ink gotchas).
Splitting into two rows was the user's explicit choice over shortening
either bracket's contents. Both rows are visible on every screen,
including leaf views and mid-jump.

Both new pieces are HUD-only — the `time` command's own Time 1/Time 2
output is untouched (no timezone, no whole-seconds count; still
`now.toLocaleString()` and the full `formatUniverseAge` years/days/H:M:S
breakdown). The row's own dedicated `clockNow` interval runs every 1s —
independent of the coarser 5s position/drift tick, still gated by
`pausedRef` so `/pause` freezes it completely (see Pause below).

**Precision**: `relativity.ts`'s `universeAgeWholeSeconds` computes the
whole-seconds count via `bigint` arithmetic, not `universeAgeSeconds`'s
float64 total (~4.35e17 seconds) — a float64's precision near that
magnitude only resolves to about ±64 seconds (the ULP of summing a huge
number with a small one), so a display built on it would sit frozen for
up to a minute at a time rather than ticking every second (confirmed
directly: two calls 300ms apart came back bit-for-bit identical, before
this was caught and fixed). `bigint` has no such limit:
`SECONDS_PER_JULIAN_YEAR` is exactly representable as an integer
(`365.25 × 86400 = 31,557,600`, no fractional remainder), so the huge
reference-age term converts to `bigint` exactly, and only the small,
already-precise elapsed-seconds term needs adding to it — no precision
lost anywhere in the sum. An earlier version of this row
(`formatUniverseAgeCompactDetailed`, since removed along with
`formatUniverseAgeCompact`) showed a billions-of-years figure plus a
day/H:M:S.mmm remainder computed the same float64-based way and hit
this exact wall — worth remembering if this resurfaces: **any** display
meant to visibly tick off of `universeAgeSeconds()`'s total hits this
same wall, not just the
specific field that hit it originally.

This row originally shared the breadcrumb row's right-hand corner with
the zoom indicator; that wrapped at 80 columns (an entirely ordinary
terminal width) and silently overflowed the bottom panel's fixed,
`overflow: hidden` height, so it was moved to its own row — see Gravity
below, which follows the same one-row-per-concern shape.

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

## Galactic position

Two more dedicated rows, directly below Velocity, answering "where are
we relative to the black hole at the center of the galaxy" —
Sagittarius A* (see World model above) is the origin.

`[GALACTIC POSITION - ...]` — **real** data, always visible: distance
from the galactic center (`GALACTIC_CENTER_DISTANCE_LY`, 26,673 ly,
already curated for the Gravity/Velocity rows' galactic terms) and
height above the galactic midplane (`relativity.ts`'s
`SUN_HEIGHT_ABOVE_GALACTIC_PLANE_LY`, ~67.8 ly — the Sun's real
measured offset, Bennett & Bovy 2019: 20.8 ± 0.3 pc). This height is
shared by the Sun and every curated star in `starFacts.ts`, not
computed per star: every one of them sits within ~2300 ly of the Sun,
negligible against the ~26,673 ly to the galactic center, so the whole
curated cluster is honestly at the *same* height on this scale — one
real number, not sixteen approximated ones. Sagittarius A* itself sits
*at* the plane (height 0), being the disk's own center by definition.

`[ORBITAL PHASE (illustrative) - ...]` — explicitly **not** real data,
labeled as such in the HUD text itself, not just in this doc. Real
astronomy has no agreed reference epoch (and no precise-enough period)
to say exactly where the Sun currently sits in its lap around the
galactic center — unlike a planet's orbit, this isn't something with a
tracked ephemeris. `relativity.ts`'s `galacticOrbitPhaseDeg` instead
advances a phase angle in real time at the real orbital rate
(`GALACTIC_ORBIT_PERIOD_SECONDS`, derived — not separately sourced —
from the same circumference/speed the Gravity row's galactic term
already uses; comes out to ~228 million years, a good sanity check
against the real textbook range of ~225–250 million years), anchored
arbitrarily to `REFERENCE_EPOCH_MS` (0° there) — a convention, the same
way `starFacts.ts`'s `displayAngleDeg` values are hand-assigned rather
than measured. `formatGalacticPhase` auto-scales like `formatGravity`;
in practice this is *always* exponential notation (the real rate is
~5×10⁻¹⁴° per second), and deliberately isn't hunted for a way to make
it visibly tick the way GALACTIC TIMES' universe-age reading was —
unlike that case, the real thing this represents genuinely doesn't
change on any human timescale, so a static-looking number here is
correct, not a bug to engineer around.

## Session model

A session is a `sessionId` + `resumeKey` pair, generated locally and
persisted to `~/.solar-tui/sessions/<sessionId>.json` — explicitly a
stand-in for a future multi-user server (`session.ts`'s own comment: the
shape mirrors what a real server would eventually hand out). Resume with
`npm start -- --resume <sessionId> <resumeKey>`; a mismatched id/key pair
fails immediately rather than silently starting a new session. Notes are
freeform per-node-id text arrays, saved via the `save <text>` command and
persisted the same way.

## Keys and commands

The full input surface, kept in one place so nothing is discoverable
only by accident. This is the canonical reference — `App.tsx`'s `help`
case and `Prompt.tsx`'s persistent hint text are both meant to summarize
it, not define it, so update this section first when either changes.

**Nav-mode keys** (`App.tsx`'s main `useInput`, active whenever not
paused, not mid-transition, not in command mode, and the console isn't
open):

- Arrow keys — move focus to whichever entry is actually positioned in
  that direction on screen (`spatialNav.ts`; see Spatial navigation
  above).
- Enter — travel to the focused entry (or, on the star-map exit entry,
  travel back out through the current star).
- Escape / Backspace — go back one level (`goBack()`); Escape also
  instantly resumes if paused (see Pause below).
- `+`/`=` and `-`/`_` — zoom in/out (see Zoom above); no effect on a
  leaf's `ContentView` screen.
- `~` — open the Console (see Console above).
- `/` or `:` — enter command mode (works even while paused, so `/pause`
  can be typed again to resume).

**Command mode** (`/` or `:` then Enter): `help`, `back`, `save <text>`,
`notes`, `load <sessionId> <resumeKey>`, `whoami`, `time`, `pause`,
`quit`/`exit`. Unknown commands log an error and return to nav mode.
Deliberately a command rather than a bare key — a bare key risks
accidentally firing during ordinary nav-mode play (a stray keypress
while looking around), where a slash command can't, and it matches
every other non-movement action (`save`, `time`, `quit`, ...) already
being a command rather than a hotkey.

`whoami` prints all three of session id, resume key, and a ready-to-run
`npm start -- --resume <id> <key>` line — not just the id, which is all
it originally showed. This is deliberately the *only* other place (besides
the one-time line printed when a session is first created) the resume
key is ever surfaced: pair it with `/pause` (see Pause above) to freeze
the screen and copy real credentials out of the terminal at any point
mid-session, not just at the very start.

`load <sessionId> <resumeKey>` is the in-game counterpart to launching
with `--resume`: calls `session.ts`'s `loadSession` (same function
`index.tsx` uses at startup), and on success replaces `sessionRef.current`
wholesale plus `setPath`/`setPlayerType` to match — no process restart.
`focusedId`/`zoomLevel` need no explicit reset: they already derive from
`path`/`centerId` via existing effects, which fire naturally once `path`
changes. A bad id/key pair logs an error and leaves the current session
untouched. The session being left behind isn't lost — it was already
continuously persisted throughout play (every travel/note/tick already
calls `saveSession`, not just `load`/`quit`), so it's independently
resumable later by its own id/key.

**Console** (`~`, its own separate mode — see Console above): `help`,
`become llm`, `become human`, `close`/`exit`; Escape also closes it.

Discoverability: nothing in the UI requires a player to already know
`help` existed. The persistent bottom-prompt hint (`Prompt.tsx`, shown
whenever not actively typing a command) lists every nav-mode key; `help`
itself expands on that (split across several short `pushLog` lines —
see the Pause section's note on why a single long help string can't be
used); and every "unknown command" message — in both the main command
mode (`App.tsx`) and inside the Console (`Console.tsx`) — points back to
`help` rather than just failing silently.

## Pause

`/pause` freezes the whole screen so the player can select and copy
text out of the terminal without it changing mid-selection — without
this, the always-ticking HUD clock (its own 1s interval) and the
coarser 5s position/drift tick mean nothing on screen stays still for
long. A command rather than a bare key deliberately — see the Keys and
commands section above for why — which also means it can never fire
while typing in the prompt or console (both already ignore the nav
`useInput` hook entirely — see below — but a bare key would still risk
an accidental trigger during ordinary nav-mode play).

Implementation (`App.tsx`): a `paused` boolean gates both interval
callbacks (`if (!pausedRef.current) setX(...)`, read via a ref kept in
sync with the state so the already-running `setInterval` doesn't need
to be torn down and recreated) — the timers keep firing, they just skip
the state update that would otherwise trigger a re-render or advance
anything. The `runCommand` `pause` case toggles the boolean and logs
"Paused"/"Resumed". The same `useInput` handler that owns the other
nav-mode keys checks `paused` first: while paused, every key except
Escape (instant resume) and `/`/`:` (to type `/pause` again) is
swallowed — arrows don't move focus, Enter doesn't travel, zoom doesn't
change — so the frozen frame is genuinely frozen, not just visually
stale. A side effect worth being deliberate about: since the
drift-accumulation effect is keyed off the same tick that pause
suppresses, gravitational time dilation does not accumulate while
paused — the same "no relativistic effect" treatment a SOLAR BASE JUMP
already gets (`SPEC.md`'s Time section), for the same underlying reason
(nothing advances during a deliberate non-gameplay freeze). Shown via a
`PAUSED — esc or /pause to resume` message that takes over the HUD's
`Centered on X` slot (the same slot a SOLAR BASE JUMP's phase message
already borrows), bold and yellow like the transition message.
