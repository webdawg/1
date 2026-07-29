# Spec

Technical specification of how the `tui/` engine actually works right now —
the concrete *how*, as opposed to `SCOPE.md` (the *why*, founding vision) or
`ROADMAP.md` (the *what's next*, phased plan). This is a snapshot of the
current design; update it as the design changes, and if the code and this
file ever disagree, the code is authoritative until this file catches up.

## World model

A single recursive rule: whatever node you're centered on, you see what
orbits it. Node categories: `sun` → `planet` → `moon`; `sun` → `belt` →
`asteroid`; `sun` → `comets` (hub) → `comet`; any of those → leaf nodes
(`surface`, `orbit-log`, `rings` — only on ringed planets, `notes`).
Leaves are generic detail screens, not physical bodies.

Position math, by category:
- **Planets** — real orbital elements + Kepler's equation (Newton's
  method), time-of-now based. `tui/src/orbital.ts`.
- **Moons, asteroids** — circular mean-motion approximation (a per-body
  phase offset + period), not full ephemeris. `getMoonPosition`/
  `getAsteroidPosition` in `worldTree.ts`.
- **Comets** — full Kepler equation like planets, not the circular
  approximation, because their eccentricity is too extreme for that to
  look sane. `cometFacts.ts`'s `getCometPosition`.
- **Belt, comets hub** — a single fixed representative point each, since
  the real belt/comet population spans every angle at once and there's no
  single "position" to compute.

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
| Sun (center marker only) | `(*)` | `(*)` |
| Terrestrial planet | `(x)` | Mercury `(.)`, Venus `(v)`, Earth `(O)`, Mars `(r)` |
| Gas/ice giant (all 4 — Jupiter/Saturn/Uranus/Neptune all have real rings) | `=x=` | `=J=` `=S=` `=U=` `=N=` |
| Moon | `.m.` | shared across all moons |
| Belt hub | `{:}` | `{:}` |
| Individual asteroid | `{.}` | `{.}` |
| Comets hub | `~^~` | `~^~` |
| Individual comet | `~'~` | `~'~` |
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

The center marker is placed before both passes, fixed and unmoved (it's
"where you are," not something that should visually drift).

## Spatial navigation

Arrow keys move focus to whichever *other* plotted entry is actually
positioned in that direction on screen — not the next item in a hidden
angle-sorted list. `spatialNav.ts`'s `pickNextFocus`:

- Filter candidates strictly in the pressed direction (`right`: `dx>0`,
  etc.).
- Score survivors `primary + perpendicular * 3` (primary = delta along
  the pressed axis, perpendicular = the other axis's delta — grid coords
  already include the display's aspect-ratio stretch, so this weighting
  is what favors "almost straight" over "diagonal"). Pick the minimum;
  tie-break by id.
- If nothing lies in that direction at all, fall back to angle-order
  wraparound (step ±1 through the angle-sorted entries, wrapping) so
  arrow keys always do *something* rather than going dead at layout
  edges.

Enter travels to the focused entry, pushing it onto the navigation path;
children rebuild for the new center via `getOrbitChildren`, and focus
resets to the new set's first entry.

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
