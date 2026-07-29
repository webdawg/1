import { solveEccentricAnomaly, rev } from "./orbital.js";

export const COMETS_HUB_ID = "comets";

export const COMETS_HUB_FACTS = {
  label: "Comets",
  description:
    "Icy leftovers from the solar system's formation, on long and highly eccentric orbits that swing from near the Sun out past the planets.",
  originNote: "Most come from one of two reservoirs: the Kuiper Belt beyond Neptune, or the far more distant Oort Cloud.",
  // A single fixed point stands in for this whole category, the same way
  // the asteroid belt does — it isn't one real position.
  displayAngleDeg: 200,
  displayDistanceAU: 20,
} as const;

export interface CometFacts {
  label: string;
  description: string;
  nucleusDiameterKm: number;
  perihelionAU: number;
  aphelionAU: number;
  orbitalPeriodYears: number;
  /** True for long-period comets whose orbit is easily perturbed and only roughly known. */
  periodUncertain?: boolean;
  /** ISO date of the most recent perihelion passage. */
  lastPerihelion: string;
}

export const COMET_ORDER = ["halley", "encke", "hale-bopp", "hyakutake"] as const;

export type CometId = (typeof COMET_ORDER)[number];

export const COMET_FACTS: Record<CometId, CometFacts> = {
  halley: {
    label: "Halley",
    description:
      "The most famous comet, visible to the naked eye roughly every 76 years — last seen in 1986, due back in 2061.",
    nucleusDiameterKm: 11,
    perihelionAU: 0.586,
    aphelionAU: 35.1,
    orbitalPeriodYears: 76,
    lastPerihelion: "1986-02-09",
  },
  encke: {
    label: "Encke",
    description: "The comet with the shortest known orbital period of any regularly observed comet.",
    nucleusDiameterKm: 4.8,
    perihelionAU: 0.336,
    aphelionAU: 4.09,
    orbitalPeriodYears: 3.3,
    lastPerihelion: "2023-10-22",
  },
  "hale-bopp": {
    label: "Hale-Bopp",
    description: "One of the brightest comets of the 20th century, visible to the naked eye for a record 18 months.",
    nucleusDiameterKm: 60,
    perihelionAU: 0.914,
    aphelionAU: 370,
    orbitalPeriodYears: 2533,
    periodUncertain: true,
    lastPerihelion: "1997-04-01",
  },
  hyakutake: {
    label: "Hyakutake",
    description: "Passed unusually close to Earth in 1996 and grew one of the longest tails ever recorded.",
    nucleusDiameterKm: 4.8,
    perihelionAU: 0.23,
    aphelionAU: 3400,
    orbitalPeriodYears: 70000,
    periodUncertain: true,
    lastPerihelion: "1996-05-01",
  },
};

export function isCometId(id: string): id is CometId {
  return (COMET_ORDER as readonly string[]).includes(id);
}

export interface CometPosition {
  distanceAU: number;
  /** Angle from this comet's own perihelion direction — not a sky-referenced longitude like the planets use. */
  angleDeg: number;
}

export function getCometPosition(cometId: CometId, date: Date): CometPosition {
  const facts = COMET_FACTS[cometId];
  const a = (facts.perihelionAU + facts.aphelionAU) / 2;
  const e = (facts.aphelionAU - facts.perihelionAU) / (facts.aphelionAU + facts.perihelionAU);
  const periodDays = facts.orbitalPeriodYears * 365.25;
  const perihelionMs = Date.parse(`${facts.lastPerihelion}T00:00:00Z`);
  const daysSincePerihelion = (date.getTime() - perihelionMs) / 86400000;
  const meanAnomalyDeg = (daysSincePerihelion / periodDays) * 360;

  // Very eccentric orbits need more Newton iterations to converge.
  const E = solveEccentricAnomaly(meanAnomalyDeg, e, 100);
  const xv = a * (Math.cos(E) - e);
  const yv = a * Math.sqrt(1 - e * e) * Math.sin(E);

  return {
    distanceAU: Math.sqrt(xv * xv + yv * yv),
    angleDeg: rev((Math.atan2(yv, xv) * 180) / Math.PI),
  };
}
