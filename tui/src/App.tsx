import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import SolarView from "./components/SolarView.js";
import ContentView from "./components/ContentView.js";
import Prompt from "./components/Prompt.js";
import { getBreadcrumbLabel, getCenterLabel, getDistanceDomain, getNodeKind, getOrbitChildren } from "./worldTree.js";
import { saveSession, type SessionData } from "./session.js";

const TICK_MS = 5000;
const MAX_LOG_LINES = 4;

interface Props {
  session: SessionData;
  isNewSession: boolean;
}

export default function App({ session, isNewSession }: Props): React.JSX.Element {
  const { exit } = useApp();
  const sessionRef = useRef<SessionData>(session);

  const [path, setPath] = useState<string[]>(session.path);
  const [focusIndex, setFocusIndex] = useState(0);
  const [mode, setMode] = useState<"nav" | "command">("nav");
  const [promptValue, setPromptValue] = useState("");
  const [log, setLog] = useState<string[]>(
    isNewSession
      ? [
          `New session. Save these to resume later:`,
          `  session: ${session.sessionId}   resume key: ${session.resumeKey}`,
        ]
      : [`Welcome back. Resumed session ${session.sessionId}.`]
  );
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), TICK_MS);
    return () => clearInterval(id);
  }, []);

  function pushLog(line: string) {
    setLog((prev) => [...prev.slice(-(MAX_LOG_LINES - 1)), line]);
  }

  function persist(nextPath: string[]) {
    sessionRef.current.path = nextPath;
    void saveSession(sessionRef.current);
  }

  const centerId = path[path.length - 1];
  const centerLabel = getCenterLabel(centerId);
  const centerKind = getNodeKind(centerId);
  const isLeaf = centerKind === "surface" || centerKind === "orbit-log" || centerKind === "notes";
  const domain = useMemo(() => getDistanceDomain(centerId), [centerId]);
  const children = useMemo(
    () => [...getOrbitChildren(centerId, new Date())].sort((a, b) => a.angleDeg - b.angleDeg),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [centerId, path.length]
  );
  const focused = children.length > 0 ? children[focusIndex % children.length] : null;

  useInput(
    (input, key) => {
      if (key.leftArrow || key.upArrow) {
        setFocusIndex((i) => (children.length === 0 ? 0 : (i - 1 + children.length) % children.length));
        return;
      }
      if (key.rightArrow || key.downArrow) {
        setFocusIndex((i) => (children.length === 0 ? 0 : (i + 1) % children.length));
        return;
      }
      if (key.return) {
        if (focused) {
          const nextPath = [...path, focused.id];
          setPath(nextPath);
          setFocusIndex(0);
          persist(nextPath);
          pushLog(`Traveled to ${focused.label}.`);
        }
        return;
      }
      if (key.escape || key.backspace) {
        if (path.length > 1) {
          const nextPath = path.slice(0, -1);
          setPath(nextPath);
          setFocusIndex(0);
          persist(nextPath);
          pushLog(`Back to ${getCenterLabel(nextPath[nextPath.length - 1])}.`);
        }
        return;
      }
      if (input === "/" || input === ":") {
        setMode("command");
      }
    },
    { isActive: mode === "nav" }
  );

  function handlePromptChange(value: string) {
    // Ink coalesces fast/bursty input (e.g. a real paste, or a laggy
    // connection) into a single onChange call instead of firing onSubmit,
    // so a trailing Enter can arrive embedded in the text rather than as a
    // key press. Treat an embedded newline the same as pressing Enter.
    const newlineIndex = value.search(/[\r\n]/);
    if (newlineIndex === -1) {
      setPromptValue(value);
      return;
    }
    runCommand(value.slice(0, newlineIndex));
  }

  function runCommand(raw: string) {
    const value = raw.trim();
    setMode("nav");
    setPromptValue("");
    if (!value) return;

    const [cmd, ...rest] = value.split(/\s+/);
    const arg = rest.join(" ");

    switch (cmd.toLowerCase()) {
      case "help":
        pushLog("Commands: help, back, save <text>, notes, whoami, quit");
        break;
      case "back": {
        if (path.length > 1) {
          const nextPath = path.slice(0, -1);
          setPath(nextPath);
          setFocusIndex(0);
          persist(nextPath);
          pushLog(`Back to ${getCenterLabel(nextPath[nextPath.length - 1])}.`);
        } else {
          pushLog("Already at the Sun.");
        }
        break;
      }
      case "save": {
        if (!arg) {
          pushLog("Usage: save <text>");
          break;
        }
        const notes = sessionRef.current.notes[centerId] ?? [];
        notes.push(arg);
        sessionRef.current.notes[centerId] = notes;
        void saveSession(sessionRef.current);
        pushLog(`Saved note at ${centerLabel}.`);
        break;
      }
      case "notes": {
        const notes = sessionRef.current.notes[centerId] ?? [];
        pushLog(notes.length === 0 ? `No notes at ${centerLabel}.` : notes.join(" | "));
        break;
      }
      case "whoami":
        pushLog(`Session: ${sessionRef.current.sessionId}`);
        break;
      case "quit":
      case "exit":
        void saveSession(sessionRef.current).then(() => exit());
        break;
      default:
        pushLog(`Unknown command: ${cmd}`);
    }
  }

  return (
    <Box flexDirection="column">
      <Text>
        Centered on <Text bold>{centerLabel}</Text>
        {path.length > 1 ? `  (${path.map(getBreadcrumbLabel).join(" > ")})` : ""}
      </Text>
      {isLeaf ? (
        <ContentView nodeId={centerId} date={new Date()} notes={sessionRef.current.notes[centerId] ?? []} />
      ) : (
        <SolarView centerLabel={centerLabel} orbitEntries={children} domain={domain} focusedId={focused?.id ?? null} />
      )}
      <Box flexDirection="column" marginTop={1}>
        {log.map((line, idx) => (
          <Text key={idx} dimColor>
            {line}
          </Text>
        ))}
      </Box>
      <Prompt active={mode === "command"} value={promptValue} onChange={handlePromptChange} onSubmit={runCommand} />
    </Box>
  );
}
