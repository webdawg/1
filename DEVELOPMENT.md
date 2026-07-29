# Development Environment

What's needed to develop and run this repo, and what's just notes from
getting it working. See `CLAUDE.md` for code structure, `SCOPE.md`/
`ROADMAP.md` for the vision and plan.

## Prerequisites

- **Node.js 26.x** — `tui/`'s `@types/node` is pinned to `^26.1.2` and CI
  (`.github/workflows/typecheck.yml`) runs on Node 26. The packages
  themselves only declare `engines.node >= 18`, so older Node may work, but
  26.x is what this repo is actually developed and tested against.
- **npm** (bundled with Node).
- **git**, plus a GitHub remote you can push to
  (`origin` → `https://github.com/webdawg/1.git`).
- **GitHub CLI (`gh`)**, authenticated — used for pushing/auth. Pushing
  changes to `.github/workflows/*` specifically requires the `workflow`
  OAuth scope, which isn't part of the default scope set. If a push is
  rejected with "refusing to allow an OAuth App to create or update
  workflow ... without `workflow` scope", run:
  ```bash
  gh auth refresh -h github.com -s workflow
  ```
  (opens a browser/device-code approval, one-time).
- **tmux** — not needed to just play the game, but is how this repo's
  Ink TUI gets driven non-interactively for automated verification (see
  Testing below), since it's a raw-stdin interactive app with no
  headless/scriptable mode of its own.
- **Python >= 3.10** — only relevant if picking up the currently-unused
  `src/one/` skeleton (see `CLAUDE.md` Project overview); not needed for
  `tui/` work.

Developed on Arch Linux; nothing here is Arch-specific — any Unix-like
system with a terminal emulator that supports ANSI escapes should work.
Not tested on Windows (would need WSL or similar for a POSIX-like
terminal).

## Setup

```bash
git clone https://github.com/webdawg/1.git
cd 1/tui
npm install
```

You may see this warning from `npm install` — it's expected, not an error:

```
npm warn install-scripts 1 package had install scripts blocked because they are not covered by allowScripts:
npm warn install-scripts   esbuild@0.28.1 (postinstall: node install.js)
```

Recent npm blocks package postinstall scripts by default as a
supply-chain-attack mitigation. esbuild's postinstall is just a
verification/fallback step — the actual platform binary comes from a
separate optional dependency (`@esbuild/linux-x64` or equivalent for your
platform) that isn't affected by the block. Verified working despite the
warning; nothing to act on.

## Running

```bash
cd tui
npm start              # launches the TUI, takes over the terminal
npm run typecheck      # tsc --noEmit, no test framework configured yet
```

See `README.md` for in-app controls (arrow keys, Enter, Escape, `/`
command mode) and session resume (`npm start -- --resume <id> <key>`).

## Runtime data

The app writes session save state to `~/.solar-tui/sessions/*.json` — your
home directory, outside the repo. `npm start` never touches the repo
itself beyond `node_modules/` (gitignored). Safe to `rm -rf
~/.solar-tui` any time for a clean slate; nothing in the repo depends on
it existing.

## Testing / verifying TUI changes

No test framework is set up yet (`ROADMAP.md` Phase 2 tracks adding one).
Two ways changes have actually been verified so far:

1. **Pure logic** — import and call the relevant functions directly (e.g.
   `getOrbitChildren`, `getCometPosition` from `worldTree.ts`/
   `cometFacts.ts`) via `npx tsx` on a throwaway script, checking for
   `NaN`/crashes/sensible values. Fast, but doesn't touch rendering.
2. **Actual UI** — drive it with tmux, since it's a raw-stdin app:
   ```bash
   tmux new-session -d -s check -x 220 -y 50 "npm start"
   sleep 3
   tmux send-keys -t check Down     # one key per send-keys call —
   sleep 0.3                        # batching multiple keys in one
   tmux send-keys -t check Enter    # call has been unreliable, send
   sleep 1                          # one at a time with short sleeps
   tmux capture-pane -t check -p
   tmux kill-session -t check       # clean up when done
   ```
   Key names: `Up`/`Down`/`Left`/`Right`/`Enter`/`Escape`.

## Known Ink gotchas

Found and confirmed via minimal standalone reproductions (isolated from
this app's code) while building the two-tile layout — worth knowing before
touching box sizing in `SolarView.tsx`/`App.tsx` again:

- **A `Box` with `borderStyle` + explicit `height`, containing a `Text`
  row whose rendered content is wider than the box's actual inner content
  area (box width minus border minus `paddingX`), silently corrupts the
  box's bottom border** — it doesn't clip, wrap, warn, or throw; it
  replaces N characters of the border line with blank spaces, where N is
  exactly the overflow amount. Confirmed with a repro as small as a 20x3
  box with one `Text` line 2 characters too wide. This is why
  `gridWidth` in `App.tsx` subtracts 4 (2 border + 2 `paddingX`), not 2 —
  get that wrong and every row in `SolarView` overflows by the padding
  amount, corrupting the border on every render. If this resurfaces
  (new padding, new border style, a wrapping box added around `SolarView`),
  re-derive the actual inner content width from every box the content
  passes through, not just the outermost border.
- **Ad-hoc test scripts for this must live inside `tui/`** (e.g.
  `tui/scratch-repro.tsx`, delete when done) — running `npx tsx` on a file
  outside `tui/` fails with `Cannot find module 'react'` since Node
  resolves bare imports from the script's own directory upward, and
  `/tmp` has no `node_modules` in its ancestry.
- **A crashing script under `tmux new-session -d "command"` kills the
  whole tmux server**, not just that pane, if it was the only session —
  tmux exits when no sessions remain by default. If a `tmux
  new-session`/`capture-pane` call suddenly reports "no server running,"
  suspect the launched command crashed instantly rather than a tmux
  problem; run it directly with `timeout 3 <command>` (or pipe to `head`)
  first to see the real error before re-wrapping it in tmux. This is also
  a faster iteration loop than tmux for pure-rendering repros that don't
  need real keyboard input — plain piped output already reflects Ink's
  actual box-drawing output.

## CI

`.github/workflows/typecheck.yml` runs `npm run typecheck` on every push
to `master` (this repo pushes straight to `master`, no PR workflow in use
— see the `gh` `workflow` scope note above for why pushing CI-file changes
specifically can fail the first time).
