// Shodashvarga (D1 - D60) divisional chart engine.

import { norm360 } from "./core";

export const VARGAS = [
  { d: 1, key: "D1", name: "Rashi", meaning: "Body, overall life" },
  { d: 2, key: "D2", name: "Hora", meaning: "Wealth, resources" },
  { d: 3, key: "D3", name: "Drekkana", meaning: "Siblings, courage" },
  { d: 4, key: "D4", name: "Chaturthamsha", meaning: "Property, fortune" },
  { d: 7, key: "D7", name: "Saptamsha", meaning: "Children, progeny" },
  { d: 9, key: "D9", name: "Navamsha", meaning: "Spouse, dharma, strength" },
  { d: 10, key: "D10", name: "Dashamsha", meaning: "Career, status" },
  { d: 12, key: "D12", name: "Dwadashamsha", meaning: "Parents, lineage" },
  { d: 16, key: "D16", name: "Shodashamsha", meaning: "Vehicles, comforts" },
  { d: 20, key: "D20", name: "Vimshamsha", meaning: "Spiritual practice" },
  { d: 24, key: "D24", name: "Siddhamsha", meaning: "Education, learning" },
  { d: 27, key: "D27", name: "Bhamsa", meaning: "Strengths, weaknesses" },
  { d: 30, key: "D30", name: "Trimshamsha", meaning: "Misfortune, evils" },
  { d: 40, key: "D40", name: "Khavedamsha", meaning: "Maternal legacy" },
  { d: 45, key: "D45", name: "Akshavedamsha", meaning: "Paternal legacy, character" },
  { d: 60, key: "D60", name: "Shashtiamsha", meaning: "Past karma, totality" },
] as const;

export type VargaKey = (typeof VARGAS)[number]["key"];

const movable = (s: number) => s % 3 === 0;
const fixed = (s: number) => s % 3 === 1;

/** Returns the divisional sign (0-11) of a sidereal longitude for divisor D. */
export function vargaSign(longitude: number, D: number): number {
  const lon = norm360(longitude);
  const sign = Math.floor(lon / 30);
  const deg = lon - sign * 30;
  const odd = sign % 2 === 0;
  const part = Math.floor(deg / (30 / D));

  switch (D) {
    case 1:
      return sign;
    case 2:
      return odd ? (deg < 15 ? 4 : 3) : deg < 15 ? 3 : 4;
    case 3:
      return (sign + part * 4) % 12;
    case 4:
      return (sign + part * 3) % 12;
    case 7:
      return ((odd ? sign : sign + 6) + part) % 12;
    case 9:
      return Math.floor(lon / (30 / 9)) % 12;
    case 10:
      return ((odd ? sign : sign + 8) + part) % 12;
    case 12:
      return (sign + part) % 12;
    case 16:
      return ((movable(sign) ? 0 : fixed(sign) ? 4 : 8) + part) % 12;
    case 20:
      return ((movable(sign) ? 0 : fixed(sign) ? 8 : 4) + part) % 12;
    case 24:
      return ((odd ? 4 : 3) + part) % 12;
    case 27:
      return Math.floor(lon / (30 / 27)) % 12;
    case 30: {
      if (odd) {
        if (deg < 5) return 0;
        if (deg < 10) return 10;
        if (deg < 18) return 8;
        if (deg < 25) return 2;
        return 6;
      }
      if (deg < 5) return 1;
      if (deg < 12) return 5;
      if (deg < 20) return 11;
      if (deg < 25) return 9;
      return 7;
    }
    case 40:
      return ((odd ? 0 : 6) + part) % 12;
    case 45:
      return ((movable(sign) ? 0 : fixed(sign) ? 4 : 8) + part) % 12;
    case 60:
      return (sign + part) % 12;
    default:
      return (sign * D + part) % 12;
  }
}
