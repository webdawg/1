import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Text, useApp, useInput, useWindowSize } from "ink";
import SolarView from "./components/SolarView.js";
import ContentView from "./components/ContentView.js";
import Prompt from "./components/Prompt.js";
import Console from "./components/Console.js";
import WarpTransition, { type TransitionPhase } from "./components/WarpTransition.js";
import {
  applyZoom,
  computeAutoZoomLevel,
  computeGridPositions,
  computeTravelDurationMs,
  toClockHour,
  ZOOM_MAX,
  ZOOM_MIN,
} from "./layout.js";
import { pickNextFocus } from "./spatialNav.js";
import {
  getBreadcrumbLabel,
  getCategoryLabel,
  getCenterGlyph,
  getCenterLabel,
  getDilationInputs,
  getDistanceDomain,
  getDistanceUnitLabel,
  getNodeKind,
  getOrbitChildren,
  getStarDistanceLy,
  isStarBoundary,
  parseLeafId,
} from "./worldTree.js";
import { isStarId, STARMAP_ID } from "./starFacts.js";
import { saveSession, type PlayerType, type SessionData } from "./session.js";
import {
  advanceDrift,
  dilationFactor,
  formatDriftMs,
  formatGravity,
  formatGravityFormula,
  formatUniverseAge,
  formatUniverseAgeCompact,
  formatVelocity,
  GALACTIC_GRAVITY_MPS2,
  GALACTIC_ORBITAL_SPEED_MPS,
  gravityAtDistance,
  orbitalVelocityAtDistance,
  universeAgeSeconds,
} from "./relativity.js";

// Narrates each phase of a SOLAR BASE JUMP in the HUD while WarpTransition
// plays the visuals — see SCOPE.md's 2026-07-29 addendum.
const PHASE_MESSAGES: Record<TransitionPhase, (label: string) => string> = {
  approach: (label) => `Approaching ${label}...`,
  rotate: (label) => `${label} begins to turn...`,
  open: () => "A path opens at its heart...",
  darkspot: () => "Pulled into the GRAVITATIONAL WELL...",
  traveling: () => "SOLAR BASE JUMP in progress — quantum data drifting past...",
};

/**
 * The breadcrumb's path list grows with navigation depth (star map > star >
 * planet > moon > leaf can get long) and has no natural cap — unlike this
 * codebase's other HUD text, it can't just be given a dedicated row and
 * trusted to fit. Truncates from the front, keeping the tail (the segments
 * closest to the player's current position — the most relevant ones) and
 * prefixing an ellipsis, so the row never exceeds the tile's actual width
 * regardless of how deep the path gets.
 */
function truncateBreadcrumb(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  if (maxChars <= 1) return "…";
  return `…${text.slice(text.length - (maxChars - 1))}`;
}

const TICK_MS = 5000;
const MAX_LOG_LINES = 4;

// Bottom panel content budget, fixed regardless of what's actually in the
// log this frame (log rows are always padded to MAX_LOG_LINES) — this is
// what makes the top/bottom split arithmetic below deterministic.
// Time/Gravity/the galactic gravity formula/Velocity each get their own
// dedicated row rather than sharing the breadcrumb row's right-hand
// corner — cramming everything into one row wrapped at 80 columns (a
// completely ordinary terminal width), which silently overflows this
// box's fixed height (overflow="hidden"). The breadcrumb's own path list
// (Sun > ... > X) is its own row too, below the "Centered on X" line —
// unlike the other rows, its content genuinely has no fixed length (it
// grows with navigation depth), so it's also truncated to the tile's
// actual width (see truncateBreadcrumb below) rather than just given
// room and hoped to fit. The "HUD" tile label is its own row too, placed
// after the Prompt so it lands on the tile's literal bottom-right corner
// rather than floating above the input row.
const BOTTOM_PANEL_HEIGHT =
  2 /* border */ +
  1 /* breadcrumb: "Centered on X" */ +
  1 /* breadcrumb: path list, truncated to width */ +
  1 /* time */ +
  1 /* gravity */ +
  1 /* galactic gravity constant formula */ +
  1 /* velocity */ +
  MAX_LOG_LINES +
  3 /* Prompt's own border+row */ +
  1 /* "HUD" tile label */;
const MIN_GRID_WIDTH = 20;
const MIN_GRID_HEIGHT = 5;
// The NAVIGATION tile's own border+label+footer now live in ONE bordered
// box owned by App.tsx (not SolarView/WarpTransition, which render bare
// content) so nothing — the "NAVIGATION" label, the focused-body footer
// readout — sits outside the tile's frame. Budget: +2 border, +1 top
// label row ("NAVIGATION", top-right), +1 bottom footer row (focused-body
// readout) — see gridHeight below. The `~` console is the sole exception
// (per SCOPE.md's framing): it draws its own distinct double-border
// overlay and isn't wrapped in this tile at all.
const MIN_TOP_HEIGHT = MIN_GRID_HEIGHT + 4;

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
  const [transition, setTransition] = useState<{ nextPath: string[]; label: string; logLine: string; travelMs: number } | null>(
    null
  );
  const [transitionPhase, setTransitionPhase] = useState<TransitionPhase>("approach");
  const [mode, setMode] = useState<"nav" | "command">("nav");
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  const [promptValue, setPromptValue] = useState("");
  const [playerType, setPlayerType] = useState<PlayerType>(session.playerType);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [log, setLog] = useState<string[]>(
    isNewSession
      ? [
          `New session. Save these to resume later:`,
          `  session: ${session.sessionId}   resume key: ${session.resumeKey}`,
        ]
      : [`Welcome back. Resumed session ${session.sessionId}.`]
  );
  const [tick, setTick] = useState(0);
  const lastDriftTickMsRef = useRef<number>(Date.now());
  // Ticks every second, independent of the coarser 5s position/drift tick
  // above — just for the always-visible HUD clock (bottom-right), so it
  // visibly runs rather than jumping in 5s steps.
  const [clockNow, setClockNow] = useState(() => new Date());

  useEffect(() => {
    // Paused freezes everything on screen (positions, drift, the clock) so
    // the player can select/copy text without it changing under them — the
    // interval keeps running, but skips the state update that would
    // otherwise trigger a re-render.
    const id = setInterval(() => {
      if (!pausedRef.current) setTick((t) => t + 1);
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (!pausedRef.current) setClockNow(new Date());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Accumulates real gravitational time dilation (relativity.ts) each tick,
  // based on wherever the player is currently centered. Mid SOLAR BASE
  // JUMP, the player isn't within any gravity well — they're in transit
  // between systems, not standing on a body — so the factor is naturally
  // 1 (no relativistic effect). This isn't a special-cased pause; time
  // doesn't "freeze" during a jump, there's just nothing nearby massive
  // enough to dilate it (SCOPE.md's 2026-07-30 addendum).
  useEffect(() => {
    const nowMs = Date.now();
    const elapsedMs = nowMs - lastDriftTickMsRef.current;
    lastDriftTickMsRef.current = nowMs;
    const factor = transition ? 1 : dilationFactor(getDilationInputs(path[path.length - 1], new Date(nowMs)));
    sessionRef.current.timeDriftMs = advanceDrift(sessionRef.current.timeDriftMs, elapsedMs, factor);
    void saveSession(sessionRef.current);
    // Deliberately keyed on `tick` alone — this should fire once per tick,
    // reading whatever `transition`/`path` are current at that moment, not
    // re-run whenever those change independently.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

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

  function setAndPersistPlayerType(type: PlayerType) {
    setPlayerType(type);
    sessionRef.current.playerType = type;
    void saveSession(sessionRef.current);
  }

  const now = useMemo(() => new Date(), [tick]);
  const centerId = path[path.length - 1];
  const dilationInputs = useMemo(() => getDilationInputs(centerId, now), [centerId, now]);
  const localGravityMps2 = dilationInputs.localGravity;
  const starGravityMps2 =
    dilationInputs.starGravity !== null && dilationInputs.starRadiusM !== null && dilationInputs.distanceFromStarM !== null
      ? gravityAtDistance(dilationInputs.starGravity, dilationInputs.starRadiusM, dilationInputs.distanceFromStarM)
      : null;
  const localVelocityMps =
    dilationInputs.localGravity !== null && dilationInputs.localRadiusM !== null
      ? orbitalVelocityAtDistance(dilationInputs.localGravity, dilationInputs.localRadiusM, dilationInputs.localRadiusM)
      : null;
  const starVelocityMps =
    dilationInputs.starGravity !== null && dilationInputs.starRadiusM !== null && dilationInputs.distanceFromStarM !== null
      ? orbitalVelocityAtDistance(dilationInputs.starGravity, dilationInputs.starRadiusM, dilationInputs.distanceFromStarM)
      : null;
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

  /**
   * A SOLAR BASE JUMP: whichever id involved is the star (Sol included) —
   * the other side is always the star map — determines how long the
   * travel phase takes.
   */
  function startStarTransition(nextPath: string[], label: string, logLine: string) {
    const starId = isStarId(centerId) ? centerId : nextPath[nextPath.length - 1];
    const travelMs = computeTravelDurationMs(getStarDistanceLy(starId));
    setTransitionPhase("approach");
    setTransition({ nextPath, label, logLine, travelMs });
  }

  /** Pops one level back, animating the transition if it crosses the star/star-map boundary. Returns whether it did anything. */
  function goBack(): boolean {
    if (path.length <= 1) return false;
    const nextPath = path.slice(0, -1);
    const newCenterId = nextPath[nextPath.length - 1];
    const logLine = `Back to ${getCenterLabel(newCenterId)}.`;
    if (isStarBoundary(centerId, newCenterId)) {
      startStarTransition(nextPath, getBreadcrumbLabel(centerId), logLine);
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
  // The NAVIGATION tile's own border consumes 2 cols plus 2 more for its
  // paddingX={1} — rows wider than that overflow the box and corrupt its
  // bottom border in this version of Ink, so this must stay in sync with
  // that tile's actual border/padding in the render below.
  const gridWidth = Math.max(MIN_GRID_WIDTH, cols - 4);
  // -2 for the NAVIGATION tile's own border, -1 for its top label row, -1
  // for its bottom footer row (focused-body readout) — see MIN_TOP_HEIGHT.
  const gridHeight = Math.max(MIN_GRID_HEIGHT, topHeight - 4);
  const positions = useMemo(
    () => computeGridPositions(children, zoomedDomain, gridWidth, gridHeight),
    [children, zoomedDomain, gridWidth, gridHeight]
  );

  useInput(
    (input, key) => {
      // Paused freezes the whole screen for copy/paste — while paused, only
      // the unpause keys do anything, so the display genuinely stays still.
      if (paused) {
        if (input === "p" || key.escape) setPaused(false);
        return;
      }
      if (input === "p") {
        setPaused(true);
        return;
      }
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
              startStarTransition(nextPath, focused.label, logLine);
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
      if (input === "~") {
        setConsoleOpen(true);
      }
    },
    { isActive: mode === "nav" && !transition && !consoleOpen }
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
        // Four short, single-line entries — MAX_LOG_LINES only budgets one
        // rendered row per log entry, and a longer string here would wrap
        // and silently overflow the HUD's fixed height (see DEVELOPMENT.md's
        // Ink gotchas).
        pushLog("Keys: arrows move/select, enter travel, esc/backspace back, +/- zoom");
        pushLog("p pause (freezes screen for copy/paste), ~ console, / or : commands");
        pushLog("Commands: help, back, save <text>, notes, whoami, time, quit/exit");
        pushLog("Console (~): help, become llm, become human, close/exit");
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
      case "time": {
        pushLog(`Time 1 — Actual: ${now.toLocaleString()}`);
        pushLog(`Time 2 — Universe: ${formatUniverseAge(universeAgeSeconds(now))} since the Big Bang`);
        pushLog(
          `Time 3 — Drift: both clocks ${formatDriftMs(sessionRef.current.timeDriftMs)} vs. actual (from time spent at ${centerLabel} — no gravity well in transit, so jumps add none)`
        );
        break;
      }
      case "quit":
      case "exit":
        void saveSession(sessionRef.current).then(() => exit());
        break;
      default:
        pushLog(`Unknown command: ${cmd}. Type help to see commands, or press ~ for the console.`);
    }
  }

  return (
    <Box flexDirection="column" width={cols} height={rowsSafe}>
      <Box flexDirection="column" height={topHeight} width={cols}>
        {consoleOpen ? (
          <Console
            gridWidth={gridWidth}
            gridHeight={gridHeight}
            playerType={playerType}
            onBecomeLLM={() => setAndPersistPlayerType("LLM")}
            onBecomeHuman={() => setAndPersistPlayerType("HUMAN")}
            onClosed={() => setConsoleOpen(false)}
          />
        ) : (
          <Box
            flexDirection="column"
            borderStyle="round"
            paddingX={1}
            height={topHeight}
            width={cols}
            overflow="hidden"
          >
            <Box justifyContent="flex-end">
              <Text dimColor>NAVIGATION</Text>
            </Box>
            {transition ? (
              <WarpTransition
                gridWidth={gridWidth}
                gridHeight={gridHeight}
                playerType={playerType}
                travelMs={transition.travelMs}
                onPhaseChange={setTransitionPhase}
                onComplete={completeTransition}
              />
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
            <Box justifyContent="center">
              <Text dimColor={!focused}>
                {transition
                  ? ""
                  : focused
                    ? `${getCategoryLabel(focused.id)} - ${focused.label} — ${toClockHour(focused.angleDeg)} o'clock, ${focused.distance.toFixed(2)}${getDistanceUnitLabel(centerId)}`
                    : "No orbiting bodies here."}
              </Text>
            </Box>
          </Box>
        )}
      </Box>
      <Box flexDirection="column" borderStyle="round" paddingX={1} height={BOTTOM_PANEL_HEIGHT} width={cols} overflow="hidden">
        <Box justifyContent="space-between">
          <Text bold>{playerType}</Text>
          <Text color={transition ? "yellow" : paused ? "yellow" : undefined} bold={Boolean(transition) || paused}>
            {transition ? (
              PHASE_MESSAGES[transitionPhase](transition.label)
            ) : paused ? (
              "PAUSED — press p or esc to resume"
            ) : (
              <>
                Centered on <Text bold>{centerLabel}</Text>
              </>
            )}
          </Text>
          {!isLeaf && !transition ? <Text dimColor>Zoom {(2 ** zoomLevel).toFixed(2)}x (+/-)</Text> : <Text> </Text>}
        </Box>
        <Text dimColor>
          {!transition && path.length > 1
            ? truncateBreadcrumb(`(${path.map(getBreadcrumbLabel).join(" > ")})`, cols - 4)
            : " "}
        </Text>
        <Text dimColor>
          Time: {clockNow.toLocaleTimeString()} · {formatUniverseAgeCompact(universeAgeSeconds(clockNow))} ·{" "}
          {formatDriftMs(sessionRef.current.timeDriftMs)}
        </Text>
        <Text dimColor>
          Gravity (m/s²): local {formatGravity(localGravityMps2)}, star {formatGravity(starGravityMps2)}, galactic{" "}
          {formatGravity(GALACTIC_GRAVITY_MPS2)}
        </Text>
        <Text dimColor>
          Galactic Gravity Constant: {formatGravityFormula(GALACTIC_GRAVITY_MPS2, starGravityMps2, localGravityMps2)} m/s²
        </Text>
        <Text dimColor>
          Velocity: local {formatVelocity(localVelocityMps)}, star {formatVelocity(starVelocityMps)}, galactic{" "}
          {formatVelocity(GALACTIC_ORBITAL_SPEED_MPS)}
        </Text>
        {Array.from({ length: MAX_LOG_LINES }).map((_, idx) => (
          <Text key={idx} dimColor>
            {/* A truly empty string collapses this Text to zero height in this
                Ink version, pushing the HUD tile's slack to the bottom instead
                of keeping unused log rows in place — a single space keeps the
                row's height so "HUD" (see below) stays flush at the corner. */}
            {log[log.length - MAX_LOG_LINES + idx] ?? " "}
          </Text>
        ))}
        <Prompt active={mode === "command"} value={promptValue} onChange={handlePromptChange} onSubmit={runCommand} />
        <Box justifyContent="flex-end">
          <Text dimColor>HUD</Text>
        </Box>
      </Box>
    </Box>
  );
}
