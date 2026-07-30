#!/usr/bin/env bash
# Launches the TUI (tui/) — the active project in this repo. See CLAUDE.md.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/tui"

if [ ! -d node_modules ]; then
  npm install
fi

npm start
