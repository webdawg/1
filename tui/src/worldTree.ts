/**
 * The recursive "center + orbiting things" world model. Whatever node you're
 * centered on, this returns what orbits it. Today the only node with real
 * orbital data is the Sun (whose children are the planets, positioned via
 * ../orbital.ts); every other node gets a small ring of placeholder objects
 * so the same interface pattern already works recursively. Later, a node's
 * children can come from a server instead of being computed locally, without
 * changing anything above this module.
 */
import { getPlanetPositions, PLANET_ORDER, type PlanetName } from "./orbital.js";

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
const PLACEHOLDER_DOMAIN: DistanceDomain = { min: 1, max: 3 };

// Generic objects shown around any node that isn't the Sun. These are
// stand-ins for future real content (bots, data, actions, messages, ...).
const PLACEHOLDER_CHILDREN = ["Surface", "Orbit Log", "Notes"];

export function isKnownPlanet(id: string): id is PlanetName {
  return (PLANET_ORDER as readonly string[]).includes(id);
}

export function getCenterLabel(nodeId: string): string {
  if (nodeId === "sun") return "Sun";
  if (isKnownPlanet(nodeId)) return PLANET_META[nodeId].label;
  return nodeId;
}

export function getDistanceDomain(nodeId: string): DistanceDomain {
  return nodeId === "sun" ? SUN_AU_DOMAIN : PLACEHOLDER_DOMAIN;
}

/** Slow, deterministic rotation so placeholder rings still feel alive. */
function placeholderAngle(seed: number, date: Date, index: number, count: number): number {
  const baseSpacing = (360 / count) * index;
  const minutesSinceEpoch = date.getTime() / 60000;
  const drift = ((seed + minutesSinceEpoch) * 0.5) % 360;
  return (baseSpacing + drift) % 360;
}

function seedFromId(id: string): number {
  let h = 0;
  for (let idx = 0; idx < id.length; idx++) h = (h * 31 + id.charCodeAt(idx)) % 360;
  return h;
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

  const seed = seedFromId(nodeId);
  return PLACEHOLDER_CHILDREN.map((label, index) => ({
    id: `${nodeId}:${label.toLowerCase().replace(/\s+/g, "-")}`,
    label,
    glyph: "·",
    angleDeg: placeholderAngle(seed, date, index, PLACEHOLDER_CHILDREN.length),
    distance: index + 1,
  }));
}
