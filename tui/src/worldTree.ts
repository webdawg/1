/**
 * The recursive "center + orbiting things" world model. Whatever node you're
 * centered on, this returns what orbits it. The Sun's children are the
 * planets, positioned via ../orbital.ts. Each planet's children are its
 * major moons (positioned by simple mean motion — a circular approximation,
 * not full ephemeris) plus three fixed leaves (Surface, Orbit Log, Notes)
 * with real content rendered by ContentView. A moon has the same three
 * leaves as its own children. Later, a node's children can come from a
 * server instead of being computed locally, without changing anything above
 * this module.
 */
import { daysSinceJ2000, getPlanetPositions, PLANET_ORDER, type PlanetName } from "./orbital.js";
import { getMoonsOf, isMoonId, MOON_FACTS, type MoonId } from "./moonFacts.js";
import { hasRings } from "./ringFacts.js";

export type LeafKind = "surface" | "orbit-log" | "rings" | "notes";
export type NodeKind = "sun" | "planet" | "moon" | LeafKind;

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

// Every planet/moon has these leaves; ContentView renders real data for each,
// keyed by this suffix. "rings" is filtered out per-owner in leafChildren
// below, since only some planets have a ring system.
const LEAVES: Array<{ suffix: LeafKind; label: string }> = [
  { suffix: "surface", label: "Surface" },
  { suffix: "orbit-log", label: "Orbit Log" },
  { suffix: "rings", label: "Rings" },
  { suffix: "notes", label: "Notes" },
];

function seedFromId(id: string): number {
  let h = 0;
  for (let idx = 0; idx < id.length; idx++) h = (h * 31 + id.charCodeAt(idx)) % 360;
  return h;
}

/** Circular-orbit approximation: mean motion from a per-moon phase offset. */
function moonAngle(moonId: MoonId, date: Date, periodDays: number): number {
  const phase = seedFromId(moonId);
  const raw = (daysSinceJ2000(date) / periodDays) * 360 + phase;
  return ((raw % 360) + 360) % 360;
}

export function getMoonPosition(moonId: MoonId, date: Date): MoonPosition {
  const facts = MOON_FACTS[moonId];
  return {
    angleDeg: moonAngle(moonId, date, facts.orbitalPeriodDays),
    distanceKm: facts.distanceFromPlanetKm,
  };
}

export function isKnownPlanet(id: string): id is PlanetName {
  return (PLANET_ORDER as readonly string[]).includes(id);
}

function getOwnerLabel(ownerId: string): string {
  if (isKnownPlanet(ownerId)) return PLANET_META[ownerId].label;
  if (isMoonId(ownerId)) return MOON_FACTS[ownerId].label;
  return ownerId;
}

/** Splits a leaf id like "earth:orbit-log" into its owner (planet or moon) and kind. */
export function parseLeafId(id: string): { owner: string; kind: LeafKind } | null {
  const sep = id.lastIndexOf(":");
  if (sep === -1) return null;
  const owner = id.slice(0, sep);
  const suffix = id.slice(sep + 1);
  const leaf = LEAVES.find((l) => l.suffix === suffix);
  return leaf ? { owner, kind: leaf.suffix } : null;
}

export function getNodeKind(nodeId: string): NodeKind {
  if (nodeId === "sun") return "sun";
  if (isKnownPlanet(nodeId)) return "planet";
  if (isMoonId(nodeId)) return "moon";
  const leaf = parseLeafId(nodeId);
  return leaf ? leaf.kind : "planet";
}

export function getCenterLabel(nodeId: string): string {
  if (nodeId === "sun") return "Sun";
  if (isKnownPlanet(nodeId)) return PLANET_META[nodeId].label;
  if (isMoonId(nodeId)) return `${PLANET_META[MOON_FACTS[nodeId].parent].label} — ${MOON_FACTS[nodeId].label}`;
  const leaf = parseLeafId(nodeId);
  if (leaf) return `${getOwnerLabel(leaf.owner)} — ${getBreadcrumbLabel(nodeId)}`;
  return nodeId;
}

/** Short label for breadcrumb trails, where the parent is already shown. */
export function getBreadcrumbLabel(nodeId: string): string {
  if (isMoonId(nodeId)) return MOON_FACTS[nodeId].label;
  const leaf = parseLeafId(nodeId);
  if (leaf) return LEAVES.find((l) => l.suffix === leaf.kind)?.label ?? leaf.kind;
  return getCenterLabel(nodeId);
}

export function getDistanceDomain(nodeId: string): DistanceDomain {
  if (nodeId === "sun") return SUN_AU_DOMAIN;
  if (isKnownPlanet(nodeId)) {
    return { min: 1, max: leafChildren(nodeId).length + getMoonsOf(nodeId).length };
  }
  return LEAF_DOMAIN;
}

function leafChildren(ownerId: string): OrbitEntry[] {
  const applicable = LEAVES.filter(
    (leaf) => leaf.suffix !== "rings" || (isKnownPlanet(ownerId) && hasRings(ownerId))
  );
  return applicable.map((leaf, index) => ({
    id: `${ownerId}:${leaf.suffix}`,
    label: leaf.label,
    glyph: "·",
    angleDeg: (360 / applicable.length) * index,
    distance: index + 1,
  }));
}

export function getOrbitChildren(nodeId: string, date: Date): OrbitEntry[] {
  if (nodeId === "sun") {
    return getPlanetPositions(date).map((p) => ({
      id: p.name,
      label: PLANET_META[p.name].label,
      glyph: PLANET_META[p.name].glyph,
      angleDeg: p.angleDeg,
      distance: p.distanceAU,
    }));
  }

  if (isKnownPlanet(nodeId)) {
    const leaves = leafChildren(nodeId);
    const moonEntries: OrbitEntry[] = getMoonsOf(nodeId).map((moonId, index) => {
      const facts = MOON_FACTS[moonId];
      return {
        id: moonId,
        label: facts.label,
        glyph: "o",
        angleDeg: moonAngle(moonId, date, facts.orbitalPeriodDays),
        distance: leaves.length + 1 + index,
      };
    });
    return [...leaves, ...moonEntries];
  }

  if (isMoonId(nodeId)) return leafChildren(nodeId);

  return [];
}
