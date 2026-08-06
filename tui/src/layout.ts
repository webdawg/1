/**
 * Turns (angle, distance) pairs into integer character-grid coordinates.
 * Pure math, no React — the single source of truth SolarView (rendering)
 * and spatialNav (arrow-key direction decisions) both build on, so what's
 * drawn and what's reachable can never disagree. Also owns zoom math and
 * SOLAR BASE JUMP travel-duration scaling, since both are just more real-
 * distance-to-display-value mappings in the same spirit.
 */

export interface GridPoint {
  x: number;
  y: number;
}

// Terminal character cells are roughly twice as tall as they are wide, so we
// stretch the horizontal axis to make orbits read as round rather than
// squashed into a vertical oval.
const ASPECT_RATIO = 2.1;

/** Converts a (center, angle, radius) polar position into an integer (x, y) grid cell, stretching x by ASPECT_RATIO so orbits read round on a taller-than-wide terminal cell grid. */
export function polarToGrid(
  centerX: number,
  centerY: number,
  angleDeg: number,
  radius: number
): GridPoint {
  const rad = (angleDeg * Math.PI) / 180;
  const x = centerX + Math.round(Math.cos(rad) * radius * ASPECT_RATIO);
  const y = centerY - Math.round(Math.sin(rad) * radius);
  return { x, y };
}

/**
 * Maps a real distance (AU, or any positive unit) onto a display radius
 * between minRadius and maxRadius using a sqrt scale, so inner planets
 * don't all collapse on top of each other next to outer ones.
 */
export function scaleDistance(
  distance: number,
  domainMin: number,
  domainMax: number,
  minRadius: number,
  maxRadius: number
): number {
  const t =
    (Math.sqrt(distance) - Math.sqrt(domainMin)) /
    (Math.sqrt(domainMax) - Math.sqrt(domainMin));
  const clamped = Math.max(0, Math.min(1, t));
  return minRadius + clamped * (maxRadius - minRadius);
}

export const ZOOM_MIN = -2;
export const ZOOM_MAX = 6;

/**
 * Shrinks (positive zoomLevel) or expands (negative) a distance domain's
 * span around its minimum, leaving minRadius/maxRadius untouched. A real
 * outlier (e.g. one star hundreds of light-years further out than the
 * rest) otherwise forces sqrt scaling to compress everything else into a
 * small fraction of the display no matter how gentle the curve — zooming
 * in trades "see the outlier" for "spread out what's near you," pinning
 * anything past the new effective max to the outer rim exactly like an
 * out-of-domain distance already does.
 */
export function applyZoom(domain: { min: number; max: number }, zoomLevel: number): { min: number; max: number } {
  const factor = 2 ** zoomLevel;
  const span = Math.max(0.0001, (domain.max - domain.min) / factor);
  return { min: domain.min, max: domain.min + span };
}

// Fraction of distinct real distances guaranteed to land within the
// visible radius by default — the rest are sacrificed to the outer rim.
// A "sacrifice just the single farthest thing" rule sounds tighter but
// falls apart the moment there's more than one outlier (e.g. several
// stars all hundreds of light-years past the nearby cluster) — ignoring
// only the very farthest barely moves the target when its closest
// neighbor is nearly as extreme. A fixed fraction is blunter but stays
// predictable regardless of how the outliers happen to be clustered.
const AUTO_ZOOM_KEEP_FRACTION = 0.75;

/**
 * The zoom level to land on by default: zoom in enough that most real
 * entries (see `AUTO_ZOOM_KEEP_FRACTION`) fit inside the visible radius,
 * maximizing spread for the majority at the cost of pinning the most
 * extreme ones to the outer rim. `distances` should already exclude
 * leaves and the distance-0 "home" entry — neither is a real spread
 * target. Falls back to no zoom (level 0) when there's too little data to
 * meaningfully sacrifice anything (need at least 4 distinct distances
 * before 25% rounds up to a whole entry).
 */
export function computeAutoZoomLevel(distances: number[], domain: { min: number; max: number }): number {
  const distinct = Array.from(new Set(distances.filter((d) => d > 0))).sort((a, b) => a - b);
  const keepCount = Math.max(1, Math.ceil(distinct.length * AUTO_ZOOM_KEEP_FRACTION));
  if (keepCount >= distinct.length) return 0;

  const targetMax = distinct[keepCount - 1];
  const targetSpan = targetMax - domain.min;
  const span = domain.max - domain.min;
  if (targetSpan <= 0 || span <= 0) return 0;

  const level = Math.round(Math.log2(span / targetSpan));
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, level));
}

export type PinnedEdge = "left" | "right" | "top" | "bottom";

interface PositionedEntry {
  id: string;
  angleDeg: number;
  distance: number;
  /**
   * When set, this entry skips the normal distance/angle math entirely and
   * sticks to a fixed edge column/row of the grid — for a body that should
   * always read as genuinely at the very edge of the screen, immune to
   * zoom level, domain changes, and grid-size changes (unlike an ordinary
   * out-of-domain distance, which still clamps to maxRadius but drifts
   * with those — see Sagittarius A*, worldTree.ts's STARMAP_ID branch).
   */
  pinnedEdge?: PinnedEdge;
}

function pinnedEdgePosition(edge: PinnedEdge, gridWidth: number, gridHeight: number): GridPoint {
  const centerX = Math.floor(gridWidth / 2);
  const centerY = Math.floor(gridHeight / 2);
  switch (edge) {
    case "left":
      return { x: 0, y: centerY };
    case "right":
      return { x: gridWidth - 1, y: centerY };
    case "top":
      return { x: centerX, y: 0 };
    case "bottom":
      return { x: centerX, y: gridHeight - 1 };
  }
}

/**
 * Single source of truth for "where does each orbit entry land on the
 * character grid" — used both for rendering (SolarView) and for deciding
 * what's spatially up/down/left/right of the current selection
 * (spatialNav). Radius bounds derive from the grid's actual dimensions
 * rather than fixed constants, since the grid is sized to the terminal.
 */
export function computeGridPositions(
  entries: PositionedEntry[],
  domain: { min: number; max: number },
  gridWidth: number,
  gridHeight: number
): Map<string, GridPoint> {
  const centerX = Math.floor(gridWidth / 2);
  const centerY = Math.floor(gridHeight / 2);
  const minRadius = 2;
  const maxRadius = Math.max(minRadius, Math.floor(Math.min(gridHeight, gridWidth / ASPECT_RATIO) / 2) - 1);

  const positions = new Map<string, GridPoint>();
  for (const entry of entries) {
    if (entry.pinnedEdge) {
      positions.set(entry.id, pinnedEdgePosition(entry.pinnedEdge, gridWidth, gridHeight));
      continue;
    }
    // Zero is a deliberate signal, not just a very small number: it means
    // "at the reference point itself," so it plots dead center rather than
    // being floored up to minRadius like any other near-zero distance.
    const radius = entry.distance === 0 ? 0 : scaleDistance(entry.distance, domain.min, domain.max, minRadius, maxRadius);
    positions.set(entry.id, polarToGrid(centerX, centerY, entry.angleDeg, radius));
  }
  return positions;
}

/** Converts an ecliptic-style angle into a 1-12 clock position, 12 at top. */
export function toClockHour(angleDeg: number): number {
  const raw = ((90 - angleDeg + 360) % 360) / 30;
  const hour = Math.round(raw) % 12;
  return hour === 0 ? 12 : hour;
}

export const MIN_TRAVEL_MS = 5000;
export const MAX_TRAVEL_MS = 10000;
// Matches worldTree.ts's STARMAP_DISPLAY_DOMAIN max — the farthest curated
// star (PSR B1257+12) is the longest a SOLAR BASE JUMP can take. Sagittarius
// A*'s real distance (26,673 ly) is well past this on purpose — see
// STARMAP_DISPLAY_DOMAIN's comment — so it clamps to the same max travel
// time PSR B1257+12 gets, same as any other out-of-domain distance would.
const MAX_KNOWN_DISTANCE_LY = 2300;

/**
 * How long the "traveling" phase of a star jump lasts, sqrt-scaled by real
 * distance the same way display radius is — Sol itself (or anything close)
 * takes MIN_TRAVEL_MS, the single farthest curated star takes MAX_TRAVEL_MS,
 * everything else falls between.
 */
export function computeTravelDurationMs(distanceLy: number): number {
  const t = Math.max(0, Math.min(1, Math.sqrt(Math.max(0, distanceLy)) / Math.sqrt(MAX_KNOWN_DISTANCE_LY)));
  return Math.round(MIN_TRAVEL_MS + t * (MAX_TRAVEL_MS - MIN_TRAVEL_MS));
}

/*
 * ============================================================================
 * COLD EXPLAINER — layout.ts
 * ============================================================================
 * Written for a reader who has opened only this file, per CODEBOT.md's
 * cold-open convention. Keep this current when the file's behavior changes.
 *
 * WHAT THIS FILE IS
 * Pure position/scaling math for the whole engine — no React, no world-
 * model knowledge (it never asks "what kind of body is this," only "given
 * an angle/distance/domain, where does it go"). Two consumers depend on
 * this staying the single source of truth: SolarView.tsx (rendering) and
 * spatialNav.ts (arrow-key direction decisions) — both call
 * computeGridPositions rather than computing their own coordinates, so
 * what's drawn and what arrow keys navigate to can never drift apart.
 *
 * THE MAIN PIPELINE
 * scaleDistance maps a real distance onto a display radius between
 * minRadius/maxRadius using a sqrt curve (so inner bodies don't collapse
 * together next to outer ones); polarToGrid then converts that radius
 * plus an angle into an integer (x, y) grid cell, stretching the x axis
 * by ASPECT_RATIO to counter terminal cells being taller than they are
 * wide. computeGridPositions runs this for every entry in a view, with
 * two special cases: distance 0 always plots dead-center (not floored up
 * to minRadius), and an entry with pinnedEdge skips the distance/angle
 * math entirely in favor of a fixed edge column/row (currently only
 * Sagittarius A*, via worldTree.ts — see PinnedEdge).
 *
 * ZOOM AND AUTO-ZOOM
 * applyZoom shrinks/grows a distance domain's span around its minimum;
 * anything that falls outside the new effective range clamps to the
 * outer rim, the same behavior an ordinary out-of-domain distance
 * already has. computeAutoZoomLevel picks a sensible starting zoom per
 * view — enough to fit AUTO_ZOOM_KEEP_FRACTION (75%) of real distances
 * inside the visible radius, sacrificing the most extreme ~25% to the
 * rim, rather than always starting flat and making the player zoom in
 * by hand.
 *
 * TRAVEL DURATION
 * computeTravelDurationMs is the same sqrt-scaling idea applied to time
 * instead of space: a SOLAR BASE JUMP's travel phase runs from
 * MIN_TRAVEL_MS (Sol itself) to MAX_TRAVEL_MS (the farthest curated
 * star, MAX_KNOWN_DISTANCE_LY), matching the founding vision's "5-10
 * seconds depending on distance."
 * ============================================================================
 */
