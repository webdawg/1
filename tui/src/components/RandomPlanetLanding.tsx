import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import type { PlayerType } from "../session.js";
import type { RandomLanding } from "../randomSystem.js";
import { TRAVELER_FIGURES } from "./WarpTransition.js";

interface Props {
  landing: RandomLanding;
  playerType: PlayerType;
  gridWidth: number;
  gridHeight: number;
}

interface Cell {
  char: string;
  color?: string;
  bold?: boolean;
}

const FRAME_MS = 220;
// A short, self-contained landing beat (~1s) played once on arrival, then
// settles into the static description card below — deliberately lighter
// weight than WarpTransition's full cinematic, since this isn't a mode
// transition, just a brief "and now you're standing here" moment.
const INTRO_STEPS = 5;
// Mirrors layout.ts's private ASPECT_RATIO so the disk reads round, not
// squashed, on the taller-than-wide terminal cell grid.
const ASPECT_RATIO = 2.1;

function blankGrid(gridWidth: number, gridHeight: number): Cell[][] {
  return Array.from({ length: gridHeight }, () => Array.from({ length: gridWidth }, () => ({ char: " " })));
}

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

/** What Sagittarius A* leads to, per direct request ("we land on the planet the major civilization lives on") — a brief landing beat, then a fixed description card, regenerated fresh every visit. See randomSystem.ts. */
export default function RandomPlanetLanding({ landing, playerType, gridWidth, gridHeight }: Props): React.JSX.Element {
  const [step, setStep] = useState(0);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (settled) return;
    const id = setTimeout(() => {
      if (step < INTRO_STEPS - 1) setStep((s) => s + 1);
      else setSettled(true);
    }, FRAME_MS);
    return () => clearTimeout(id);
  }, [step, settled]);

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
      <Text italic>
        Touchdown on {landing.planetName}, orbiting {landing.starName}.
      </Text>
      <Text> </Text>
      <Text>{landing.description}</Text>
    </Box>
  );
}
