import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Text, useApp, useInput, useWindowSize } from "ink";
import SolarView from "./components/SolarView.js";
import ContentView from "./components/ContentView.js";
import Prompt from "./components/Prompt.js";
import WarpTransition from "./components/WarpTransition.js";
import { applyZoom, computeAutoZoomLevel, computeGridPositions, toClockHour, ZOOM_MAX, ZOOM_MIN } from "./layout.js";
import { pickNextFocus } from "./spatialNav.js";
import {
  getBreadcrumbLabel,
  getCenterGlyph,
  getCenterLabel,
  getDistanceDomain,
  getDistanceUnitLabel,
  getNodeKind,
  getOrbitChildren,
  isStarBoundary,
  parseLeafId,
} from "./worldTree.js";
import { STARMAP_ID } from "./starFacts.js";
import { saveSession, type SessionData } from "./session.js";

const TICK_MS = 5000;
const MAX_LOG_LINES = 4;

// Bottom panel content budget, fixed regardless of what's actually in the
// log this frame (log rows are always padded to MAX_LOG_LINES) — this is
// what makes the top/bottom split arithmetic below deterministic.
const BOTTOM_PANEL_HEIGHT = 2 /* border */ + 1 /* breadcrumb */ + 1 /* focused-body info */ + MAX_LOG_LINES + 3 /* Prompt's own border+row */;
const MIN_GRID_WIDTH = 20;
const MIN_GRID_HEIGHT = 5;
const MIN_TOP_HEIGHT = MIN_GRID_HEIGHT + 2;

interface Props {
  session: SessionData;
  isNewSession: boolean;
}

export default function App({ session, isNewSession }: Props): React.JSX.Element {
  const { exit } = useApp();
  const sessionRef = useRef<SessionData>(session);
  const { columns, rows } = useWindowSize();

  const [path, setPath] = useState<string[]>(session.path);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(0);
  const [transition, setTransition] = useState<{ nextPath: string[]; label: string; logLine: string } | null>(null);
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
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), TICK_MS);
    return () => clearInterval(id);
  }, []);

  function pushLog(line: string) {
    setLog((prev) => [...prev.slice(-(MAX_LOG_LINES - 1)), line]);
  }

  /** Commits a travel that was held back for the "diving through a star" animation. */
  function completeTransition() {
    setTransition((current) => {
      if (!current) return current;
      setPath(current.nextPath);
      persist(current.nextPath);
      pushLog(current.logLine);
      return null;
    });
  }

  function persist(nextPath: string[]) {
    sessionRef.current.path = nextPath;
    void saveSession(sessionRef.current);
  }

  const now = useMemo(() => new Date(), [tick]);
  const centerId = path[path.length - 1];
  const centerLabel = getCenterLabel(centerId);
  const centerKind = getNodeKind(centerId);
  const isLeaf = centerKind === "surface" || centerKind === "orbit-log" || centerKind === "rings" || centerKind === "notes";
  const domain = useMemo(() => getDistanceDomain(centerId), [centerId]);
  const children = useMemo(
    () => [...getOrbitChildren(centerId, now)].sort((a, b) => a.angleDeg - b.angleDeg),
    [centerId, now]
  );

  useEffect(() => {
    setFocusedId((prev) => (prev && children.some((c) => c.id === prev) ? prev : (children[0]?.id ?? null)));
  }, [children]);

  // Zoom is a property of the current view, not something that should
  // follow you to a different one — land already spread out as far as a
  // single sacrificed outlier allows, rather than always starting flat at
  // 1x and making the user zoom in by hand every time.
  const autoZoomLevel = useMemo(
    () => computeAutoZoomLevel(children.filter((c) => parseLeafId(c.id) === null).map((c) => c.distance), domain),
    [children, domain]
  );
  useEffect(() => {
    setZoomLevel(autoZoomLevel);
    // Only centerId should trigger this — re-running on every autoZoomLevel
    // recompute (e.g. the 5s position tick) would fight the user's own
    // manual zoom adjustments.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerId]);

  const zoomedDomain = useMemo(() => applyZoom(domain, zoomLevel), [domain, zoomLevel]);

  const focused = children.find((c) => c.id === focusedId) ?? null;

  /** Pops one level back, animating the transition if it crosses the star/star-map boundary. Returns whether it did anything. */
  function goBack(): boolean {
    if (path.length <= 1) return false;
    const nextPath = path.slice(0, -1);
    const newCenterId = nextPath[nextPath.length - 1];
    const logLine = `Back to ${getCenterLabel(newCenterId)}.`;
    if (isStarBoundary(centerId, newCenterId)) {
      setTransition({ nextPath, label: getBreadcrumbLabel(centerId), logLine });
    } else {
      setPath(nextPath);
      persist(nextPath);
      pushLog(logLine);
    }
    return true;
  }

  const cols = columns || 80;
  const rowsSafe = rows || 24;
  const topHeight = Math.max(MIN_TOP_HEIGHT, rowsSafe - BOTTOM_PANEL_HEIGHT);
  // SolarView's box consumes 2 cols for its border plus 2 more for its
  // paddingX={1} — rows wider than that overflow the box and corrupt its
  // bottom border in this version of Ink, so this must stay in sync with
  // SolarView's own border/padding.
  const gridWidth = Math.max(MIN_GRID_WIDTH, cols - 4);
  const gridHeight = Math.max(MIN_GRID_HEIGHT, topHeight - 2);
  const positions = useMemo(
    () => computeGridPositions(children, zoomedDomain, gridWidth, gridHeight),
    [children, zoomedDomain, gridWidth, gridHeight]
  );

  useInput(
    (input, key) => {
      if (key.leftArrow) {
        setFocusedId((id) => pickNextFocus(children, positions, id, "left"));
        return;
      }
      if (key.rightArrow) {
        setFocusedId((id) => pickNextFocus(children, positions, id, "right"));
        return;
      }
      if (key.upArrow) {
        setFocusedId((id) => pickNextFocus(children, positions, id, "up"));
        return;
      }
      if (key.downArrow) {
        setFocusedId((id) => pickNextFocus(children, positions, id, "down"));
        return;
      }
      if (key.return) {
        if (focused) {
          // The star-map exit entry represents traveling back out through
          // the star you're standing at — a real, selectable object, not
          // a child to push onto the path.
          if (focused.id === STARMAP_ID) {
            goBack();
          } else {
            const nextPath = [...path, focused.id];
            const logLine = `Traveled to ${focused.label}.`;
            if (isStarBoundary(centerId, focused.id)) {
              setTransition({ nextPath, label: focused.label, logLine });
            } else {
              setPath(nextPath);
              persist(nextPath);
              pushLog(logLine);
            }
          }
        }
        return;
      }
      if (key.escape || key.backspace) {
        goBack();
        return;
      }
      // Zoom only means something for the spatial grid, not a leaf's
      // detail screen — "=" is unshifted "+" on most keyboards.
      if (!isLeaf && (input === "+" || input === "=")) {
        setZoomLevel((z) => Math.min(ZOOM_MAX, z + 1));
        return;
      }
      if (!isLeaf && (input === "-" || input === "_")) {
        setZoomLevel((z) => Math.max(ZOOM_MIN, z - 1));
        return;
      }
      if (input === "/" || input === ":") {
        setMode("command");
      }
    },
    { isActive: mode === "nav" && !transition }
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
        if (!goBack()) pushLog(`Already at ${centerLabel}.`);
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
    <Box flexDirection="column" width={cols} height={rowsSafe}>
      <Box flexDirection="column" height={topHeight} width={cols}>
        {transition ? (
          <WarpTransition gridWidth={gridWidth} gridHeight={gridHeight} onComplete={completeTransition} />
        ) : isLeaf ? (
          <ContentView nodeId={centerId} date={now} notes={sessionRef.current.notes[centerId] ?? []} />
        ) : (
          <SolarView
            centerGlyph={getCenterGlyph(centerId)}
            orbitEntries={children}
            domain={zoomedDomain}
            focusedId={focusedId}
            gridWidth={gridWidth}
            gridHeight={gridHeight}
          />
        )}
      </Box>
      <Box flexDirection="column" borderStyle="round" paddingX={1} height={BOTTOM_PANEL_HEIGHT} width={cols} overflow="hidden">
        <Box justifyContent="space-between">
          <Text color={transition ? "yellow" : undefined} bold={Boolean(transition)}>
            {transition ? (
              `Diving through ${transition.label}...`
            ) : (
              <>
                Centered on <Text bold>{centerLabel}</Text>
                {path.length > 1 ? `  (${path.map(getBreadcrumbLabel).join(" > ")})` : ""}
              </>
            )}
          </Text>
          {!isLeaf && !transition ? <Text dimColor>Zoom {(2 ** zoomLevel).toFixed(2)}x (+/-)</Text> : null}
        </Box>
        <Text dimColor={!focused}>
          {transition
            ? ""
            : focused
              ? `${focused.label} — ${toClockHour(focused.angleDeg)} o'clock, ${focused.distance.toFixed(2)}${getDistanceUnitLabel(centerId)}`
              : "No orbiting bodies here."}
        </Text>
        {Array.from({ length: MAX_LOG_LINES }).map((_, idx) => (
          <Text key={idx} dimColor>
            {log[log.length - MAX_LOG_LINES + idx] ?? ""}
          </Text>
        ))}
        <Prompt active={mode === "command"} value={promptValue} onChange={handlePromptChange} onSubmit={runCommand} />
      </Box>
    </Box>
  );
}
