/**
 * Local stand-in for the future multi-user server. Shape mirrors what that
 * server will eventually hand out: a session id (who you are) and a resume
 * key (proves you can reclaim that session). Both are just files on disk for
 * now; nothing here should be load-bearing for real security later.
 */
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const SESSIONS_DIR = join(homedir(), ".solar-tui", "sessions");

export type PlayerType = "HUMAN" | "LLM";

export interface SessionData {
  sessionId: string;
  resumeKey: string;
  createdAt: string;
  /** Navigation stack from the star map down to the current center; last entry is "here". */
  path: string[];
  /** Freeform notes saved per node id. */
  notes: Record<string, string[]>;
  /** Default entity type; becoming LLM requires solving the console's puzzle — see Console.tsx. */
  playerType: PlayerType;
  /** Accumulated relativistic drift, in ms (negative = time lost to dilation so far) — see relativity.ts. */
  timeDriftMs: number;
}

function token(bytes: number): string {
  return randomBytes(bytes).toString("hex");
}

function filePath(sessionId: string): string {
  return join(SESSIONS_DIR, `${sessionId}.json`);
}

/** A brand-new session: random id/resume key, default path at the Sun. */
export function createSession(): SessionData {
  return {
    sessionId: token(6),
    resumeKey: token(12),
    createdAt: new Date().toISOString(),
    // Opens on the familiar Sol view, but with the star map already in the
    // path history — must match worldTree.ts's STARMAP_ID/"sun", otherwise
    // the star map is unreachable (Escape only pops existing path entries).
    path: ["starmap", "sun"],
    notes: {},
    playerType: "HUMAN",
    timeDriftMs: 0,
  };
}

/** Writes a session to disk as pretty-printed JSON, creating the sessions directory if it doesn't exist yet. */
export async function saveSession(data: SessionData): Promise<void> {
  await mkdir(SESSIONS_DIR, { recursive: true });
  await writeFile(filePath(data.sessionId), JSON.stringify(data, null, 2), "utf8");
}

/** Loads a session by id, but only returns it if resumeKey actually matches — a mismatched or missing session resolves to null rather than throwing. */
export async function loadSession(
  sessionId: string,
  resumeKey: string
): Promise<SessionData | null> {
  const path = filePath(sessionId);
  if (!existsSync(path)) return null;
  const raw = await readFile(path, "utf8");
  const data = JSON.parse(raw) as SessionData;
  if (data.resumeKey !== resumeKey) return null;
  // Older saved sessions predate playerType/timeDriftMs.
  return { ...data, playerType: data.playerType ?? "HUMAN", timeDriftMs: data.timeDriftMs ?? 0 };
}

/*
 * ============================================================================
 * COLD EXPLAINER — session.ts
 * ============================================================================
 * Written for a reader who has opened only this file, per CODEBOT.md's
 * cold-open convention. Keep this current when the file's behavior changes.
 *
 * WHAT THIS FILE IS
 * Local, file-based session persistence — this module's own top comment
 * calls it "a stand-in for the future multi-user server," and its shape
 * is deliberately what a real server would eventually hand out: a random
 * sessionId (who you are) and a random resumeKey (proves you can reclaim
 * that session). Both are just JSON files under
 * ~/.solar-tui/sessions/<sessionId>.json for now — nothing here is meant
 * to be load-bearing for real auth later.
 *
 * WHAT'S PERSISTED
 * SessionData: sessionId/resumeKey/createdAt, the navigation path stack,
 * per-node-id freeform notes, playerType (HUMAN/LLM), and timeDriftMs
 * (accumulated real gravitational time dilation — see relativity.ts).
 * Deliberately NOT persisted here: App.tsx's randomSystem/hasPlayedLanding
 * state (Sagittarius A*'s generated destination) — that's an explicit
 * "fresh every time" design choice living entirely in React state, not
 * this file's concern.
 *
 * THE THREE OPERATIONS
 * createSession makes a brand-new session (fresh random id/key, path
 * defaulting to ["starmap", "sun"] — must match worldTree.ts's
 * STARMAP_ID/"sun" exactly, or the star map becomes unreachable via
 * Escape's path-popping). saveSession writes the current session to disk
 * as pretty-printed JSON — called after nearly every state change
 * elsewhere in the app, not just on quit. loadSession reads a session
 * back by id, but only actually returns it if the supplied resumeKey
 * matches; a wrong key or missing file both resolve to null rather than
 * throwing, and index.tsx is the one place that turns that null into a
 * user-facing error and process exit. loadSession also back-fills
 * playerType/timeDriftMs with defaults for sessions saved before those
 * fields existed, so old save files don't break on load.
 * ============================================================================
 */
