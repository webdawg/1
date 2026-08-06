export const STARMAP_ID = "starmap";

export const STARMAP_FACTS = {
  label: "Nearby Stars",
  description:
    "A curated sample of real, notable star systems near the Sun — not an exhaustive catalog (billions of stars are known in the galaxy alone). Distances are measured from the Sun.",
} as const;

// Sol's own gravity/radius — kept separate from STAR_FACTS since Sol is
// excluded from that record (see below). Used by relativity.ts's
// gravitational time dilation, same real-physics treatment as everywhere
// else in this codebase.
//
// A hardcoded quote, entered verbatim per direct instruction (typos and
// all — see SCOPE.md's 2026-08-06 addendum for the full capture). Lore,
// not a spec item: nothing below performs anything resembling "tensor
// like calculations" on the Sun, and nothing should be built to make
// this sentence literally true.
//   "their are infinite connections between stars, lets call this
//    entire project starsystem, and when you perform tensor like
//    calculations using the particial accelerator sun you get strange
//    results - this is a hardcoded quote save in documentation, and
//    lets update the entire spec to reflect this."
export const SUN_GRAVITY = 274; // m/s², surface
export const SUN_DIAMETER_KM = 1_392_000;

export type StarId =
  | "sun"
  | "proxima-centauri"
  | "alpha-centauri"
  | "barnards-star"
  | "ross-128"
  | "tau-ceti"
  | "teegardens-star"
  | "gliese-667c"
  | "trappist-1"
  | "55-cancri"
  | "51-pegasi"
  | "hd-209458"
  | "toi-700"
  | "kepler-186"
  | "kepler-452"
  | "wasp-12"
  | "psr-b1257+12"
  | "sagittarius-a-star";

// Sol ("sun") is handled specially in worldTree.ts — it keeps its existing
// glyph/label/children untouched. This order excludes it.
export const STAR_ORDER: readonly Exclude<StarId, "sun">[] = [
  "proxima-centauri",
  "alpha-centauri",
  "barnards-star",
  "ross-128",
  "tau-ceti",
  "teegardens-star",
  "gliese-667c",
  "trappist-1",
  "55-cancri",
  "51-pegasi",
  "hd-209458",
  "toi-700",
  "kepler-186",
  "kepler-452",
  "wasp-12",
  "psr-b1257+12",
  "sagittarius-a-star",
];

export interface StarFacts {
  label: string;
  description: string;
  /** Distance from the Sun, in light-years. */
  distanceLy: number;
  spectralType: string;
  glyph: string;
  displayAngleDeg: number;
  /** Surface gravity, m/s² — derived from the star's real mass/radius (see relativity.ts). */
  gravity: number;
  diameterKm: number;
}

export const STAR_FACTS: Record<Exclude<StarId, "sun">, StarFacts> = {
  "proxima-centauri": {
    label: "Proxima Centauri",
    description: "The closest known star to the Sun, a faint red dwarf orbited by at least two small planets.",
    distanceLy: 4.25,
    spectralType: "M5.5V red dwarf",
    glyph: "*P*",
    displayAngleDeg: 10,
    gravity: 1590,
    diameterKm: 202_000,
  },
  "alpha-centauri": {
    label: "Alpha Centauri",
    description:
      "A binary pair of Sun-like stars (A and B) forming, with Proxima, the nearest star system to the Sun. No confirmed planets as of now — an earlier claimed detection was retracted.",
    distanceLy: 4.37,
    spectralType: "G2V + K1V binary",
    glyph: "*A*",
    displayAngleDeg: 25,
    gravity: 203,
    diameterKm: 1_698_000,
  },
  "barnards-star": {
    label: "Barnard's Star",
    description:
      "A fast-moving red dwarf with the largest known proper motion of any star. Earlier claimed planets were retracted; a small planet was confirmed in 2024.",
    distanceLy: 5.96,
    spectralType: "M4V red dwarf",
    glyph: "*B*",
    displayAngleDeg: 50,
    gravity: 1028,
    diameterKm: 273_000,
  },
  "ross-128": {
    label: "Ross 128",
    description: "A quiet red dwarf, notably less prone to the violent flares common among small stars.",
    distanceLy: 11.03,
    spectralType: "M4V red dwarf",
    glyph: "*R*",
    displayAngleDeg: 75,
    gravity: 1186,
    diameterKm: 274_000,
  },
  "tau-ceti": {
    label: "Tau Ceti",
    description: "A Sun-like star visible to the naked eye, slightly smaller and cooler than the Sun.",
    distanceLy: 11.9,
    spectralType: "G8V",
    glyph: "*C*",
    displayAngleDeg: 100,
    gravity: 341,
    diameterKm: 1_104_000,
  },
  "teegardens-star": {
    label: "Teegarden's Star",
    description: "An ultra-cool, ancient red dwarf discovered via its motion before its planets were found.",
    distanceLy: 12.5,
    spectralType: "M7V red dwarf",
    glyph: "*N*",
    displayAngleDeg: 130,
    gravity: 1459,
    diameterKm: 181_000,
  },
  "gliese-667c": {
    label: "Gliese 667 C",
    description: "The faintest member of a triple-star system, orbited by a super-Earth in its habitable zone.",
    distanceLy: 23.6,
    spectralType: "M1.5V red dwarf",
    glyph: "*G*",
    displayAngleDeg: 155,
    gravity: 482,
    diameterKm: 585_000,
  },
  "trappist-1": {
    label: "TRAPPIST-1",
    description:
      "An ultra-cool dwarf star with seven known rocky planets — the largest batch of Earth-size worlds found around a single star.",
    distanceLy: 40.7,
    spectralType: "M8V ultra-cool dwarf",
    glyph: "*7*",
    displayAngleDeg: 180,
    gravity: 1665,
    diameterKm: 168_000,
  },
  "55-cancri": {
    label: "55 Cancri",
    description: "A Sun-like star with a tightly-packed planetary system, including a scorched lava world.",
    distanceLy: 41,
    spectralType: "G8V",
    glyph: "*5*",
    displayAngleDeg: 205,
    gravity: 279,
    diameterKm: 1_313_000,
  },
  "51-pegasi": {
    label: "51 Pegasi",
    description:
      "A Sun-like star that made history in 1995 as the first ever found to host a planet — earning its discoverers the 2019 Nobel Prize in Physics.",
    distanceLy: 50.9,
    spectralType: "G5V",
    glyph: "*1*",
    displayAngleDeg: 230,
    gravity: 199,
    diameterKm: 1_722_000,
  },
  "hd-209458": {
    label: "HD 209458",
    description: "A Sun-like star whose planet, nicknamed Osiris, was the first ever caught transiting its star.",
    distanceLy: 159,
    spectralType: "G0V",
    glyph: "*H*",
    displayAngleDeg: 255,
    gravity: 219,
    diameterKm: 1_670_000,
  },
  "toi-700": {
    label: "TOI-700",
    description: "A small, quiet red dwarf found by NASA's TESS mission to host two habitable-zone planets.",
    distanceLy: 101.4,
    spectralType: "M2V red dwarf",
    glyph: "*O*",
    displayAngleDeg: 280,
    gravity: 645,
    diameterKm: 585_000,
  },
  "kepler-186": {
    label: "Kepler-186",
    description: "A red dwarf whose outermost known planet was the first Earth-size world found in another star's habitable zone.",
    distanceLy: 582,
    spectralType: "M1V red dwarf",
    glyph: "*K*",
    displayAngleDeg: 300,
    gravity: 507,
    diameterKm: 724_000,
  },
  "kepler-452": {
    label: "Kepler-452",
    description: "A Sun-like star hosting a planet nicknamed \"Earth's cousin\" for its Earth-like year around a Sun-like star.",
    distanceLy: 1800,
    spectralType: "G2V",
    glyph: "*2*",
    displayAngleDeg: 320,
    gravity: 231,
    diameterKm: 1_545_000,
  },
  "wasp-12": {
    label: "WASP-12",
    description: "A Sun-like star slowly consuming its own planet, which orbits so close its atmosphere is being stripped away.",
    distanceLy: 870,
    spectralType: "G0V",
    glyph: "*W*",
    displayAngleDeg: 340,
    gravity: 150,
    diameterKm: 2_186_000,
  },
  "psr-b1257+12": {
    label: "PSR B1257+12",
    description:
      "Not a star but a millisecond pulsar — the collapsed core of a dead star. Its planets, found in 1992, were the first confirmed exoplanets in history.",
    distanceLy: 2300,
    spectralType: "Millisecond pulsar",
    glyph: "*X*",
    displayAngleDeg: 355,
    // A real neutron star: ~1.4 solar masses collapsed into an ~11km radius.
    // 2GM/(rc²) ≈ 0.38 here — a genuinely strong-field GR regime, not the
    // weak-field approximation everywhere else. See relativity.ts.
    gravity: 1.5e12,
    diameterKm: 22,
  },
  "sagittarius-a-star": {
    label: "Sagittarius A*",
    description:
      "Not a star but the supermassive black hole at the Milky Way's center — ~4.3 million solar masses, the galaxy's strongest real time dilation source.",
    // Same real distance as relativity.ts's GALACTIC_CENTER_DISTANCE_LY —
    // that constant measures the Sun's distance from exactly this object,
    // since Sgr A* IS the galactic center (GRAVITY collaboration, 2019).
    distanceLy: 26_673,
    spectralType: "Supermassive black hole",
    // Deliberately not the (*) / *x* motifs every other star-map entry
    // uses — a dense, dark block cluster rather than a bracketed dot, per
    // direct feedback that a plain circle "wasn't cutting it." Verified
    // via tmux that Unicode block-drawing characters (U+2580 range) don't
    // trip the single-width column-math gotcha every other glyph in this
    // codebase has to respect (see DEVELOPMENT.md) — they render as one
    // terminal column each, same as any ASCII glyph.
    glyph: "▓█▓",
    // Clamped to the same outer rim radius as PSR B1257+12 (see
    // STARMAP_DISPLAY_DOMAIN's comment) — 180° puts it on the left side
    // of the NAVIGATION tile, per direct follow-up request (it had
    // briefly sat at the star map's exact center, then at 270°/bottom;
    // this superseded both). Still the map's farthest-out object, same
    // as it's always been; verify via tmux if this angle is ever revised
    // again, since the grid's coarse resolution has repeatedly made
    // "looks isolated" something that has to be checked, not assumed
    // from the angle number alone.
    displayAngleDeg: 180,
    // EHT Collaboration 2022 mass estimate (~4.297 million solar masses).
    // gravity/diameterKm here aren't a literal surface — they're derived
    // from the Schwarzschild radius (Rs = 2GM/c² ≈ 12.69 million km) via
    // the same GM = gravity·radius² construction dilationFactor uses
    // everywhere else, so "standing" here means standing at the event
    // horizon. 2GM/(rc²) = 1 there by definition, capped by
    // relativity.ts's MAX_SCHWARZSCHILD_TERM to a dilation factor of
    // ~0.001 — a clock at the horizon runs at roughly 1/1000th speed,
    // the most extreme curated case by a wide margin (PSR B1257+12's
    // ~0.79 was the previous most extreme).
    gravity: 3.54e6,
    diameterKm: 25_390_000,
  },
};

export function isStarId(id: string): id is StarId {
  return id === "sun" || (STAR_ORDER as readonly string[]).includes(id);
}

export type ExoplanetKind = "rocky" | "gas-giant";

export interface ExoplanetFacts {
  label: string;
  description: string;
  starId: Exclude<StarId, "sun">;
  kind: ExoplanetKind;
  orbitalPeriodDays: number;
  /** Semi-major axis, in AU (estimated where not precisely known). */
  distanceAU: number;
  discovered: string;
  /** For genuinely disputed or revised detections — mirrors comets' periodUncertain flag. */
  statusNote?: string;
}

const RAW_EXOPLANET_FACTS = {
  "proxima-b": {
    label: "Proxima b",
    description: "A roughly Earth-mass planet in Proxima Centauri's habitable zone.",
    starId: "proxima-centauri",
    kind: "rocky",
    orbitalPeriodDays: 11.2,
    distanceAU: 0.0485,
    discovered: "2016",
  },
  "proxima-d": {
    label: "Proxima d",
    description: "A very small, fast-orbiting planet closer to Proxima Centauri than Mercury is to the Sun.",
    starId: "proxima-centauri",
    kind: "rocky",
    orbitalPeriodDays: 5.1,
    distanceAU: 0.029,
    discovered: "2022",
  },
  "barnards-star-b": {
    label: "Barnard's Star b",
    description: "A small, likely frozen planet whipping around Barnard's Star every few days.",
    starId: "barnards-star",
    kind: "rocky",
    orbitalPeriodDays: 3.15,
    distanceAU: 0.023,
    discovered: "2024",
    statusNote: "An earlier 2018 claim (a longer, ~233-day orbit) was retracted in 2021; this is a separate, later confirmation.",
  },
  "ross-128b": {
    label: "Ross 128 b",
    description: "A temperate, roughly Earth-mass planet orbiting one of the quietest red dwarfs known.",
    starId: "ross-128",
    kind: "rocky",
    orbitalPeriodDays: 9.9,
    distanceAU: 0.0496,
    discovered: "2017",
  },
  "tau-ceti-e": {
    label: "Tau Ceti e",
    description: "A candidate super-Earth on the inner edge of Tau Ceti's habitable zone.",
    starId: "tau-ceti",
    kind: "rocky",
    orbitalPeriodDays: 162.87,
    distanceAU: 0.538,
    discovered: "2012 (candidate)",
    statusNote: "Signal is faint and has been debated; not universally treated as fully confirmed.",
  },
  "tau-ceti-f": {
    label: "Tau Ceti f",
    description: "A candidate super-Earth further out in Tau Ceti's habitable zone.",
    starId: "tau-ceti",
    kind: "rocky",
    orbitalPeriodDays: 636,
    distanceAU: 1.334,
    discovered: "2012 (candidate)",
    statusNote: "Signal is faint and has been debated; not universally treated as fully confirmed.",
  },
  "teegarden-b": {
    label: "Teegarden's Star b",
    description: "An Earth-mass planet in the habitable zone of one of the oldest red dwarfs known nearby.",
    starId: "teegardens-star",
    kind: "rocky",
    orbitalPeriodDays: 4.91,
    distanceAU: 0.0259,
    discovered: "2019",
  },
  "teegarden-c": {
    label: "Teegarden's Star c",
    description: "A cooler, more distant sibling of Teegarden's Star b, also in the star's habitable zone.",
    starId: "teegardens-star",
    kind: "rocky",
    orbitalPeriodDays: 11.4,
    distanceAU: 0.0455,
    discovered: "2019",
  },
  "gliese-667cc": {
    label: "Gliese 667 Cc",
    description: "A super-Earth in the habitable zone of the faintest star in a triple-star system.",
    starId: "gliese-667c",
    kind: "rocky",
    orbitalPeriodDays: 28.1,
    distanceAU: 0.125,
    discovered: "2011",
  },
  "trappist-1b": {
    label: "TRAPPIST-1 b",
    description: "The innermost of TRAPPIST-1's seven rocky worlds, likely too hot for liquid water.",
    starId: "trappist-1",
    kind: "rocky",
    orbitalPeriodDays: 1.51,
    distanceAU: 0.0115,
    discovered: "2016",
  },
  "trappist-1c": {
    label: "TRAPPIST-1 c",
    description: "The second TRAPPIST-1 planet, similar in size to Venus.",
    starId: "trappist-1",
    kind: "rocky",
    orbitalPeriodDays: 2.42,
    distanceAU: 0.0158,
    discovered: "2016",
  },
  "trappist-1d": {
    label: "TRAPPIST-1 d",
    description: "The smallest of the seven TRAPPIST-1 planets, near the inner edge of the habitable zone.",
    starId: "trappist-1",
    kind: "rocky",
    orbitalPeriodDays: 4.05,
    distanceAU: 0.0223,
    discovered: "2016",
  },
  "trappist-1e": {
    label: "TRAPPIST-1 e",
    description: "Widely considered the most Earth-like of TRAPPIST-1's planets, squarely in the habitable zone.",
    starId: "trappist-1",
    kind: "rocky",
    orbitalPeriodDays: 6.1,
    distanceAU: 0.0293,
    discovered: "2017",
  },
  "trappist-1f": {
    label: "TRAPPIST-1 f",
    description: "A habitable-zone TRAPPIST-1 planet that may host water ice.",
    starId: "trappist-1",
    kind: "rocky",
    orbitalPeriodDays: 9.21,
    distanceAU: 0.0385,
    discovered: "2017",
  },
  "trappist-1g": {
    label: "TRAPPIST-1 g",
    description: "The largest of the TRAPPIST-1 planets, on the outer edge of the habitable zone.",
    starId: "trappist-1",
    kind: "rocky",
    orbitalPeriodDays: 12.35,
    distanceAU: 0.0469,
    discovered: "2017",
  },
  "trappist-1h": {
    label: "TRAPPIST-1 h",
    description: "The outermost and coldest of TRAPPIST-1's seven known planets.",
    starId: "trappist-1",
    kind: "rocky",
    orbitalPeriodDays: 18.77,
    distanceAU: 0.0619,
    discovered: "2017",
  },
  "55-cancri-e": {
    label: "55 Cancri e",
    description:
      "A scorched world orbiting so close to its star that a year lasts under 18 hours — nicknamed a \"lava planet.\"",
    starId: "55-cancri",
    kind: "rocky",
    orbitalPeriodDays: 0.7365,
    distanceAU: 0.0154,
    discovered: "2004",
  },
  "51-pegasi-b": {
    label: "51 Pegasi b",
    description: "A hot Jupiter, and the first planet ever confirmed orbiting a Sun-like star.",
    starId: "51-pegasi",
    kind: "gas-giant",
    orbitalPeriodDays: 4.23,
    distanceAU: 0.0527,
    discovered: "1995",
  },
  "hd-209458b": {
    label: "HD 209458 b",
    description: "Nicknamed Osiris — the first exoplanet ever observed transiting in front of its star.",
    starId: "hd-209458",
    kind: "gas-giant",
    orbitalPeriodDays: 3.52,
    distanceAU: 0.047,
    discovered: "1999",
  },
  "toi-700d": {
    label: "TOI-700 d",
    description: "An Earth-size, likely rocky planet in its star's habitable zone, found by NASA's TESS mission.",
    starId: "toi-700",
    kind: "rocky",
    orbitalPeriodDays: 37.4,
    distanceAU: 0.163,
    discovered: "2020",
  },
  "toi-700e": {
    label: "TOI-700 e",
    description: "A slightly smaller sibling of TOI-700 d, also within the star's habitable zone.",
    starId: "toi-700",
    kind: "rocky",
    orbitalPeriodDays: 27.8,
    distanceAU: 0.133,
    discovered: "2023",
  },
  "kepler-186f": {
    label: "Kepler-186f",
    description: "The first Earth-size planet confirmed in another star's habitable zone.",
    starId: "kepler-186",
    kind: "rocky",
    orbitalPeriodDays: 129.9,
    distanceAU: 0.36,
    discovered: "2014",
  },
  "kepler-452b": {
    label: "Kepler-452b",
    description: "Nicknamed \"Earth's cousin\" for orbiting a Sun-like star at roughly Earth's own distance.",
    starId: "kepler-452",
    kind: "rocky",
    orbitalPeriodDays: 385,
    distanceAU: 1.04,
    discovered: "2015",
  },
  "wasp-12b": {
    label: "WASP-12b",
    description: "An extreme hot Jupiter, distorted egg-shaped by its star's gravity as it is slowly torn apart.",
    starId: "wasp-12",
    kind: "gas-giant",
    orbitalPeriodDays: 1.09,
    distanceAU: 0.0234,
    discovered: "2008",
  },
  "psr-b1257-12b": {
    label: "PSR B1257+12 b",
    description: "Nicknamed Draugr — one of the smallest exoplanets known, barely twice the Moon's mass.",
    starId: "psr-b1257+12",
    kind: "rocky",
    orbitalPeriodDays: 25.3,
    distanceAU: 0.19,
    discovered: "1994",
  },
  "psr-b1257-12c": {
    label: "PSR B1257+12 c",
    description: "Nicknamed Poltergeist — one of the first two planets ever confirmed beyond the solar system.",
    starId: "psr-b1257+12",
    kind: "rocky",
    orbitalPeriodDays: 66.5,
    distanceAU: 0.36,
    discovered: "1992",
  },
  "psr-b1257-12d": {
    label: "PSR B1257+12 d",
    description: "Nicknamed Phobetor — the outermost of the pulsar's three known planets.",
    starId: "psr-b1257+12",
    kind: "rocky",
    orbitalPeriodDays: 98.2,
    distanceAU: 0.46,
    discovered: "1994",
  },
} satisfies Record<string, ExoplanetFacts>;

export type ExoplanetId = keyof typeof RAW_EXOPLANET_FACTS;

// Re-typed with the full ExoplanetFacts shape (optional fields included) —
// `satisfies` above preserves each entry's exact literal type, which would
// otherwise make properties like `statusNote` inaccessible on entries that
// don't set it.
export const EXOPLANET_FACTS: Record<ExoplanetId, ExoplanetFacts> = RAW_EXOPLANET_FACTS;

export function isExoplanetId(id: string): id is ExoplanetId {
  return Object.prototype.hasOwnProperty.call(EXOPLANET_FACTS, id);
}

export function getExoplanetsOfStar(starId: Exclude<StarId, "sun">): ExoplanetId[] {
  return (Object.keys(EXOPLANET_FACTS) as ExoplanetId[])
    .filter((id) => EXOPLANET_FACTS[id].starId === starId)
    .sort((a, b) => EXOPLANET_FACTS[a].distanceAU - EXOPLANET_FACTS[b].distanceAU);
}
