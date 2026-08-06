/**
 * Directional selection among plotted orbit entries: given where you're
 * focused now and an arrow key press, decide what's actually up/down/
 * left/right of it on screen — not the next item in some hidden list.
 */
import type { GridPoint } from "./layout.js";
import type { OrbitEntry } from "./worldTree.js";

export type Direction = "up" | "down" | "left" | "right";

const PERPENDICULAR_PENALTY = 3;
// A distance-0 entry ("home" — see layout.ts's computeGridPositions) sits
// at the exact center, so it's very often off-axis from wherever you're
// currently focused. Scored like everything else, a genuinely-closer
// neighbor can consistently beat it from every direction at once,
// stranding it behind an unbreakable cycle between two other entries.
// A lighter penalty keeps it reachable from a wide cone of directions
// without making it an unconditional magnet (it still loses to anything
// clearly closer and better-aligned).
const HOME_PERPENDICULAR_PENALTY = 0.5;

/**
 * Given the currently-focused entry and a pressed arrow key, returns the
 * id of whichever other entry is actually positioned in that direction
 * on screen — nearest-neighbor scoring with a perpendicular-distance
 * penalty so "almost straight" beats "diagonal," falling back to
 * angle-order wraparound when nothing lies that direction at all.
 */
export function pickNextFocus(
  entries: OrbitEntry[],
  positions: Map<string, GridPoint>,
  currentId: string | null,
  direction: Direction
): string | null {
  if (entries.length === 0) return null;

  const currentPos = currentId ? positions.get(currentId) : undefined;
  if (!currentId || !currentPos) return entries[0].id;

  let best: { id: string; score: number } | null = null;
  for (const entry of entries) {
    if (entry.id === currentId) continue;
    const pos = positions.get(entry.id);
    if (!pos) continue;

    const dx = pos.x - currentPos.x;
    const dy = pos.y - currentPos.y;
    const perpendicularPenalty = entry.distance === 0 ? HOME_PERPENDICULAR_PENALTY : PERPENDICULAR_PENALTY;
    let score: number;
    switch (direction) {
      case "right":
        if (dx <= 0) continue;
        score = dx + Math.abs(dy) * perpendicularPenalty;
        break;
      case "left":
        if (dx >= 0) continue;
        score = -dx + Math.abs(dy) * perpendicularPenalty;
        break;
      case "down":
        if (dy <= 0) continue;
        score = dy + Math.abs(dx) * perpendicularPenalty;
        break;
      case "up":
        if (dy >= 0) continue;
        score = -dy + Math.abs(dx) * perpendicularPenalty;
        break;
    }

    if (!best || score < best.score || (score === best.score && entry.id < best.id)) {
      best = { id: entry.id, score };
    }
  }

  if (best) return best.id;

  // Nothing lies in that direction (e.g. pressing "up" from the topmost
  // entry) — fall back to angle-order wraparound so arrow keys always do
  // something, instead of going dead at layout edges.
  const currentIndex = entries.findIndex((e) => e.id === currentId);
  if (currentIndex === -1) return entries[0].id;
  const step = direction === "right" || direction === "down" ? 1 : -1;
  const nextIndex = (currentIndex + step + entries.length) % entries.length;
  return entries[nextIndex].id;
}

/*
 * ============================================================================
 * COLD EXPLAINER — spatialNav.ts
 * ============================================================================
 * Written for a reader who has opened only this file, per CODEBOT.md's
 * cold-open convention. Keep this current when the file's behavior changes.
 *
 * WHAT THIS FILE IS
 * One function, pickNextFocus, that makes arrow-key navigation spatial
 * instead of cycling a hidden sorted list: given the on-screen (x, y) of
 * every orbit entry (from layout.ts's computeGridPositions — the same
 * positions SolarView renders from, so this can never disagree with what
 * the player actually sees) and a direction, it picks whichever entry is
 * genuinely closest in that direction.
 *
 * HOW SCORING WORKS
 * For a given direction, candidates on the wrong side are excluded
 * outright (dx <= 0 for "right", etc.), then scored as
 * primary + perpendicular * penalty, where primary is the delta along
 * the pressed axis and perpendicular is the delta on the other axis —
 * lower wins, ties broken by id for determinism. penalty is normally 3,
 * but 0.5 for a distance-0 "home" entry specifically: home sits at the
 * grid's exact center, so at full penalty a genuinely-closer neighbor
 * could out-score it from every direction at once, permanently stranding
 * it behind a 2-cycle between two other entries (hit in practice: Mars
 * vs. Mercury excluding the Sun). The lighter penalty keeps it reachable
 * from a wide cone of directions without becoming an unconditional magnet.
 *
 * THE FALLBACK
 * If nothing scores (e.g. pressing "up" from the topmost entry), falls
 * back to angle-order wraparound — step ±1 through the entries array,
 * wrapping — so arrow keys always do *something* rather than going dead
 * at a layout edge.
 * ============================================================================
 */
