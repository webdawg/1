import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import { polarToGrid } from "../layout.js";

const FRAME_COUNT = 6;
const FRAME_MS = 200;
const ANGLE_STEP_DEG = 24;
// Mirrors layout.ts's private ASPECT_RATIO — terminal cells are taller
// than they are wide, so the ring is stretched horizontally to read round.
const ASPECT_RATIO = 2.1;

interface Cell {
  char: string;
  color?: string;
  bold?: boolean;
}

interface Props {
  gridWidth: number;
  gridHeight: number;
  /** Fired once the last frame has shown. */
  onComplete: () => void;
}

/** "Diving through a star": a ring expands from the center each frame. */
function buildFrame(frame: number, gridWidth: number, gridHeight: number): Cell[][] {
  const grid: Cell[][] = Array.from({ length: gridHeight }, () =>
    Array.from({ length: gridWidth }, () => ({ char: " " }))
  );
  const centerX = Math.floor(gridWidth / 2);
  const centerY = Math.floor(gridHeight / 2);
  const maxRadius = Math.max(1, Math.floor(Math.min(gridHeight, gridWidth / ASPECT_RATIO) / 2) - 1);
  const radius = ((frame + 1) / FRAME_COUNT) * maxRadius;

  for (let angle = 0; angle < 360; angle += ANGLE_STEP_DEG) {
    const { x, y } = polarToGrid(centerX, centerY, angle, radius);
    if (x < 0 || x >= gridWidth || y < 0 || y >= gridHeight) continue;
    grid[y][x] = { char: "*", color: "yellow", bold: true };
  }
  // A bright flash at the center fades as the ring expands away from it.
  if (frame < FRAME_COUNT - 2) {
    grid[centerY][centerX] = { char: "@", color: "yellow", bold: true };
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

export default function WarpTransition({ gridWidth, gridHeight, onComplete }: Props): React.JSX.Element {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => {
      if (frame < FRAME_COUNT - 1) setFrame((f) => f + 1);
      else onComplete();
    }, FRAME_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame]);

  const grid = buildFrame(frame, gridWidth, gridHeight);

  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1}>
      {grid.map((row, idx) => (
        <TransitionRow key={idx} row={row} />
      ))}
    </Box>
  );
}
