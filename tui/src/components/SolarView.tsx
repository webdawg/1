/**
 * Renders the NAVIGATION tile's main content: a full-width grid of
 * nothing but icon+label pairs for the current center and everything
 * orbiting it. Generic over OrbitEntry/DistanceDomain — new body
 * categories need no changes here, just a glyph in worldTree.ts. Renders
 * bare content only, no border of its own; App.tsx owns the tile border
 * that wraps this.
 */
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

/** Builds the full character grid for one frame: the center glyph (or the star's own self-entry, if present), then every orbit entry's icon and label stamped in priority order. */
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

/** Renders one grid row, run-length-encoding adjacent same-styled cells into a single Text run each rather than one Text per character. */
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

/** The orbit-grid view itself: builds the frame's character grid from props and renders it row by row. Memoized since it's re-rendered every position-recompute tick. */
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

/*
 * ============================================================================
 * COLD EXPLAINER — SolarView.tsx
 * ============================================================================
 * Written for a reader who has opened only this file, per CODEBOT.md's
 * cold-open convention. Keep this current when the file's behavior changes.
 *
 * WHAT THIS FILE IS
 * The NAVIGATION tile's main content component: a full-width character
 * grid showing the current center's glyph plus every orbiting entry as
 * an icon+label pair, positioned by real angle/distance. No text list —
 * that's the HUD/bottom-panel's job elsewhere. Renders bare content with
 * no border of its own; App.tsx's wrapping Box owns the one border that
 * encloses this (and ContentView/WarpTransition, its siblings in the
 * same tile slot).
 *
 * HOW POSITIONS BECOME A GRID
 * computeGridPositions (layout.ts) turns each entry's real angle/distance
 * into an (x, y) cell — the single source of truth shared with
 * spatialNav.ts's direction-picking logic. buildGrid then stamps
 * characters into a 2D Cell[][] buffer: first the center glyph (unless a
 * star's own self-entry at distance 0 takes that spot instead — see
 * worldTree.ts's starSelfEntry), then every entry's icon, then every
 * entry's label, via stampRow.
 *
 * WHY TWO STAMPING PASSES (ICONS, THEN LABELS)
 * A label stamp is much wider than an icon stamp and can span over
 * where a nearby body's icon belongs in a crowded cluster (e.g. the
 * inner rocky planets, or a dense cluster of nearby stars on the map).
 * Claiming every icon first — via findFreeSlot, which nudges a stamp to
 * the nearest open cell rather than dropping it — guarantees every body
 * gets *some* visible icon; only labels are ever silently omitted when
 * space runs out. This was a real bug fixed earlier in the project
 * (crowded clusters used to drop entries entirely).
 *
 * COLLISION MODEL
 * occupied (an OccupiedRanges map) tracks claimed column ranges per row.
 * stampRow refuses to write if any part of its span collides with an
 * existing claim, returning false so callers can react (findFreeSlot
 * uses this to search outward ring by ring for open space). Stamping
 * happens in priority order — center first, then the focused entry, then
 * everything else — so the most important content on screen is the last
 * to lose a collision.
 *
 * RENDERING
 * GridRow run-length-encodes each row's cells into same-styled Text runs
 * (avoids one Ink Text element per character). The whole component is
 * wrapped in React.memo since it re-renders every position-recompute
 * tick (currently every 5 seconds) even when nothing on screen actually
 * moved enough to matter.
 * ============================================================================
 */
