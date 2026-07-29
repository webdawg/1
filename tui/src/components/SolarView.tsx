import React from "react";
import { Box, Text } from "ink";
import { computeGridPositions } from "../layout.js";
import type { OrbitEntry, DistanceDomain } from "../worldTree.js";

interface Cell {
  char: string;
  color?: string;
  bold?: boolean;
}

interface Props {
  centerGlyph: string;
  orbitEntries: OrbitEntry[];
  domain: DistanceDomain;
  focusedId: string | null;
  gridWidth: number;
  gridHeight: number;
}

type OccupiedRanges = Map<number, Array<[start: number, end: number]>>;

/**
 * Writes a whole string across one row's columns, clipping at the right
 * edge and dropping the entire stamp (not partially) if it collides with
 * something already claimed on that row. First-claim-wins: callers stamp
 * in priority order (center, then focused entry, then the rest) so the
 * most important thing on screen is never the one that silently vanishes.
 */
function stampRow(
  grid: Cell[][],
  occupied: OccupiedRanges,
  row: number,
  startCol: number,
  text: string,
  color: string | undefined,
  bold: boolean,
  gridWidth: number
): void {
  if (row < 0 || row >= grid.length || startCol >= gridWidth) return;
  const clippedStart = Math.max(0, startCol);
  const endCol = Math.min(gridWidth, startCol + text.length);
  if (endCol <= clippedStart) return;

  const ranges = occupied.get(row) ?? [];
  if (ranges.some(([s, e]) => clippedStart < e && endCol > s)) return;

  for (let col = clippedStart; col < endCol; col++) {
    grid[row][col] = { char: text[col - startCol], color, bold };
  }
  ranges.push([clippedStart, endCol]);
  occupied.set(row, ranges);
}

function buildGrid(
  centerGlyph: string,
  entries: OrbitEntry[],
  domain: DistanceDomain,
  focusedId: string | null,
  gridWidth: number,
  gridHeight: number
): Cell[][] {
  const grid: Cell[][] = Array.from({ length: gridHeight }, () =>
    Array.from({ length: gridWidth }, () => ({ char: " " }))
  );
  const occupied: OccupiedRanges = new Map();

  const centerX = Math.floor(gridWidth / 2);
  const centerY = Math.floor(gridHeight / 2);
  stampRow(grid, occupied, centerY, centerX - Math.floor(centerGlyph.length / 2), centerGlyph, "yellow", true, gridWidth);

  const positions = computeGridPositions(entries, domain, gridWidth, gridHeight);
  const stampOrder = [...entries].sort((a, b) => (a.id === focusedId ? 0 : 1) - (b.id === focusedId ? 0 : 1));

  for (const entry of stampOrder) {
    const pos = positions.get(entry.id);
    if (!pos || pos.x < 0 || pos.x >= gridWidth || pos.y < 0 || pos.y >= gridHeight) continue;
    const isFocused = entry.id === focusedId;
    stampRow(grid, occupied, pos.y, pos.x, `${entry.glyph} ${entry.label}`, isFocused ? "green" : "cyan", isFocused, gridWidth);
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

function SolarView({ centerGlyph, orbitEntries, domain, focusedId, gridWidth, gridHeight }: Props): React.JSX.Element {
  const grid = buildGrid(centerGlyph, orbitEntries, domain, focusedId, gridWidth, gridHeight);

  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1}>
      {grid.map((row, idx) => (
        <GridRow key={idx} row={row} />
      ))}
    </Box>
  );
}

export default React.memo(SolarView);
