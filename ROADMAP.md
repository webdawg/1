# Roadmap

Phased plan derived from `SCOPE.md`. `SCOPE.md` is the *why* and doesn't
change; this file is the *what's next* and should. Review it at the start
of a session to pick up work; check items off as they land; add items as
scope gets clearer. Moment-to-moment "what's uncommitted right now" lives
in `CLAUDE.md`'s Current status section, not here — this is phase-level.

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
      position)
- [ ] Support for additional "dimensional spaces" with near-password-grade
      unique IDs
- [ ] Read-only access to real fixed/moving object feeds (cameras,
      satellites, radios, ...) — view and download, no control yet
- [ ] Auth schemes for eventually *controlling* real objects (explicitly
      undefined in the vision — start from existing RFCs/standards, don't
      invent from scratch)
- [ ] Ambient physics parameters at each location (light source direction,
      relative motion) — parameters only, no rendering

**Done when:** the engine can represent at least one real, live external
data feed inside the navigation model.

## Phase 6 — Narrative & engine-as-platform

The long-horizon, least-defined ideas — worth keeping visible so early
architecture doesn't foreclose them, but not actionable yet.

- [ ] Story/narrative layer — RPG framing, possibly a real-world
      search/ARG element
- [ ] Interruptions / mass messages
- [ ] Pickup-able objects with effects (food, water, ...) — explicitly
      "none required at this time" in the original vision, lowest priority
- [ ] Second video-raster "game box" overlay on top of text mode
- [ ] Feed engine state to an external 3D game engine as a renderer

**Done when:** honestly, this phase is a horizon, not a target — revisit
and re-scope once Phases 1-5 make the shape of the platform clearer.
