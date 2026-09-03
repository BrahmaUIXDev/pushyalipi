// Raja Yoga, Dhana Yoga & Dosha detection engine.

import { PlanetKey } from "./ephemeris";
import { Chart, NATURAL_BENEFIC, SIGNS, SIGN_LORDS, PlanetPosition } from "./vedic";

export interface Finding {
  id: string;
  name: string;
  present: boolean;
  severity?: "positive" | "caution" | "severe";
  detail: string;
  effect: string;
}

const KENDRA = [1, 4, 7, 10];
const TRIKONA = [1, 5, 9];

// Which planet is exalted in each rashi (index 0 = Aries). Used by Neechbhanga.
const EXALTATION_SIGN_OWNER: Partial<Record<number, PlanetKey>> = {
  0: "Sun", 1: "Moon", 2: "Rahu", 3: "Jupiter", 5: "Mercury",
  6: "Saturn", 7: "Ketu", 9: "Mars", 11: "Venus",
};


function get(chart: Chart, p: PlanetKey): PlanetPosition {
  return chart.planets.find((x) => x.planet === p)!;
}

function lordOfHouse(chart: Chart, house: number): PlanetKey {
  return SIGN_LORDS[(chart.ascSign + house - 1) % 12]!;
}

function housesFromMoon(chart: Chart, p: PlanetPosition) {
  const moon = get(chart, "Moon");
  return ((p.sign - moon.sign + 12) % 12) + 1;
}

const MAHAPURUSHA: { planet: PlanetKey; yoga: string; effect: string }[] = [
  { planet: "Mars", yoga: "Ruchaka", effect: "Commanding valour, leadership in defence, sports or surgery." },
  { planet: "Mercury", yoga: "Bhadra", effect: "Sharp intellect, eloquence, success in writing, trade and analytics." },
  { planet: "Jupiter", yoga: "Hamsa", effect: "Wisdom, righteousness, respect from learned people, guru-like nature." },
  { planet: "Venus", yoga: "Malavya", effect: "Beauty, luxury, artistic refinement, vehicles and comforts." },
  { planet: "Saturn", yoga: "Sasa", effect: "Authority over masses, discipline, rise through sustained labour." },
];

export function detectYogas(chart: Chart): Finding[] {
  const out: Finding[] = [];
  const P = (p: PlanetKey) => get(chart, p);

  // Panch Mahapurusha
  for (const m of MAHAPURUSHA) {
    const pl = P(m.planet);
    const strong = pl.dignity === "Exalted" || pl.dignity === "Own Sign" || pl.dignity === "Mooltrikona";
    const present = strong && KENDRA.includes(pl.house);
    out.push({
      id: m.yoga,
      name: `${m.yoga} Yoga (Panch Mahapurusha)`,
      present,
      severity: "positive",
      detail: present
        ? `${m.planet} is ${pl.dignity} in ${SIGNS[pl.sign]} occupying kendra house ${pl.house}.`
        : `${m.planet} in ${SIGNS[pl.sign]} (house ${pl.house}) does not meet the kendra + dignity condition.`,
      effect: m.effect,
    });
  }

  // Gajakesari
  {
    const j = P("Jupiter"), mo = P("Moon");
    const dist = ((j.sign - mo.sign + 12) % 12) + 1;
    const present = KENDRA.includes(dist);
    out.push({
      id: "gajakesari",
      name: "Gajakesari Yoga",
      present,
      severity: "positive",
      detail: present
        ? `Jupiter is in kendra (${dist}th) from the Moon.`
        : `Jupiter is ${dist}th from the Moon — not a kendra.`,
      effect: "Lasting reputation, wisdom, wealth that survives adversity, patronage from elders.",
    });
  }

  // Budhaditya
  {
    const s = P("Sun"), me = P("Mercury");
    const present = s.sign === me.sign;
    out.push({
      id: "budhaditya",
      name: "Budhaditya Yoga",
      present,
      severity: "positive",
      detail: present
        ? `Sun and Mercury are conjunct in ${SIGNS[s.sign]} (house ${s.house}).`
        : "Sun and Mercury occupy different signs.",
      effect: "Intelligence, administrative talent, communication skills and recognition in intellectual fields.",
    });
  }

  // Chandra-Mangal
  {
    const mo = P("Moon"), ma = P("Mars");
    const present = mo.sign === ma.sign || Math.abs(((mo.sign - ma.sign + 12) % 12)) === 6;
    out.push({
      id: "chandramangal",
      name: "Chandra-Mangal Yoga",
      present,
      severity: "positive",
      detail: present
        ? "Moon and Mars are in conjunction or mutual opposition."
        : "Moon and Mars are neither conjunct nor opposed.",
      effect: "Earning capacity through enterprise, real estate and bold financial moves.",
    });
  }

  // Lakshmi Yoga: 9th lord strong + lagna lord strong
  {
    const l9 = lordOfHouse(chart, 9);
    const l1 = lordOfHouse(chart, 1);
    const p9 = P(l9), p1 = P(l1);
    const strong = (p: PlanetPosition) =>
      ["Exalted", "Own Sign", "Mooltrikona"].includes(p.dignity);
    const present = strong(p9) && (strong(p1) || KENDRA.includes(p1.house));
    out.push({
      id: "lakshmi",
      name: "Lakshmi Yoga",
      present,
      severity: "positive",
      detail: `9th lord ${l9} is ${p9.dignity} in house ${p9.house}; lagna lord ${l1} is ${p1.dignity} in house ${p1.house}.`,
      effect: "Sustained prosperity, landed assets, graceful fortune and family honour.",
    });
  }

  // Dharma-Karmadhipati: 9th & 10th lords connected
  {
    const l9 = lordOfHouse(chart, 9), l10 = lordOfHouse(chart, 10);
    const p9 = P(l9), p10 = P(l10);
    const dist = ((p9.sign - p10.sign + 12) % 12);
    const present = l9 === l10 || dist === 0 || dist === 6;
    out.push({
      id: "dharmakarma",
      name: "Dharma-Karmadhipati Yoga",
      present,
      severity: "positive",
      detail: `9th lord ${l9} (house ${p9.house}) and 10th lord ${l10} (house ${p10.house}).`,
      effect: "A career aligned with dharma; authority, fame and ethical leadership.",
    });
  }

  // Vipreet Raja Yoga: lords of 6/8/12 placed in 6/8/12
  {
    const dusthana = [6, 8, 12];
    const hits = dusthana
      .map((h) => ({ h, lord: lordOfHouse(chart, h) }))
      .filter(({ lord }) => dusthana.includes(P(lord).house));
    out.push({
      id: "vipreet",
      name: "Vipreet Raja Yoga",
      present: hits.length > 0,
      severity: "positive",
      detail: hits.length
        ? hits.map(({ h, lord }) => `${h}th lord ${lord} in house ${P(lord).house}`).join("; ")
        : "No dusthana lord is placed in another dusthana.",
      effect: "Rise after crisis — adversity converts into unexpected success and gain.",
    });
  }

  // Neechbhanga Raja Yoga — dispositor of the debilitation sign, OR the planet
  // that is exalted in that same sign, must sit in a kendra from Lagna or Moon.
  {
    const moonSign = get(chart, "Moon").sign;
    const inKendra = (p: PlanetPosition) =>
      KENDRA.includes(p.house) || KENDRA.includes(((p.sign - moonSign + 12) % 12) + 1);

    const debil = chart.planets.filter((p) => p.dignity === "Debilitated");
    const reasons: string[] = [];
    const cancelled = debil.filter((p) => {
      const dispositor = SIGN_LORDS[p.sign]!;
      const dp = P(dispositor);
      const exaltLord = EXALTATION_SIGN_OWNER[p.sign];
      const ep = exaltLord ? P(exaltLord) : undefined;
      const byDispositor = inKendra(dp);
      const byExaltLord = !!ep && inKendra(ep);
      if (byDispositor) reasons.push(`${p.planet}: dispositor ${dispositor} in kendra from Lagna/Moon`);
      if (byExaltLord) reasons.push(`${p.planet}: ${exaltLord} (exalted in ${SIGNS[p.sign]}) in kendra from Lagna/Moon`);
      return byDispositor || byExaltLord;
    });
    out.push({
      id: "neechbhanga",
      name: "Neechbhanga Raja Yoga",
      present: cancelled.length > 0,
      severity: "positive",
      detail: debil.length
        ? `Debilitated: ${debil.map((d) => d.planet).join(", ")}. ${reasons.length ? reasons.join("; ") + "." : "No kendra-based cancellation applies."}`
        : "No planet is debilitated in this chart.",
      effect: "Debilitation is cancelled — great rise from humble beginnings.",
    });
  }


  // Kendra-Trikona Raja Yoga
  {
    const kLords = KENDRA.map((h) => lordOfHouse(chart, h));
    const tLords = TRIKONA.map((h) => lordOfHouse(chart, h));
    const pairs: string[] = [];
    for (const k of kLords) {
      for (const t of tLords) {
        if (k === t) continue;
        if (P(k).sign === P(t).sign) pairs.push(`${k} + ${t} in ${SIGNS[P(k).sign]}`);
      }
    }
    out.push({
      id: "rajayoga",
      name: "Kendra-Trikona Raja Yoga",
      present: pairs.length > 0,
      severity: "positive",
      detail: pairs.length ? pairs.join("; ") : "No kendra and trikona lords are conjoined.",
      effect: "Classical Raja Yoga — power, position and respected achievement.",
    });
  }

  // Dhana Yoga: 2nd & 11th lords linked
  {
    const l2 = lordOfHouse(chart, 2), l11 = lordOfHouse(chart, 11);
    const present = P(l2).sign === P(l11).sign || l2 === l11;
    out.push({
      id: "dhana",
      name: "Dhana Yoga",
      present,
      severity: "positive",
      detail: `2nd lord ${l2} in house ${P(l2).house}, 11th lord ${l11} in house ${P(l11).house}.`,
      effect: "Accumulation of wealth, multiple income streams, financial stability.",
    });
  }

  return out;
}

export function detectDoshas(chart: Chart): Finding[] {
  const out: Finding[] = [];
  const P = (p: PlanetKey) => get(chart, p);

  // Mangal Dosha
  {
    const ma = P("Mars");
    const houses = [1, 4, 7, 8, 12];
    const fromLagna = houses.includes(ma.house);
    const fromMoon = houses.includes(housesFromMoon(chart, ma));
    const cancel: string[] = [];
    if (["Own Sign", "Exalted", "Mooltrikona"].includes(ma.dignity))
      cancel.push(`Mars is ${ma.dignity} in ${SIGNS[ma.sign]}`);
    const benefics = chart.planets.filter(
      (p) => NATURAL_BENEFIC.includes(p.planet) && (p.sign === ma.sign || ((p.sign - ma.sign + 12) % 12) === 6),
    );
    if (benefics.length) cancel.push(`Benefic influence from ${benefics.map((b) => b.planet).join(", ")}`);
    if ([3, 6, 11].includes(ma.house)) cancel.push("Mars occupies an upachaya house");

    const present = (fromLagna || fromMoon) && cancel.length === 0;
    out.push({
      id: "mangal",
      name: "Mangal (Kuja) Dosha",
      present,
      severity: present ? "severe" : "caution",
      detail: `Mars sits in house ${ma.house} from Lagna and house ${housesFromMoon(chart, ma)} from Moon.${cancel.length ? " Cancellation: " + cancel.join("; ") + "." : ""}`,
      effect: present
        ? "Friction and delay in marriage; match with a similarly Manglik partner and perform Mangal shanti."
        : "Manglik affliction is absent or neutralised by classical cancellation rules.",
    });
  }

  // Kaal Sarp Dosha
  {
    const rahu = P("Rahu");
    const others = chart.planets.filter((p) => p.planet !== "Rahu" && p.planet !== "Ketu");
    const rel = others.map((p) => (p.longitude - rahu.longitude + 360) % 360);
    const allOneSide = rel.every((r) => r > 0 && r < 180) || rel.every((r) => r > 180);
    const TYPES = [
      "Anant", "Kulik", "Vasuki", "Shankhpal", "Padma", "Mahapadma",
      "Takshak", "Karkotak", "Shankhachood", "Ghatak", "Vishdhar", "Sheshnaag",
    ];
    const type = TYPES[rahu.house - 1]!;
    out.push({
      id: "kaalsarp",
      name: "Kaal Sarp Dosha",
      present: allOneSide,
      severity: allOneSide ? "severe" : "caution",
      detail: allOneSide
        ? `All seven grahas are hemmed between Rahu (house ${rahu.house}) and Ketu — type: ${type} Kaal Sarp.`
        : "Planets fall on both sides of the Rahu-Ketu axis; the dosha does not form.",
      effect: allOneSide
        ? "Cyclical struggle and delayed results; Nag Panchami rites and Rahu-Ketu shanti are advised."
        : "No serpentine confinement of the chart.",
    });
  }

  // Pitra Dosha
  {
    const sun = P("Sun"), rahu = P("Rahu"), sat = P("Saturn");
    const ninth = chart.planets.filter((p) => p.house === 9);
    const present =
      sun.sign === rahu.sign || sun.sign === sat.sign ||
      ninth.some((p) => p.planet === "Rahu" || p.planet === "Ketu" || p.planet === "Saturn");
    out.push({
      id: "pitra",
      name: "Pitra Dosha",
      present,
      severity: present ? "caution" : "positive",
      detail: present
        ? `Affliction of the Sun / 9th house detected (${ninth.map((p) => p.planet).join(", ") || "Sun conjunct malefic"}).`
        : "Sun and the 9th house are free of Rahu/Ketu/Saturn affliction.",
      effect: "Ancestral karmic debt; Shraddha, Tarpan and Pitru Paksha offerings bring relief.",
    });
  }

  // Guru Chandal
  {
    const j = P("Jupiter"), r = P("Rahu"), k = P("Ketu");
    const present = j.sign === r.sign || j.sign === k.sign;
    out.push({
      id: "guruchandal",
      name: "Guru Chandal Dosha",
      present,
      severity: present ? "caution" : "positive",
      detail: present
        ? `Jupiter is conjunct ${j.sign === r.sign ? "Rahu" : "Ketu"} in ${SIGNS[j.sign]}.`
        : "Jupiter is free from the nodal axis.",
      effect: "Unconventional beliefs and disputes with mentors; Guru mantra and ethical discipline help.",
    });
  }

  // Grahan Dosha
  {
    const s = P("Sun"), mo = P("Moon"), r = P("Rahu"), k = P("Ketu");
    const present = s.sign === r.sign || s.sign === k.sign || mo.sign === r.sign || mo.sign === k.sign;
    out.push({
      id: "grahan",
      name: "Grahan Dosha",
      present,
      severity: present ? "caution" : "positive",
      detail: present
        ? "Luminary conjunct the nodal axis (eclipse-type combination)."
        : "Neither luminary is eclipsed by Rahu or Ketu.",
      effect: "Fluctuating confidence and mental unrest; Surya/Chandra remedies stabilise the mind.",
    });
  }

  // Kemdrum Dosha + classical Kemdrum Bhanga (cancellation)
  {
    const mo = P("Moon");
    const NODES_AND_SUN = ["Moon", "Sun", "Rahu", "Ketu"];

    // 2nd and 12th from Moon, excluding Sun, Rahu and Ketu.
    const supporters = chart.planets.filter((p) => {
      if (NODES_AND_SUN.includes(p.planet)) return false;
      const d = ((p.sign - mo.sign + 12) % 12) + 1;
      return d === 2 || d === 12;
    });

    const cancellations: string[] = [];

    // Rule A — Moon in own sign (Cancer) or exalted (Taurus).
    if (mo.sign === 3 || mo.sign === 1)
      cancellations.push("Moon in own/exalted sign dissolves Kemdrum");

    // Rule B — Jupiter, Mars, Venus or Mercury in a kendra from Lagna or from Moon.
    const kendraPlanets = (["Jupiter", "Mars", "Venus", "Mercury"] as PlanetKey[]).filter((k) => {
      const pl = P(k);
      const fromMoon = ((pl.sign - mo.sign + 12) % 12) + 1;
      return KENDRA.includes(pl.house) || KENDRA.includes(fromMoon);
    });
    if (kendraPlanets.length)
      cancellations.push(`${kendraPlanets.join(", ")} occupy a kendra from Lagna or Moon`);

    // Rule C — Gajakesari: Jupiter in kendra from the Moon.
    const jupFromMoon = ((P("Jupiter").sign - mo.sign + 12) % 12) + 1;
    if (KENDRA.includes(jupFromMoon))
      cancellations.push(`Gajakesari: Jupiter is ${jupFromMoon}th (kendra) from the Moon`);

    const isolated = supporters.length === 0;
    const present = isolated && cancellations.length === 0;

    out.push({
      id: "kemdrum",
      name: "Kemdrum Dosha",
      present,
      severity: present ? "caution" : "positive",
      detail: present
        ? "No planet (excluding Sun, Rahu, Ketu) occupies the 2nd or 12th from the Moon, and no classical cancellation applies."
        : isolated
          ? `Moon is unsupported in the 2nd/12th, but Kemdrum is cancelled — ${cancellations.join("; ")}.`
          : `Moon is flanked by ${supporters.map((p) => p.planet).join(", ")} in the 2nd/12th house from it.${cancellations.length ? " Additional cancellation: " + cancellations.join("; ") + "." : ""}`,
      effect: present
        ? "Emotional isolation and financial ups-and-downs; Monday fasts and Chandra remedies advised."
        : "Kemdrum affliction is absent or fully neutralised (Kemdrum Bhanga).",
    });
  }


  return out;
}

// ---- Sade Sati / Dhaiya ----

export interface SadeSatiStatus {
  active: boolean;
  phase: string;
  transitSign: string;
  moonSign: string;
  detail: string;
  dhaiya: boolean;
}

export function sadeSati(chart: Chart, saturnTransitSign: number): SadeSatiStatus {
  const moon = get(chart, "Moon");
  const rel = (saturnTransitSign - moon.sign + 12) % 12;
  const active = rel === 11 || rel === 0 || rel === 1;
  const phase =
    rel === 11 ? "First phase (Rising) — 12th from Moon"
      : rel === 0 ? "Second phase (Peak) — over natal Moon"
        : rel === 1 ? "Third phase (Setting) — 2nd from Moon"
          : "Not running";
  const dhaiya = rel === 3 || rel === 7;
  return {
    active,
    phase,
    transitSign: SIGNS[saturnTransitSign]!,
    moonSign: SIGNS[moon.sign]!,
    dhaiya,
    detail: active
      ? `Saturn transits ${SIGNS[saturnTransitSign]}, ${rel === 11 ? "12th" : rel === 0 ? "1st" : "2nd"} from your natal Moon in ${SIGNS[moon.sign]}.`
      : dhaiya
        ? `Kantaka Shani / Dhaiya is running: Saturn is ${rel + 1}th from your natal Moon.`
        : `Saturn is ${rel + 1}th from your natal Moon — neither Sade Sati nor Dhaiya is active.`,
  };
}
