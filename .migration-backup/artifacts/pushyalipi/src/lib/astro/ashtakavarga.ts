// Bhinnashtakavarga (BAV) & Sarvashtakavarga (SAV).

import { PlanetKey } from "./ephemeris";
import { PlanetPosition } from "./vedic";

export const AV_PLANETS: PlanetKey[] = [
  "Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn",
];

type Contributors = Record<string, number[]>;

// Benefic house placements counted from each contributor.
const TABLE: Record<string, Contributors> = {
  Sun: {
    Sun: [1, 2, 4, 7, 8, 9, 10, 11],
    Moon: [3, 6, 10, 11],
    Mars: [1, 2, 4, 7, 8, 9, 10, 11],
    Mercury: [3, 5, 6, 9, 10, 11, 12],
    Jupiter: [5, 6, 9, 11],
    Venus: [6, 7, 12],
    Saturn: [1, 2, 4, 7, 8, 9, 10, 11],
    Lagna: [3, 4, 6, 10, 11, 12],
  },
  Moon: {
    Sun: [3, 6, 7, 8, 10, 11],
    Moon: [1, 3, 6, 7, 10, 11],
    Mars: [2, 3, 5, 6, 9, 10, 11],
    Mercury: [1, 3, 4, 5, 7, 8, 10, 11],
    Jupiter: [1, 4, 7, 8, 10, 11, 12],
    Venus: [3, 4, 5, 7, 9, 10, 11],
    Saturn: [3, 5, 6, 11],
    Lagna: [3, 6, 10, 11],
  },
  Mars: {
    Sun: [3, 5, 6, 10, 11],
    Moon: [3, 6, 11],
    Mars: [1, 2, 4, 7, 8, 10, 11],
    Mercury: [3, 5, 6, 11],
    Jupiter: [6, 10, 11, 12],
    Venus: [6, 8, 11, 12],
    Saturn: [1, 4, 7, 8, 9, 10, 11],
    Lagna: [1, 3, 6, 10, 11],
  },
  Mercury: {
    Sun: [5, 6, 9, 11, 12],
    Moon: [2, 4, 6, 8, 10, 11],
    Mars: [1, 2, 4, 7, 8, 9, 10, 11],
    Mercury: [1, 3, 5, 6, 9, 10, 11, 12],
    Jupiter: [6, 8, 11, 12],
    Venus: [1, 2, 3, 4, 5, 8, 9, 11],
    Saturn: [1, 2, 4, 7, 8, 9, 10, 11],
    Lagna: [1, 2, 4, 6, 8, 10, 11],
  },
  Jupiter: {
    Sun: [1, 2, 3, 4, 7, 8, 9, 10, 11],
    Moon: [2, 5, 7, 9, 11],
    Mars: [1, 2, 4, 7, 8, 10, 11],
    Mercury: [1, 2, 4, 5, 6, 9, 10, 11],
    Jupiter: [1, 2, 3, 4, 7, 8, 10, 11],
    Venus: [2, 5, 6, 9, 10, 11],
    Saturn: [3, 5, 6, 12],
    Lagna: [1, 2, 4, 5, 6, 7, 9, 10, 11],
  },
  Venus: {
    Sun: [8, 11, 12],
    Moon: [1, 2, 3, 4, 5, 8, 9, 11, 12],
    Mars: [3, 4, 6, 9, 11, 12],
    Mercury: [3, 5, 6, 9, 11],
    Jupiter: [5, 8, 9, 10, 11],
    Venus: [1, 2, 3, 4, 5, 8, 9, 10, 11],
    Saturn: [3, 4, 5, 8, 9, 10, 11],
    Lagna: [1, 2, 3, 4, 5, 8, 9],
  },
  Saturn: {
    Sun: [1, 2, 4, 7, 8, 10, 11],
    Moon: [3, 6, 11],
    Mars: [3, 5, 6, 10, 11, 12],
    Mercury: [6, 8, 9, 10, 11, 12],
    Jupiter: [5, 6, 11, 12],
    Venus: [6, 11, 12],
    Saturn: [3, 5, 6, 11],
    Lagna: [1, 3, 4, 6, 10, 11],
  },
};

export interface AshtakavargaResult {
  bav: Record<string, number[]>; // planet -> 12 signs
  sav: number[]; // 12 signs
}

export function computeAshtakavarga(
  planets: PlanetPosition[],
  ascSign: number,
): AshtakavargaResult {
  const signOfBody = (name: string) =>
    name === "Lagna"
      ? ascSign
      : planets.find((p) => p.planet === name)?.sign ?? 0;

  const bav: Record<string, number[]> = {};
  const sav = new Array(12).fill(0);

  for (const planet of AV_PLANETS) {
    const row = new Array(12).fill(0);
    const contributors = TABLE[planet]!;
    for (const [from, houses] of Object.entries(contributors)) {
      const base = signOfBody(from);
      for (const h of houses) {
        row[(base + h - 1) % 12] += 1;
      }
    }
    bav[planet] = row;
    for (let i = 0; i < 12; i++) sav[i] += row[i];
  }

  return { bav, sav };
}

// ---- Panchadha Maitri (five-fold friendship) ----

const NAT_FRIEND: Record<string, PlanetKey[]> = {
  Sun: ["Moon", "Mars", "Jupiter"],
  Moon: ["Sun", "Mercury"],
  Mars: ["Sun", "Moon", "Jupiter"],
  Mercury: ["Sun", "Venus"],
  Jupiter: ["Sun", "Moon", "Mars"],
  Venus: ["Mercury", "Saturn"],
  Saturn: ["Mercury", "Venus"],
  Rahu: ["Venus", "Saturn", "Mercury"],
  Ketu: ["Mars", "Venus", "Saturn"],
};

const NAT_ENEMY: Record<string, PlanetKey[]> = {
  Sun: ["Venus", "Saturn"],
  Moon: [],
  Mars: ["Mercury"],
  Mercury: ["Moon"],
  Jupiter: ["Mercury", "Venus"],
  Venus: ["Sun", "Moon"],
  Saturn: ["Sun", "Moon", "Mars"],
  Rahu: ["Sun", "Moon", "Mars"],
  Ketu: ["Sun", "Moon"],
};

export type Maitri =
  | "Great Friend" | "Friend" | "Neutral" | "Enemy" | "Bitter Enemy";

export function panchadhaMaitri(planets: PlanetPosition[]): Record<string, Record<string, Maitri>> {
  const result: Record<string, Record<string, Maitri>> = {};
  for (const a of planets) {
    result[a.planet] = {};
    for (const b of planets) {
      if (a.planet === b.planet) continue;
      const natural = NAT_FRIEND[a.planet]?.includes(b.planet)
        ? 1
        : NAT_ENEMY[a.planet]?.includes(b.planet)
          ? -1
          : 0;
      const dist = ((b.sign - a.sign + 12) % 12) + 1;
      const temporary = [2, 3, 4, 10, 11, 12].includes(dist) ? 1 : -1;
      const score = natural + temporary;
      const value: Maitri =
        score === 2 ? "Great Friend"
          : score === 1 ? "Friend"
            : score === 0 ? "Neutral"
              : score === -1 ? "Enemy"
                : "Bitter Enemy";
      result[a.planet]![b.planet] = value;
    }
  }
  return result;
}

// ---- Nava Tara Chakra ----

export const TARA_NAMES = [
  "Janma", "Sampat", "Vipat", "Kshema", "Pratyak", "Sadhaka", "Vadha", "Mitra", "Ati-Mitra",
] as const;

export const TARA_QUALITY: Record<string, "good" | "bad" | "neutral"> = {
  Janma: "neutral", Sampat: "good", Vipat: "bad", Kshema: "good", Pratyak: "bad",
  Sadhaka: "good", Vadha: "bad", Mitra: "good", "Ati-Mitra": "good",
};

export function navaTara(birthNakshatra: number) {
  return Array.from({ length: 27 }, (_, i) => {
    const offset = (i - birthNakshatra + 27) % 27;
    const tara = TARA_NAMES[offset % 9]!;
    return { nakshatra: i, tara, quality: TARA_QUALITY[tara]! };
  });
}
