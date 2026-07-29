import React from "react";
import { render } from "ink";
import App from "./App.js";
import { createSession, loadSession } from "./session.js";

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
