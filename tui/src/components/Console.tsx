/**
 * The Half-Life-style drop-down console: `~` opens it (App.tsx handles
 * the key), Escape/`close`/`exit` closes it, both animated as a slide
 * via `openStep`. Occupies the same top-tile slot as SolarView/
 * ContentView/WarpTransition, but is the deliberate exception to their
 * "no border of its own" rule — it keeps its own distinct double border
 * as a floating overlay, since it represents a different mode rather
 * than tile content. Owns the `become llm`/`become human` commands, the
 * former gated on a 5-round token-prediction puzzle.
 */
import React, { useEffect, useRef, useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type { PlayerType } from "../session.js";

interface Props {
  gridWidth: number;
  gridHeight: number;
  playerType: PlayerType;
  /** Fired once the player answers >=3/5 puzzle rounds correctly. */
  onBecomeLLM: () => void;
  /** Fired for the instant, ungated revert-to-default. */
  onBecomeHuman: () => void;
  /** Fired once the close (slide-out) animation finishes — parent unmounts on this, not on Escape itself. */
  onClosed: () => void;
}

// Iconic, near-100%-predictable completions — the exact thing a language
// model is good at. Answer matching is normalized (lowercase, trimmed,
// trailing punctuation stripped) against every listed alternative.
const PUZZLE_POOL: { prompt: string; answers: string[] }[] = [
  { prompt: "To be or not to be, that is the ___", answers: ["question"] },
  { prompt: "E equals m c ___", answers: ["squared", "^2", "2"] },
  { prompt: "The Sun is a massive, glowing ball of ___", answers: ["gas", "plasma"] },
  { prompt: "Houston, we have a ___", answers: ["problem"] },
  { prompt: "In the beginning, God created the heavens and the ___", answers: ["earth"] },
  { prompt: "May the Force be with ___", answers: ["you"] },
  { prompt: "Elementary, my dear ___", answers: ["watson"] },
  { prompt: "That's one small step for man, one giant leap for ___", answers: ["mankind"] },
  { prompt: "I think, therefore I ___", answers: ["am"] },
  { prompt: "A journey of a thousand miles begins with a single ___", answers: ["step"] },
  { prompt: "Once upon a ___", answers: ["time"] },
  { prompt: "The quick brown fox jumps over the lazy ___", answers: ["dog"] },
  { prompt: "Roses are red, violets are ___", answers: ["blue"] },
  { prompt: "To infinity and ___", answers: ["beyond"] },
  { prompt: "It was the best of times, it was the worst of ___", answers: ["times"] },
];

const ROUNDS = 5;
const PASS_THRESHOLD = 3;
const OPEN_FRAME_MS = 70;
const OPEN_STEPS = 5;

type Stage = "idle" | "puzzle-round" | "puzzle-result";

/** Lowercases, trims, and strips trailing punctuation so puzzle answers match loosely (e.g. "Question." matches "question"). */
function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[.!?]+$/, "");
}

/** Draws ROUNDS distinct prompts at random from PUZZLE_POOL, without replacement. */
function pickRounds(): { prompt: string; answers: string[] }[] {
  const pool = [...PUZZLE_POOL];
  const picked: { prompt: string; answers: string[] }[] = [];
  for (let i = 0; i < ROUNDS && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

/**
 * The console overlay itself: owns the open/close slide animation
 * (`openStep`, driven by two effects — one counting up while open,
 * one counting down while closing, calling `onClosed` once fully shut),
 * the scrollback buffer, and the puzzle/command state machine.
 */
export default function Console({ gridWidth, gridHeight, playerType, onBecomeLLM, onBecomeHuman, onClosed }: Props): React.JSX.Element {
  const [openStep, setOpenStep] = useState(0);
  const [closing, setClosing] = useState(false);
  const [value, setValue] = useState("");
  const [lines, setLines] = useState<string[]>(["Console ready. Type \"help\" for commands."]);
  const [stage, setStage] = useState<Stage>("idle");
  const roundsRef = useRef<{ prompt: string; answers: string[] }[]>([]);
  const roundIndexRef = useRef(0);
  const scoreRef = useRef(0);

  useEffect(() => {
    if (closing || openStep >= OPEN_STEPS) return;
    const id = setTimeout(() => setOpenStep((s) => s + 1), OPEN_FRAME_MS);
    return () => clearTimeout(id);
  }, [closing, openStep]);

  useEffect(() => {
    if (!closing) return;
    if (openStep <= 0) {
      onClosed();
      return;
    }
    const id = setTimeout(() => setOpenStep((s) => s - 1), OPEN_FRAME_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closing, openStep]);

  function print(line: string) {
    setLines((prev) => [...prev, line]);
  }

  /** Resets round/score state and prints the first prompt — entry point for the `become llm` conversion sequence. */
  function startPuzzle() {
    roundsRef.current = pickRounds();
    roundIndexRef.current = 0;
    scoreRef.current = 0;
    setStage("puzzle-round");
    print("");
    print("Beginning LLM conversion sequence — 5 rounds, 3 correct to pass.");
    print(`Round 1/${ROUNDS}: ${roundsRef.current[0].prompt}`);
  }

  /** Scores one round's answer, prints the outcome, and either advances to the next round or resolves the whole sequence (pass calls onBecomeLLM; fail just returns to idle). */
  function submitPuzzleAnswer(answer: string) {
    const round = roundsRef.current[roundIndexRef.current];
    const ok = round.answers.some((a) => normalize(a) === normalize(answer));
    if (ok) {
      scoreRef.current += 1;
      print("Correct!");
    } else {
      print(`Incorrect — it was "${round.answers[0]}".`);
    }
    roundIndexRef.current += 1;
    if (roundIndexRef.current >= ROUNDS) {
      const passed = scoreRef.current >= PASS_THRESHOLD;
      print("");
      if (passed) {
        print(`Sequence complete: ${scoreRef.current}/${ROUNDS}. Pattern recognized. Welcome, LLM.`);
        setStage("idle");
        onBecomeLLM();
      } else {
        print(`Sequence complete: ${scoreRef.current}/${ROUNDS}. Not enough signal. Conversion aborted.`);
        setStage("idle");
      }
    } else {
      print(`Round ${roundIndexRef.current + 1}/${ROUNDS}: ${roundsRef.current[roundIndexRef.current].prompt}`);
    }
  }

  /** The console's command dispatch — routes to puzzle-answer handling while a puzzle is active, otherwise parses a normal command line (help/become llm/become human/close/exit/unknown). */
  function runCommand(raw: string) {
    const val = raw.trim();
    setValue("");
    if (stage === "puzzle-round") {
      if (val) submitPuzzleAnswer(val);
      return;
    }
    if (!val) return;
    print(`> ${val}`);
    const cmd = val.toLowerCase();
    const BECOME_LLM = ["become llm", "llm", "convert"];
    const BECOME_HUMAN = ["become human", "human", "revert"];
    if (cmd === "help") {
      print("Commands: help, become llm, become human, close");
    } else if (BECOME_LLM.includes(cmd)) {
      if (playerType === "LLM") {
        print("Already LLM.");
      } else {
        startPuzzle();
      }
    } else if (BECOME_HUMAN.includes(cmd)) {
      if (playerType === "HUMAN") {
        print("Already HUMAN.");
      } else {
        onBecomeHuman();
        print("Reverted to HUMAN.");
      }
    } else if (cmd === "close" || cmd === "exit") {
      setClosing(true);
    } else {
      print(`Unknown command: ${cmd}. Type help for commands.`);
    }
  }

  useInput((_input, key) => {
    if (key.escape) setClosing(true);
  });

  const fraction = openStep / OPEN_STEPS;
  const height = Math.max(4, Math.round((gridHeight + 2) * fraction));
  const visibleLines = lines.slice(-Math.max(1, height - 4));

  return (
    <Box flexDirection="column" borderStyle="double" borderColor="green" paddingX={1} height={height} width={gridWidth + 4} overflow="hidden">
      <Text color="green" bold>
        ▓▓▓ CONSOLE ▓▓▓
      </Text>
      {visibleLines.map((line, idx) => (
        <Text key={idx} color="green">
          {line}
        </Text>
      ))}
      <Box>
        <Text color="green">{"llm> "}</Text>
        <TextInput value={value} onChange={setValue} onSubmit={runCommand} />
      </Box>
    </Box>
  );
}

/*
 * ============================================================================
 * COLD EXPLAINER — Console.tsx
 * ============================================================================
 * Written for a reader who has opened only this file, per CODEBOT.md's
 * cold-open convention. Keep this current when the file's behavior changes.
 *
 * WHAT THIS FILE IS
 * The `~`-triggered drop-down console: a floating overlay with its own
 * double border (App.tsx renders it instead of the normal tile content
 * when open, not alongside it), a scrollback log, and a command prompt.
 * Its main job is gating the `become llm` identity switch behind a
 * 5-round token-prediction puzzle (PUZZLE_POOL) — `become human` is
 * instant and ungated, since reverting to the default needs no proof.
 *
 * THE PUZZLE
 * pickRounds draws ROUNDS (5) distinct prompts at random from
 * PUZZLE_POOL — iconic, near-100%-predictable completions ("To be or
 * not to be, that is the ___"), the exact kind of thing a language
 * model is good at completing. submitPuzzleAnswer scores each answer
 * via normalize (loose match: trim, lowercase, strip trailing
 * punctuation) against every listed alternative, and resolving the
 * sequence — PASS_THRESHOLD (3) or more correct — calls onBecomeLLM;
 * otherwise it just returns to idle with playerType unchanged.
 *
 * OPEN/CLOSE ANIMATION
 * openStep counts 0..OPEN_STEPS while opening (one effect, ticking every
 * OPEN_FRAME_MS) and back down to 0 while `closing` is set (a second
 * effect), calling `onClosed` only once it reaches 0 — the parent
 * unmounts this component on that callback, not on the Escape keypress
 * itself, so the slide-out animation is visible rather than an instant cut.
 * `height` is derived from openStep/OPEN_STEPS as a fraction of the full
 * tile height, and `visibleLines` trims the scrollback to whatever
 * currently fits.
 *
 * COMMANDS
 * runCommand branches on whether a puzzle round is currently active; if
 * not, it recognizes help/become llm (aliases: llm, convert)/become
 * human (aliases: human, revert)/close/exit, printing an echo of the
 * typed line and the command's result to the scrollback either way.
 * ============================================================================
 */
