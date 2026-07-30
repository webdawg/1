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
 * something already claimed on that row. Returns whether it was placed,
 * so callers can fall back to something shorter rather than the entry
 * vanishing outright. First-claim-wins: callers stamp in priority order
 * (center, then focused entry, then the rest) so the most important thing
 * on screen is the last to lose a collision.
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
): boolean {
  if (row < 0 || row >= grid.length || startCol >= gridWidth) return false;
  const clippedStart = Math.max(0, startCol);
  const endCol = Math.min(gridWidth, startCol + text.length);
  if (endCol <= clippedStart) return false;

  const ranges = occupied.get(row) ?? [];
  if (ranges.some(([s, e]) => clippedStart < e && endCol > s)) return false;

  for (let col = clippedStart; col < endCol; col++) {
    grid[row][col] = { char: text[col - startCol], color, bold };
  }
  ranges.push([clippedStart, endCol]);
  occupied.set(row, ranges);
  return true;
}

const FREE_SLOT_ROW_RADIUS = 3;
const FREE_SLOT_COL_RADIUS = 8;

/**
 * Finds the nearest free row/column to (row, col) — checked outward
 * ring by ring — where a stamp of the given width wouldn't collide with
 * anything already claimed. Icons never overwrite each other: if their
 * exact orbital position is taken, they're nudged to the closest open
 * spot instead of being skipped.
 */
function findFreeSlot(
  occupied: OccupiedRanges,
  row: number,
  col: number,
  width: number,
  gridWidth: number,
  gridHeight: number
): { row: number; col: number } | null {
  const isFree = (r: number, c: number): boolean => {
    if (r < 0 || r >= gridHeight || c < 0 || c + width > gridWidth) return false;
    const ranges = occupied.get(r) ?? [];
    return !ranges.some(([s, e]) => c < e && c + width > s);
  };

  for (let dRow = 0; dRow <= FREE_SLOT_ROW_RADIUS; dRow++) {
    const rowCandidates = dRow === 0 ? [row] : [row - dRow, row + dRow];
    for (const r of rowCandidates) {
      for (let dCol = 0; dCol <= FREE_SLOT_COL_RADIUS; dCol++) {
        const colCandidates = dCol === 0 ? [col] : [col - dCol, col + dCol];
        for (const c of colCandidates) {
          if (isFree(r, c)) return { row: r, col: c };
        }
      }
    }
  }
  return null;
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
  // A star's own children include itself as a real, selectable entry at
  // distance 0 (see worldTree.ts's starSelfEntry) — when that's present,
  // it takes over the center spot through the normal entry-stamping loop
  // below instead of this fixed, unselectable marker.
  const hasSelfEntry = entries.some((entry) => entry.distance === 0);
  if (!hasSelfEntry) {
    stampRow(grid, occupied, centerY, centerX - Math.floor(centerGlyph.length / 2), centerGlyph, "yellow", true, gridWidth);
  }

  const positions = computeGridPositions(entries, domain, gridWidth, gridHeight);
  const stampOrder = [...entries].sort((a, b) => (a.id === focusedId ? 0 : 1) - (b.id === focusedId ? 0 : 1));

  // Two passes, icons before labels: in a crowded cluster (e.g. the inner
  // rocky planets, all close to the Sun) a neighbor's full "icon label"
  // stamp can span right over where another body's icon belongs. Claiming
  // every body's short icon first — nudged to the nearest open slot if its
  // exact orbital position is already taken, never dropped or overlapped —
  // means a dense cluster degrades to icons-without-names or icons slightly
  // off their precise spot, rather than some bodies vanishing outright.
  const placedIcon = new Map<string, { row: number; col: number }>();
  for (const entry of stampOrder) {
    const pos = positions.get(entry.id);
    if (!pos || pos.x < 0 || pos.x >= gridWidth || pos.y < 0 || pos.y >= gridHeight) continue;
    const isFocused = entry.id === focusedId;
    const color = isFocused ? "green" : "cyan";
    const slot = findFreeSlot(occupied, pos.y, pos.x, entry.glyph.length, gridWidth, gridHeight);
    if (slot && stampRow(grid, occupied, slot.row, slot.col, entry.glyph, color, isFocused, gridWidth)) {
      placedIcon.set(entry.id, slot);
    }
  }
  for (const entry of stampOrder) {
    const icon = placedIcon.get(entry.id);
    if (!icon) continue;
    const isFocused = entry.id === focusedId;
    const color = isFocused ? "green" : "cyan";
    stampRow(grid, occupied, icon.row, icon.col + entry.glyph.length, ` ${entry.label}`, color, isFocused, gridWidth);
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
    <Box flexDirection="column">
      {grid.map((row, idx) => (
        <GridRow key={idx} row={row} />
      ))}
    </Box>
  );
}

export default React.memo(SolarView);
