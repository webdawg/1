/** Curated real facts for the 4 largest bodies in the main asteroid belt. */
export interface AsteroidFacts {
  label: string;
  description: string;
  diameterKm: number;
  /** Semi-major axis, in AU. */
  distanceAU: number;
  orbitalPeriodYears: number;
}

// The four largest bodies in the main asteroid belt — not an exhaustive
// catalog (over a million objects larger than 1 km are known there).
export const ASTEROID_ORDER = ["ceres", "vesta", "pallas", "hygiea"] as const;

export type AsteroidId = (typeof ASTEROID_ORDER)[number];

export const ASTEROID_FACTS: Record<AsteroidId, AsteroidFacts> = {
  ceres: {
    label: "Ceres",
    description: "The largest object in the asteroid belt, and the only dwarf planet in the inner solar system.",
    diameterKm: 940,
    distanceAU: 2.77,
    orbitalPeriodYears: 4.6,
  },
  vesta: {
    label: "Vesta",
    description: "The second most massive body in the belt, and the brightest asteroid seen from Earth.",
    diameterKm: 525,
    distanceAU: 2.36,
    orbitalPeriodYears: 3.63,
  },
  pallas: {
    label: "Pallas",
    description: "One of the largest asteroids, tilted at a steep angle to the main belt's plane.",
    diameterKm: 512,
    distanceAU: 2.77,
    orbitalPeriodYears: 4.62,
  },
  hygiea: {
    label: "Hygiea",
    description: "The fourth-largest object in the belt, and possibly a dwarf planet itself.",
    diameterKm: 434,
    distanceAU: 3.14,
    orbitalPeriodYears: 5.56,
  },
};

/** Type guard: is this id one of the curated asteroid ids in ASTEROID_ORDER? */
export function isAsteroidId(id: string): id is AsteroidId {
  return (ASTEROID_ORDER as readonly string[]).includes(id);
}

/** All curated asteroids, nearest-first — how worldTree.ts orders the belt's orbit children. */
export function getAsteroidsSortedByDistance(): AsteroidId[] {
  return [...ASTEROID_ORDER].sort((a, b) => ASTEROID_FACTS[a].distanceAU - ASTEROID_FACTS[b].distanceAU);
}

/*
 * ============================================================================
 * COLD EXPLAINER — asteroidFacts.ts
 * ============================================================================
 * Written for a reader who has opened only this file, per CODEBOT.md's
 * cold-open convention. Keep this current when the file's behavior changes.
 *
 * WHAT THIS FILE IS
 * Real curated facts for the 4 largest bodies in the main asteroid belt
 * (Ceres, Vesta, Pallas, Hygiea) — not remotely exhaustive (over a
 * million known objects larger than 1 km live in the real belt), just
 * the standout few worth a curated entry.
 *
 * HOW OTHER FILES USE THIS
 * worldTree.ts positions each asteroid via circular mean-motion (a
 * per-body phase offset plus this file's real orbitalPeriodYears,
 * converted to days), using getAsteroidsSortedByDistance to order them
 * as the belt's orbit children — nearest (by real distanceAU) first.
 * ContentView.tsx's AsteroidSurface/AsteroidOrbitLog components read
 * ASTEROID_FACTS directly for their leaf content.
 *
 * PATTERN THIS FILE FOLLOWS
 * Same shape as every other `*Facts.ts` file: an id union (AsteroidId),
 * an interface (AsteroidFacts), a curated Record, and an isXId type
 * guard. Static data, no network calls.
 * ============================================================================
 */
