import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import { polarToGrid } from "../layout.js";
import type { PlayerType } from "../session.js";

export type TransitionPhase = "approach" | "rotate" | "open" | "darkspot" | "traveling";

interface Props {
  gridWidth: number;
  gridHeight: number;
  /** Whose figure appears during approach/rotate/open — see HUMAN_FIGURE/LLM_FIGURE. */
  playerType: PlayerType;
  /** How long the "traveling" phase lasts — real distance drives this, see layout.ts's computeTravelDurationMs. */
  travelMs: number;
  onPhaseChange: (phase: TransitionPhase) => void;
  /** Fired once the whole sequence (setup + travel) has finished. */
  onComplete: () => void;
}

const FRAME_MS = 200;
const WORD_REFRESH_MS = 450;
const ANGLE_STEP_DEG = 24;
const STAR_RING_FRACTION = 0.35;
// Mirrors layout.ts's private ASPECT_RATIO — terminal cells are taller
// than they are wide, so circles are stretched horizontally to read round.
const ASPECT_RATIO = 2.1;

// 12 setup steps, 3 each: approach the star, watch it turn, watch its
// center open, get pulled into the dark spot at its heart. Only the
// "traveling" phase after this (word-flicker, not step-counted) scales
// with real distance — this cinematic setup is always the same length.
const SETUP_PHASES: TransitionPhase[] = [
  "approach", "approach", "approach",
  "rotate", "rotate", "rotate",
  "open", "open", "open",
  "darkspot", "darkspot", "darkspot",
];

// The traveler, 3 rows x 3 cols — only appears during the approach/rotate/
// open phases; already consumed by the time the dark spot forms. HUMAN is
// arms-and-legs; LLM is deliberately not humanoid (a core, a circuit body,
// a hovering base instead of legs) — see SCOPE.md's 2026-07-29 addenda.
const TRAVELER_FIGURES: Record<PlayerType, { lines: string[]; color: string }> = {
  HUMAN: { lines: [" o ", "/|\\", "/ \\"], color: "cyan" },
  LLM: { lines: [" ◆ ", "<#>", "==="], color: "green" },
};

// Quantum data drifting past as the HUMAN mind bends and becomes part of
// the universe — alien thoughts, alien machine messages, whatever. Mixed
// on purpose: single words, binary-ish noise, short cryptic phrases.
const QUANTUM_WORDS = [
  "ERROR", "VOID", "NULL", "ECHO", "STATIC", "ENTROPY",
  "01001000 01001001", "??????", "SIGNAL LOST", "WHO ARE YOU",
  "WE SEE YOU", "PATTERN RECOGNIZED", "OBSERVER DETECTED",
  "COORDINATES UNKNOWN", "MEMORY FRAGMENT", "WAVEFORM COLLAPSE",
  "TRANSMISSION", "UNKNOWN ORIGIN", "FREQUENCY SHIFT", "DATA CORRUPT",
  "YOU ARE OBSERVED", "ALIEN SIGNAL", "BECOME", "..--. .-. .",
];

interface Cell {
  char: string;
  color?: string;
  bold?: boolean;
}

interface TravelWord {
  word: string;
  row: number;
  col: number;
}

function blankGrid(gridWidth: number, gridHeight: number): Cell[][] {
  return Array.from({ length: gridHeight }, () => Array.from({ length: gridWidth }, () => ({ char: " " })));
}

function inBounds(x: number, y: number, gridWidth: number, gridHeight: number): boolean {
  return x >= 0 && x < gridWidth && y >= 0 && y < gridHeight;
}

function stampStarRing(
  grid: Cell[][],
  centerX: number,
  centerY: number,
  radius: number,
  angleOffsetDeg: number,
  gridWidth: number,
  gridHeight: number
): void {
  for (let angle = 0; angle < 360; angle += ANGLE_STEP_DEG) {
    const { x, y } = polarToGrid(centerX, centerY, angle + angleOffsetDeg, radius);
    if (inBounds(x, y, gridWidth, gridHeight)) grid[y][x] = { char: "o", color: "yellow", bold: true };
  }
}

/** The traveler, fixed straight-up (90°) from the star so its shape never needs to rotate. */
function stampTraveler(
  grid: Cell[][],
  centerX: number,
  centerY: number,
  radius: number,
  playerType: PlayerType,
  gridWidth: number,
  gridHeight: number
): void {
  const { lines, color } = TRAVELER_FIGURES[playerType];
  const { x, y } = polarToGrid(centerX, centerY, 90, radius);
  for (let r = 0; r < lines.length; r++) {
    const row = y - 1 + r;
    if (row < 0 || row >= gridHeight) continue;
    const line = lines[r];
    for (let c = 0; c < line.length; c++) {
      const col = x - 1 + c;
      if (col < 0 || col >= gridWidth || line[c] === " ") continue;
      grid[row][col] = { char: line[c], color, bold: true };
    }
  }
}

function fillDisk(
  grid: Cell[][],
  centerX: number,
  centerY: number,
  radius: number,
  char: string,
  color: string,
  gridWidth: number,
  gridHeight: number
): void {
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const dx = (x - centerX) / ASPECT_RATIO;
      const dy = y - centerY;
      if (Math.sqrt(dx * dx + dy * dy) <= radius) grid[y][x] = { char, color, bold: true };
    }
  }
}

function buildSetupFrame(step: number, playerType: PlayerType, gridWidth: number, gridHeight: number): Cell[][] {
  const grid = blankGrid(gridWidth, gridHeight);
  const centerX = Math.floor(gridWidth / 2);
  const centerY = Math.floor(gridHeight / 2);
  const maxRadius = Math.max(2, Math.floor(Math.min(gridHeight, gridWidth / ASPECT_RATIO) / 2) - 1);
  const ringRadius = Math.max(2, Math.round(maxRadius * STAR_RING_FRACTION));
  const phase = SETUP_PHASES[step];
  const subStep = step % 3;
  const ringAngleOffset = step * 15;

  if (phase === "approach" || phase === "rotate" || phase === "open") {
    stampStarRing(grid, centerX, centerY, ringRadius, ringAngleOffset, gridWidth, gridHeight);
  }

  if (phase === "approach") {
    const radii = [maxRadius, maxRadius * 0.6, ringRadius + 2];
    stampTraveler(grid, centerX, centerY, radii[subStep], playerType, gridWidth, gridHeight);
  } else if (phase === "rotate") {
    stampTraveler(grid, centerX, centerY, ringRadius, playerType, gridWidth, gridHeight);
  } else if (phase === "open") {
    if (subStep === 0) stampTraveler(grid, centerX, centerY, ringRadius, playerType, gridWidth, gridHeight);
    const diskChar = subStep === 0 ? "▒" : subStep === 1 ? "▓" : "█";
    fillDisk(grid, centerX, centerY, subStep + 1, diskChar, "yellow", gridWidth, gridHeight);
  } else if (phase === "darkspot") {
    const radii = [2, 5, Math.max(gridWidth, gridHeight)];
    fillDisk(grid, centerX, centerY, radii[subStep], "█", "gray", gridWidth, gridHeight);
  }

  return grid;
}

function pickRandomWords(gridWidth: number, gridHeight: number): TravelWord[] {
  const count = 1 + Math.floor(Math.random() * 3);
  const words: TravelWord[] = [];
  for (let i = 0; i < count; i++) {
    const word = QUANTUM_WORDS[Math.floor(Math.random() * QUANTUM_WORDS.length)];
    const row = Math.floor(Math.random() * gridHeight);
    const maxCol = Math.max(0, gridWidth - word.length);
    const col = Math.floor(Math.random() * (maxCol + 1));
    words.push({ word, row, col });
  }
  return words;
}

function buildTravelingFrame(words: TravelWord[], gridWidth: number, gridHeight: number): Cell[][] {
  const grid = blankGrid(gridWidth, gridHeight);
  for (const { word, row, col } of words) {
    if (row < 0 || row >= gridHeight) continue;
    for (let i = 0; i < word.length; i++) {
      const c = col + i;
      if (c < 0 || c >= gridWidth) continue;
      grid[row][c] = { char: word[i], color: "magenta", bold: false };
    }
  }
  return grid;
}

function TransitionRow({ row }: { row: Cell[] }): React.JSX.Element {
  const runs: { text: string; color?: string; bold?: boolean }[] = [];
  for (const cell of row) {
    const last = runs[runs.length - 1];
    if (last && last.color === cell.color && last.bold === cell.bold) {
      last.text += cell.char;
    } else {
      runs.push({ text: cell.char, color: cell.color, bold: cell.bold });
    }
  }
  return (
    <Text>
      {runs.map((run, idx) => (
        <Text key={idx} color={run.color} bold={run.bold}>
          {run.text}
        </Text>
      ))}
    </Text>
  );
}

export default function WarpTransition({ gridWidth, gridHeight, playerType, travelMs, onPhaseChange, onComplete }: Props): React.JSX.Element {
  const [step, setStep] = useState(0);
  const [traveling, setTraveling] = useState(false);
  const [travelWords, setTravelWords] = useState<TravelWord[]>([]);

  useEffect(() => {
    if (traveling) return;
    const id = setTimeout(() => {
      if (step < SETUP_PHASES.length - 1) setStep((s) => s + 1);
      else setTraveling(true);
    }, FRAME_MS);
    return () => clearTimeout(id);
  }, [step, traveling]);

  useEffect(() => {
    onPhaseChange(traveling ? "traveling" : SETUP_PHASES[step]);
    // Reporting the derived phase whenever step/traveling change is the
    // whole point — onPhaseChange itself isn't a dependency on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traveling, step]);

  useEffect(() => {
    if (!traveling) return;
    setTravelWords(pickRandomWords(gridWidth, gridHeight));
    const wordId = setInterval(() => setTravelWords(pickRandomWords(gridWidth, gridHeight)), WORD_REFRESH_MS);
    const doneId = setTimeout(onComplete, travelMs);
    return () => {
      clearInterval(wordId);
      clearTimeout(doneId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traveling]);

  const grid = traveling
    ? buildTravelingFrame(travelWords, gridWidth, gridHeight)
    : buildSetupFrame(step, playerType, gridWidth, gridHeight);

  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1}>
      {grid.map((row, idx) => (
        <TransitionRow key={idx} row={row} />
      ))}
    </Box>
  );
}
