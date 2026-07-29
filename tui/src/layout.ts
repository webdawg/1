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
