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
