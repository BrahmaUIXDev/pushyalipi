// Vedic chart construction: signs, nakshatras, dignities, houses, panchang.

import {
  assertValidDateTime,
  dmsString,
  julianDay,
  lahiriAyanamsha,
  ascendantTropical,
  localDateTimeToUtc,
  norm360,
} from "./core";
import { PLANET_ORDER, PlanetKey, dailySpeed, tropicalPosition } from "./ephemeris";

export const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

export const SIGN_LORDS: PlanetKey[] = [
  "Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury",
  "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter",
];

export const NAKSHATRAS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
  "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
  "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
  "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha",
  "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
] as const;

export const NAKSHATRA_LORDS: PlanetKey[] = [
  "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
  "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
  "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
];

export const TITHIS = [
  "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami",
  "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi",
  "Purnima/Amavasya",
];

export const YOGAS_27 = [
  "Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda", "Sukarma",
  "Dhriti", "Shula", "Ganda", "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra",
  "Siddhi", "Vyatipata", "Variyana", "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha",
  "Shukla", "Brahma", "Indra", "Vaidhriti",
];

export const KARANAS = [
  "Bava", "Balava", "Kaulava", "Taitila", "Gara", "Vanija", "Vishti",
];

export const VARAS = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

// Exaltation degree per planet (sidereal absolute longitude)
const EXALT: Partial<Record<PlanetKey, number>> = {
  Sun: 10, Moon: 33, Mars: 298, Mercury: 165, Jupiter: 95,
  Venus: 357, Saturn: 200, Rahu: 50, Ketu: 230,
};

const OWN_SIGNS: Record<PlanetKey, number[]> = {
  Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11],
  Venus: [1, 6], Saturn: [9, 10], Rahu: [10], Ketu: [7],
};

const MOOLTRIKONA: Partial<Record<PlanetKey, [number, number, number]>> = {
  Sun: [4, 0, 20], Moon: [1, 3, 30], Mars: [0, 0, 12], Mercury: [5, 15, 20],
  Jupiter: [8, 0, 10], Venus: [6, 0, 15], Saturn: [10, 0, 20],
};

// Classical Asta (combustion) limits in degrees of true angular separation
// from the Sun. Retrograde planets combust within a tighter orb.
const COMBUST_ORB: Partial<Record<PlanetKey, { direct: number; retro: number }>> = {
  Moon: { direct: 12, retro: 12 },
  Mars: { direct: 17, retro: 8 },
  Mercury: { direct: 14, retro: 12 },
  Venus: { direct: 10, retro: 8 },
  Jupiter: { direct: 11, retro: 11 },
  Saturn: { direct: 15, retro: 15 },
};

/**
 * Minimum angular distance between two ecliptic longitudes along the 360 wheel.
 * Fixes the adjacent-rashi bug (e.g. Sun 11 Aquarius vs Mars 27 Capricorn).
 */
export function angularDistance(a: number, b: number): number {
  const raw = Math.abs(norm360(a) - norm360(b));
  return Math.min(raw, 360 - raw);
}

export function isCombust(planet: PlanetKey, planetLon: number, sunLon: number, retrograde: boolean): boolean {
  if (planet === "Sun" || planet === "Rahu" || planet === "Ketu") return false;
  const orb = COMBUST_ORB[planet];
  if (!orb) return false;
  const threshold = retrograde ? orb.retro : orb.direct;
  return angularDistance(planetLon, sunLon) <= threshold;
}


export const NATURAL_BENEFIC: PlanetKey[] = ["Jupiter", "Venus", "Moon", "Mercury"];

export type Dignity =
  | "Exalted" | "Debilitated" | "Mooltrikona" | "Own Sign" | "Neutral";

export interface PlanetPosition {
  planet: PlanetKey;
  longitude: number; // sidereal 0-360
  sign: number; // 0-11
  degreeInSign: number;
  dms: string;
  nakshatra: number; // 0-26
  pada: number; // 1-4
  nakshatraLord: PlanetKey;
  retrograde: boolean;
  combust: boolean;
  dignity: Dignity;
  speed: number;
  house: number; // 1-12 from lagna
}

export interface BirthInput {
  name: string;
  date: string; // yyyy-mm-dd (local birth date)
  time: string; // HH:mm (24h local)
  latitude: number;
  longitude: number;
  tzOffset: number; // hours east of UTC
  timezone?: string; // IANA timezone, preferred for historical/DST correctness
  place: string;
}

export interface Panchang {
  tithi: string;
  tithiPaksha: string;
  nakshatra: string;
  yoga: string;
  karana: string;
  vara: string;
  sunSign: string;
  moonSign: string;
  lagnaLord: PlanetKey;
  rashiLord: PlanetKey;
  nakshatraLord: PlanetKey;
}

export interface Chart {
  input: BirthInput;
  jd: number;
  ayanamsha: number;
  ascendant: number;
  ascSign: number;
  ascDms: string;
  planets: PlanetPosition[];
  panchang: Panchang;
  utcDate: Date;
}

export function signOf(lon: number) {
  return Math.floor(norm360(lon) / 30);
}

export function houseFrom(ascSign: number, sign: number) {
  return ((sign - ascSign + 12) % 12) + 1;
}

function dignityOf(planet: PlanetKey, lon: number): Dignity {
  const sign = signOf(lon);
  const ex = EXALT[planet];
  if (ex !== undefined) {
    if (signOf(ex) === sign) return "Exalted";
    if (signOf(ex + 180) === sign) return "Debilitated";
  }
  const mt = MOOLTRIKONA[planet];
  if (mt) {
    const [s, from, to] = mt;
    const deg = lon - sign * 30;
    if (s === sign && deg >= from && deg <= to) return "Mooltrikona";
  }
  if (OWN_SIGNS[planet].includes(sign)) return "Own Sign";
  return "Neutral";
}

export function computeChart(input: BirthInput): Chart {
  const dateParts = input.date.split("-").map(Number);
  const timeParts = input.time.split(":").map(Number);
  const [y, m, d] = dateParts;
  const [hh, mm] = timeParts;
  if (
    y === undefined ||
    m === undefined ||
    d === undefined ||
    hh === undefined ||
    mm === undefined ||
    !/^\d{4}-\d{2}-\d{2}$/.test(input.date) ||
    !/^\d{2}:\d{2}$/.test(input.time)
  ) {
    throw new Error("Birth date must be YYYY-MM-DD and time must be HH:mm.");
  }
  assertValidDateTime(y, m, d, hh, mm, 0);
  if (!input.place.trim()) throw new Error("Birth place is required.");
  if (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90) {
    throw new Error("Latitude must be between -90 and 90.");
  }
  if (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) {
    throw new Error("Longitude must be between -180 and 180.");
  }
  if (!Number.isFinite(input.tzOffset) || input.tzOffset < -24 || input.tzOffset > 24) {
    throw new Error("Timezone offset must be between -24 and 24 hours.");
  }

  const utc = localDateTimeToUtc(y, m, d, hh, mm, input.timezone, input.tzOffset);
  const utcHours = (utc.date.getTime() - Date.UTC(y, m - 1, d, 0, 0, 0)) / 3600000;
  const jd = julianDay(y, m, d, 0, 0, 0) + utcHours / 24;
  const ayan = lahiriAyanamsha(jd);

  const ascTrop = ascendantTropical(jd, input.latitude, input.longitude);
  const ascendant = norm360(ascTrop - ayan);
  const ascSign = signOf(ascendant);

  const sunLon = norm360(tropicalPosition("Sun", jd) - ayan);

  const planets: PlanetPosition[] = PLANET_ORDER.map((p) => {
    const lon = norm360(tropicalPosition(p, jd) - ayan);
    const speed = p === "Rahu" || p === "Ketu" ? -0.053 : dailySpeed(p, jd);
    const sign = signOf(lon);
    const nk = Math.floor(lon / (360 / 27));
    const pada = Math.floor((lon % (360 / 27)) / (360 / 108)) + 1;
    const retrograde = speed < 0;
    return {
      planet: p,
      longitude: lon,
      sign,
      degreeInSign: lon - sign * 30,
      dms: dmsString(lon - sign * 30),
      nakshatra: nk,
      pada,
      nakshatraLord: NAKSHATRA_LORDS[nk]!,
      retrograde,
      combust: isCombust(p, lon, sunLon, retrograde),

      dignity: dignityOf(p, lon),
      speed,
      house: houseFrom(ascSign, sign),
    };
  });

  const moon = planets.find((p) => p.planet === "Moon")!;
  const sun = planets.find((p) => p.planet === "Sun")!;

  const elong = norm360(moon.longitude - sun.longitude);
  const tithiIdx = Math.floor(elong / 12);
  const yogaIdx = Math.floor(norm360(moon.longitude + sun.longitude) / (360 / 27));
  const karanaIdx = Math.floor(elong / 6);
  const karana =
    karanaIdx === 0
      ? "Kimstughna"
      : karanaIdx >= 57
        ? ["Shakuni", "Chatushpada", "Naga"][karanaIdx - 57] ?? "Naga"
        : KARANAS[(karanaIdx - 1) % 7]!;

  const utcDate = utc.date;
  const localWeekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();

  const panchang: Panchang = {
    tithi: TITHIS[tithiIdx % 15]!,
    tithiPaksha: tithiIdx < 15 ? "Shukla Paksha" : "Krishna Paksha",
    nakshatra: NAKSHATRAS[moon.nakshatra]!,
    yoga: YOGAS_27[yogaIdx]!,
    karana,
    vara: VARAS[localWeekday]!,
    sunSign: SIGNS[sun.sign]!,
    moonSign: SIGNS[moon.sign]!,
    lagnaLord: SIGN_LORDS[ascSign]!,
    rashiLord: SIGN_LORDS[moon.sign]!,
    nakshatraLord: moon.nakshatraLord,
  };

  return {
    input: { ...input, tzOffset: utc.offset },
    jd,
    ayanamsha: ayan,
    ascendant,
    ascSign,
    ascDms: dmsString(ascendant - ascSign * 30),
    planets,
    panchang,
    utcDate,
  };
}

export const HOUSE_MEANINGS = [
  "Self, body, personality, vitality",
  "Wealth, family, speech, food",
  "Courage, siblings, communication, effort",
  "Mother, home, comforts, education",
  "Intelligence, children, mantra, romance",
  "Enemies, debts, disease, service",
  "Marriage, partnership, business",
  "Longevity, occult, sudden events, inheritance",
  "Fortune, dharma, guru, higher learning",
  "Career, status, authority, karma",
  "Gains, income, elder siblings, networks",
  "Losses, expenses, moksha, foreign lands",
];
