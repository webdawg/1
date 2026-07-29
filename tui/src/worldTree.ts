/**
 * The recursive "center + orbiting things" world model. Whatever node you're
 * centered on, this returns what orbits it. The Sun's children are the
 * planets, positioned via ../orbital.ts. Each planet's children are three
 * fixed leaves (Surface, Orbit Log, Notes) with real content rendered by
 * ContentView; they don't orbit anything themselves. Later, a node's
 * children can come from a server instead of being computed locally, without
 * changing anything above this module.
 */
import { getPlanetPositions, PLANET_ORDER, type PlanetName } from "./orbital.js";

export type LeafKind = "surface" | "orbit-log" | "notes";
export type NodeKind = "sun" | "planet" | LeafKind;

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

// Every planet has the same three leaves; ContentView renders real data for
// each, keyed by this suffix.
const LEAVES: Array<{ suffix: LeafKind; label: string }> = [
  { suffix: "surface", label: "Surface" },
  { suffix: "orbit-log", label: "Orbit Log" },
  { suffix: "notes", label: "Notes" },
];

export function isKnownPlanet(id: string): id is PlanetName {
  return (PLANET_ORDER as readonly string[]).includes(id);
}

/** Splits a leaf id like "earth:orbit-log" into its parent planet and kind. */
export function parseLeafId(id: string): { planet: PlanetName; kind: LeafKind } | null {
  const [planet, suffix] = id.split(":");
  if (!planet || !suffix || !isKnownPlanet(planet)) return null;
  const leaf = LEAVES.find((l) => l.suffix === suffix);
  return leaf ? { planet, kind: leaf.suffix } : null;
}

export function getNodeKind(nodeId: string): NodeKind {
  if (nodeId === "sun") return "sun";
  if (isKnownPlanet(nodeId)) return "planet";
  const leaf = parseLeafId(nodeId);
  return leaf ? leaf.kind : "planet";
}

export function getCenterLabel(nodeId: string): string {
  if (nodeId === "sun") return "Sun";
  if (isKnownPlanet(nodeId)) return PLANET_META[nodeId].label;
  const leaf = parseLeafId(nodeId);
  if (leaf) return `${PLANET_META[leaf.planet].label} — ${getBreadcrumbLabel(nodeId)}`;
  return nodeId;
}

/** Short label for breadcrumb trails, where the parent planet is already shown. */
export function getBreadcrumbLabel(nodeId: string): string {
  const leaf = parseLeafId(nodeId);
  if (leaf) return LEAVES.find((l) => l.suffix === leaf.kind)?.label ?? leaf.kind;
  return getCenterLabel(nodeId);
}

export function getDistanceDomain(nodeId: string): DistanceDomain {
  return nodeId === "sun" ? SUN_AU_DOMAIN : LEAF_DOMAIN;
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

  if (!isKnownPlanet(nodeId)) return [];

  return LEAVES.map((leaf, index) => ({
    id: `${nodeId}:${leaf.suffix}`,
    label: leaf.label,
    glyph: "·",
    angleDeg: (360 / LEAVES.length) * index,
    distance: index + 1,
  }));
}
