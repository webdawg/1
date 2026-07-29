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

Two full-width tiles, stacked vertically:

- **Top tile — the universe.** Dynamically sized to fill the actual
  terminal window (Ink's `useWindowSize`, reacting live to resize).
  Bordered box containing *only* plotted icon+label pairs — no other
  text. Swapped for `ContentView`'s leaf detail screen when centered on a
  leaf node.
- **Bottom tile — everything else.** Fixed height (11 rows), full width,
  bordered box containing, in order: the breadcrumb (`Centered on X (Sun
  > ... > X)`), one line of the currently-focused body's quick info
  (`label — N o'clock, distance`), the log (always exactly `MAX_LOG_LINES`
  rows, blank-padded so the panel's height never varies with content),
  and the command prompt.

Position math for the top tile lives in one place — `layout.ts`'s
`computeGridPositions` — used both by `SolarView` for rendering and by
`spatialNav.ts` for direction decisions, so they can never disagree about
where something is.

**Known constraint:** `SolarView`'s box has a border (2 cols) and
`paddingX={1}` (2 more cols) — `gridWidth` must subtract all 4, not just
the border. Getting this wrong doesn't error; it silently corrupts the
box's bottom border in this Ink version. See `DEVELOPMENT.md`.

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
detects this. That move instead plays a ~1.2s "diving through the star"
animation (`WarpTransition.tsx`: 6 frames of an expanding ring, reusing
`layout.ts`'s `polarToGrid`, no new position math) before the path
actually changes. While it plays: the top tile shows the animation
instead of `SolarView`/`ContentView`, the bottom panel's breadcrumb/
focused-info lines are replaced by a single `Diving through {label}...`
status line, and `useInput` is gated off (`isActive: mode === "nav" &&
!transition`) so no navigation input is processed mid-animation. The
pending `{ nextPath, label, logLine }` is held in `App.tsx`'s `transition`
state and only committed (`setPath`/`persist`/`pushLog`) when
`WarpTransition` calls its `onComplete` callback — there's no independent
timer to keep in sync with the animation's actual length.

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
`whoami`, `quit`/`exit`. Unknown commands log an error and return to nav
mode.
