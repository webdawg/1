# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

This repository is an early-stage skeleton with no commits yet. The package (`src/one/__init__.py`) and `tests/` directory are both currently empty. There is no README, no lint/test tooling configured, and no dependencies declared yet — treat architecture and conventions as not yet established rather than assuming prior art.

## Structure

- `src/one/` — the `one` package (src layout, installed in editable/build mode via setuptools).
- `tests/` — empty; no test framework is declared in `pyproject.toml` yet.

## Packaging

- Build backend: `setuptools` (`pyproject.toml`), package discovery rooted at `src/`.
- Requires Python >= 3.10.
- No console scripts, optional dependency groups, or runtime dependencies are declared yet.

Since no test runner, linter, or CLI entry point is configured, do not assume commands like `pytest` or `ruff` are available until they are added to `pyproject.toml` — check there first before running or suggesting a command.
