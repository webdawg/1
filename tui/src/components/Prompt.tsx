import React from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";

interface Props {
  active: boolean;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
}

export default function Prompt({ active, value, onChange, onSubmit }: Props): React.JSX.Element {
  return (
    <Box borderStyle="single" paddingX={1}>
      <Text color={active ? "green" : "gray"}>{"> "}</Text>
      {active ? (
        <TextInput value={value} onChange={onChange} onSubmit={onSubmit} />
      ) : (
        <Text dimColor>
          type / or : for commands, arrows to look around, enter to travel, esc to go back, ~ for console
        </Text>
      )}
    </Box>
  );
}
