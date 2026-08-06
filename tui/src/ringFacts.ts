/** Curated real facts for the 4 gas/ice giants' ring systems — the terrestrial planets have no entry here at all (see hasRings). */
import type { PlanetName } from "./orbital.js";

export interface RingFacts {
  description: string;
  composition: string;
  innerRadiusKm: number;
  outerRadiusKm: number;
  discovered: string;
}

// Only the gas/ice giants have ring systems; the terrestrial planets don't.
export const RING_FACTS: Partial<Record<PlanetName, RingFacts>> = {
  jupiter: {
    description: "Faint, dusty rings made from debris knocked off Jupiter's small inner moons.",
    composition: "Dust",
    innerRadiusKm: 92000,
    outerRadiusKm: 226000,
    discovered: "1979, by Voyager 1",
  },
  saturn: {
    description: "The largest and brightest ring system in the solar system, yet remarkably thin.",
    composition: "Ice, with some rocky debris",
    innerRadiusKm: 74500,
    outerRadiusKm: 140180,
    discovered: "Seen by Galileo in 1610; recognized as rings by Huygens in 1655",
  },
  uranus: {
    description: "A set of narrow, dark rings discovered when they briefly hid a star from view.",
    composition: "Ice mixed with dark, carbon-rich material",
    innerRadiusKm: 38000,
    outerRadiusKm: 98000,
    discovered: "1977, via stellar occultation",
  },
  neptune: {
    description: "Faint rings with unusual clumpy arcs, held together by a nearby moon's gravity.",
    composition: "Dust and ice",
    innerRadiusKm: 42000,
    outerRadiusKm: 63000,
    discovered: "1989, by Voyager 2",
  },
};

/** Whether a planet has a curated ring entry — drives worldTree.ts's applicableLeafKinds (the Rings leaf only exists for these 4). */
export function hasRings(planet: PlanetName): boolean {
  return planet in RING_FACTS;
}

/*
 * ============================================================================
 * COLD EXPLAINER — ringFacts.ts
 * ============================================================================
 * Written for a reader who has opened only this file, per CODEBOT.md's
 * cold-open convention. Keep this current when the file's behavior changes.
 *
 * WHAT THIS FILE IS
 * Real curated facts for the ring systems of the 4 gas/ice giants
 * (Jupiter, Saturn, Uranus, Neptune) — the only planets with rings.
 * RING_FACTS is a Partial<Record<PlanetName, RingFacts>> rather than a
 * full Record specifically because the 4 terrestrial planets genuinely
 * have no rings and no entry, not a placeholder or a "—".
 *
 * HOW OTHER FILES USE THIS
 * hasRings(planet) is what worldTree.ts's applicableLeafKinds checks to
 * decide whether a planet gets a "Rings" leaf alongside the usual
 * Surface/Orbit Log/Notes; ContentView.tsx's PlanetRings component reads
 * RING_FACTS directly to render that leaf's content (composition, real
 * inner/outer radius in km, discovery year and method).
 *
 * PATTERN THIS FILE FOLLOWS
 * Same shape as every other `*Facts.ts` file, minus the id-union-type
 * part (PlanetName already exists in orbital.ts) — an interface plus a
 * curated record, no network calls.
 * ============================================================================
 */
