# 1

A text-based solar system engine, built as an Ink (React-for-terminals) TUI.
Navigate from the Sun out through the planets, their major moons, the
asteroid belt, and (in progress) comets, using real orbital mechanics for
planet positions.

## Running

```bash
./run.sh
```

or manually:

```bash
cd tui
npm install
npm start
```

Arrow keys move focus between orbiting bodies, Enter travels to the focused
body, Escape/Backspace goes back. Type `/` or `:` for command mode
(`help`, `back`, `save <text>`, `notes`, `whoami`, `quit`).

```bash
npm run typecheck
```

See `tui/` for the source layout.

## Documentation

Beyond this README, the repo carries a small stack of docs, each with a
distinct scope:

- [`SCOPE.md`](SCOPE.md) — the founding vision statement: the long-term
  idea behind this project, well beyond what's currently built. Not a
  spec, just the north star for judging where features should
  eventually head. Includes dated addenda as the vision gets extended
  over time.
- [`ROADMAP.md`](ROADMAP.md) — the phased plan derived from that vision,
  broken into concrete, checkable items. Check here for what's next
  before starting new work.
- [`SPEC.md`](SPEC.md) — the technical specification of how the engine
  *currently* works: world model, layout, icon/placement rules, spatial
  navigation, the player/console/travel systems, session model. Kept in
  sync with the code, as distinct from `SCOPE.md`'s vision and
  `ROADMAP.md`'s plan.
- [`DEVELOPMENT.md`](DEVELOPMENT.md) — the development environment:
  prerequisites, setup, running, and how TUI changes get verified (no
  automated test framework yet, so this matters more than usual). Also
  where Ink-specific gotchas hit during development get recorded.
- [`CLAUDE.md`](CLAUDE.md) — guidance for Claude Code (or any AI coding
  assistant) working in this repo: project/file structure, conventions,
  and a "Current status" section tracking tactical, uncommitted-right-now
  detail that changes faster than `ROADMAP.md`'s phases do.

## Python skeleton

`src/one/`, `tests/`, and `pyproject.toml` are an early scaffold unrelated to
the TUI above — currently empty, not under active development.

- `src/one/` — the `one` package (src layout).
- `tests/` — empty; no test framework configured yet.
- Requires Python >= 3.10.

```bash
pip install -e .
```
