/** Turns (angle, distance) pairs into integer character-grid coordinates. */

export interface GridPoint {
  x: number;
  y: number;
}

// Terminal character cells are roughly twice as tall as they are wide, so we
// stretch the horizontal axis to make orbits read as round rather than
// squashed into a vertical oval.
const ASPECT_RATIO = 2.1;

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

interface PositionedEntry {
  id: string;
  angleDeg: number;
  distance: number;
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
