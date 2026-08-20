# Starsystem — Roadmap

Phased plan derived from `SCOPE.md`. `SCOPE.md` is the *why* and doesn't
change; this file is the *what's next* and should. Review it at the start
of a session to pick up work; check items off as they land; add items as
scope gets clearer. Moment-to-moment "what's uncommitted right now" lives
in `CLAUDE.md`'s Current status section, not here — this is phase-level.
See `CODEBOT.md` for the general principles new work here should follow.

Phases are roughly sequential but not strict gates — later-phase ideas can
start early if they're cheap, and phases can overlap.

## What success looks like

This is meant to become a real public multi-user thing, per `SCOPE.md`'s
web-session/live-server idea — not just a personal local tool that stays
single-player forever. That means Phase 3 (multi-user live server) is a
genuine destination, not a someday-maybe, and architectural choices in
Phases 1-2 should avoid painting it out (e.g. keep `worldTree.ts`'s
position/state calculations pure functions of id + time, since a server
will need to compute the same things `App.tsx` does locally today).

## Phase 1 — Single-player text engine (core loop)

The base "center + orbiting things" navigation model, playable locally by
one person in a terminal.

- [x] Ink TUI scaffold, keyboard navigation, recentering on travel
- [x] Command prompt (`help`, `back`, `save`, `notes`, `whoami`, `quit`)
- [x] Real orbital mechanics for the 8 planets (time-of-now based)
- [x] Major moons, ring facts, asteroid belt + largest asteroids
- [x] Local session save/resume (session id + resume key, file-backed)

**Status: essentially done.** This phase is the foundation everything else
builds on — new body categories and later phases extend it rather than
replace it.

## Phase 2 — Fill out the world

More to explore before this feels like "the solar system," plus the
BBS-style social layer the vision calls for.

- [x] Comets (Halley, Encke, Hale-Bopp, Hyakutake — full Kepler positions)
- [x] A curated black hole (Sagittarius A*, real mass/distance, the most
      extreme real gravitational time dilation source in the game)
- [ ] Dwarf planets (Pluto, Ceres, Eris, ...)
- [ ] Bots / NPCs at locations ("there may be bots there")
- [ ] Leave-messages-for-others feature (BBS-style)
- [ ] Basic tests for the orbital math, now that there's enough of it to
      be worth protecting from regressions

**Done when:** a solo player has a reasonably rich system to wander and
leave a mark on, without needing another person online.

## Phase 3 — Multi-user live server

Move from "a TUI with local save files" to "a live thing people connect to
together," per the vision's original web-session idea.

- [ ] Real server backend replacing `session.ts`'s local-file persistence
      (the module's own comment already anticipates this shape)
- [ ] Web-facing entry point people connect to at a domain
- [ ] Server-issued unique session token + resume/password token
- [ ] Shared/observable state — multiple people able to see the same
      universe, not just their own local copy
- [ ] Entry-screen concept beyond a plain prompt (tumbler/roller-style
      selectors tied to player level, as described in `SCOPE.md`)

**Done when:** two people on two machines can be in the same universe at
the same time.

## Phase 4 — Accessibility & alternate senses

Called out explicitly in the vision as non-optional, not a nice-to-have
bolted on later.

- [ ] Audio/screen-reader-first interaction path (not just visual ASCII)
- [ ] Downloadable content, playable offline / async
- [ ] Music layer

**Done when:** a blind player can play the game meaningfully without the
visual grid.

## Phase 5 — Real-space grounding

The "this isn't just a simulation" layer: rooting the engine's coordinate
system in real time/space, and eventually real objects.

- [x] Curated star map — travel from the Sun to ~16 real nearby star
      systems (Proxima Centauri, TRAPPIST-1, 51 Pegasi, PSR B1257+12, ...)
      with real curated exoplanet data, via a "dive through the star"
      transition. Pulled forward ahead of the rest of this phase — static
      curated data (same pattern as every other `*Facts.ts` file), not a
      live coordinate system or real object feed yet.
- [ ] Universal coordinate system anchored to a defined origin, factoring
      in galactic motion + time + Earth position (time-based galactic
      position) — a first real number toward this landed alongside
      Gravity below: a fixed real distance from the Sun to the galactic
      center. Actual galactic position/motion (not just a static
      distance) remains open.
- [ ] Support for additional "dimensional spaces" with near-password-grade
      unique IDs
- [ ] Read-only access to real fixed/moving object feeds (cameras,
      satellites, radios, ...) — view and download, no control yet
- [ ] Auth schemes for eventually *controlling* real objects (explicitly
      undefined in the vision — start from existing RFCs/standards, don't
      invent from scratch)
- [ ] Ambient physics parameters at each location (light source direction,
      relative motion) — parameters only, no rendering
- [x] Relativity / a three-times model (`SCOPE.md`'s 2026-07-30
      addendum): actual time, universe time (seconds since the Big Bang),
      and a continuously-accumulated relativistic drift — real
      gravitational time dilation from Sol, all 16 curated stars, and the
      8 planets (proper, non-linearized formula, so the curated pulsar's
      genuinely strong-field effect comes out correct too). No
      relativistic effect applies during a SOLAR BASE JUMP — not a
      special-cased pause, just nothing massive nearby while in transit.
      Surfaced via the `time` command and continuously on its own HUD row.
      See `SPEC.md`'s Time section. NTP-server-backed actual time, and
      per-moon/asteroid local gravity, remain future refinements.
- [x] Current gravity in the HUD (`SCOPE.md`'s 2026-07-30 addendum): a
      dedicated always-visible row showing real local (current body's own
      surface gravity), star (the system star's pull at the real current
      distance), and galactic (a fixed real constant, from the Sun's real
      distance/orbital speed around the galactic center) acceleration in
      m/s². See `SPEC.md`'s Gravity section. Not yet wired into the
      relativity drift calculation — display-only for now. A second,
      distinct row — the Galactic Gravity Constant — sums those same
      three sources and shows the running formula; not a felt quantity,
      a raw building block reserved for a later calculation.
- [x] Orbital velocity in the HUD: a dedicated row alongside Gravity,
      the real circular velocity (`v = √(GM/d)`) for the same three
      sources — local (surface circular velocity), star (real orbital
      speed around the current system's star), galactic (the fixed
      220 km/s constant). Sanity-checked against famous real numbers
      (Earth's ~7.9 km/s low-orbit and ~29.6-29.8 km/s solar orbit); the
      curated pulsar's local term is genuinely relativistic (~43% c),
      shown as a percent of light speed rather than an unwieldy km/s
      figure. See `SPEC.md`'s Velocity section.

**Done when:** the engine can represent at least one real, live external
data feed inside the navigation model.

## Phase 6 — Narrative & engine-as-platform

The long-horizon, least-defined ideas — worth keeping visible so early
architecture doesn't foreclose them, but not actionable yet.

- [ ] Story/narrative layer — RPG framing, possibly a real-world
      search/ARG element
- [x] LLM as a second, real `playerType` alongside HUMAN — reachable via
      the `~` drop-down console (`Console.tsx`), gated by a 5-round
      token-prediction puzzle (3/5 to pass); reverting to HUMAN is
      instant/ungated. See `SPEC.md`'s Player and Console sections.
      Further selectable/creatable entity types beyond these two remain
      future work.
- [ ] SHIP-based star travel as an alternative to the default SOLAR BASE
      JUMP (see `SPEC.md`'s Player/Travel sections) — undefined beyond
      "sometimes the HUMAN travels through the sun in SHIPS" in the vision
- [ ] Interruptions / mass messages
- [ ] Pickup-able objects with effects (food, water, ...) — explicitly
      "none required at this time" in the original vision, lowest priority
- [ ] Second video-raster "game box" overlay on top of text mode
- [ ] Feed engine state to an external 3D game engine as a renderer
- [ ] **Algorithmic physics** — explore whether the engine's physics
      layer (`relativity.ts` and whatever follows it) should leave room
      for decision-like ("if/then") behavior emerging at sufficiently
      complex scales, not just compounding simple formulas — framed as
      a *relativistic-scale* question (galaxy-and-up systems: how
      galaxies stabilize as they change, black hole behavior, ...), not
      metaphysics. Pairs with a second, more concrete thread: how the
      systems of compute that run something like government, or the
      universe itself, stay hardened and stable — worth scoping as
      its own model of resilient large-scale computation once this
      idea has more shape. See `SCOPE.md`'s 2026-08-20 addendum for
      the full framing. Undefined beyond the idea itself — no engine
      changes yet.
- [ ] **The navigation model as a general visual protocol** — the
      recursive "center + orbiting things" pattern (`worldTree.ts`'s
      `getOrbitChildren`) isn't inherently astronomy-specific; it could
      be a general way for bots/agents to navigate *any* data (files,
      APIs, the wider internet, ...) through the same center-and-orbit
      interaction model already built here, not just this solar-system
      dataset. Pairs with recording/logging what a bot did while
      navigating — an activity trail, distinct from a HUMAN's own
      session log. Undefined beyond the idea itself; revisit once
      Phase 2's "bots/NPCs at locations" item (bots *in* the universe)
      and Phase 3's multi-user work (observability across sessions) give
      it more shape.

**Done when:** honestly, this phase is a horizon, not a target — revisit
and re-scope once Phases 1-5 make the shape of the platform clearer.
