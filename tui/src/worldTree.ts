/**
 * The recursive "center + orbiting things" world model. Whatever node you're
 * centered on, this returns what orbits it. The Sun's children are the
 * planets (real orbital data via ../orbital.ts) plus the asteroid belt
 * (a single fixed representative point, since the real belt spans every
 * angle at once). A planet's children are its major moons plus leaves
 * (Surface, Orbit Log, optionally Rings, Notes); the belt's children are its
 * largest asteroids plus Surface/Notes leaves. Moons and asteroids are
 * positioned by simple mean motion — a circular approximation, not full
 * ephemeris — and get the same generic leaves as a terminal ring. Later, a
 * node's children can come from a server instead of being computed locally,
 * without changing anything above this module.
 */
import { daysSinceJ2000, getPlanetPositions, PLANET_ORDER, type PlanetName } from "./orbital.js";
import { getMoonsOf, isMoonId, MOON_FACTS, type MoonId } from "./moonFacts.js";
import { hasRings } from "./ringFacts.js";
import { ASTEROID_FACTS, getAsteroidsSortedByDistance, isAsteroidId, type AsteroidId } from "./asteroidFacts.js";
import { BELT_FACTS, BELT_ID } from "./beltFacts.js";
import { COMET_FACTS, COMET_ORDER, COMETS_HUB_FACTS, COMETS_HUB_ID, getCometPosition, isCometId } from "./cometFacts.js";

export type LeafKind = "surface" | "orbit-log" | "rings" | "notes";
export type NodeKind = "sun" | "planet" | "moon" | "belt" | "asteroid" | "comets" | "comet" | LeafKind;

export interface OrbitEntry {
  id: string;
  label: string;
  glyph: string;
  angleDeg: number;
  /** Arbitrary display-scale distance (AU for real bodies, ring index otherwise). */
  distance: number;
}

export interface DistanceDomain {
  min: number;
  max: number;
}

export interface MoonPosition {
  angleDeg: number;
  distanceKm: number;
}

export interface AsteroidPosition {
  angleDeg: number;
  distanceAU: number;
}

const PLANET_META: Record<PlanetName, { label: string; glyph: string }> = {
  mercury: { label: "Mercury", glyph: "•" },
  venus: { label: "Venus", glyph: "o" },
  earth: { label: "Earth", glyph: "O" },
  mars: { label: "Mars", glyph: "o" },
  jupiter: { label: "Jupiter", glyph: "@" },
  saturn: { label: "Saturn", glyph: "Ѻ" },
  uranus: { label: "Uranus", glyph: "0" },
  neptune: { label: "Neptune", glyph: "0" },
};

const SUN_AU_DOMAIN: DistanceDomain = { min: 0.38, max: 30.1 };
const LEAF_DOMAIN: DistanceDomain = { min: 1, max: 3 };
// Comets range from well under 1 AU to hundreds of AU; anything past this
// simply pins to the outer edge of the display (scaleDistance clamps).
const COMET_DISPLAY_DOMAIN: DistanceDomain = { min: 0.2, max: 40 };

const LEAF_LABELS: Record<LeafKind, string> = {
  surface: "Surface",
  "orbit-log": "Orbit Log",
  rings: "Rings",
  notes: "Notes",
};

function seedFromId(id: string): number {
  let h = 0;
  for (let idx = 0; idx < id.length; idx++) h = (h * 31 + id.charCodeAt(idx)) % 360;
  return h;
}

/** Circular-orbit approximation: mean motion from a per-body phase offset. */
function meanMotionAngle(bodyId: string, date: Date, periodDays: number): number {
  const phase = seedFromId(bodyId);
  const raw = (daysSinceJ2000(date) / periodDays) * 360 + phase;
  return ((raw % 360) + 360) % 360;
}

export function getMoonPosition(moonId: MoonId, date: Date): MoonPosition {
  const facts = MOON_FACTS[moonId];
  return {
    angleDeg: meanMotionAngle(moonId, date, facts.orbitalPeriodDays),
    distanceKm: facts.distanceFromPlanetKm,
  };
}

export function getAsteroidPosition(asteroidId: AsteroidId, date: Date): AsteroidPosition {
  const facts = ASTEROID_FACTS[asteroidId];
  return {
    angleDeg: meanMotionAngle(asteroidId, date, facts.orbitalPeriodYears * 365.25),
    distanceAU: facts.distanceAU,
  };
}

export function isKnownPlanet(id: string): id is PlanetName {
  return (PLANET_ORDER as readonly string[]).includes(id);
}

function getOwnerLabel(ownerId: string): string {
  if (isKnownPlanet(ownerId)) return PLANET_META[ownerId].label;
  if (isMoonId(ownerId)) return MOON_FACTS[ownerId].label;
  if (ownerId === BELT_ID) return BELT_FACTS.label;
  if (isAsteroidId(ownerId)) return ASTEROID_FACTS[ownerId].label;
  if (ownerId === COMETS_HUB_ID) return COMETS_HUB_FACTS.label;
  if (isCometId(ownerId)) return COMET_FACTS[ownerId].label;
  return ownerId;
}

/** Splits a leaf id like "earth:orbit-log" into its owner and kind. */
export function parseLeafId(id: string): { owner: string; kind: LeafKind } | null {
  const sep = id.lastIndexOf(":");
  if (sep === -1) return null;
  const owner = id.slice(0, sep);
  const suffix = id.slice(sep + 1);
  if (!(suffix in LEAF_LABELS)) return null;
  return { owner, kind: suffix as LeafKind };
}

export function getNodeKind(nodeId: string): NodeKind {
  if (nodeId === "sun") return "sun";
  if (isKnownPlanet(nodeId)) return "planet";
  if (isMoonId(nodeId)) return "moon";
  if (nodeId === BELT_ID) return "belt";
  if (isAsteroidId(nodeId)) return "asteroid";
  if (nodeId === COMETS_HUB_ID) return "comets";
  if (isCometId(nodeId)) return "comet";
  const leaf = parseLeafId(nodeId);
  return leaf ? leaf.kind : "planet";
}

export function getCenterLabel(nodeId: string): string {
  if (nodeId === "sun") return "Sun";
  if (isKnownPlanet(nodeId)) return PLANET_META[nodeId].label;
  if (isMoonId(nodeId)) return `${PLANET_META[MOON_FACTS[nodeId].parent].label} — ${MOON_FACTS[nodeId].label}`;
  if (nodeId === BELT_ID) return BELT_FACTS.label;
  if (isAsteroidId(nodeId)) return `${BELT_FACTS.label} — ${ASTEROID_FACTS[nodeId].label}`;
  if (nodeId === COMETS_HUB_ID) return COMETS_HUB_FACTS.label;
  if (isCometId(nodeId)) return `${COMETS_HUB_FACTS.label} — ${COMET_FACTS[nodeId].label}`;
  const leaf = parseLeafId(nodeId);
  if (leaf) return `${getOwnerLabel(leaf.owner)} — ${getBreadcrumbLabel(nodeId)}`;
  return nodeId;
}

/** Short label for breadcrumb trails, where the parent is already shown. */
export function getBreadcrumbLabel(nodeId: string): string {
  if (isMoonId(nodeId)) return MOON_FACTS[nodeId].label;
  if (isAsteroidId(nodeId)) return ASTEROID_FACTS[nodeId].label;
  if (isCometId(nodeId)) return COMET_FACTS[nodeId].label;
  const leaf = parseLeafId(nodeId);
  if (leaf) return LEAF_LABELS[leaf.kind];
  return getCenterLabel(nodeId);
}

function applicableLeafKinds(ownerId: string): LeafKind[] {
  if (ownerId === BELT_ID || ownerId === COMETS_HUB_ID) return ["surface", "notes"];
  if (isKnownPlanet(ownerId)) {
    return hasRings(ownerId) ? ["surface", "orbit-log", "rings", "notes"] : ["surface", "orbit-log", "notes"];
  }
  // moons, asteroids, and comets
  return ["surface", "orbit-log", "notes"];
}

function leafChildren(ownerId: string): OrbitEntry[] {
  const kinds = applicableLeafKinds(ownerId);
  return kinds.map((kind, index) => ({
    id: `${ownerId}:${kind}`,
    label: LEAF_LABELS[kind],
    glyph: "·",
    angleDeg: (360 / kinds.length) * index,
    distance: index + 1,
  }));
}

export function getDistanceDomain(nodeId: string): DistanceDomain {
  if (nodeId === "sun") return SUN_AU_DOMAIN;
  if (isKnownPlanet(nodeId)) {
    return { min: 1, max: leafChildren(nodeId).length + getMoonsOf(nodeId).length };
  }
  if (nodeId === BELT_ID) {
    return { min: 1, max: leafChildren(nodeId).length + getAsteroidsSortedByDistance().length };
  }
  if (nodeId === COMETS_HUB_ID) return COMET_DISPLAY_DOMAIN;
  return LEAF_DOMAIN;
}

export function getOrbitChildren(nodeId: string, date: Date): OrbitEntry[] {
  if (nodeId === "sun") {
    const planetEntries = getPlanetPositions(date).map((p) => ({
      id: p.name,
      label: PLANET_META[p.name].label,
      glyph: PLANET_META[p.name].glyph,
      angleDeg: p.angleDeg,
      distance: p.distanceAU,
    }));
    const beltEntry: OrbitEntry = {
      id: BELT_ID,
      label: BELT_FACTS.label,
      glyph: ":",
      angleDeg: BELT_FACTS.displayAngleDeg,
      distance: BELT_FACTS.displayDistanceAU,
    };
    const cometsHubEntry: OrbitEntry = {
      id: COMETS_HUB_ID,
      label: COMETS_HUB_FACTS.label,
      glyph: "^",
      angleDeg: COMETS_HUB_FACTS.displayAngleDeg,
      distance: COMETS_HUB_FACTS.displayDistanceAU,
    };
    return [...planetEntries, beltEntry, cometsHubEntry];
  }

  if (isKnownPlanet(nodeId)) {
    const leaves = leafChildren(nodeId);
    const moonEntries: OrbitEntry[] = getMoonsOf(nodeId).map((moonId, index) => {
      const facts = MOON_FACTS[moonId];
      return {
        id: moonId,
        label: facts.label,
        glyph: "o",
        angleDeg: meanMotionAngle(moonId, date, facts.orbitalPeriodDays),
        distance: leaves.length + 1 + index,
      };
    });
    return [...leaves, ...moonEntries];
  }

  if (nodeId === BELT_ID) {
    const leaves = leafChildren(nodeId);
    const asteroidEntries: OrbitEntry[] = getAsteroidsSortedByDistance().map((asteroidId, index) => {
      const facts = ASTEROID_FACTS[asteroidId];
      return {
        id: asteroidId,
        label: facts.label,
        glyph: ".",
        angleDeg: meanMotionAngle(asteroidId, date, facts.orbitalPeriodYears * 365.25),
        distance: leaves.length + 1 + index,
      };
    });
    return [...leaves, ...asteroidEntries];
  }

  if (nodeId === COMETS_HUB_ID) {
    const leaves = leafChildren(nodeId);
    const cometEntries: OrbitEntry[] = COMET_ORDER.map((cometId) => {
      const facts = COMET_FACTS[cometId];
      const position = getCometPosition(cometId, date);
      return {
        id: cometId,
        label: facts.label,
        glyph: "'",
        angleDeg: position.angleDeg,
        distance: position.distanceAU,
      };
    });
    return [...leaves, ...cometEntries];
  }

  if (isMoonId(nodeId) || isAsteroidId(nodeId) || isCometId(nodeId)) return leafChildren(nodeId);

  return [];
}
