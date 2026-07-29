# 1

A text-based solar system engine, built as an Ink (React-for-terminals) TUI.
Navigate from the Sun out through the planets, their major moons, the
asteroid belt, and (in progress) comets, using real orbital mechanics for
planet positions.

## Running

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

See `tui/` for the source layout and `CLAUDE.md` for current status and the
roadmap.

## Python skeleton

`src/one/`, `tests/`, and `pyproject.toml` are an early scaffold unrelated to
the TUI above — currently empty, not under active development.

- `src/one/` — the `one` package (src layout).
- `tests/` — empty; no test framework configured yet.
- Requires Python >= 3.10.

```bash
pip install -e .
```
