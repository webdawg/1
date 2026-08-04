/**
 * The recursive "center + orbiting things" world model. Whatever node you're
 * centered on, this returns what orbits it. The star map's children are Sol
 * (the Sun, unchanged from before this level existed) plus real nearby
 * stars; a star's children are its curated real exoplanets. The Sun's
 * children are the planets (real orbital data via ../orbital.ts) plus the
 * asteroid belt (a single fixed representative point, since the real belt
 * spans every angle at once). A planet's children are its major moons plus
 * leaves (Surface, Orbit Log, optionally Rings, Notes); the belt's children
 * are its largest asteroids plus Surface/Notes leaves. Moons, asteroids, and
 * exoplanets are positioned by simple mean motion — a circular
 * approximation, not full ephemeris — and get the same generic leaves as a
 * terminal ring. Later, a node's children can come from a server instead of
 * being computed locally, without changing anything above this module.
 */
import { daysSinceJ2000, getPlanetPosition, getPlanetPositions, PLANET_ORDER, type PlanetName } from "./orbital.js";
import { getMoonsOf, isMoonId, MOON_FACTS, type MoonId } from "./moonFacts.js";
import { hasRings } from "./ringFacts.js";
import { PLANET_FACTS } from "./planetFacts.js";
import { ASTEROID_FACTS, getAsteroidsSortedByDistance, isAsteroidId, type AsteroidId } from "./asteroidFacts.js";
import { BELT_FACTS, BELT_ID } from "./beltFacts.js";
import { COMET_FACTS, COMET_ORDER, COMETS_HUB_FACTS, COMETS_HUB_ID, getCometPosition, isCometId } from "./cometFacts.js";
import {
  EXOPLANET_FACTS,
  STAR_FACTS,
  STAR_ORDER,
  STARMAP_FACTS,
  STARMAP_ID,
  SUN_DIAMETER_KM,
  SUN_GRAVITY,
  getExoplanetsOfStar,
  isExoplanetId,
  isStarId,
  type ExoplanetId,
  type ExoplanetKind,
} from "./starFacts.js";
import { AU_IN_METERS, type DilationInputs } from "./relativity.js";
import type { PinnedEdge } from "./layout.js";

export type LeafKind = "surface" | "orbit-log" | "rings" | "notes";
export type NodeKind =
  | "sun"
  | "planet"
  | "moon"
  | "belt"
  | "asteroid"
  | "comets"
  | "comet"
  | "starmap"
  | "star"
  | "exoplanet"
  | LeafKind;

export interface OrbitEntry {
  id: string;
  label: string;
  glyph: string;
  angleDeg: number;
  /** Arbitrary display-scale distance (AU for real bodies, ring index otherwise). */
  distance: number;
  /** See layout.ts's PinnedEdge — an entry that always sticks to a fixed edge of the grid instead of the normal distance/angle math. */
  pinnedEdge?: PinnedEdge;
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

export interface ExoplanetPosition {
  angleDeg: number;
  distanceAU: number;
}

// Bracket style signals category before you even read the letter inside:
// (x) terrestrial planet, =x= ringed gas/ice giant, .m. moon, {x} belt
// body, ~x~ comet-family body, » menu-style leaf (not a physical body).
const PLANET_META: Record<PlanetName, { label: string; glyph: string }> = {
  mercury: { label: "Mercury", glyph: "(.)" },
  venus: { label: "Venus", glyph: "(v)" },
  earth: { label: "Earth", glyph: "(O)" },
  mars: { label: "Mars", glyph: "(r)" },
  jupiter: { label: "Jupiter", glyph: "=J=" },
  saturn: { label: "Saturn", glyph: "=S=" },
  uranus: { label: "Uranus", glyph: "=U=" },
  neptune: { label: "Neptune", glyph: "=N=" },
};

const SUN_GLYPH = "(*)";
const MOON_GLYPH = ".m.";
const BELT_GLYPH = "{:}";
const ASTEROID_GLYPH = "{.}";
const COMETS_HUB_GLYPH = "~^~";
const COMET_GLYPH = "~'~";
const LEAF_GLYPH = "»";
const STARMAP_GLYPH = "{*}";
const EXOPLANET_GLYPH: Record<ExoplanetKind, string> = { rocky: "(e)", "gas-giant": "=g=" };

const SUN_AU_DOMAIN: DistanceDomain = { min: 0.38, max: 30.1 };
const LEAF_DOMAIN: DistanceDomain = { min: 1, max: 3 };
// Comets range from well under 1 AU to hundreds of AU; anything past this
// simply pins to the outer edge of the display (scaleDistance clamps).
const COMET_DISPLAY_DOMAIN: DistanceDomain = { min: 0.2, max: 40 };
// Sol sits at distance 0; PSR B1257+12 (2300 ly) sets the domain's max.
// Sagittarius A*'s real distance is 26,673 ly — deliberately NOT
// widening this domain to fit it: doing so was tried and reverted, since
// squeezing in one outlier 11x farther than the next-farthest curated
// star forced sqrt scaling (and auto-zoom right along with it, maxing
// out at 64x) to crowd all 16 other stars into unreadable overlap. Sgr
// A* instead just clamps to the same outer rim every other out-of-domain
// distance already does (scaleDistance's t is clamped to [0,1] — see
// layout.ts).
const STARMAP_DISPLAY_DOMAIN: DistanceDomain = { min: 0, max: 2300 };

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

export function getExoplanetPosition(exoplanetId: ExoplanetId, date: Date): ExoplanetPosition {
  const facts = EXOPLANET_FACTS[exoplanetId];
  return {
    angleDeg: meanMotionAngle(exoplanetId, date, facts.orbitalPeriodDays),
    distanceAU: facts.distanceAU,
  };
}

export function isKnownPlanet(id: string): id is PlanetName {
  return (PLANET_ORDER as readonly string[]).includes(id);
}

export function getCenterGlyph(nodeId: string): string {
  if (nodeId === "sun") return SUN_GLYPH;
  if (isKnownPlanet(nodeId)) return PLANET_META[nodeId].glyph;
  if (isMoonId(nodeId)) return MOON_GLYPH;
  if (nodeId === BELT_ID) return BELT_GLYPH;
  if (isAsteroidId(nodeId)) return ASTEROID_GLYPH;
  if (nodeId === COMETS_HUB_ID) return COMETS_HUB_GLYPH;
  if (isCometId(nodeId)) return COMET_GLYPH;
  if (nodeId === STARMAP_ID) return STARMAP_GLYPH;
  if (isStarId(nodeId) && nodeId !== "sun") return STAR_FACTS[nodeId].glyph;
  if (isExoplanetId(nodeId)) return EXOPLANET_GLYPH[EXOPLANET_FACTS[nodeId].kind];
  return LEAF_GLYPH;
}

function getOwnerLabel(ownerId: string): string {
  if (isKnownPlanet(ownerId)) return PLANET_META[ownerId].label;
  if (isMoonId(ownerId)) return MOON_FACTS[ownerId].label;
  if (ownerId === BELT_ID) return BELT_FACTS.label;
  if (isAsteroidId(ownerId)) return ASTEROID_FACTS[ownerId].label;
  if (ownerId === COMETS_HUB_ID) return COMETS_HUB_FACTS.label;
  if (isCometId(ownerId)) return COMET_FACTS[ownerId].label;
  if (ownerId === STARMAP_ID) return STARMAP_FACTS.label;
  if (isStarId(ownerId)) return ownerId === "sun" ? "Sun" : STAR_FACTS[ownerId].label;
  if (isExoplanetId(ownerId)) return EXOPLANET_FACTS[ownerId].label;
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
  if (nodeId === STARMAP_ID) return "starmap";
  if (isStarId(nodeId) && nodeId !== "sun") return "star";
  if (isExoplanetId(nodeId)) return "exoplanet";
  const leaf = parseLeafId(nodeId);
  return leaf ? leaf.kind : "planet";
}

const NO_DILATION_INPUTS: DilationInputs = {
  localGravity: null,
  localRadiusM: null,
  starGravity: null,
  starRadiusM: null,
  distanceFromStarM: null,
};

function radiusMFromDiameterKm(diameterKm: number): number {
  return (diameterKm * 1000) / 2;
}

/**
 * What a node needs for real gravitational time dilation
 * (relativity.ts's dilationFactor) — its own local surface gravity/radius
 * where known (a planet, or a star), plus its system star's gravity/
 * radius and the node's real distance from it. Leaves aren't physical
 * bodies, so they resolve through to their owner. See SPEC.md's Time
 * section.
 */
export function getDilationInputs(nodeId: string, date: Date): DilationInputs {
  const sunInputs = {
    starGravity: SUN_GRAVITY,
    starRadiusM: radiusMFromDiameterKm(SUN_DIAMETER_KM),
  };
  if (nodeId === "sun") {
    return {
      localGravity: SUN_GRAVITY,
      localRadiusM: radiusMFromDiameterKm(SUN_DIAMETER_KM),
      starGravity: null,
      starRadiusM: null,
      distanceFromStarM: null,
    };
  }
  if (isKnownPlanet(nodeId)) {
    const facts = PLANET_FACTS[nodeId];
    return {
      localGravity: facts.gravity,
      localRadiusM: radiusMFromDiameterKm(facts.diameterKm),
      ...sunInputs,
      distanceFromStarM: getPlanetPosition(nodeId, date).distanceAU * AU_IN_METERS,
    };
  }
  if (isMoonId(nodeId)) {
    const parent = MOON_FACTS[nodeId].parent;
    return {
      localGravity: null,
      localRadiusM: null,
      ...sunInputs,
      distanceFromStarM: getPlanetPosition(parent, date).distanceAU * AU_IN_METERS,
    };
  }
  if (nodeId === BELT_ID) {
    return { localGravity: null, localRadiusM: null, ...sunInputs, distanceFromStarM: BELT_FACTS.displayDistanceAU * AU_IN_METERS };
  }
  if (isAsteroidId(nodeId)) {
    return {
      localGravity: null,
      localRadiusM: null,
      ...sunInputs,
      distanceFromStarM: ASTEROID_FACTS[nodeId].distanceAU * AU_IN_METERS,
    };
  }
  if (nodeId === COMETS_HUB_ID) {
    return {
      localGravity: null,
      localRadiusM: null,
      ...sunInputs,
      distanceFromStarM: COMETS_HUB_FACTS.displayDistanceAU * AU_IN_METERS,
    };
  }
  if (isCometId(nodeId)) {
    return {
      localGravity: null,
      localRadiusM: null,
      ...sunInputs,
      distanceFromStarM: getCometPosition(nodeId, date).distanceAU * AU_IN_METERS,
    };
  }
  if (nodeId === STARMAP_ID) return NO_DILATION_INPUTS;
  if (isStarId(nodeId) && nodeId !== "sun") {
    const facts = STAR_FACTS[nodeId];
    return {
      localGravity: facts.gravity,
      localRadiusM: radiusMFromDiameterKm(facts.diameterKm),
      starGravity: null,
      starRadiusM: null,
      distanceFromStarM: null,
    };
  }
  if (isExoplanetId(nodeId)) {
    const facts = EXOPLANET_FACTS[nodeId];
    const starFacts = STAR_FACTS[facts.starId];
    return {
      localGravity: null,
      localRadiusM: null,
      starGravity: starFacts.gravity,
      starRadiusM: radiusMFromDiameterKm(starFacts.diameterKm),
      distanceFromStarM: facts.distanceAU * AU_IN_METERS,
    };
  }
  const leaf = parseLeafId(nodeId);
  if (leaf) return getDilationInputs(leaf.owner, date);
  return NO_DILATION_INPUTS;
}

export function getCenterLabel(nodeId: string): string {
  if (nodeId === "sun") return "Sun";
  if (isKnownPlanet(nodeId)) return PLANET_META[nodeId].label;
  if (isMoonId(nodeId)) return `${PLANET_META[MOON_FACTS[nodeId].parent].label} — ${MOON_FACTS[nodeId].label}`;
  if (nodeId === BELT_ID) return BELT_FACTS.label;
  if (isAsteroidId(nodeId)) return `${BELT_FACTS.label} — ${ASTEROID_FACTS[nodeId].label}`;
  if (nodeId === COMETS_HUB_ID) return COMETS_HUB_FACTS.label;
  if (isCometId(nodeId)) return `${COMETS_HUB_FACTS.label} — ${COMET_FACTS[nodeId].label}`;
  if (nodeId === STARMAP_ID) return STARMAP_FACTS.label;
  if (isStarId(nodeId) && nodeId !== "sun") return `${STARMAP_FACTS.label} — ${STAR_FACTS[nodeId].label}`;
  if (isExoplanetId(nodeId)) {
    const facts = EXOPLANET_FACTS[nodeId];
    return `${STAR_FACTS[facts.starId].label} — ${facts.label}`;
  }
  const leaf = parseLeafId(nodeId);
  if (leaf) return `${getOwnerLabel(leaf.owner)} — ${getBreadcrumbLabel(nodeId)}`;
  return nodeId;
}

/** Short label for breadcrumb trails, where the parent is already shown. */
export function getBreadcrumbLabel(nodeId: string): string {
  if (isMoonId(nodeId)) return MOON_FACTS[nodeId].label;
  if (isAsteroidId(nodeId)) return ASTEROID_FACTS[nodeId].label;
  if (isCometId(nodeId)) return COMET_FACTS[nodeId].label;
  if (isStarId(nodeId) && nodeId !== "sun") return STAR_FACTS[nodeId].label;
  if (isExoplanetId(nodeId)) return EXOPLANET_FACTS[nodeId].label;
  const leaf = parseLeafId(nodeId);
  if (leaf) return LEAF_LABELS[leaf.kind];
  return getCenterLabel(nodeId);
}

function applicableLeafKinds(ownerId: string): LeafKind[] {
  if (ownerId === BELT_ID || ownerId === COMETS_HUB_ID || ownerId === STARMAP_ID) return ["surface", "notes"];
  if (isKnownPlanet(ownerId)) {
    return hasRings(ownerId) ? ["surface", "orbit-log", "rings", "notes"] : ["surface", "orbit-log", "notes"];
  }
  if (isStarId(ownerId) && ownerId !== "sun") return ["surface", "notes"];
  // moons, asteroids, comets, and exoplanets
  return ["surface", "orbit-log", "notes"];
}

/**
 * The star you're centered on (Sol included) appears among its own orbit
 * children — using its own actual glyph and name, not a separate icon —
 * so it's a real, selectable object: travel "through the star" back to
 * the star map is something you aim at and Enter, just like any planet
 * or moon, not a special Escape-only shortcut. Distance 0 places it
 * exactly at the grid's center, taking over the spot the fixed,
 * unselectable center marker occupies in every other kind of view.
 */
function starSelfEntry(starId: string): OrbitEntry {
  return {
    id: STARMAP_ID,
    label: getBreadcrumbLabel(starId),
    glyph: getCenterGlyph(starId),
    angleDeg: 0,
    distance: 0,
  };
}

function leafChildren(ownerId: string): OrbitEntry[] {
  const kinds = applicableLeafKinds(ownerId);
  return kinds.map((kind, index) => ({
    id: `${ownerId}:${kind}`,
    label: LEAF_LABELS[kind],
    glyph: LEAF_GLYPH,
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
  if (nodeId === STARMAP_ID) return STARMAP_DISPLAY_DOMAIN;
  if (isStarId(nodeId) && nodeId !== "sun") {
    const distances = getExoplanetsOfStar(nodeId).map((id) => EXOPLANET_FACTS[id].distanceAU);
    if (distances.length === 0) return LEAF_DOMAIN;
    const min = Math.min(...distances);
    const max = Math.max(...distances);
    // A single-planet system would otherwise give scaleDistance a
    // zero-width domain (min === max), dividing by zero.
    return min === max ? { min: min * 0.5, max: max * 1.5 } : { min, max };
  }
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
      glyph: BELT_GLYPH,
      angleDeg: BELT_FACTS.displayAngleDeg,
      distance: BELT_FACTS.displayDistanceAU,
    };
    const cometsHubEntry: OrbitEntry = {
      id: COMETS_HUB_ID,
      label: COMETS_HUB_FACTS.label,
      glyph: COMETS_HUB_GLYPH,
      angleDeg: COMETS_HUB_FACTS.displayAngleDeg,
      distance: COMETS_HUB_FACTS.displayDistanceAU,
    };
    return [...planetEntries, beltEntry, cometsHubEntry, starSelfEntry(nodeId)];
  }

  if (isKnownPlanet(nodeId)) {
    const leaves = leafChildren(nodeId);
    const moonEntries: OrbitEntry[] = getMoonsOf(nodeId).map((moonId, index) => {
      const facts = MOON_FACTS[moonId];
      return {
        id: moonId,
        label: facts.label,
        glyph: MOON_GLYPH,
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
        glyph: ASTEROID_GLYPH,
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
        glyph: COMET_GLYPH,
        angleDeg: position.angleDeg,
        distance: position.distanceAU,
      };
    });
    return [...leaves, ...cometEntries];
  }

  if (nodeId === STARMAP_ID) {
    const leaves = leafChildren(nodeId);
    // Sol sits at its usual near-center "home" spot (see the distance
    // comment below) — Sagittarius A* previously took over the exact
    // center, then moved to a rim angle, both reverted; see its own entry
    // below for where it landed for good.
    const solEntry: OrbitEntry = {
      id: "sun",
      label: "Sun",
      glyph: SUN_GLYPH,
      angleDeg: 0,
      // Genuinely 0 ly from itself, but distance 0 is reserved to mean
      // "exact grid center" (see computeGridPositions) — the star map's
      // own center marker already occupies that spot, so this uses a
      // negligible nonzero value to land just next to it instead.
      distance: 0.01,
    };
    const starEntries: OrbitEntry[] = STAR_ORDER.map((starId) => {
      const facts = STAR_FACTS[starId];
      return {
        id: starId,
        label: facts.label,
        glyph: facts.glyph,
        angleDeg: facts.displayAngleDeg,
        distance: facts.distanceLy,
        // Sagittarius A* alone: pinned to the grid's literal left edge
        // (layout.ts's pinnedEdge, not the normal distance/angle math),
        // per "should always be on the very edge of the screen" — unlike
        // an ordinary out-of-domain clamp-to-rim, this can't drift inward
        // from zoom, domain changes, or icon-crowding nudges, and reads
        // as touching the NAVIGATION tile's own border rather than just
        // sitting near it.
        pinnedEdge: starId === "sagittarius-a-star" ? "left" : undefined,
      };
    });
    return [...leaves, solEntry, ...starEntries];
  }

  if (isStarId(nodeId) && nodeId !== "sun") {
    const leaves = leafChildren(nodeId);
    const exoplanetEntries: OrbitEntry[] = getExoplanetsOfStar(nodeId).map((exoplanetId) => {
      const facts = EXOPLANET_FACTS[exoplanetId];
      const position = getExoplanetPosition(exoplanetId, date);
      return {
        id: exoplanetId,
        label: facts.label,
        glyph: EXOPLANET_GLYPH[facts.kind],
        angleDeg: position.angleDeg,
        distance: position.distanceAU,
      };
    });
    return [...leaves, ...exoplanetEntries, starSelfEntry(nodeId)];
  }

  if (isMoonId(nodeId) || isAsteroidId(nodeId) || isCometId(nodeId) || isExoplanetId(nodeId)) return leafChildren(nodeId);

  return [];
}

/** Unit suffix for the bottom panel's focused-body distance readout. */
export function getDistanceUnitLabel(nodeId: string): string {
  if (nodeId === STARMAP_ID) return " ly";
  if (nodeId === "sun" || (isStarId(nodeId) && nodeId !== "sun")) return " AU";
  return "";
}

const CATEGORY_LABELS: Record<NodeKind, string> = {
  sun: "STAR",
  planet: "PLANET",
  moon: "MOON",
  belt: "BELT",
  asteroid: "ASTEROID",
  comets: "COMETS",
  comet: "COMET",
  starmap: "STAR MAP",
  star: "STAR",
  exoplanet: "EXOPLANET",
  surface: "SURFACE",
  "orbit-log": "ORBIT LOG",
  rings: "RINGS",
  notes: "NOTES",
};

/**
 * All-caps "what this is" prefix for the bottom panel's focused-entry
 * readout — e.g. "PLANET - Earth". A star's own selectable self-entry
 * (see starSelfEntry) keeps id STARMAP_ID for App.tsx's back-navigation
 * handling, but it represents the star you're standing on, not the star
 * map itself, so it's special-cased ahead of the generic kind lookup.
 */
export function getCategoryLabel(nodeId: string): string {
  if (nodeId === STARMAP_ID) return "STAR";
  return CATEGORY_LABELS[getNodeKind(nodeId)];
}

/**
 * True when traveling between fromId and toId crosses the boundary
 * between the star map and "inside a solar system" — i.e. one side is
 * the star map and the other is a star (Sol included). This is the
 * "diving through a star" transition; every other move stays instant.
 */
export function isStarBoundary(fromId: string, toId: string): boolean {
  return (fromId === STARMAP_ID && isStarId(toId)) || (isStarId(fromId) && toId === STARMAP_ID);
}

/** Real distance from the Sun, in light-years — 0 for Sol itself. Drives how long a SOLAR BASE JUMP's travel phase takes. */
export function getStarDistanceLy(starId: string): number {
  if (starId === "sun") return 0;
  if (isStarId(starId) && starId !== "sun") return STAR_FACTS[starId].distanceLy;
  return 0;
}
