import React from "react";
import { Box, Text } from "ink";
import { getPlanetPosition, type PlanetName } from "../orbital.js";
import { PLANET_FACTS } from "../planetFacts.js";
import { getMoonsOf, isMoonId, MOON_FACTS, type MoonId } from "../moonFacts.js";
import { getMoonPosition, isKnownPlanet, parseLeafId } from "../worldTree.js";

interface Props {
  nodeId: string;
  date: Date;
  notes: string[];
}

function formatDays(days: number): string {
  if (days < 500) return `${days.toFixed(days < 10 ? 2 : 1)} days`;
  return `${(days / 365.25).toFixed(1)} years`;
}

function toClockHour(angleDeg: number): number {
  const raw = ((90 - angleDeg + 360) % 360) / 30;
  const hour = Math.round(raw) % 12;
  return hour === 0 ? 12 : hour;
}

function PlanetSurface({ planet }: { planet: PlanetName }): React.JSX.Element {
  const facts = PLANET_FACTS[planet];
  const shownMoons = getMoonsOf(planet).length;
  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1}>
      <Text italic>{facts.description}</Text>
      <Text> </Text>
      <Text>Diameter: {facts.diameterKm.toLocaleString()} km</Text>
      <Text>Surface gravity: {facts.gravity} m/s²</Text>
      <Text>Length of day: {formatDays(facts.dayLengthHours / 24)}</Text>
      <Text>Mean temperature: {facts.meanTempC}°C</Text>
      <Text>
        Known moons: {facts.moons}
        {shownMoons > 0 ? ` (${shownMoons} shown here)` : ""}
      </Text>
    </Box>
  );
}

function PlanetOrbitLog({ planet, date }: { planet: PlanetName; date: Date }): React.JSX.Element {
  const facts = PLANET_FACTS[planet];
  const position = getPlanetPosition(planet, date);
  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1}>
      <Text>Distance from Sun right now: {position.distanceAU.toFixed(3)} AU</Text>
      <Text>
        Position: {toClockHour(position.angleDeg)} o'clock ({position.angleDeg.toFixed(1)}° heliocentric longitude)
      </Text>
      <Text>Orbital period: {formatDays(facts.orbitalPeriodDays)}</Text>
    </Box>
  );
}

function MoonSurface({ moon }: { moon: MoonId }): React.JSX.Element {
  const facts = MOON_FACTS[moon];
  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1}>
      <Text italic>{facts.description}</Text>
      <Text> </Text>
      <Text>Diameter: {facts.diameterKm.toLocaleString()} km</Text>
      <Text>Distance from parent: {facts.distanceFromPlanetKm.toLocaleString()} km</Text>
      <Text>Orbital period: {formatDays(facts.orbitalPeriodDays)}</Text>
      <Text>Tidally locked (day length = orbital period)</Text>
    </Box>
  );
}

function MoonOrbitLog({ moon, date }: { moon: MoonId; date: Date }): React.JSX.Element {
  const facts = MOON_FACTS[moon];
  const position = getMoonPosition(moon, date);
  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1}>
      <Text>Distance from parent: {position.distanceKm.toLocaleString()} km (assumed circular orbit)</Text>
      <Text>Position: {toClockHour(position.angleDeg)} o'clock ({position.angleDeg.toFixed(1)}°)</Text>
      <Text>Orbital period: {formatDays(facts.orbitalPeriodDays)}</Text>
    </Box>
  );
}

function Notes({ notes }: { notes: string[] }): React.JSX.Element {
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

export default function ContentView({ nodeId, date, notes }: Props): React.JSX.Element {
  const leaf = parseLeafId(nodeId);
  if (!leaf) {
    return <Text dimColor>Nothing here.</Text>;
  }

  if (leaf.kind === "notes") return <Notes notes={notes} />;

  if (isKnownPlanet(leaf.owner)) {
    return leaf.kind === "surface" ? (
      <PlanetSurface planet={leaf.owner} />
    ) : (
      <PlanetOrbitLog planet={leaf.owner} date={date} />
    );
  }

  if (!isMoonId(leaf.owner)) {
    return <Text dimColor>Nothing here.</Text>;
  }
  return leaf.kind === "surface" ? (
    <MoonSurface moon={leaf.owner} />
  ) : (
    <MoonOrbitLog moon={leaf.owner} date={date} />
  );
}
