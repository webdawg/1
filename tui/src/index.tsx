/**
 * Entry point: parses `--resume <sessionId> <resumeKey>` (or creates a
 * fresh session when absent) and hands the result to Ink's `render` to
 * mount App. See session.ts for what a session actually contains.
 */
import React from "react";
import { render } from "ink";
import App from "./App.js";
import { createSession, loadSession } from "./session.js";

/** Resolves which session to boot with, then renders App. The only async entrypoint in this codebase, since loadSession reads from disk. */
async function main() {
  const args = process.argv.slice(2);
  const resumeIdx = args.indexOf("--resume");

  let session;
  let isNewSession = false;

  if (resumeIdx !== -1) {
    const sessionId = args[resumeIdx + 1];
    const resumeKey = args[resumeIdx + 2];
    if (!sessionId || !resumeKey) {
      console.error("Usage: --resume <sessionId> <resumeKey>");
      process.exit(1);
    }
    const loaded = await loadSession(sessionId, resumeKey);
    if (!loaded) {
      console.error("No matching session found for that session id / resume key.");
      process.exit(1);
    }
    session = loaded;
  } else {
    session = createSession();
    isNewSession = true;
  }

  render(<App session={session} isNewSession={isNewSession} />);
}

void main();

/*
 * ============================================================================
 * COLD EXPLAINER — index.tsx
 * ============================================================================
 * Written for a reader who has opened only this file, per CODEBOT.md's
 * cold-open convention. Keep this current when the file's behavior changes.
 *
 * WHAT THIS FILE IS
 * The process entry point (`npm start` runs this via tsx). Its only job is
 * deciding which SessionData to boot with, then mounting App.tsx with it.
 *
 * WHAT IT DOES
 * Reads process.argv for `--resume <sessionId> <resumeKey>`. If present,
 * calls session.ts's loadSession — on success that session boots as-is; on
 * failure (missing args, or no matching id/key pair on disk) it prints an
 * error and exits with a nonzero code rather than silently starting a new
 * session. If `--resume` is absent, session.ts's createSession makes a
 * brand-new session (fresh random id/resume key, default path at the Sun).
 * Either way, the resulting session and an isNewSession flag (which drives
 * App.tsx's one-time "save these to resume later" welcome message) get
 * passed into Ink's render() to mount <App>.
 *
 * WHAT THIS FILE DELIBERATELY DOES NOT DO
 * No game logic, no rendering, no session persistence logic of its own —
 * all of that lives in App.tsx and session.ts respectively. This file is
 * intentionally thin.
 * ============================================================================
 */
