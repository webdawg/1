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

export interface SessionData {
  sessionId: string;
  resumeKey: string;
  createdAt: string;
  /** Navigation stack from the Sun down to the current center; last entry is "here". */
  path: string[];
  /** Freeform notes saved per node id. */
  notes: Record<string, string[]>;
}

function token(bytes: number): string {
  return randomBytes(bytes).toString("hex");
}

function filePath(sessionId: string): string {
  return join(SESSIONS_DIR, `${sessionId}.json`);
}

export function createSession(): SessionData {
  return {
    sessionId: token(6),
    resumeKey: token(12),
    createdAt: new Date().toISOString(),
    path: ["sun"],
    notes: {},
  };
}

export async function saveSession(data: SessionData): Promise<void> {
  await mkdir(SESSIONS_DIR, { recursive: true });
  await writeFile(filePath(data.sessionId), JSON.stringify(data, null, 2), "utf8");
}

export async function loadSession(
  sessionId: string,
  resumeKey: string
): Promise<SessionData | null> {
  const path = filePath(sessionId);
  if (!existsSync(path)) return null;
  const raw = await readFile(path, "utf8");
  const data = JSON.parse(raw) as SessionData;
  if (data.resumeKey !== resumeKey) return null;
  return data;
}
