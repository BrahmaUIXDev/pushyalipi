// Pure client-side planetary ephemeris (no native binaries, no APIs).
// Sun/planets: JPL approximate Keplerian elements (valid 1800-2050, ~arcmin).
// Moon: truncated ELP/Meeus series (~10 arcsec).

import { DEG, RAD, centuries, cosD, norm360, sinD } from "./core";

export type PlanetKey =
  | "Sun"
  | "Moon"
  | "Mars"
  | "Mercury"
  | "Jupiter"
  | "Venus"
  | "Saturn"
  | "Rahu"
  | "Ketu";

export const PLANET_ORDER: PlanetKey[] = [
  "Sun",
  "Moon",
  "Mars",
  "Mercury",
  "Jupiter",
  "Venus",
  "Saturn",
  "Rahu",
  "Ketu",
];

type Elements = {
  a: number;
  e: number;
  I: number;
  L: number;
  wbar: number;
  Om: number;
  da: number;
  de: number;
  dI: number;
  dL: number;
  dwbar: number;
  dOm: number;
};

const EL = {
  Mercury: {
    a: 0.38709927, e: 0.20563593, I: 7.00497902, L: 252.2503235, wbar: 77.45779628, Om: 48.33076593,
    da: 0.00000037, de: 0.00001906, dI: -0.00594749, dL: 149472.67411175, dwbar: 0.16047689, dOm: -0.12534081,
  },
  Venus: {
    a: 0.72333566, e: 0.00677672, I: 3.39467605, L: 181.9790995, wbar: 131.60246718, Om: 76.67984255,
    da: 0.0000039, de: -0.00004107, dI: -0.0007889, dL: 58517.81538729, dwbar: 0.00268329, dOm: -0.27769418,
  },
  Earth: {
    a: 1.00000261, e: 0.01671123, I: -0.00001531, L: 100.46457166, wbar: 102.93768193, Om: 0.0,
    da: 0.00000562, de: -0.00004392, dI: -0.01294668, dL: 35999.37244981, dwbar: 0.32327364, dOm: 0.0,
  },
  Mars: {
    a: 1.52371034, e: 0.0933941, I: 1.84969142, L: -4.55343205, wbar: -23.94362959, Om: 49.55953891,
    da: 0.00001847, de: 0.00007882, dI: -0.00813131, dL: 19140.30268499, dwbar: 0.44441088, dOm: -0.29257343,
  },
  Jupiter: {
    a: 5.202887, e: 0.04838624, I: 1.30439695, L: 34.39644051, wbar: 14.72847983, Om: 100.47390909,
    da: -0.00011607, de: -0.00013253, dI: -0.00183714, dL: 3034.74612775, dwbar: 0.21252668, dOm: 0.20469106,
  },
  Saturn: {
    a: 9.53667594, e: 0.05386179, I: 2.48599187, L: 49.95424423, wbar: 92.59887831, Om: 113.66242448,
    da: -0.0012506, de: -0.00050991, dI: 0.00193609, dL: 1222.49362201, dwbar: -0.41897216, dOm: -0.28867794,
  },
} satisfies Record<string, Elements>;

type BodyName = keyof typeof EL;

function heliocentric(el: Elements, T: number): [number, number, number] {
  const a = el.a + el.da * T;
  const e = el.e + el.de * T;
  const I = el.I + el.dI * T;
  const L = el.L + el.dL * T;
  const wbar = el.wbar + el.dwbar * T;
  const Om = el.Om + el.dOm * T;

  const w = wbar - Om;
  let M = norm360(L - wbar);
  if (M > 180) M -= 360;

  let E = M + e * RAD * sinD(M);
  for (let i = 0; i < 12; i++) {
    const dM = M - (E - e * RAD * sinD(E));
    E += dM / (1 - e * cosD(E));
  }

  const xp = a * (cosD(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * sinD(E);

  const cw = cosD(w), sw = sinD(w), cO = cosD(Om), sO = sinD(Om), cI = cosD(I), sI = sinD(I);
  const x = (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp;
  const y = (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp;
  const z = sw * sI * xp + cw * sI * yp;
  return [x, y, z];
}

/** Tropical geocentric ecliptic longitude of a planet (degrees). */
function tropicalLongitude(name: string, jd: number): number {
  const T = centuries(jd);
  if (name === "Sun") {
    const [ex, ey] = heliocentric(EL['Earth'], T);
    return norm360(Math.atan2(-ey, -ex) * RAD);
  }
  const [ex, ey, ez] = heliocentric(EL['Earth'], T);
  const [px, py, pz] = heliocentric(EL[name as BodyName], T);
  const gx = px - ex, gy = py - ey, gz = pz - ez;
  void gz;
  return norm360(Math.atan2(gy, gx) * RAD);
}

/** Moon tropical longitude via truncated Meeus (ch. 47) series. */
function moonLongitude(jd: number): number {
  const T = centuries(jd);
  const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + (T * T * T) / 538841;
  const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + (T * T * T) / 545868;
  const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T;
  const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + (T * T * T) / 69699;
  const F = 93.272095 + 483202.0175233 * T - 0.0036539 * T * T;
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;

  const terms: [number, number, number, number, number][] = [
    [0, 0, 1, 0, 6288774], [2, 0, -1, 0, 1274027], [2, 0, 0, 0, 658314],
    [0, 0, 2, 0, 213618], [0, 1, 0, 0, -185116], [0, 0, 0, 2, -114332],
    [2, 0, -2, 0, 58793], [2, -1, -1, 0, 57066], [2, 0, 1, 0, 53322],
    [2, -1, 0, 0, 45758], [0, 1, -1, 0, -40923], [1, 0, 0, 0, -34720],
    [0, 1, 1, 0, -30383], [2, 0, 0, -2, 15327], [0, 0, 1, 2, -12528],
    [0, 0, 1, -2, 10980], [4, 0, -1, 0, 10675], [0, 0, 3, 0, 10034],
    [4, 0, -2, 0, 8548], [2, 1, -1, 0, -7888], [2, 1, 0, 0, -6766],
    [1, 0, -1, 0, -5163], [1, 1, 0, 0, 4987], [2, -1, 1, 0, 4036],
    [2, 0, 2, 0, 3994], [4, 0, 0, 0, 3861], [2, 0, -3, 0, 3665],
    [0, 1, -2, 0, -2689], [2, 0, -1, 2, -2602], [2, -1, -2, 0, 2390],
    [1, 0, 1, 0, -2348], [2, -2, 0, 0, 2236], [0, 1, 2, 0, -2120],
    [0, 2, 0, 0, -2069], [2, -2, -1, 0, 2048], [2, 0, 1, -2, -1773],
    [2, 0, 0, 2, -1595], [4, -1, -1, 0, 1215], [0, 0, 2, 2, -1110],
    [3, 0, -1, 0, -892], [2, 1, 1, 0, -810], [4, -1, -2, 0, 759],
    [0, 2, -1, 0, -713], [2, 2, -1, 0, -700], [2, 1, -2, 0, 691],
    [2, -1, 0, -2, 596], [4, 0, 1, 0, 549], [0, 0, 4, 0, 537],
    [4, -1, 0, 0, 520], [1, 0, -2, 0, -487],
  ];

  let sum = 0;
  for (const [d, m, mp, f, coef] of terms) {
    const arg = d * D + m * M + mp * Mp + f * F;
    const ecc = Math.abs(m) === 1 ? E : Math.abs(m) === 2 ? E * E : 1;
    sum += coef * ecc * Math.sin(arg * DEG);
  }
  return norm360(Lp + sum / 1000000);
}

/** Mean lunar node (Rahu) tropical longitude. */
function rahuLongitude(jd: number): number {
  const T = centuries(jd);
  return norm360(
    125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + (T * T * T) / 467441,
  );
}

export function tropicalPosition(planet: PlanetKey, jd: number): number {
  switch (planet) {
    case "Moon":
      return moonLongitude(jd);
    case "Rahu":
      return rahuLongitude(jd);
    case "Ketu":
      return norm360(rahuLongitude(jd) + 180);
    default:
      return tropicalLongitude(planet, jd);
  }
}

/** Daily motion in degrees (signed). Negative = retrograde. */
export function dailySpeed(planet: PlanetKey, jd: number): number {
  const a = tropicalPosition(planet, jd - 0.5);
  const b = tropicalPosition(planet, jd + 0.5);
  let diff = b - a;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
}
