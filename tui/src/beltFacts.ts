/**
 * Curated real facts for the main asteroid belt itself, as a single
 * body — distinct from asteroidFacts.ts, which curates the belt's
 * individual largest members. The belt is a single fixed representative
 * point in the display, since the real belt spans every angle at once
 * and there's no honest single position to animate.
 */
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

/*
 * ============================================================================
 * COLD EXPLAINER — beltFacts.ts
 * ============================================================================
 * Written for a reader who has opened only this file, per CODEBOT.md's
 * cold-open convention. Keep this current when the file's behavior changes.
 *
 * WHAT THIS FILE IS
 * Real curated facts for the main asteroid belt as a whole (its real
 * inner/outer radius in AU, composition, total mass and object-count
 * notes) — distinct from asteroidFacts.ts, which curates the belt's
 * individual largest named members (Ceres, Vesta, ...).
 *
 * WHY A FIXED DISPLAY POSITION
 * The real belt spans every angle around the Sun at once — there's no
 * honest single (angle, distance) that represents "where the belt is."
 * displayAngleDeg/displayDistanceAU are a deliberate fixed stand-in
 * point, same treatment cometFacts.ts's comets hub and starFacts.ts's
 * star map root both use for the same reason.
 *
 * HOW OTHER FILES USE THIS
 * worldTree.ts uses BELT_ID/BELT_FACTS to build the belt's own orbit
 * entry (as a child of the Sun) and its Surface leaf's content;
 * ContentView.tsx's BeltSurface component renders composition/mass/count
 * notes directly from BELT_FACTS. asteroidFacts.ts's individual asteroids
 * become the belt's own children once you travel there.
 * ============================================================================
 */
