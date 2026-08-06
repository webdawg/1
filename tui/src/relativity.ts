// Real gravitational time dilation, plus a "seconds since the Big Bang"
// clock — see SCOPE.md's 2026-07-30 addenda and SPEC.md's Time section.
// Pure functions/constants only, no React or session state.

export const SPEED_OF_LIGHT_MPS = 299_792_458;
export const AU_IN_METERS = 149_597_870_700;
export const LY_IN_METERS = 9_460_730_472_580_800;

// Real distance from the Sun to the galactic center (GRAVITY collaboration,
// 2019: ~8.178 kpc) and the Sun's real orbital speed around it (IAU 1985
// recommended value, ~220 km/s) — together giving a real centripetal
// acceleration (v²/r) toward the galactic center, without needing to model
// the galaxy's actual (non-point-mass) enclosed mass distribution. We're
// not modeling galactic position/motion yet ("we just need to know
// distance for now" — SCOPE.md's 2026-07-30 addendum), so this is treated
// as a fixed background constant rather than something that varies with
// in-system position, which is negligible at this scale anyway.
export const GALACTIC_CENTER_DISTANCE_LY = 26_673;
export const GALACTIC_ORBITAL_SPEED_MPS = 220_000;
export const GALACTIC_GRAVITY_MPS2 = GALACTIC_ORBITAL_SPEED_MPS ** 2 / (GALACTIC_CENTER_DISTANCE_LY * LY_IN_METERS);

const SECONDS_PER_JULIAN_YEAR = 365.25 * 24 * 3600;

// Planck 2018 estimate, anchored to a fixed reference instant so the
// universe's age only needs elapsed real time added to it, not a full
// recomputation each call.
const AGE_OF_UNIVERSE_YEARS_AT_REFERENCE = 13_797_000_000;
const REFERENCE_EPOCH_MS = Date.UTC(2026, 0, 1);
const AGE_OF_UNIVERSE_SECONDS_AT_REFERENCE = AGE_OF_UNIVERSE_YEARS_AT_REFERENCE * SECONDS_PER_JULIAN_YEAR;

/** Seconds since the Big Bang at real time `now`, as a float64 — see universeAgeWholeSeconds for why this loses sub-minute precision and isn't fit for anything meant to visibly tick. */
export function universeAgeSeconds(now: Date): number {
  const elapsedSeconds = (now.getTime() - REFERENCE_EPOCH_MS) / 1000;
  return AGE_OF_UNIVERSE_SECONDS_AT_REFERENCE + elapsedSeconds;
}

/** The `time` command's full "Time 2" line: years (comma-grouped), days, and an H:M:S remainder, all derived from a universeAgeSeconds() total. */
export function formatUniverseAge(seconds: number): string {
  const years = Math.floor(seconds / SECONDS_PER_JULIAN_YEAR);
  let remainder = seconds - years * SECONDS_PER_JULIAN_YEAR;
  const days = Math.floor(remainder / 86400);
  remainder -= days * 86400;
  const hours = Math.floor(remainder / 3600);
  remainder -= hours * 3600;
  const minutes = Math.floor(remainder / 60);
  const secs = Math.floor(remainder - minutes * 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${years.toLocaleString("en-US")} years, ${days} days, ${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
}

/**
 * Exact whole seconds since the Big Bang, as a bigint. universeAgeSeconds()
 * (a float64) can't answer this: at ~4.35e17 seconds, float64 precision
 * only resolves to about ±64 seconds (the ULP of summing a huge number with
 * a small one), so a display built on it would sit frozen for up to a
 * minute at a time instead of ticking every second — confirmed directly (a
 * throwaway check: two calls 300ms apart came back bit-for-bit identical).
 * bigint arithmetic has no such limit: SECONDS_PER_JULIAN_YEAR is exactly
 * representable as an integer (365.25 * 86400 = 31,557,600, no fractional
 * remainder), so the reference age converts to bigint exactly, and only
 * the small, already-precise elapsed-seconds term gets added to it.
 */
export function universeAgeWholeSeconds(now: Date): bigint {
  const ageAtReference = BigInt(AGE_OF_UNIVERSE_YEARS_AT_REFERENCE) * BigInt(SECONDS_PER_JULIAN_YEAR);
  const elapsedWholeSeconds = BigInt(Math.floor((now.getTime() - REFERENCE_EPOCH_MS) / 1000));
  return ageAtReference + elapsedWholeSeconds;
}

/** The HUD's GALACTIC TIMES universe-age reading — the exact whole-seconds count, comma-grouped, ticking every real second. */
export function formatUniverseAgeSeconds(now: Date): string {
  return `${universeAgeWholeSeconds(now).toLocaleString("en-US")}s`;
}

/**
 * A UTC offset like "UTC-7" or "UTC+5:30" — computed directly from
 * getTimezoneOffset() rather than Intl's timeZoneName: "shortOffset",
 * which formats as "GMT±H" per the ECMA-402 spec, not "UTC±H".
 */
export function formatUtcOffset(date: Date): string {
  // getTimezoneOffset() is positive west of UTC (backwards from the usual
  // UTC+/-N convention), so negate it.
  const totalMinutes = -date.getTimezoneOffset();
  const sign = totalMinutes >= 0 ? "+" : "-";
  const absMinutes = Math.abs(totalMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;
  return minutes === 0 ? `UTC${sign}${hours}` : `UTC${sign}${hours}:${String(minutes).padStart(2, "0")}`;
}

// The Sun's real height above the galactic midplane (Bennett & Bovy, 2019:
// 20.8 ± 0.3 pc). Every star curated in starFacts.ts sits within ~2300 ly
// of the Sun — negligible against the ~26,673 ly to the galactic center —
// so the whole curated cluster shares this one real height above the
// plane rather than needing 16 separately-sourced numbers; Sagittarius A*
// itself sits *at* the plane (height 0), being the disk's own center.
const PARSEC_IN_LY = 3.26156;
export const SUN_HEIGHT_ABOVE_GALACTIC_PLANE_LY = 20.8 * PARSEC_IN_LY;

// One full lap around the galactic center ("a galactic year") — derived
// from the same real circumference/speed GALACTIC_GRAVITY_MPS2 above is
// built from, not a separately-sourced number, and lands close to the
// real textbook estimate (~225–250 million years) as a sanity check.
export const GALACTIC_ORBIT_PERIOD_SECONDS =
  (2 * Math.PI * GALACTIC_CENTER_DISTANCE_LY * LY_IN_METERS) / GALACTIC_ORBITAL_SPEED_MPS;

/**
 * Illustrative, NOT a real measurement: real astronomy has no agreed
 * reference epoch (or a precise enough period) to say exactly where the
 * Sun currently sits in its ~225-million-year galactic orbit. This just
 * advances a phase angle in real time at the real orbital rate, anchored
 * arbitrarily to REFERENCE_EPOCH_MS (0° there) — a convention, the same
 * way starFacts.ts's displayAngleDeg values are hand-assigned rather than
 * measured, not a fact about the Sun's true orbital phase. Changes by
 * roughly 5e-14° per second — genuinely, correctly, imperceptibly slow;
 * unlike GALACTIC TIMES' universe-age reading, this one isn't meant to
 * visibly tick, because the real thing it represents doesn't either.
 */
export function galacticOrbitPhaseDeg(now: Date): number {
  const elapsedSeconds = (now.getTime() - REFERENCE_EPOCH_MS) / 1000;
  const fraction = (elapsedSeconds / GALACTIC_ORBIT_PERIOD_SECONDS) % 1;
  return ((fraction * 360) % 360 + 360) % 360;
}

/** A degree value, auto-scaled like formatGravity — this one's realistically always tiny (see galacticOrbitPhaseDeg), so it's almost always exponential notation. */
export function formatGalacticPhase(deg: number): string {
  if (deg >= 0.001 && deg < 100_000) return `${deg.toFixed(6)}°`;
  return `${deg.toExponential(3)}°`;
}

/**
 * What a node needs, physically, to compute its gravitational time
 * dilation: its own local surface gravity/radius (a planet, or a star —
 * null if unknown/not applicable), and its system star's gravity/radius
 * plus real distance from it (null when the node IS the star, or when no
 * star applies at all, e.g. the star map). worldTree.ts resolves this
 * per node id, since it already owns "know about every body category."
 */
export interface DilationInputs {
  localGravity: number | null;
  localRadiusM: number | null;
  starGravity: number | null;
  starRadiusM: number | null;
  distanceFromStarM: number | null;
}

// Caps 2GM/(rc²) short of 1 so surfaceDilationFactor/remoteDilationFactor
// never take sqrt of a negative number for a pathological input — real
// inputs here (even the curated neutron star) stay well under this.
const MAX_SCHWARZSCHILD_TERM = 0.999999;

function schwarzschildTerm(gravity: number, radiusM: number, distanceM: number): number {
  const gm = gravity * radiusM * radiusM;
  return Math.min((2 * gm) / (distanceM * SPEED_OF_LIGHT_MPS ** 2), MAX_SCHWARZSCHILD_TERM);
}

/**
 * Proper (non-linearized) gravitational time dilation factor: how fast a
 * clock runs here relative to a distant observer. 1 = no dilation; values
 * approach 0 near a strong enough field (e.g. the curated pulsar).
 * Combines the node's own local term (if it's a body with known surface
 * gravity) with its system star's remote term (if it has a real distance
 * from one) — both apply together, matching how weak-field GR dilation
 * contributions combine.
 */
export function dilationFactor(inputs: DilationInputs): number {
  let factor = 1;
  if (inputs.localGravity !== null && inputs.localRadiusM !== null) {
    factor *= Math.sqrt(1 - schwarzschildTerm(inputs.localGravity, inputs.localRadiusM, inputs.localRadiusM));
  }
  if (
    inputs.starGravity !== null &&
    inputs.starRadiusM !== null &&
    inputs.distanceFromStarM !== null &&
    inputs.distanceFromStarM > 0
  ) {
    factor *= Math.sqrt(1 - schwarzschildTerm(inputs.starGravity, inputs.starRadiusM, inputs.distanceFromStarM));
  }
  return factor;
}

/** currentDriftMs plus this tick's contribution: elapsed real time scaled by how far factor is from 1 (no drift). */
export function advanceDrift(currentDriftMs: number, elapsedRealMs: number, factor: number): number {
  return currentDriftMs + elapsedRealMs * (factor - 1);
}

/** Newtonian gravitational acceleration (m/s²) at distanceM from a mass with the given surface gravity/radius — same GM = gravity*radius² approach dilationFactor uses. */
export function gravityAtDistance(surfaceGravity: number, surfaceRadiusM: number, distanceM: number): number {
  const gm = surfaceGravity * surfaceRadiusM * surfaceRadiusM;
  return gm / (distanceM * distanceM);
}

/** A gravitational acceleration in m/s², auto-scaled to whichever notation reads best — these range from ~1e-10 (galactic) to ~1e12 (the curated pulsar's surface). */
export function formatGravity(mps2: number | null): string {
  if (mps2 === null) return "—";
  if (mps2 >= 0.01 && mps2 < 100_000) return mps2.toFixed(3);
  return mps2.toExponential(3);
}

/** Circular orbital velocity (m/s) at distanceM from a mass with the given surface gravity/radius — v = √(GM/d). Pass the body's own radius as distanceM for its own surface circular velocity (the "first cosmic velocity"). */
export function orbitalVelocityAtDistance(surfaceGravity: number, surfaceRadiusM: number, distanceM: number): number {
  const gm = surfaceGravity * surfaceRadiusM * surfaceRadiusM;
  return Math.sqrt(gm / distanceM);
}

/** A velocity in m/s, shown in km/s (matching how real astronomy usually states orbital speeds) — switches to a fraction of light speed for genuinely relativistic cases (the curated pulsar's surface is ~43% c). */
export function formatVelocity(mps: number | null): string {
  if (mps === null) return "—";
  if (mps >= 10_000_000) return `${((mps / SPEED_OF_LIGHT_MPS) * 100).toFixed(2)}% c`;
  return `${(mps / 1000).toFixed(3)} km/s`;
}

/**
 * The "Galactic Gravity Constant" — every gravitational acceleration
 * acting on the player's current position, added up as one chain: the
 * galaxy's pull (fixed, from its central mass) + the system star's pull
 * at the real current distance + the current object's own surface
 * gravity (null terms count as 0, e.g. no star term when centered on the
 * star itself). Not a "felt" sensation — real gravity doesn't compound
 * additively like this in practice (each term already includes its own
 * distance falloff, and you wouldn't perceive the galaxy's or the Sun's
 * pull as weight while standing on a planet) — this is a raw building
 * block for a later calculation, kept as an explicit formula rather than
 * just the total so the terms (and how differently-scaled they are)
 * stay visible. Distinct from the individual local/star/galactic
 * readings on the Gravity row, which this sums.
 */
export function formatGravityFormula(galaxyMps2: number, starMps2: number | null, localMps2: number | null): string {
  const sum = galaxyMps2 + (starMps2 ?? 0) + (localMps2 ?? 0);
  return `${formatGravity(galaxyMps2)} + ${formatGravity(starMps2)} + ${formatGravity(localMps2)} = ${formatGravity(sum)}`;
}

/** A signed duration, auto-scaled to whichever unit reads best — drift ranges from nanoseconds (Earth) to seconds (the pulsar). */
export function formatDriftMs(ms: number): string {
  if (ms === 0) return "0s";
  const sign = ms < 0 ? "-" : "+";
  const abs = Math.abs(ms);
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(3)}s`;
  if (abs >= 1) return `${sign}${abs.toFixed(3)}ms`;
  if (abs >= 0.001) return `${sign}${(abs * 1000).toFixed(3)}µs`;
  return `${sign}${(abs * 1_000_000).toFixed(3)}ns`;
}

/*
 * ============================================================================
 * COLD EXPLAINER — relativity.ts
 * ============================================================================
 * Written for a reader who has opened only this file, per CODEBOT.md's
 * cold-open convention. Keep this current when the file's behavior changes.
 *
 * WHAT THIS FILE IS
 * All real physics and time math in the game, as pure functions/constants
 * — no React, no session state, no knowledge of what a "planet" or "moon"
 * is (that's worldTree.ts's getDilationInputs, which maps a node id to
 * the DilationInputs shape this file consumes). Everything here is either
 * a real, cited constant (GRAVITY collaboration 2019, Bennett & Bovy
 * 2019, Planck 2018, IAU 1985) or a real formula applied to real curated
 * data — the sole deliberate exception, and only for illustrative framing
 * rather than fabricated data, is galacticOrbitPhaseDeg (see its own
 * comment for why).
 *
 * THREE TIMES
 * universeAgeSeconds/formatUniverseAge give the full years/days/H:M:S
 * breakdown the `time` command uses. The HUD's persistent GALACTIC TIMES
 * row can't use that same total, though: at ~4.35e17 seconds, float64
 * precision only resolves to about ±64 seconds, so a naive per-second
 * reading would sit visibly frozen. universeAgeWholeSeconds sidesteps
 * this with bigint arithmetic (the reference age converts to bigint
 * exactly, since SECONDS_PER_JULIAN_YEAR has no fractional remainder),
 * giving formatUniverseAgeSeconds a count that ticks by exactly 1 every
 * real second. dilationFactor/advanceDrift/formatDriftMs implement the
 * third time — real gravitational time dilation (proper, non-linearized
 * Schwarzschild formula) accumulated into a running drift as the player
 * dwells at a body, driven by App.tsx's tick loop.
 *
 * GRAVITY AND VELOCITY
 * gravityAtDistance and orbitalVelocityAtDistance are both built on the
 * same GM = gravity * radius² construction dilationFactor uses — real
 * Newtonian formulas (v = √(GM/d) for circular orbital velocity), not
 * approximations invented for this game. formatGravity/formatVelocity
 * auto-scale between fixed and scientific/percent-of-c notation, since
 * curated values span ~22 orders of magnitude (the galactic constant to
 * the curated pulsar's surface). formatGravityFormula sums the three
 * gravity sources into the HUD's "Galactic Gravity Constant" row,
 * explicitly not meant to represent anything physically felt.
 *
 * GALACTIC POSITION
 * GALACTIC_CENTER_DISTANCE_LY/GALACTIC_ORBITAL_SPEED_MPS are the two real
 * curated numbers everything galactic derives from (the Sun's distance
 * from and orbital speed around Sagittarius A*). GALACTIC_GRAVITY_MPS2
 * and GALACTIC_ORBIT_PERIOD_SECONDS are both *derived*, not separately
 * sourced, from those two — and the orbit period comes out close to the
 * real textbook range (~225-250 million years) as a sanity check.
 * SUN_HEIGHT_ABOVE_GALACTIC_PLANE_LY is the one other independently-cited
 * real number (Bennett & Bovy 2019), deliberately shared by the whole
 * curated star cluster in starFacts.ts rather than computed per star —
 * see its own comment for why that's an honest simplification, not a
 * shortcut.
 * ============================================================================
 */
