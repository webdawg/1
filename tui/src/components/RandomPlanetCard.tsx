/**
 * Renders a single planet from a Sagittarius A* generated random
 * system: a brief "touchdown" ground-growing animation on first arrival
 * at the civilization's home planet, then (immediately for every other
 * planet, and forever after for that one) a static description card.
 */
import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import type { PlayerType } from "../session.js";
import type { RandomPlanet } from "../randomSystem.js";
import { TRAVELER_FIGURES } from "./WarpTransition.js";

interface Props {
  planet: RandomPlanet;
  playerType: PlayerType;
  gridWidth: number;
  gridHeight: number;
  /** True only for the very first arrival on the civilization's home planet — every other visit (revisiting it, or any other planet in the system) jumps straight to the settled card. */
  animate: boolean;
  /** Fired once, when the intro animation finishes — never fired at all when animate is false. */
  onAnimationDone: () => void;
}

interface Cell {
  char: string;
  color?: string;
  bold?: boolean;
}

const FRAME_MS = 220;
// A short, self-contained landing beat (~1s) played once on first arrival,
// then settles into the static description card below — deliberately
// lighter weight than WarpTransition's full cinematic, since this isn't a
// mode transition, just a brief "and now you're standing here" moment.
const INTRO_STEPS = 5;
// Mirrors layout.ts's private ASPECT_RATIO so the disk reads round, not
// squashed, on the taller-than-wide terminal cell grid.
const ASPECT_RATIO = 2.1;

function blankGrid(gridWidth: number, gridHeight: number): Cell[][] {
  return Array.from({ length: gridHeight }, () => Array.from({ length: gridWidth }, () => ({ char: " " })));
}

/** One frame of the touchdown animation: a growing green disk (the ground), with the traveler figure appearing once it's big enough to stand on. */
function buildIntroFrame(step: number, playerType: PlayerType, gridWidth: number, gridHeight: number): Cell[][] {
  const grid = blankGrid(gridWidth, gridHeight);
  const centerX = Math.floor(gridWidth / 2);
  const centerY = Math.floor(gridHeight / 2);
  const maxRadius = Math.max(2, Math.floor(Math.min(gridHeight, gridWidth / ASPECT_RATIO) / 2));
  const radius = Math.max(1, Math.round((maxRadius * (step + 1)) / INTRO_STEPS));

  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const dx = (x - centerX) / ASPECT_RATIO;
      const dy = y - centerY;
      if (Math.sqrt(dx * dx + dy * dy) <= radius) grid[y][x] = { char: "▓", color: "green", bold: true };
    }
  }

  // The traveler only appears once the ground is big enough to stand on.
  if (step >= INTRO_STEPS - 2) {
    const { lines, color } = TRAVELER_FIGURES[playerType];
    for (let r = 0; r < lines.length; r++) {
      const row = centerY - 1 + r;
      if (row < 0 || row >= gridHeight) continue;
      const line = lines[r];
      for (let c = 0; c < line.length; c++) {
        const col = centerX - 1 + c;
        if (col < 0 || col >= gridWidth || line[c] === " ") continue;
        grid[row][col] = { char: line[c], color, bold: true };
      }
    }
  }

  return grid;
}

/** Renders one grid row, run-length-encoding adjacent same-styled cells into a single Text run each. */
function GridRow({ row }: { row: Cell[] }): React.JSX.Element {
  const runs: { text: string; color?: string; bold?: boolean }[] = [];
  for (const cell of row) {
    const last = runs[runs.length - 1];
    if (last && last.color === cell.color && last.bold === cell.bold) {
      last.text += cell.char;
    } else {
      runs.push({ text: cell.char, color: cell.color, bold: cell.bold });
    }
  }
  return (
    <Text>
      {runs.map((run, idx) => (
        <Text key={idx} color={run.color} bold={run.bold}>
          {run.text}
        </Text>
      ))}
    </Text>
  );
}

/**
 * What arriving at (or exploring) Sagittarius A*'s generated system shows
 * for a single planet — the civilization's home gets the animated
 * touchdown exactly once (animate=true, only on that first arrival);
 * every other planet, and every revisit, jumps straight to the settled
 * card. App.tsx renders this with key={planet.id} so navigating between
 * different planets gets a fresh component instance (fresh animation
 * decision) rather than carrying stale intro-animation state over.
 */
export default function RandomPlanetCard({ planet, playerType, gridWidth, gridHeight, animate, onAnimationDone }: Props): React.JSX.Element {
  const [step, setStep] = useState(0);
  const [settled, setSettled] = useState(!animate);

  useEffect(() => {
    if (!animate || settled) return;
    const id = setTimeout(() => {
      if (step < INTRO_STEPS - 1) {
        setStep((s) => s + 1);
      } else {
        setSettled(true);
        onAnimationDone();
      }
    }, FRAME_MS);
    return () => clearTimeout(id);
    // onAnimationDone is only ever meant to fire once, driven by step/settled
    // — not re-run just because the parent passed a new function identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, settled, animate]);

  if (!settled) {
    const grid = buildIntroFrame(step, playerType, gridWidth, gridHeight);
    return (
      <Box flexDirection="column">
        {grid.map((row, idx) => (
          <GridRow key={idx} row={row} />
        ))}
      </Box>
    );
  }

  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1}>
      <Text italic>{planet.civilizationName ? `Touchdown on ${planet.name}.` : `You are standing on ${planet.name}.`}</Text>
      <Text> </Text>
      <Text>{planet.description}</Text>
    </Box>
  );
}

/*
 * ============================================================================
 * COLD EXPLAINER — RandomPlanetCard.tsx
 * ============================================================================
 * Written for a reader who has opened only this file, per CODEBOT.md's
 * cold-open convention. Keep this current when the file's behavior changes.
 *
 * WHAT THIS FILE IS
 * The display component for a single planet inside a Sagittarius A*
 * generated random system (randomSystem.ts's RandomPlanet). Two states:
 * a brief (~1s, INTRO_STEPS frames at FRAME_MS each) touchdown animation
 * — a growing green disk standing in for the ground, with the traveler
 * figure appearing once there's enough of it to stand on — played once
 * on first arrival at the civilization's home planet, then a static
 * description card for every subsequent render.
 *
 * WHY A SEPARATE, LIGHTER ANIMATION FROM WarpTransition
 * This isn't a mode transition like the star-dive/portal sequence in
 * WarpTransition.tsx — it's a smaller "and now you're standing here"
 * beat, so it's deliberately simpler: one frame-builder, no setup/
 * traveling phase split, reusing only TRAVELER_FIGURES (not the whole
 * component) from WarpTransition.tsx.
 *
 * WHEN THE ANIMATION PLAYS
 * The `animate` prop is true only for the very first arrival on the
 * home planet; every other planet in the system, and every revisit,
 * renders already-`settled` (the static card) immediately. App.tsx
 * mounts this with `key={planet.id}` so navigating between different
 * generated planets creates a fresh component instance — and therefore
 * a fresh animation decision — rather than carrying stale intro-
 * animation state over from whichever planet was viewed last.
 *
 * WHAT IT RENDERS ONCE SETTLED
 * A small bordered card (matching ContentView.tsx's leaf-card styling)
 * with an italic touchdown/standing line (wording differs slightly for
 * the civilization's home planet) and the planet's generated description.
 * ============================================================================
 */
