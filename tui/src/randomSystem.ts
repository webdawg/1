/**
 * The one deliberately fictional corner of this engine. Everywhere else —
 * planets, moons, real nearby stars, curated exoplanets, Sagittarius A*
 * itself — is real, curated data; a Sagittarius A* crossing instead
 * generates a brand-new, wholly made-up star/planet/civilization every
 * single trip ("fresh every time" was an explicit choice over a stable,
 * revisitable destination — see SPEC.md's Random landing section). Pure
 * functions, no React or session state, and deliberately not persisted
 * anywhere: nothing generated here is meant to look like real astronomy,
 * or to still exist the next time you go through.
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

export interface RandomLanding {
  starName: string;
  planetName: string;
  civilizationName: string;
  description: string;
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** A fresh, wholly fictional star/planet/civilization — call once per Sagittarius A* arrival, never cached or persisted. */
export function generateRandomLanding(): RandomLanding {
  const starName = `${pick(STAR_PREFIXES)} ${pick(STAR_SUFFIXES)}`;
  const planetName = `${pick(PLANET_PREFIXES)}${pick(PLANET_SUFFIXES)}`;
  const civilizationName = `The ${pick(CIVILIZATION_ADJECTIVES)} ${pick(CIVILIZATION_NOUNS)}`;
  const description = `${civilizationName}, a civilization ${pick(CIVILIZATION_TRAITS)}.`;
  return { starName, planetName, civilizationName, description };
}
