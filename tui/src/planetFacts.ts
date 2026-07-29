import type { PlanetName } from "./orbital.js";

export interface PlanetFacts {
  description: string;
  diameterKm: number;
  gravity: number;
  /** Length of one solar day, in Earth hours. */
  dayLengthHours: number;
  /** Length of one orbit, in Earth days. */
  orbitalPeriodDays: number;
  moons: number;
  meanTempC: number;
}

export const PLANET_FACTS: Record<PlanetName, PlanetFacts> = {
  mercury: {
    description: "The smallest planet, and the closest to the Sun.",
    diameterKm: 4879,
    gravity: 3.7,
    dayLengthHours: 4222.6,
    orbitalPeriodDays: 88,
    moons: 0,
    meanTempC: 167,
  },
  venus: {
    description: "Similar in size to Earth, but with a crushing, scorching atmosphere.",
    diameterKm: 12104,
    gravity: 8.87,
    dayLengthHours: 2802,
    orbitalPeriodDays: 224.7,
    moons: 0,
    meanTempC: 464,
  },
  earth: {
    description: "The only known planet with life.",
    diameterKm: 12742,
    gravity: 9.81,
    dayLengthHours: 24,
    orbitalPeriodDays: 365.25,
    moons: 1,
    meanTempC: 15,
  },
  mars: {
    description: "The Red Planet, home to the solar system's tallest volcano.",
    diameterKm: 6779,
    gravity: 3.71,
    dayLengthHours: 24.7,
    orbitalPeriodDays: 687,
    moons: 2,
    meanTempC: -63,
  },
  jupiter: {
    description: "The largest planet, a gas giant with a centuries-old storm.",
    diameterKm: 139820,
    gravity: 24.79,
    dayLengthHours: 9.9,
    orbitalPeriodDays: 4331,
    moons: 95,
    meanTempC: -145,
  },
  saturn: {
    description: "A gas giant famous for its wide, bright ring system.",
    diameterKm: 116460,
    gravity: 10.44,
    dayLengthHours: 10.7,
    orbitalPeriodDays: 10747,
    moons: 146,
    meanTempC: -178,
  },
  uranus: {
    description: "An ice giant that rotates almost on its side.",
    diameterKm: 50724,
    gravity: 8.87,
    dayLengthHours: 17.2,
    orbitalPeriodDays: 30589,
    moons: 28,
    meanTempC: -216,
  },
  neptune: {
    description: "The most distant planet, whipped by the solar system's fastest winds.",
    diameterKm: 49244,
    gravity: 11.15,
    dayLengthHours: 16.1,
    orbitalPeriodDays: 59800,
    moons: 16,
    meanTempC: -214,
  },
};
