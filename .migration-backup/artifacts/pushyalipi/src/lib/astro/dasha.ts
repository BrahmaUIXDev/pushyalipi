// Vimshottari Dasha engine (120-year cycle, 4 levels deep).

import { PlanetKey } from "./ephemeris";

export const DASHA_SEQUENCE: { planet: PlanetKey; years: number }[] = [
  { planet: "Ketu", years: 7 },
  { planet: "Venus", years: 20 },
  { planet: "Sun", years: 6 },
  { planet: "Moon", years: 10 },
  { planet: "Mars", years: 7 },
  { planet: "Rahu", years: 18 },
  { planet: "Jupiter", years: 16 },
  { planet: "Saturn", years: 19 },
  { planet: "Mercury", years: 17 },
];

const TOTAL = 120;
const YEAR_MS = 365.2425 * 24 * 3600 * 1000;

export interface DashaNode {
  planet: PlanetKey;
  start: Date;
  end: Date;
  level: number;
  children?: DashaNode[];
}

function seqFrom(planet: PlanetKey) {
  const i = DASHA_SEQUENCE.findIndex((d) => d.planet === planet);
  return DASHA_SEQUENCE.slice(i).concat(DASHA_SEQUENCE.slice(0, i));
}

function buildLevel(
  lordOfPeriod: PlanetKey,
  start: Date,
  durationMs: number,
  level: number,
  maxLevel: number,
): DashaNode[] {
  const nodes: DashaNode[] = [];
  let cursor = start.getTime();
  for (const item of seqFrom(lordOfPeriod)) {
    const span = durationMs * (item.years / TOTAL);
    const node: DashaNode = {
      planet: item.planet,
      start: new Date(cursor),
      end: new Date(cursor + span),
      level,
    };
    if (level < maxLevel) {
      node.children = buildLevel(item.planet, node.start, span, level + 1, maxLevel);
    }
    nodes.push(node);
    cursor += span;
  }
  return nodes;
}

/**
 * Builds the full Vimshottari tree (Maha > Antar > Pratyantar > Sookshma)
 * from the natal Moon's sidereal longitude.
 */
export function buildVimshottari(moonLongitude: number, birth: Date): DashaNode[] {
  const nakSpan = 360 / 27;
  const nakIndex = Math.floor(moonLongitude / nakSpan);
  const elapsedFraction = (moonLongitude % nakSpan) / nakSpan;

  const startLordIdx = nakIndex % 9;
  const order = DASHA_SEQUENCE.slice(startLordIdx).concat(
    DASHA_SEQUENCE.slice(0, startLordIdx),
  );

  const nodes: DashaNode[] = [];
  const first = order[0]!;
  const balance = first.years * (1 - elapsedFraction);
  let cursor = birth.getTime();

  const firstNode: DashaNode = {
    planet: first.planet,
    start: new Date(cursor),
    end: new Date(cursor + balance * YEAR_MS),
    level: 1,
  };
  firstNode.children = buildLevel(
    first.planet,
    new Date(cursor - first.years * elapsedFraction * YEAR_MS),
    first.years * YEAR_MS,
    2,
    4,
  ).filter((n) => n.end.getTime() > cursor);
  nodes.push(firstNode);
  cursor = firstNode.end.getTime();

  for (let i = 1; i < order.length; i++) {
    const item = order[i]!;
    const span = item.years * YEAR_MS;
    const node: DashaNode = {
      planet: item.planet,
      start: new Date(cursor),
      end: new Date(cursor + span),
      level: 1,
    };
    node.children = buildLevel(item.planet, node.start, span, 2, 4);
    nodes.push(node);
    cursor += span;
  }
  return nodes;
}

export function findActivePath(nodes: DashaNode[], when: Date): DashaNode[] {
  const t = when.getTime();
  const path: DashaNode[] = [];
  let list: DashaNode[] | undefined = nodes;
  while (list) {
    const hit: DashaNode | undefined = list.find(
      (n) => n.start.getTime() <= t && n.end.getTime() > t,
    );
    if (!hit) break;
    path.push(hit);
    list = hit.children;
  }
  return path;
}
