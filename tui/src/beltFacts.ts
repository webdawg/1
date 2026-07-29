export const BELT_ID = "asteroid-belt";

export const BELT_FACTS = {
  label: "Asteroid Belt",
  description:
    "A vast ring of rocky debris between Mars and Jupiter, left over from the solar system's formation and too disturbed by Jupiter's gravity to ever form a planet.",
  composition: "Rock and metal, with more ice toward the outer edge",
  innerAU: 2.2,
  outerAU: 3.2,
  massNote: "About 4% of the Moon's mass in total — roughly a third of that is Ceres alone.",
  countNote: "Over one million known objects larger than 1 km across.",
  // A single fixed point stands in for the whole ring: the real belt spans
  // every angle at once, so there's no honest single position to animate.
  displayAngleDeg: 45,
  displayDistanceAU: 2.7,
} as const;
