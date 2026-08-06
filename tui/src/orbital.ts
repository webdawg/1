/**
 * Low-precision heliocentric planet positions, good to roughly an arcminute
 * around the present era. Formulas adapted from Paul Schlyter's
 * "How to compute planetary positions" (stjarnhimlen.se/comp/ppcomp.html).
 */

const DEG = Math.PI / 180;

// Milliseconds at J2000.0 epoch (2000-01-01 12:00 UTC).
const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

/** Reduces a degree value into [0, 360). */
export function rev(deg: number): number {
  const r = deg % 360;
  return r < 0 ? r + 360 : r;
}

/** Days (fractional, can be negative) since the J2000 epoch. */
export function daysSinceJ2000(date: Date): number {
  return (date.getTime() - J2000_MS) / 86400000;
}

interface Elements {
  /** Longitude of ascending node, deg + deg/day */
  N: [number, number];
  /** Inclination, deg + deg/day */
  i: [number, number];
  /** Argument of perihelion, deg + deg/day */
  w: [number, number];
  /** Semi-major axis, AU (+ AU/day, usually ~0) */
  a: [number, number];
  /** Eccentricity (+ per day) */
  e: [number, number];
  /** Mean anomaly, deg + deg/day */
  M: [number, number];
}

const ELEMENTS: Record<string, Elements> = {
  // Standing in for Earth: these are the Sun's *geocentric* elements, which
  // give Earth's heliocentric position once rotated 180 degrees (see below).
  earth: {
    N: [0.0, 0.0],
    i: [0.0, 0.0],
    w: [282.9404, 4.70935e-5],
    a: [1.0, 0.0],
    e: [0.016709, -1.151e-9],
    M: [356.047, 0.9856002585],
  },
  mercury: {
    N: [48.3313, 3.24587e-5],
    i: [7.0047, 5.0e-8],
    w: [29.1241, 1.01444e-5],
    a: [0.387098, 0.0],
    e: [0.205635, 5.59e-10],
    M: [168.6562, 4.0923344368],
  },
  venus: {
    N: [76.6799, 2.4659e-5],
    i: [3.3946, 2.75e-8],
    w: [54.891, 1.38374e-5],
    a: [0.72333, 0.0],
    e: [0.006773, -1.302e-9],
    M: [48.0052, 1.6021302244],
  },
  mars: {
    N: [49.5574, 2.11081e-5],
    i: [1.8497, -1.78e-8],
    w: [286.5016, 2.92961e-5],
    a: [1.523688, 0.0],
    e: [0.093405, 2.516e-9],
    M: [18.6021, 0.5240207766],
  },
  jupiter: {
    N: [100.4542, 2.76854e-5],
    i: [1.303, -1.557e-7],
    w: [273.8777, 1.64505e-5],
    a: [5.20256, 0.0],
    e: [0.048498, 4.469e-9],
    M: [19.895, 0.0830853001],
  },
  saturn: {
    N: [113.6634, 2.3898e-5],
    i: [2.4886, -1.081e-7],
    w: [339.3939, 2.97661e-5],
    a: [9.55475, 0.0],
    e: [0.055546, -9.499e-9],
    M: [316.967, 0.0334442282],
  },
  uranus: {
    N: [74.0005, 1.3978e-5],
    i: [0.7733, 1.9e-8],
    w: [96.6612, 3.0565e-5],
    a: [19.18171, -1.55e-8],
    e: [0.047318, 7.45e-9],
    M: [142.5905, 0.011725806],
  },
  neptune: {
    N: [131.7806, 3.0173e-5],
    i: [1.77, -2.55e-7],
    w: [272.8461, 6.027e-6],
    a: [30.05826, 3.313e-8],
    e: [0.008606, 2.15e-9],
    M: [260.2471, 0.005995147],
  },
};

export const PLANET_ORDER = [
  "mercury",
  "venus",
  "earth",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
] as const;

export type PlanetName = (typeof PLANET_ORDER)[number];

export interface PlanetPosition {
  name: PlanetName;
  /** Heliocentric ecliptic longitude in degrees [0, 360). */
  angleDeg: number;
  /** Distance from the Sun in AU. */
  distanceAU: number;
}

/** Solves Kepler's equation E - e*sin(E) = M for the eccentric anomaly, in radians. */
export function solveEccentricAnomaly(mDeg: number, e: number, iterations = 8): number {
  const m = rev(mDeg) * DEG;
  let E = m;
  for (let n = 0; n < iterations; n++) {
    const delta = E - e * Math.sin(E) - m;
    const derivative = 1 - e * Math.cos(E);
    E -= delta / derivative;
  }
  return E; // radians
}

function at(pair: [number, number], d: number): number {
  return pair[0] + pair[1] * d;
}

/** A planet's real heliocentric position at `date`, solved from its real orbital elements via Kepler's equation. Earth is a special case — see the inline comment below. */
export function getPlanetPosition(name: PlanetName, date: Date): PlanetPosition {
  const d = daysSinceJ2000(date);
  const el = ELEMENTS[name];

  const N = at(el.N, d) * DEG;
  const i = at(el.i, d) * DEG;
  const w = at(el.w, d) * DEG;
  const a = at(el.a, d);
  const e = at(el.e, d);
  const M = at(el.M, d);

  const E = solveEccentricAnomaly(M, e);

  // Position in the orbital plane.
  const xv = a * (Math.cos(E) - e);
  const yv = a * (Math.sqrt(1 - e * e) * Math.sin(E));
  const v = Math.atan2(yv, xv);
  const r = Math.sqrt(xv * xv + yv * yv);

  if (name === "earth") {
    // `el` above is really the Sun's geocentric elements; Earth's
    // heliocentric position is the opposite side of that vector.
    const lonSun = v + w;
    return {
      name,
      angleDeg: rev((lonSun / DEG) + 180),
      distanceAU: r,
    };
  }

  // Full 3D -> ecliptic-plane projection, then flatten (drop z) for our
  // top-down 2D view.
  const vw = v + w;
  const xh = r * (Math.cos(N) * Math.cos(vw) - Math.sin(N) * Math.sin(vw) * Math.cos(i));
  const yh = r * (Math.sin(N) * Math.cos(vw) + Math.cos(N) * Math.sin(vw) * Math.cos(i));

  return {
    name,
    angleDeg: rev(Math.atan2(yh, xh) / DEG),
    distanceAU: Math.sqrt(xh * xh + yh * yh),
  };
}

/** All 8 real planets' positions at `date`, in PLANET_ORDER. */
export function getPlanetPositions(date: Date): PlanetPosition[] {
  return PLANET_ORDER.map((name) => getPlanetPosition(name, date));
}

/*
 * ============================================================================
 * COLD EXPLAINER — orbital.ts
 * ============================================================================
 * Written for a reader who has opened only this file, per CODEBOT.md's
 * cold-open convention. Keep this current when the file's behavior changes.
 *
 * WHAT THIS FILE IS
 * Real Keplerian orbital mechanics for the 8 planets — the only body
 * category in the game solved this precisely (moons/asteroids/exoplanets
 * use a simpler circular mean-motion approximation elsewhere; comets use
 * a full Kepler solve too, but with their own orbital elements in
 * cometFacts.ts). Formulas adapted from Paul Schlyter's "How to compute
 * planetary positions," good to roughly an arcminute around the present
 * era — not observatory-grade, but real astronomy, not an approximation
 * invented for this game.
 *
 * HOW IT WORKS
 * ELEMENTS holds each planet's six real orbital elements (N, i, w, a, e,
 * M) plus their real per-day rates of change, referenced to the J2000.0
 * epoch. getPlanetPosition(name, date) evaluates those elements at the
 * given date, solves Kepler's equation (E - e·sin(E) = M) for the
 * eccentric anomaly via Newton's method (solveEccentricAnomaly), derives
 * the position in the orbital plane, then projects it into the ecliptic
 * plane and flattens to 2D (drops z) for this engine's top-down view.
 *
 * THE EARTH SPECIAL CASE
 * ELEMENTS.earth is actually the Sun's *geocentric* elements (how the Sun
 * appears to move around Earth) — real historical convention for this
 * formula set — so getPlanetPosition rotates that result 180° to recover
 * Earth's real heliocentric position instead, rather than carrying a
 * second, redundant set of elements.
 *
 * WHAT THIS FILE DELIBERATELY DOES NOT DO
 * No knowledge of glyphs, labels, or the world tree — worldTree.ts
 * consumes getPlanetPositions/getPlanetPosition and wraps the results in
 * OrbitEntry objects. This file is pure physics, nothing else.
 * ============================================================================
 */
