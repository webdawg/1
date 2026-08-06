/**
 * Curated real facts for the solar system's major/notable moons — not
 * an exhaustive catalog (Jupiter and Saturn alone have well over a
 * hundred known moons between them, most tiny and irregular). Positions
 * are computed elsewhere (worldTree.ts's circular mean-motion
 * approximation), using this file's orbitalPeriodDays/distanceFromPlanetKm.
 */
import type { PlanetName } from "./orbital.js";

export interface MoonFacts {
  label: string;
  parent: PlanetName;
  description: string;
  diameterKm: number;
  /** Orbital period around the parent planet, in Earth days. All of these
   * moons are tidally locked, so this also equals their rotation period. */
  orbitalPeriodDays: number;
  distanceFromPlanetKm: number;
}

// Major/notable moons only — not an exhaustive catalog (Jupiter and Saturn
// alone have well over a hundred known moons between them, most tiny and
// irregular).
export const MOON_ORDER = [
  "moon",
  "phobos",
  "deimos",
  "io",
  "europa",
  "ganymede",
  "callisto",
  "titan",
  "enceladus",
  "titania",
  "oberon",
  "umbriel",
  "ariel",
  "miranda",
  "triton",
] as const;

export type MoonId = (typeof MOON_ORDER)[number];

export const MOON_FACTS: Record<MoonId, MoonFacts> = {
  moon: {
    label: "Moon",
    parent: "earth",
    description: "Earth's only natural satellite, and the fifth largest moon in the solar system.",
    diameterKm: 3474,
    orbitalPeriodDays: 27.3,
    distanceFromPlanetKm: 384400,
  },
  phobos: {
    label: "Phobos",
    parent: "mars",
    description: "The larger of Mars's two moons, orbiting so close and fast it rises in the west and sets in the east.",
    diameterKm: 22,
    orbitalPeriodDays: 0.319,
    distanceFromPlanetKm: 9376,
  },
  deimos: {
    label: "Deimos",
    parent: "mars",
    description: "The smaller and outer of Mars's two moons.",
    diameterKm: 12,
    orbitalPeriodDays: 1.263,
    distanceFromPlanetKm: 23463,
  },
  io: {
    label: "Io",
    parent: "jupiter",
    description: "The most volcanically active body in the solar system.",
    diameterKm: 3643,
    orbitalPeriodDays: 1.769,
    distanceFromPlanetKm: 421700,
  },
  europa: {
    label: "Europa",
    parent: "jupiter",
    description: "An icy moon thought to hide a liquid ocean beneath its surface.",
    diameterKm: 3122,
    orbitalPeriodDays: 3.551,
    distanceFromPlanetKm: 671100,
  },
  ganymede: {
    label: "Ganymede",
    parent: "jupiter",
    description: "The largest moon in the solar system, bigger than the planet Mercury.",
    diameterKm: 5268,
    orbitalPeriodDays: 7.155,
    distanceFromPlanetKm: 1070400,
  },
  callisto: {
    label: "Callisto",
    parent: "jupiter",
    description: "The most heavily cratered object in the solar system.",
    diameterKm: 4821,
    orbitalPeriodDays: 16.69,
    distanceFromPlanetKm: 1882700,
  },
  titan: {
    label: "Titan",
    parent: "saturn",
    description: "The only moon with a dense atmosphere, and lakes of liquid methane on its surface.",
    diameterKm: 5150,
    orbitalPeriodDays: 15.95,
    distanceFromPlanetKm: 1221870,
  },
  enceladus: {
    label: "Enceladus",
    parent: "saturn",
    description: "A small icy moon that vents water-ice plumes from its south pole.",
    diameterKm: 504,
    orbitalPeriodDays: 1.37,
    distanceFromPlanetKm: 238000,
  },
  titania: {
    label: "Titania",
    parent: "uranus",
    description: "The largest moon of Uranus.",
    diameterKm: 1578,
    orbitalPeriodDays: 8.706,
    distanceFromPlanetKm: 436300,
  },
  oberon: {
    label: "Oberon",
    parent: "uranus",
    description: "The outermost of Uranus's major moons.",
    diameterKm: 1523,
    orbitalPeriodDays: 13.46,
    distanceFromPlanetKm: 583500,
  },
  umbriel: {
    label: "Umbriel",
    parent: "uranus",
    description: "One of the darkest moons in the solar system.",
    diameterKm: 1169,
    orbitalPeriodDays: 4.144,
    distanceFromPlanetKm: 266000,
  },
  ariel: {
    label: "Ariel",
    parent: "uranus",
    description: "The brightest of Uranus's major moons.",
    diameterKm: 1158,
    orbitalPeriodDays: 2.52,
    distanceFromPlanetKm: 191020,
  },
  miranda: {
    label: "Miranda",
    parent: "uranus",
    description: "A small moon with extreme, jumbled terrain including a giant cliff.",
    diameterKm: 471,
    orbitalPeriodDays: 1.413,
    distanceFromPlanetKm: 129900,
  },
  triton: {
    label: "Triton",
    parent: "neptune",
    description: "Neptune's largest moon, orbiting backwards, likely a captured Kuiper Belt object.",
    diameterKm: 2707,
    orbitalPeriodDays: 5.877,
    distanceFromPlanetKm: 354800,
  },
};

/** Type guard: is this id one of the curated moon ids in MOON_ORDER? */
export function isMoonId(id: string): id is MoonId {
  return (MOON_ORDER as readonly string[]).includes(id);
}

/** All curated moons of a given planet, nearest-first. */
export function getMoonsOf(planet: PlanetName): MoonId[] {
  return MOON_ORDER.filter((id) => MOON_FACTS[id].parent === planet).sort(
    (a, b) => MOON_FACTS[a].distanceFromPlanetKm - MOON_FACTS[b].distanceFromPlanetKm
  );
}

/*
 * ============================================================================
 * COLD EXPLAINER — moonFacts.ts
 * ============================================================================
 * Written for a reader who has opened only this file, per CODEBOT.md's
 * cold-open convention. Keep this current when the file's behavior changes.
 *
 * WHAT THIS FILE IS
 * Real curated facts for 15 major/notable moons across Earth, Mars,
 * Jupiter, Saturn, Uranus, and Neptune — MOON_ORDER is the id list,
 * MOON_FACTS the per-moon data (label, parent planet, description,
 * diameter, orbital period, real distance from its parent). Every one
 * of these moons is tidally locked, so orbitalPeriodDays also equals
 * its rotation period — noted once on the interface rather than per moon.
 *
 * HOW OTHER FILES USE THIS
 * worldTree.ts computes each moon's live angular position via circular
 * mean-motion (a per-body phase offset plus this file's real
 * orbitalPeriodDays) — not a full ephemeris, an approximation
 * deliberately simpler than orbital.ts's real Keplerian planet math.
 * getMoonsOf(planet) is how worldTree.ts finds a planet's moon set,
 * sorted nearest-first, when building that planet's orbit children.
 *
 * PATTERN THIS FILE FOLLOWS
 * Same shape as every other `*Facts.ts` file: an id union (MoonId), an
 * interface (MoonFacts), a `Record<MoonId, MoonFacts>`, and an `isXId`
 * type guard. Static curated data, no network calls.
 * ============================================================================
 */
