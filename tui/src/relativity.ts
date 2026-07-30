// Real gravitational time dilation, plus a "seconds since the Big Bang"
// clock — see SCOPE.md's 2026-07-30 addenda and SPEC.md's Time section.
// Pure functions/constants only, no React or session state.

export const SPEED_OF_LIGHT_MPS = 299_792_458;
export const AU_IN_METERS = 149_597_870_700;

const SECONDS_PER_JULIAN_YEAR = 365.25 * 24 * 3600;

// Planck 2018 estimate, anchored to a fixed reference instant so the
// universe's age only needs elapsed real time added to it, not a full
// recomputation each call.
const AGE_OF_UNIVERSE_YEARS_AT_REFERENCE = 13_797_000_000;
const REFERENCE_EPOCH_MS = Date.UTC(2026, 0, 1);
const AGE_OF_UNIVERSE_SECONDS_AT_REFERENCE = AGE_OF_UNIVERSE_YEARS_AT_REFERENCE * SECONDS_PER_JULIAN_YEAR;

export function universeAgeSeconds(now: Date): number {
  const elapsedSeconds = (now.getTime() - REFERENCE_EPOCH_MS) / 1000;
  return AGE_OF_UNIVERSE_SECONDS_AT_REFERENCE + elapsedSeconds;
}

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

/** A short form for persistent display (the HUD corner) — formatUniverseAge's full breakdown is too long to show at all times. */
export function formatUniverseAgeCompact(seconds: number): string {
  const billionYears = seconds / SECONDS_PER_JULIAN_YEAR / 1_000_000_000;
  return `${billionYears.toFixed(3)}B yrs`;
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
