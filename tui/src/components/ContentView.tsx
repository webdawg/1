import React from "react";
import { Box, Text } from "ink";
import { getPlanetPosition } from "../orbital.js";
import { PLANET_FACTS } from "../planetFacts.js";
import { parseLeafId } from "../worldTree.js";

interface Props {
  nodeId: string;
  date: Date;
  notes: string[];
}

function formatDuration(days: number): string {
  if (days < 500) return `${days.toFixed(1)} days`;
  return `${(days / 365.25).toFixed(1)} years`;
}

function toClockHour(angleDeg: number): number {
  const raw = ((90 - angleDeg + 360) % 360) / 30;
  const hour = Math.round(raw) % 12;
  return hour === 0 ? 12 : hour;
}

export default function ContentView({ nodeId, date, notes }: Props): React.JSX.Element {
  const leaf = parseLeafId(nodeId);
  if (!leaf) {
    return <Text dimColor>Nothing here.</Text>;
  }

  const facts = PLANET_FACTS[leaf.planet];

  if (leaf.kind === "surface") {
    return (
      <Box flexDirection="column" borderStyle="round" paddingX={1}>
        <Text italic>{facts.description}</Text>
        <Text> </Text>
        <Text>Diameter: {facts.diameterKm.toLocaleString()} km</Text>
        <Text>Surface gravity: {facts.gravity} m/s²</Text>
        <Text>Length of day: {formatDuration(facts.dayLengthHours / 24)}</Text>
        <Text>Mean temperature: {facts.meanTempC}°C</Text>
        <Text>Known moons: {facts.moons}</Text>
      </Box>
    );
  }

  if (leaf.kind === "orbit-log") {
    const position = getPlanetPosition(leaf.planet, date);
    return (
      <Box flexDirection="column" borderStyle="round" paddingX={1}>
        <Text>Distance from Sun right now: {position.distanceAU.toFixed(3)} AU</Text>
        <Text>
          Position: {toClockHour(position.angleDeg)} o'clock ({position.angleDeg.toFixed(1)}° heliocentric longitude)
        </Text>
        <Text>Orbital period: {formatDuration(facts.orbitalPeriodDays)}</Text>
      </Box>
    );
  }

  // notes
  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1}>
      {notes.length === 0 ? (
        <Text dimColor>No notes here yet. Try: /save your text</Text>
      ) : (
        notes.map((note, idx) => <Text key={idx}>- {note}</Text>)
      )}
    </Box>
  );
}
