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

export function hasRings(planet: PlanetName): boolean {
  return planet in RING_FACTS;
}
