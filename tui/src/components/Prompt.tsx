/**
 * The HUD tile's command-input row: a bordered single-line box that's
 * either a live TextInput (when `active`) or a dim inactive hint
 * summarizing the available controls. Purely presentational — App.tsx
 * owns `value`/command handling and just wires callbacks through.
 */
import React from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";

interface Props {
  active: boolean;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
}

/** Renders the prompt row itself, switching between the live TextInput and the inactive hint text based on `active`. */
export default function Prompt({ active, value, onChange, onSubmit }: Props): React.JSX.Element {
  return (
    <Box borderStyle="single" paddingX={1}>
      <Text color={active ? "green" : "gray"}>{"> "}</Text>
      {active ? (
        <TextInput value={value} onChange={onChange} onSubmit={onSubmit} />
      ) : (
        <Text dimColor>/ or : commands, arrows move, enter travel, esc back, ~ console</Text>
      )}
    </Box>
  );
}

/*
 * ============================================================================
 * COLD EXPLAINER — Prompt.tsx
 * ============================================================================
 * Written for a reader who has opened only this file, per CODEBOT.md's
 * cold-open convention. Keep this current when the file's behavior changes.
 *
 * WHAT THIS FILE IS
 * The smallest component in the codebase: a single bordered row showing
 * either a live text-entry field (`ink-text-input`'s TextInput, when
 * `active`) or a dim hint line describing the app's controls (when not).
 * Sits as the last row of App.tsx's HUD tile, below the log.
 *
 * WHY THE HINT TEXT IS SHORT
 * A prior version of this hint line grew too long to fit one row at 80
 * columns, silently overflowing the HUD tile's fixed height once an
 * unrelated empty-string Ink rendering bug (which had been masking the
 * overflow) was fixed — see DEVELOPMENT.md. The current text is
 * deliberately kept short enough to fit comfortably at an 80-column floor.
 *
 * HOW OTHER FILES USE THIS
 * App.tsx renders this at the bottom of the HUD tile, passing whether
 * the prompt should currently accept input as `active`, and wiring
 * `value`/`onChange`/`onSubmit` straight through to its own command-line
 * state and `runCommand` — this component owns no state of its own.
 * ============================================================================
 */
