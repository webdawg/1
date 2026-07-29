import React from "react";
import { Box, Text } from "ink";
import { polarToGrid, scaleDistance } from "../layout.js";
import type { OrbitEntry, DistanceDomain } from "../worldTree.js";

const GRID_WIDTH = 61;
const GRID_HEIGHT = 21;
const CENTER_X = Math.floor(GRID_WIDTH / 2);
const CENTER_Y = Math.floor(GRID_HEIGHT / 2);
const MIN_RADIUS = 2;
const MAX_RADIUS = 9;

interface Cell {
  char: string;
  color?: string;
  bold?: boolean;
}

interface Props {
  centerLabel: string;
  orbitEntries: OrbitEntry[];
  domain: DistanceDomain;
  focusedId: string | null;
}

/** Converts an ecliptic-style angle into a 1-12 clock position, 12 at top. */
function toClockHour(angleDeg: number): number {
  const raw = ((90 - angleDeg + 360) % 360) / 30;
  const hour = Math.round(raw) % 12;
  return hour === 0 ? 12 : hour;
}

function buildGrid(centerLabel: string, entries: OrbitEntry[], domain: DistanceDomain, focusedId: string | null): Cell[][] {
  const grid: Cell[][] = Array.from({ length: GRID_HEIGHT }, () =>
    Array.from({ length: GRID_WIDTH }, () => ({ char: " " }))
  );

  const centerGlyph = centerLabel === "Sun" ? "*" : "@";
  grid[CENTER_Y][CENTER_X] = { char: centerGlyph, color: "yellow", bold: true };

  for (const entry of entries) {
    const radius = scaleDistance(entry.distance, domain.min, domain.max, MIN_RADIUS, MAX_RADIUS);
    const { x, y } = polarToGrid(CENTER_X, CENTER_Y, entry.angleDeg, radius);
    if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) continue;
    const isFocused = entry.id === focusedId;
    grid[y][x] = { char: entry.glyph, color: isFocused ? "green" : "cyan", bold: isFocused };
  }

  return grid;
}

function GridRow({ row }: { row: Cell[] }): React.JSX.Element {
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

function SolarView({ centerLabel, orbitEntries, domain, focusedId }: Props): React.JSX.Element {
  const grid = buildGrid(centerLabel, orbitEntries, domain, focusedId);

  return (
    <Box flexDirection="column">
      <Box flexDirection="column" borderStyle="round" paddingX={1}>
        {grid.map((row, idx) => (
          <GridRow key={idx} row={row} />
        ))}
      </Box>
      <Box flexDirection="column" marginTop={1}>
        {orbitEntries.map((entry) => {
          const focused = entry.id === focusedId;
          const hour = toClockHour(entry.angleDeg);
          const distanceLabel = `${entry.distance.toFixed(2)}${centerLabel === "Sun" ? " AU" : ""}`;
          return (
            <Text key={entry.id} color={focused ? "green" : undefined} bold={focused}>
              {focused ? "> " : "  "}
              {entry.label} — {hour} o'clock, {distanceLabel}
            </Text>
          );
        })}
      </Box>
    </Box>
  );
}

export default React.memo(SolarView);
