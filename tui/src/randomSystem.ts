/**
 * The one deliberately fictional corner of this engine. Everywhere else —
 * planets, moons, real nearby stars, curated exoplanets, Sagittarius A*
 * itself — is real, curated data; a Sagittarius A* crossing instead
 * generates a brand-new, wholly made-up star system every single trip
 * ("fresh every time" was an explicit choice over a stable, revisitable
 * destination — see SPEC.md's Random landing section), landing you
 * directly on whichever planet hosts the system's one civilization, with
 * the rest of the system explorable from there. Pure functions, no React
 * or session state, and deliberately not persisted anywhere: nothing
 * generated here is meant to look like real astronomy, or to still exist
 * the next time you go through.
 */

const STAR_PREFIXES = ["Xar", "Vel", "Qui", "Zor", "Nyx", "Kael", "Thra", "Ilo", "Ostra", "Vashti", "Corr", "Umbral", "Sere", "Tesh"];
const STAR_SUFFIXES = ["Prime", "Ascendant", "Reach", "Expanse", "Hollow", "Verge", "Drift", "Anomaly"];

const PLANET_PREFIXES = ["Vor", "Ilyra", "Duun", "Thessa", "Orin", "Kethra", "Solum", "Nael", "Bryx", "Amareth"];
const PLANET_SUFFIXES = ["", "-9", " Minor", " Prime", "'s Rest", " Terminus", "-Delta"];

const CIVILIZATION_ADJECTIVES = ["Sylvan", "Ember", "Glass", "Hollow", "Tidal", "Crystalline", "Nomad", "Quiet", "Ashen", "Verdant"];
const CIVILIZATION_NOUNS = ["Concord", "Dominion", "Weave", "Compact", "Choir", "Assembly", "Continuum", "Kinship", "Order"];

const CIVILIZATION_TRAITS = [
  "who speak in overlapping harmonics rather than words",
  "who have not built a single wheel, preferring flight",
  "who measure time by the growth rings of their cities",
  "who abandoned written language for shared memory",
  "who terraform with sound instead of machinery",
  "who have never fought a war among themselves",
  "whose architecture grows rather than being built",
  "who see in wavelengths no human eye has a name for",
  "who trade in memories instead of currency",
  "who have not yet noticed they are being visited",
];

// Flavor text for every planet in the system except the one the
// civilization calls home — no fabricated stats to go with these
// (diameter, gravity, ...), unlike every real body in this codebase;
// making up pseudo-scientific numbers for fictional worlds would blur
// the line this engine otherwise draws carefully between real and not.
const UNINHABITED_DESCRIPTIONS = [
  "A frozen, silent world, its surface unbroken by any structure.",
  "Storms circle this planet without end, visible from orbit as a single vast eye.",
  "Its surface glitters faintly — no one has yet identified why.",
  "A dense, crushing atmosphere hides whatever lies beneath it.",
  "Nothing moves here. Nothing ever has.",
  "Rings of debris orbit low, remnants of something that broke apart long ago.",
  "A world of glass-smooth stone, cracked into a million dark fissures.",
  "Its oceans are the wrong color for water, and no one has explained that either.",
];

// Bracket style deliberately doesn't reuse (x) (real terrestrial
// planets) or =x= (real gas/ice giants) — these are fictional, not
// curated, and shouldn't visually read as either. (C) marks the
// civilization's home specifically, distinct from the plain variants.
const PLANET_GLYPHS = ["(o)", "(0)", "(@)", "(#)"];
const CIVILIZATION_GLYPH = "(C)";

/** One generated planet within a RandomSystem — shaped closely enough like worldTree.ts's OrbitEntry that App.tsx can build a synthetic entry from it directly. */
export interface RandomPlanet {
  id: string;
  name: string;
  glyph: string;
  /** Arbitrary display-scale distance, same unit family as real planets' AU. */
  distance: number;
  angleDeg: number;
  /** Non-null only on the one planet the civilization calls home. */
  civilizationName: string | null;
  description: string;
}

/** One fresh roll of generateRandomSystem() — a star name (flavor only) plus every generated planet, with civilizationPlanetId marking which one to land on first. */
export interface RandomSystem {
  starName: string;
  planets: RandomPlanet[];
  civilizationPlanetId: string;
}

/** Picks one random element from a non-empty array. */
function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

const MIN_PLANETS = 3;
const MAX_PLANETS = 6;

/** A fresh, wholly fictional star system — call once per Sagittarius A* arrival, never cached or persisted. */
export function generateRandomSystem(): RandomSystem {
  const starName = `${pick(STAR_PREFIXES)} ${pick(STAR_SUFFIXES)}`;
  const planetCount = MIN_PLANETS + Math.floor(Math.random() * (MAX_PLANETS - MIN_PLANETS + 1));
  const civilizationIndex = Math.floor(Math.random() * planetCount);
  const civilizationName = `The ${pick(CIVILIZATION_ADJECTIVES)} ${pick(CIVILIZATION_NOUNS)}`;

  const planets: RandomPlanet[] = [];
  for (let i = 0; i < planetCount; i++) {
    const isCivilizationHome = i === civilizationIndex;
    // Evenly spaced with a little jitter, same spirit as the real star
    // map's hand-placed angles — keeps a handful of planets readable
    // rather than clustering by chance.
    const angleDeg = (360 / planetCount) * i + (Math.random() * 20 - 10);
    const distance = i + 1 + Math.random() * 0.4;
    planets.push({
      id: `sgr-a-planet-${i}`,
      name: `${pick(PLANET_PREFIXES)}${pick(PLANET_SUFFIXES)}`,
      glyph: isCivilizationHome ? CIVILIZATION_GLYPH : pick(PLANET_GLYPHS),
      distance,
      angleDeg,
      civilizationName: isCivilizationHome ? civilizationName : null,
      description: isCivilizationHome
        ? `${civilizationName}, a civilization ${pick(CIVILIZATION_TRAITS)}.`
        : pick(UNINHABITED_DESCRIPTIONS),
    });
  }

  return { starName, planets, civilizationPlanetId: planets[civilizationIndex].id };
}

/*
 * ============================================================================
 * COLD EXPLAINER — randomSystem.ts
 * ============================================================================
 * Written for a reader who has opened only this file, per CODEBOT.md's
 * cold-open convention. Keep this current when the file's behavior changes.
 *
 * WHAT THIS FILE IS
 * The one deliberately fictional data source in the codebase — see the
 * module comment at the top for the full framing. Everywhere else in
 * this project (planetFacts.ts, starFacts.ts, ...) is real, cited data;
 * this file mad-libs a brand-new star system from small curated word
 * banks, on every single call, with zero persistence and zero attempt to
 * look astronomically real.
 *
 * WHAT IT GENERATES
 * generateRandomSystem() returns a RandomSystem: a flavor-only star name,
 * 3-6 RandomPlanets (MIN_PLANETS/MAX_PLANETS) spread evenly around the
 * circle with a little angular jitter (same spirit as the real star
 * map's hand-placed angles), and exactly one of those planets flagged as
 * home to a randomly-named civilization (adjective + noun, plus one of
 * ten curated trait lines). Every other planet gets a plain flavor
 * description from a separate pool — deliberately no fabricated stats
 * (diameter, gravity, ...) to go with any of them, since inventing
 * pseudo-scientific numbers for fictional worlds would blur the line
 * this engine otherwise draws carefully between real and not-real data.
 *
 * WHO CONSUMES THIS
 * App.tsx calls generateRandomSystem() exactly once per Sagittarius A*
 * arrival (in completeTransition), stores the result in React state
 * (never session.ts — this is explicitly not persisted), and constructs
 * synthetic OrbitEntry objects from each RandomPlanet so the generated
 * system can be rendered and navigated through the same SolarView/
 * spatialNav machinery every real body uses. RandomPlanetCard.tsx renders
 * an individual planet's card (with a one-time landing animation for the
 * civilization's home world specifically).
 * ============================================================================
 */
