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

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[.!?]+$/, "");
}

function pickRounds(): { prompt: string; answers: string[] }[] {
  const pool = [...PUZZLE_POOL];
  const picked: { prompt: string; answers: string[] }[] = [];
  for (let i = 0; i < ROUNDS && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

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

  function startPuzzle() {
    roundsRef.current = pickRounds();
    roundIndexRef.current = 0;
    scoreRef.current = 0;
    setStage("puzzle-round");
    print("");
    print("Beginning LLM conversion sequence — 5 rounds, 3 correct to pass.");
    print(`Round 1/${ROUNDS}: ${roundsRef.current[0].prompt}`);
  }

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
