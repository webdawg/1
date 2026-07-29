import React from "react";
import { Box, Text } from "ink";
import { getPlanetPosition, type PlanetName } from "../orbital.js";
import { PLANET_FACTS } from "../planetFacts.js";
import { getMoonsOf, isMoonId, MOON_FACTS, type MoonId } from "../moonFacts.js";
import { RING_FACTS } from "../ringFacts.js";
import { ASTEROID_FACTS, isAsteroidId, type AsteroidId } from "../asteroidFacts.js";
import { BELT_FACTS, BELT_ID } from "../beltFacts.js";
import { getAsteroidPosition, getMoonPosition, isKnownPlanet, parseLeafId } from "../worldTree.js";

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

function PlanetRings({ planet }: { planet: PlanetName }): React.JSX.Element {
  const rings = RING_FACTS[planet];
  if (!rings) return <Text dimColor>No rings here.</Text>;
  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1}>
      <Text italic>{rings.description}</Text>
      <Text> </Text>
      <Text>Composition: {rings.composition}</Text>
      <Text>
        Span: {rings.innerRadiusKm.toLocaleString()} km – {rings.outerRadiusKm.toLocaleString()} km from the
        planet's center
      </Text>
      <Text>Discovered: {rings.discovered}</Text>
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

function BeltSurface(): React.JSX.Element {
  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1}>
      <Text italic>{BELT_FACTS.description}</Text>
      <Text> </Text>
      <Text>Composition: {BELT_FACTS.composition}</Text>
      <Text>
        Span: {BELT_FACTS.innerAU} AU – {BELT_FACTS.outerAU} AU from the Sun
      </Text>
      <Text>{BELT_FACTS.countNote}</Text>
      <Text>{BELT_FACTS.massNote}</Text>
    </Box>
  );
}

function AsteroidSurface({ asteroid }: { asteroid: AsteroidId }): React.JSX.Element {
  const facts = ASTEROID_FACTS[asteroid];
  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1}>
      <Text italic>{facts.description}</Text>
      <Text> </Text>
      <Text>Diameter: {facts.diameterKm.toLocaleString()} km</Text>
      <Text>Average distance from Sun: {facts.distanceAU} AU</Text>
      <Text>Orbital period: {formatDays(facts.orbitalPeriodYears * 365.25)}</Text>
    </Box>
  );
}

function AsteroidOrbitLog({ asteroid, date }: { asteroid: AsteroidId; date: Date }): React.JSX.Element {
  const facts = ASTEROID_FACTS[asteroid];
  const position = getAsteroidPosition(asteroid, date);
  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1}>
      <Text>Distance from Sun (assumed circular orbit): {position.distanceAU.toFixed(2)} AU</Text>
      <Text>
        Position: {toClockHour(position.angleDeg)} o'clock ({position.angleDeg.toFixed(1)}°)
      </Text>
      <Text>Orbital period: {formatDays(facts.orbitalPeriodYears * 365.25)}</Text>
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
    switch (leaf.kind) {
      case "surface":
        return <PlanetSurface planet={leaf.owner} />;
      case "rings":
        return <PlanetRings planet={leaf.owner} />;
      case "orbit-log":
        return <PlanetOrbitLog planet={leaf.owner} date={date} />;
    }
  }

  if (leaf.owner === BELT_ID) {
    return leaf.kind === "surface" ? <BeltSurface /> : <Text dimColor>Nothing here.</Text>;
  }

  if (isMoonId(leaf.owner)) {
    return leaf.kind === "surface" ? (
      <MoonSurface moon={leaf.owner} />
    ) : (
      <MoonOrbitLog moon={leaf.owner} date={date} />
    );
  }

  if (isAsteroidId(leaf.owner)) {
    return leaf.kind === "surface" ? (
      <AsteroidSurface asteroid={leaf.owner} />
    ) : (
      <AsteroidOrbitLog asteroid={leaf.owner} date={date} />
    );
  }

  return <Text dimColor>Nothing here.</Text>;
}
