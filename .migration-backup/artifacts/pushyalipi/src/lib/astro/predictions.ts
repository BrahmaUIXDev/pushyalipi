// Trilingual predictive engine: Life Blueprint, Career/Wealth, Marriage,
// 10-Year Dasha Roadmap, Transits and Remedies.

import { PlanetKey } from "./ephemeris";
import { tropicalPosition } from "./ephemeris";
import { lahiriAyanamsha, dateToJd, norm360 } from "./core";
import { Chart, SIGN_LORDS, PlanetPosition } from "./vedic";
import { findActivePath, buildVimshottari, DashaNode } from "./dasha";

export type PredLang = "en" | "or" | "hi";

/* ------------------------------------------------------------------ */
/* Localisation primitives                                             */
/* ------------------------------------------------------------------ */

type Tri = [string, string, string];

const li = (l: PredLang) => (l === "en" ? 0 : l === "or" ? 1 : 2);
const pick = (t: Tri, l: PredLang) => t[li(l)]!;

const SIGN_TRI: Tri[] = [
  ["Aries", "ମେଷ", "मेष"],
  ["Taurus", "ବୃଷ", "वृषभ"],
  ["Gemini", "ମିଥୁନ", "मिथुन"],
  ["Cancer", "କର୍କଟ", "कर्क"],
  ["Leo", "ସିଂହ", "सिंह"],
  ["Virgo", "କନ୍ୟା", "कन्या"],
  ["Libra", "ତୁଳା", "तुला"],
  ["Scorpio", "ବୃଶ୍ଚିକ", "वृश्चिक"],
  ["Sagittarius", "ଧନୁ", "धनु"],
  ["Capricorn", "ମକର", "मकर"],
  ["Aquarius", "କୁମ୍ଭ", "कुंभ"],
  ["Pisces", "ମୀନ", "मीन"],
];

const PLANET_TRI: Record<PlanetKey, Tri> = {
  Sun: ["Sun", "ସୂର୍ଯ୍ୟ", "सूर्य"],
  Moon: ["Moon", "ଚନ୍ଦ୍ର", "चंद्र"],
  Mars: ["Mars", "ମଙ୍ଗଳ", "मंगल"],
  Mercury: ["Mercury", "ବୁଧ", "बुध"],
  Jupiter: ["Jupiter", "ବୃହସ୍ପତି", "गुरु"],
  Venus: ["Venus", "ଶୁକ୍ର", "शुक्र"],
  Saturn: ["Saturn", "ଶନି", "शनि"],
  Rahu: ["Rahu", "ରାହୁ", "राहु"],
  Ketu: ["Ketu", "କେତୁ", "केतु"],
};

const DIGNITY_TRI: Record<string, Tri> = {
  Exalted: ["Exalted", "ଉଚ୍ଚ", "उच्च"],
  Debilitated: ["Debilitated", "ନୀଚ", "नीच"],
  Mooltrikona: ["Mooltrikona", "ମୂଳତ୍ରିକୋଣ", "मूलत्रिकोण"],
  "Own Sign": ["Own Sign", "ସ୍ୱଗୃହ", "स्वगृह"],
  Neutral: ["Neutral", "ସମ", "सम"],
};

const MONTH_TRI: Tri[] = [
  ["Jan", "ଜାନୁ", "जन"],
  ["Feb", "ଫେବ୍ରୁ", "फर"],
  ["Mar", "ମାର୍ଚ୍ଚ", "मार्च"],
  ["Apr", "ଅପ୍ରେଲ", "अप्रै"],
  ["May", "ମେ", "मई"],
  ["Jun", "ଜୁନ", "जून"],
  ["Jul", "ଜୁଲାଇ", "जुल"],
  ["Aug", "ଅଗଷ୍ଟ", "अग"],
  ["Sep", "ସେପ୍ଟେ", "सित"],
  ["Oct", "ଅକ୍ଟୋ", "अक्टू"],
  ["Nov", "ନଭେ", "नव"],
  ["Dec", "ଡିସେ", "दिस"],
];

const UI: Record<string, Tri> = {
  lifeBlueprint: ["Life Blueprint", "ଜୀବନ ନକ୍ସା", "जीवन खाका"],
  career: ["Career, Business & Wealth", "କର୍ମ, ବ୍ୟବସାୟ ଓ ଧନ", "करियर, व्यवसाय एवं धन"],
  marriage: ["Marriage & Partner", "ବିବାହ ଏବଂ ସମ୍ପର୍କ", "विवाह एवं जीवनसाथी"],
  roadmap: ["10-Year Dasha Roadmap", "ଦଶ ବର୍ଷର ଦଶା ପଥ", "दस वर्षीय दशा मार्ग"],
  transits: ["Gochar — Transit Forecast", "ଗୋଚର — ଭ୍ରମଣ ଫଳ", "गोचर — पारगमन फल"],
  remedies: ["Authentic Vedic Remedies", "ପ୍ରାମାଣିକ ବୈଦିକ ଉପଚାର", "प्रामाणिक वैदिक उपाय"],
  current: ["Current", "ଚାଲୁ", "वर्तमान"],
  upcoming: ["Upcoming", "ଆଗାମୀ", "आगामी"],
  house: ["house", "ଭାବ", "भाव"],
  mahadasha: ["Mahadasha", "ମହାଦଶା", "महादशा"],
  antardasha: ["Antardasha", "ଅନ୍ତର୍ଦଶା", "अंतर्दशा"],
};

export const tPred = (key: string, lang: PredLang) =>
  UI[key] ? pick(UI[key]!, lang) : key;

const S = (i: number, l: PredLang) => pick(SIGN_TRI[i % 12]!, l);
const P = (p: PlanetKey, l: PredLang) => pick(PLANET_TRI[p], l);
const D = (d: string, l: PredLang) => pick(DIGNITY_TRI[d] ?? ["", "", ""], l);
const MY = (dt: Date, l: PredLang) =>
  `${pick(MONTH_TRI[dt.getMonth()]!, l)} ${dt.getFullYear()}`;

/* ------------------------------------------------------------------ */
/* Chart helpers                                                       */
/* ------------------------------------------------------------------ */

const get = (chart: Chart, p: PlanetKey): PlanetPosition =>
  chart.planets.find((x) => x.planet === p)!;

const lordOf = (chart: Chart, house: number): PlanetKey =>
  SIGN_LORDS[(chart.ascSign + house - 1) % 12]!;

const strengthScore = (p: PlanetPosition) => {
  let s = 50;
  if (p.dignity === "Exalted") s += 30;
  if (p.dignity === "Mooltrikona") s += 22;
  if (p.dignity === "Own Sign") s += 18;
  if (p.dignity === "Debilitated") s -= 28;
  if (p.combust) s -= 15;
  if (p.retrograde) s -= 5;
  if ([1, 4, 7, 10, 5, 9].includes(p.house)) s += 12;
  if ([6, 8, 12].includes(p.house)) s -= 12;
  return Math.max(5, Math.min(98, s));
};

export interface TimelineEntry {
  label: string;
  period: string;
  tag: "current" | "upcoming";
  note: string;
}

export interface Section {
  id: string;
  title: string;
  score?: number;
  intro?: string;
  points: string[];
  timeline?: TimelineEntry[];
}

const dashaTree = (chart: Chart) =>
  buildVimshottari(get(chart, "Moon").longitude, chart.utcDate);

/* ------------------------------------------------------------------ */
/* 1. Life Blueprint                                                   */
/* ------------------------------------------------------------------ */

const LAGNA_NATURE: Tri[] = [
  ["pioneering, courageous and impatient for results", "ଅଗ୍ରଣୀ, ସାହସୀ ଏବଂ ଫଳ ପାଇଁ ଅଧୀର", "अग्रणी, साहसी और परिणाम हेतु अधीर"],
  ["patient, resource-building and pleasure-loving", "ଧୈର୍ଯ୍ୟବାନ, ସମ୍ପଦ ସଞ୍ଚୟକାରୀ ଓ ସୁଖପ୍ରିୟ", "धैर्यवान, संसाधन-संचयी और सुखप्रिय"],
  ["curious, versatile and quick in speech", "କୌତୂହଳୀ, ବହୁମୁଖୀ ଏବଂ ବାକ୍ଚତୁର", "जिज्ञासु, बहुमुखी और वाक्पटु"],
  ["emotional, protective and deeply attached to home", "ଭାବପ୍ରବଣ, ରକ୍ଷଣଶୀଳ ଓ ଗୃହପ୍ରିୟ", "भावुक, रक्षात्मक और गृहप्रिय"],
  ["dignified, leadership-driven and generous", "ମର୍ଯ୍ୟାଦାପୂର୍ଣ୍ଣ, ନେତୃତ୍ୱପ୍ରିୟ ଏବଂ ଉଦାର", "गरिमामय, नेतृत्वप्रिय और उदार"],
  ["analytical, precise and service-minded", "ବିଶ୍ଳେଷଣାତ୍ମକ, ସୂକ୍ଷ୍ମ ଓ ସେବାପରାୟଣ", "विश्लेषणात्मक, सूक्ष्म और सेवाभावी"],
  ["balanced, diplomatic and aesthetically refined", "ସନ୍ତୁଳିତ, କୂଟନୀତିଜ୍ଞ ଏବଂ ସୌନ୍ଦର୍ଯ୍ୟପ୍ରିୟ", "संतुलित, कूटनीतिक और सौंदर्यप्रिय"],
  ["intense, secretive and transformative", "ତୀବ୍ର, ଗୋପନୀୟ ଓ ରୂପାନ୍ତରକାରୀ", "तीव्र, गोपनीय और रूपांतरकारी"],
  ["philosophical, optimistic and truth-seeking", "ଦାର୍ଶନିକ, ଆଶାବାଦୀ ଏବଂ ସତ୍ୟାନ୍ୱେଷୀ", "दार्शनिक, आशावादी और सत्यान्वेषी"],
  ["disciplined, ambitious and duty-bound", "ଅନୁଶାସିତ, ଉଚ୍ଚାକାଂକ୍ଷୀ ଓ କର୍ତ୍ତବ୍ୟନିଷ୍ଠ", "अनुशासित, महत्वाकांक्षी और कर्तव्यनिष्ठ"],
  ["original, humanitarian and future-facing", "ମୌଳିକ, ମାନବବାଦୀ ଏବଂ ଭବିଷ୍ୟମୁଖୀ", "मौलिक, मानवतावादी और भविष्योन्मुख"],
  ["compassionate, imaginative and spiritually inclined", "କରୁଣାମୟ, କଳ୍ପନାଶୀଳ ଓ ଆଧ୍ୟାତ୍ମିକ", "करुणामय, कल्पनाशील और आध्यात्मिक"],
];

export function lifeBlueprint(chart: Chart, lang: PredLang = "en"): Section {
  const l = lang;
  const asc = chart.ascSign;
  const lagnaLord = lordOf(chart, 1);
  const ll = get(chart, lagnaLord);
  const moon = get(chart, "Moon");
  const sun = get(chart, "Sun");
  const score = Math.round((strengthScore(ll) + strengthScore(moon) + strengthScore(sun)) / 3);

  const intro = pick(
    [
      `Your Lagna is ${S(asc, "en")} with ${P(lagnaLord, "en")} as its lord, making the core nature ${pick(LAGNA_NATURE[asc]!, "en")}. Mind (Moon) rests in ${S(moon.sign, "en")} and soul (Sun) in ${S(sun.sign, "en")}, together shaping how you feel, decide and shine.`,
      `ଆପଣଙ୍କ ଲଗ୍ନ ${S(asc, "or")}, ଏହାର ଅଧିପତି ${P(lagnaLord, "or")}, ତେଣୁ ମୌଳିକ ପ୍ରକୃତି ${pick(LAGNA_NATURE[asc]!, "or")}। ମନ (ଚନ୍ଦ୍ର) ${S(moon.sign, "or")}ରେ ଏବଂ ଆତ୍ମା (ସୂର୍ଯ୍ୟ) ${S(sun.sign, "or")}ରେ ଅଛି, ଯାହା ଆପଣଙ୍କ ଅନୁଭୂତି, ନିଷ୍ପତ୍ତି ଓ ପ୍ରତିଷ୍ଠାକୁ ଗଢ଼େ।`,
      `आपका लग्न ${S(asc, "hi")} है और उसके स्वामी ${P(lagnaLord, "hi")} हैं, अतः मूल प्रकृति ${pick(LAGNA_NATURE[asc]!, "hi")} है। मन (चंद्र) ${S(moon.sign, "hi")} में तथा आत्मा (सूर्य) ${S(sun.sign, "hi")} में स्थित है, जो आपकी अनुभूति, निर्णय और प्रतिष्ठा को गढ़ते हैं।`,
    ],
    l,
  );

  const benefics = chart.planets.filter((p) => strengthScore(p) >= 65);
  const weak = chart.planets.filter((p) => strengthScore(p) <= 40);

  const points = [
    pick(
      [
        `Lagna lord ${P(lagnaLord, "en")} sits in house ${ll.house} (${D(ll.dignity, "en")}) — your life force expresses most naturally through the affairs of that bhava.`,
        `ଲଗ୍ନାଧିପତି ${P(lagnaLord, "or")} ${ll.house} ଭାବରେ (${D(ll.dignity, "or")}) ଅଛନ୍ତି — ଆପଣଙ୍କ ଜୀବନଶକ୍ତି ସେହି ଭାବର କାର୍ଯ୍ୟରେ ସର୍ବାଧିକ ପ୍ରକଟ ହୁଏ।`,
        `लग्नेश ${P(lagnaLord, "hi")} ${ll.house} भाव में (${D(ll.dignity, "hi")}) हैं — आपकी जीवनशक्ति उसी भाव के कार्यों में सर्वाधिक प्रकट होती है।`,
      ],
      l,
    ),
    pick(
      [
        `Strong grahas in this chart: ${benefics.map((p) => P(p.planet, "en")).join(", ") || "none dominant"} — these give effortless results.`,
        `ଏହି କୁଣ୍ଡଳୀରେ ବଳବାନ ଗ୍ରହ: ${benefics.map((p) => P(p.planet, "or")).join(", ") || "କେହି ପ୍ରବଳ ନୁହନ୍ତି"} — ଏମାନେ ସହଜରେ ଶୁଭ ଫଳ ଦିଅନ୍ତି।`,
        `इस कुंडली में बलवान ग्रह: ${benefics.map((p) => P(p.planet, "hi")).join(", ") || "कोई प्रबल नहीं"} — ये सहज शुभ फल देते हैं।`,
      ],
      l,
    ),
    pick(
      [
        `Grahas needing support: ${weak.map((p) => P(p.planet, "en")).join(", ") || "none critically weak"} — conscious effort and remedies are advised here.`,
        `ସହାୟତା ଆବଶ୍ୟକ କରୁଥିବା ଗ୍ରହ: ${weak.map((p) => P(p.planet, "or")).join(", ") || "କେହି ଅତ୍ୟଧିକ ଦୁର୍ବଳ ନୁହନ୍ତି"} — ଏଠାରେ ସଚେତନ ପ୍ରୟାସ ଓ ଉପଚାର ଆବଶ୍ୟକ।`,
        `सहयोग चाहने वाले ग्रह: ${weak.map((p) => P(p.planet, "hi")).join(", ") || "कोई अत्यधिक निर्बल नहीं"} — यहाँ सजग प्रयास व उपाय आवश्यक हैं।`,
      ],
      l,
    ),
    pick(
      [
        `Moon in ${S(moon.sign, "en")} (house ${moon.house}) governs emotional rhythm; Sun in ${S(sun.sign, "en")} (house ${sun.house}) governs authority and recognition.`,
        `${S(moon.sign, "or")}ର ଚନ୍ଦ୍ର (${moon.house} ଭାବ) ଭାବନାର ଗତି ନିୟନ୍ତ୍ରଣ କରନ୍ତି; ${S(sun.sign, "or")}ର ସୂର୍ଯ୍ୟ (${sun.house} ଭାବ) ଅଧିକାର ଓ ସମ୍ମାନ ଦିଅନ୍ତି।`,
        `${S(moon.sign, "hi")} का चंद्र (${moon.house} भाव) भावनात्मक लय नियंत्रित करता है; ${S(sun.sign, "hi")} का सूर्य (${sun.house} भाव) अधिकार व सम्मान देता है।`,
      ],
      l,
    ),
  ];

  return { id: "blueprint", title: tPred("lifeBlueprint", l), score, intro, points };
}

/* ------------------------------------------------------------------ */
/* 2. Career, Business & Wealth                                        */
/* ------------------------------------------------------------------ */

const INDUSTRY: Tri[] = [
  ["Defence, engineering, surgery, sports, real estate", "ପ୍ରତିରକ୍ଷା, ଇଞ୍ଜିନିୟରିଂ, ଶଲ୍ୟଚିକିତ୍ସା, କ୍ରୀଡ଼ା, ଜମି-ବ୍ୟବସାୟ", "रक्षा, इंजीनियरिंग, शल्यचिकित्सा, खेल, भू-संपदा"],
  ["Banking, luxury goods, food, agriculture, cosmetics", "ବ୍ୟାଙ୍କିଂ, ବିଳାସ ସାମଗ୍ରୀ, ଖାଦ୍ୟ, କୃଷି, ପ୍ରସାଧନ", "बैंकिंग, विलासिता वस्तुएँ, खाद्य, कृषि, प्रसाधन"],
  ["Technology, media, writing, trading, consultancy", "ପ୍ରଯୁକ୍ତି, ଗଣମାଧ୍ୟମ, ଲେଖା, ବ୍ୟାପାର, ପରାମର୍ଶ", "प्रौद्योगिकी, मीडिया, लेखन, व्यापार, परामर्श"],
  ["Hospitality, healthcare, education, shipping, FMCG", "ଆତିଥ୍ୟ, ସ୍ୱାସ୍ଥ୍ୟସେବା, ଶିକ୍ଷା, ଜାହାଜ, ଦୈନନ୍ଦିନ ସାମଗ୍ରୀ", "आतिथ्य, स्वास्थ्य, शिक्षा, नौवहन, उपभोक्ता वस्तुएँ"],
  ["Public administration, politics, leadership, entertainment", "ପ୍ରଶାସନ, ରାଜନୀତି, ନେତୃତ୍ୱ, ମନୋରଞ୍ଜନ", "प्रशासन, राजनीति, नेतृत्व, मनोरंजन"],
  ["Analytics, audit, pharma, editing, services", "ବିଶ୍ଳେଷଣ, ଅଡିଟ, ଔଷଧ, ସମ୍ପାଦନା, ସେବା", "विश्लेषण, अंकेक्षण, औषधि, संपादन, सेवाएँ"],
  ["Design, fashion, law, diplomacy, creative arts", "ଡିଜାଇନ, ଫ୍ୟାଶନ, ଆଇନ, କୂଟନୀତି, କଳା", "डिज़ाइन, फैशन, विधि, कूटनीति, कला"],
  ["Research, insurance, occult, forensics, oil & mining", "ଗବେଷଣା, ବୀମା, ଗୁପ୍ତବିଦ୍ୟା, ଫରେନସିକ, ତେଲ ଓ ଖଣି", "अनुसंधान, बीमा, गूढ़विद्या, फोरेंसिक, तेल व खनन"],
  ["Teaching, law, publishing, finance advisory, spirituality", "ଶିକ୍ଷାଦାନ, ଆଇନ, ପ୍ରକାଶନ, ଆର୍ଥିକ ପରାମର୍ଶ, ଆଧ୍ୟାତ୍ମିକତା", "शिक्षण, विधि, प्रकाशन, वित्तीय परामर्श, अध्यात्म"],
  ["Corporate management, construction, mining, government", "କର୍ପୋରେଟ ପରିଚାଳନା, ନିର୍ମାଣ, ଖଣି, ସରକାରୀ ସେବା", "कॉर्पोरेट प्रबंधन, निर्माण, खनन, सरकारी सेवा"],
  ["Technology, aviation, social causes, R&D, networks", "ପ୍ରଯୁକ୍ତି, ବିମାନ, ସାମାଜିକ କାର୍ଯ୍ୟ, ଗବେଷଣା, ନେଟୱାର୍କ", "प्रौद्योगिकी, विमानन, सामाजिक कार्य, अनुसंधान, नेटवर्क"],
  ["Pharma, import-export, spirituality, arts, marine", "ଔଷଧ, ଆମଦାନୀ-ରପ୍ତାନୀ, ଆଧ୍ୟାତ୍ମିକତା, କଳା, ସାମୁଦ୍ରିକ", "औषधि, आयात-निर्यात, अध्यात्म, कला, समुद्री"],
];

export function careerReport(chart: Chart, lang: PredLang = "en"): Section {
  const l = lang;
  const l10 = lordOf(chart, 10);
  const p10 = get(chart, l10);
  const l2 = lordOf(chart, 2);
  const l11 = lordOf(chart, 11);
  const sat = get(chart, "Saturn");
  const sun = get(chart, "Sun");
  const merc = get(chart, "Mercury");
  const tenthSign = (chart.ascSign + 9) % 12;
  const score = Math.round((strengthScore(p10) + strengthScore(sun) + strengthScore(sat)) / 3);
  const business =
    strengthScore(get(chart, lordOf(chart, 6))) > 60 ||
    [3, 6, 10, 11].includes(get(chart, "Mars").house);

  const intro = pick(
    [
      `The 10th bhava of karma falls in ${S(tenthSign, "en")}, ruled by ${P(l10, "en")} placed in house ${p10.house} (${D(p10.dignity, "en")}). Your professional identity grows through disciplined skill rather than luck alone.`,
      `କର୍ମର ଦଶମ ଭାବ ${S(tenthSign, "or")}ରେ ପଡ଼ିଛି, ଅଧିପତି ${P(l10, "or")} ${p10.house} ଭାବରେ (${D(p10.dignity, "or")}) ଅଛନ୍ତି। ଆପଣଙ୍କ ବୃତ୍ତିଗତ ପରିଚୟ କେବଳ ଭାଗ୍ୟରେ ନୁହେଁ, ଅନୁଶାସିତ ଦକ୍ଷତାରେ ବଢ଼େ।`,
      `कर्म का दशम भाव ${S(tenthSign, "hi")} में है, स्वामी ${P(l10, "hi")} ${p10.house} भाव में (${D(p10.dignity, "hi")}) हैं। आपकी व्यावसायिक पहचान केवल भाग्य से नहीं, अनुशासित कौशल से बढ़ती है।`,
    ],
    l,
  );

  const points = [
    pick(
      [
        `Favourable fields: ${pick(INDUSTRY[tenthSign]!, "en")}.`,
        `ଅନୁକୂଳ କ୍ଷେତ୍ର: ${pick(INDUSTRY[tenthSign]!, "or")}।`,
        `अनुकूल क्षेत्र: ${pick(INDUSTRY[tenthSign]!, "hi")}।`,
      ],
      l,
    ),
    pick(
      [
        `Mercury in house ${merc.house} and Saturn in house ${sat.house} indicate ${sat.house === 10 || sat.house === 6 ? "steady growth through structured, long-haul effort" : "growth through skill, negotiation and timely repositioning"}.`,
        `${merc.house} ଭାବରେ ବୁଧ ଓ ${sat.house} ଭାବରେ ଶନି ସୂଚାନ୍ତି ${sat.house === 10 || sat.house === 6 ? "ସୁସଂଗଠିତ ଦୀର୍ଘକାଳୀନ ପରିଶ୍ରମରେ ସ୍ଥିର ଅଗ୍ରଗତି" : "ଦକ୍ଷତା, ବୁଝାମଣା ଓ ସମୟୋଚିତ ପରିବର୍ତ୍ତନରେ ଅଗ୍ରଗତି"}।`,
        `${merc.house} भाव में बुध और ${sat.house} भाव में शनि दर्शाते हैं ${sat.house === 10 || sat.house === 6 ? "सुसंगठित दीर्घकालिक परिश्रम से स्थिर उन्नति" : "कौशल, वार्ता और समयोचित परिवर्तन से उन्नति"}।`,
      ],
      l,
    ),
    business
      ? pick(
          [
            "Independent business or consultancy is well supported — the 3rd/6th axis grants competitive drive and risk appetite.",
            "ସ୍ୱାଧୀନ ବ୍ୟବସାୟ କିମ୍ବା ପରାମର୍ଶ କାର୍ଯ୍ୟ ଉତ୍ତମ ସମର୍ଥିତ — ତୃତୀୟ/ଷଷ୍ଠ ଅକ୍ଷ ପ୍ରତିଯୋଗିତା ଶକ୍ତି ଦିଏ।",
            "स्वतंत्र व्यवसाय या परामर्श कार्य भली प्रकार समर्थित है — तृतीय/षष्ठ अक्ष प्रतिस्पर्धी ऊर्जा देता है।",
          ],
          l,
        )
      : pick(
          [
            "Salaried leadership or institutional roles give steadier returns than independent business.",
            "ସ୍ୱାଧୀନ ବ୍ୟବସାୟ ଅପେକ୍ଷା ଚାକିରି କିମ୍ବା ସଂସ୍ଥାଗତ ନେତୃତ୍ୱ ଅଧିକ ସ୍ଥିର ଫଳ ଦିଏ।",
            "स्वतंत्र व्यवसाय की अपेक्षा नौकरी या संस्थागत नेतृत्व अधिक स्थिर फल देता है।",
          ],
          l,
        ),
    pick(
      [
        `Wealth is governed by ${P(l2, "en")} (2nd lord) and ${P(l11, "en")} (11th lord); their periods bring the sharpest income jumps.`,
        `ଧନ ${P(l2, "or")} (ଦ୍ୱିତୀୟାଧିପତି) ଓ ${P(l11, "or")} (ଏକାଦଶାଧିପତି) ଦ୍ୱାରା ନିୟନ୍ତ୍ରିତ; ସେମାନଙ୍କ ଦଶାରେ ଆୟ ସର୍ବାଧିକ ବଢ଼େ।`,
        `धन ${P(l2, "hi")} (द्वितीयेश) व ${P(l11, "hi")} (एकादशेश) से नियंत्रित है; उनकी दशा में आय सर्वाधिक बढ़ती है।`,
      ],
      l,
    ),
  ];

  return {
    id: "career",
    title: tPred("career", l),
    score,
    intro,
    points,
    timeline: dashaWindows(chart, [l2, l11, l10], lang, 4),
  };
}

/* ------------------------------------------------------------------ */
/* 3. Marriage & Partner                                               */
/* ------------------------------------------------------------------ */

const SPOUSE: Tri[] = [
  ["assertive, independent and quick-tempered", "ଦୃଢ଼, ସ୍ୱାଧୀନ ଏବଂ ଶୀଘ୍ର କ୍ରୋଧୀ", "दृढ़, स्वतंत्र और शीघ्र क्रोधी"],
  ["steady, sensual and financially careful", "ସ୍ଥିର, ସୁଖପ୍ରିୟ ଓ ଆର୍ଥିକ ଭାବେ ସାବଧାନ", "स्थिर, सुखप्रिय और आर्थिक रूप से सावधान"],
  ["witty, communicative and socially agile", "ବୁଦ୍ଧିମାନ, ବାକ୍ପଟୁ ଓ ସାମାଜିକ", "विनोदी, वाक्पटु और सामाजिक"],
  ["nurturing, emotional and family-centred", "ସ୍ନେହଶୀଳ, ଭାବପ୍ରବଣ ଏବଂ ପରିବାରକେନ୍ଦ୍ରିତ", "स्नेहशील, भावुक और परिवार-केंद्रित"],
  ["proud, warm and status-conscious", "ଗର୍ବିତ, ସ୍ନେହପୂର୍ଣ୍ଣ ଓ ମର୍ଯ୍ୟାଦା-ସଚେତନ", "स्वाभिमानी, स्नेही और प्रतिष्ठा-सजग"],
  ["analytical, health-conscious and service-oriented", "ବିଶ୍ଳେଷଣାତ୍ମକ, ସ୍ୱାସ୍ଥ୍ୟ-ସଚେତନ ଓ ସେବାପରାୟଣ", "विश्लेषणात्मक, स्वास्थ्य-सजग और सेवाभावी"],
  ["charming, artistic and diplomatic", "ଆକର୍ଷଣୀୟ, କଳାପ୍ରିୟ ଏବଂ କୂଟନୀତିଜ୍ଞ", "आकर्षक, कलाप्रिय और कूटनीतिक"],
  ["intense, private and research-minded", "ତୀବ୍ର, ଗୋପନୀୟ ଓ ଗବେଷଣାପ୍ରିୟ", "तीव्र, गोपनीय और अनुसंधानप्रिय"],
  ["philosophical, honest and travel-loving", "ଦାର୍ଶନିକ, ସତ୍ୟବାଦୀ ଏବଂ ଭ୍ରମଣପ୍ରିୟ", "दार्शनिक, सत्यवादी और भ्रमणप्रिय"],
  ["disciplined, ambitious and mature", "ଅନୁଶାସିତ, ଉଚ୍ଚାକାଂକ୍ଷୀ ଓ ପରିପକ୍ୱ", "अनुशासित, महत्वाकांक्षी और परिपक्व"],
  ["unconventional, friendly and modern", "ଅନନ୍ୟ, ବନ୍ଧୁତ୍ୱପୂର୍ଣ୍ଣ ଏବଂ ଆଧୁନିକ", "अपरंपरागत, मित्रवत और आधुनिक"],
  ["compassionate, spiritual and gentle", "କରୁଣାମୟ, ଆଧ୍ୟାତ୍ମିକ ଓ କୋମଳ", "करुणामय, आध्यात्मिक और कोमल"],
];

export function marriageReport(chart: Chart, lang: PredLang = "en"): Section {
  const l = lang;
  const l7 = lordOf(chart, 7);
  const p7 = get(chart, l7);
  const venus = get(chart, "Venus");
  const jup = get(chart, "Jupiter");
  const occupants = chart.planets.filter((p) => p.house === 7);
  const seventhSign = (chart.ascSign + 6) % 12;
  const score = Math.round((strengthScore(p7) + strengthScore(venus)) / 2);
  const mars = get(chart, "Mars");
  const manglik = [1, 4, 7, 8, 12].includes(mars.house);

  const intro = pick(
    [
      `The 7th bhava falls in ${S(seventhSign, "en")}, ruled by ${P(l7, "en")} in house ${p7.house} (${D(p7.dignity, "en")}). Venus, the karaka of love, occupies ${S(venus.sign, "en")} in house ${venus.house}.`,
      `ସପ୍ତମ ଭାବ ${S(seventhSign, "or")}ରେ ପଡ଼ିଛି, ଅଧିପତି ${P(l7, "or")} ${p7.house} ଭାବରେ (${D(p7.dignity, "or")})। ପ୍ରେମର କାରକ ଶୁକ୍ର ${S(venus.sign, "or")}ରେ ${venus.house} ଭାବରେ ଅଛନ୍ତି।`,
      `सप्तम भाव ${S(seventhSign, "hi")} में है, स्वामी ${P(l7, "hi")} ${p7.house} भाव में (${D(p7.dignity, "hi")})। प्रेम के कारक शुक्र ${S(venus.sign, "hi")} में ${venus.house} भाव में हैं।`,
    ],
    l,
  );

  const points = [
    occupants.length
      ? pick(
          [
            `Planets in the 7th house: ${occupants.map((o) => P(o.planet, "en")).join(", ")} — they directly colour partnership matters.`,
            `ସପ୍ତମ ଭାବରେ ଗ୍ରହ: ${occupants.map((o) => P(o.planet, "or")).join(", ")} — ଏମାନେ ସିଧାସଳଖ ଦାମ୍ପତ୍ୟକୁ ପ୍ରଭାବିତ କରନ୍ତି।`,
            `सप्तम भाव में ग्रह: ${occupants.map((o) => P(o.planet, "hi")).join(", ")} — ये सीधे दांपत्य को प्रभावित करते हैं।`,
          ],
          l,
        )
      : pick(
          [
            "No planet occupies the 7th house; results follow the 7th lord and Venus.",
            "ସପ୍ତମ ଭାବରେ କୌଣସି ଗ୍ରହ ନାହାନ୍ତି; ଫଳ ସପ୍ତମାଧିପତି ଓ ଶୁକ୍ରଙ୍କ ଅନୁସାରେ ମିଳେ।",
            "सप्तम भाव में कोई ग्रह नहीं; फल सप्तमेश व शुक्र के अनुसार मिलते हैं।",
          ],
          l,
        ),
    pick(
      [
        `Likely partner temperament: ${pick(SPOUSE[seventhSign]!, "en")}. Jupiter in house ${jup.house} shapes the values you seek in a partner.`,
        `ସମ୍ଭାବ୍ୟ ସାଥୀଙ୍କ ପ୍ରକୃତି: ${pick(SPOUSE[seventhSign]!, "or")}। ${jup.house} ଭାବର ବୃହସ୍ପତି ସାଥୀଠାରୁ ଆପଣ ଖୋଜୁଥିବା ମୂଲ୍ୟବୋଧ ନିର୍ଦ୍ଧାରଣ କରନ୍ତି।`,
        `संभावित जीवनसाथी की प्रकृति: ${pick(SPOUSE[seventhSign]!, "hi")}। ${jup.house} भाव के गुरु आपके अपेक्षित मूल्यों को गढ़ते हैं।`,
      ],
      l,
    ),
    manglik
      ? pick(
          [
            "Manglik factor present — prefer a partner with comparable Mars placement and perform Mangal shanti before fixing the match.",
            "ମାଙ୍ଗଳିକ ଦୋଷ ଅଛି — ସମାନ ମଙ୍ଗଳ ସ୍ଥିତିର ସାଥୀ ବାଛନ୍ତୁ ଏବଂ ବିବାହ ପୂର୍ବରୁ ମଙ୍ଗଳ ଶାନ୍ତି କରନ୍ତୁ।",
            "मांगलिक दोष है — समान मंगल स्थिति वाला जीवनसाथी चुनें और विवाह से पूर्व मंगल शांति कराएँ।",
          ],
          l,
        )
      : pick(
          [
            "No Manglik obstruction — horoscope matching remains straightforward.",
            "ମାଙ୍ଗଳିକ ବାଧା ନାହିଁ — କୁଣ୍ଡଳୀ ମିଳାଣ ସହଜ ରହିବ।",
            "मांगलिक बाधा नहीं — कुंडली मिलान सरल रहेगा।",
          ],
          l,
        ),
  ];

  return {
    id: "marriage",
    title: tPred("marriage", l),
    score,
    intro,
    points,
    timeline: dashaWindows(chart, [l7, "Venus", "Jupiter"], lang, 4),
  };
}

/* ------------------------------------------------------------------ */
/* 4. Dasha windows + 10-Year Roadmap                                  */
/* ------------------------------------------------------------------ */

const ROADMAP_NOTE: Record<PlanetKey, Tri> = {
  Sun: ["Authority, government links, recognition and paternal matters rise.", "ଅଧିକାର, ସରକାରୀ ସମ୍ପର୍କ, ସମ୍ମାନ ଓ ପିତୃ ସମ୍ବନ୍ଧୀୟ ବିଷୟ ବଢ଼େ।", "अधिकार, शासकीय संपर्क, सम्मान व पितृ-संबंधी विषय बढ़ते हैं।"],
  Moon: ["Emotional life, mother, travel and public contact dominate.", "ଭାବନା, ମାତା, ଯାତ୍ରା ଓ ଜନସମ୍ପର୍କ ପ୍ରଧାନ ରହେ।", "भावनाएँ, माता, यात्रा व जनसंपर्क प्रमुख रहते हैं।"],
  Mars: ["Courage, property, litigation and technical work intensify.", "ସାହସ, ସମ୍ପତ୍ତି, ମାମଲା ଓ ଯାନ୍ତ୍ରିକ କାର୍ଯ୍ୟ ବଢ଼େ।", "साहस, संपत्ति, वाद-विवाद व तकनीकी कार्य बढ़ते हैं।"],
  Mercury: ["Business, study, communication and contracts flourish.", "ବ୍ୟବସାୟ, ଅଧ୍ୟୟନ, ଯୋଗାଯୋଗ ଓ ଚୁକ୍ତି ଉନ୍ନତ ହୁଏ।", "व्यवसाय, अध्ययन, संचार व अनुबंध फलते हैं।"],
  Jupiter: ["Wisdom, wealth, children, marriage and guru-blessings expand.", "ଜ୍ଞାନ, ଧନ, ସନ୍ତାନ, ବିବାହ ଓ ଗୁରୁକୃପା ବଢ଼େ।", "ज्ञान, धन, संतान, विवाह व गुरुकृपा बढ़ती है।"],
  Venus: ["Love, comfort, vehicles, art and refined living increase.", "ପ୍ରେମ, ସୁଖ, ଯାନ, କଳା ଓ ସୁରୁଚିପୂର୍ଣ୍ଣ ଜୀବନ ବଢ଼େ।", "प्रेम, सुख, वाहन, कला व सुरुचिपूर्ण जीवन बढ़ता है।"],
  Saturn: ["Discipline, delay-then-reward, service and long-term structure.", "ଅନୁଶାସନ, ବିଳମ୍ବ ପରେ ଫଳ, ସେବା ଓ ଦୀର୍ଘକାଳୀନ ସ୍ଥିରତା।", "अनुशासन, विलंब के बाद फल, सेवा व दीर्घकालिक स्थिरता।"],
  Rahu: ["Sudden rise, foreign links, technology and unconventional gains.", "ହଠାତ୍ ଉନ୍ନତି, ବିଦେଶ ସମ୍ପର୍କ, ପ୍ରଯୁକ୍ତି ଓ ଅସାଧାରଣ ଲାଭ।", "आकस्मिक उन्नति, विदेश संपर्क, प्रौद्योगिकी व असामान्य लाभ।"],
  Ketu: ["Detachment, research, spirituality and course-correction.", "ବିରକ୍ତି, ଗବେଷଣା, ଆଧ୍ୟାତ୍ମିକତା ଓ ଦିଗ ପରିବର୍ତ୍ତନ।", "वैराग्य, अनुसंधान, अध्यात्म व दिशा-परिवर्तन।"],
};

function flatPairs(tree: DashaNode[]) {
  return tree.flatMap((m) => (m.children ?? []).map((a) => ({ m, a })));
}

/** Antardasha windows involving the given planets, from today onward. */
function dashaWindows(
  chart: Chart,
  planets: PlanetKey[],
  lang: PredLang,
  limit = 4,
  now = new Date(),
): TimelineEntry[] {
  const l = lang;
  const t = now.getTime();
  return flatPairs(dashaTree(chart))
    .filter(({ m, a }) => planets.includes(m.planet) || planets.includes(a.planet))
    .filter(({ a }) => a.end.getTime() > t)
    .slice(0, limit)
    .map(({ m, a }) => ({
      label: `${P(m.planet, l)} / ${P(a.planet, l)}`,
      period: `${MY(a.start, l)} – ${MY(a.end, l)}`,
      tag: (a.start.getTime() <= t ? "current" : "upcoming") as "current" | "upcoming",
      note: pick(ROADMAP_NOTE[a.planet], l),
    }));
}

export function dashaRoadmap(
  chart: Chart,
  lang: PredLang = "en",
  now = new Date(),
): Section {
  const l = lang;
  const tree = dashaTree(chart);
  const t = now.getTime();
  const horizon = t + 10 * 365.2425 * 86400000;
  const path = findActivePath(tree, now);
  const maha = path[0];
  const antar = path[1];

  const timeline: TimelineEntry[] = flatPairs(tree)
    .filter(({ a }) => a.end.getTime() > t && a.start.getTime() < horizon)
    .map(({ m, a }) => ({
      label: `${P(m.planet, l)} ${tPred("mahadasha", l)} / ${P(a.planet, l)} ${tPred("antardasha", l)}`,
      period: `${MY(a.start, l)} – ${MY(a.end, l)}`,
      tag: (a.start.getTime() <= t ? "current" : "upcoming") as "current" | "upcoming",
      note: pick(ROADMAP_NOTE[a.planet], l),
    }));

  const intro = maha
    ? pick(
        [
          `You are running the ${P(maha.planet, "en")} Mahadasha (${MY(maha.start, "en")} – ${MY(maha.end, "en")})${antar ? `, currently in the ${P(antar.planet, "en")} Antardasha until ${MY(antar.end, "en")}` : ""}. The next ten years unfold as below.`,
          `ଆପଣ ${P(maha.planet, "or")} ମହାଦଶା (${MY(maha.start, "or")} – ${MY(maha.end, "or")}) ଅତିକ୍ରମ କରୁଛନ୍ତି${antar ? `, ବର୍ତ୍ତମାନ ${P(antar.planet, "or")} ଅନ୍ତର୍ଦଶା ${MY(antar.end, "or")} ପର୍ଯ୍ୟନ୍ତ` : ""}। ଆଗାମୀ ଦଶ ବର୍ଷର ପଥ ନିମ୍ନରେ ଦିଆଗଲା।`,
          `आप ${P(maha.planet, "hi")} महादशा (${MY(maha.start, "hi")} – ${MY(maha.end, "hi")}) में चल रहे हैं${antar ? `, वर्तमान में ${P(antar.planet, "hi")} अंतर्दशा ${MY(antar.end, "hi")} तक` : ""}। आगामी दस वर्षों का मार्ग नीचे दिया गया है।`,
        ],
        l,
      )
    : pick(
        ["The Vimshottari cycle for this chart begins after the current period.", "ଏହି କୁଣ୍ଡଳୀର ବିଂଶୋତ୍ତରୀ ଚକ୍ର ପରବର୍ତ୍ତୀ କାଳରୁ ଆରମ୍ଭ ହୁଏ।", "इस कुंडली का विंशोत्तरी चक्र आगामी काल से आरंभ होता है।"],
        l,
      );

  return { id: "roadmap", title: tPred("roadmap", l), intro, points: [], timeline };
}

/* ------------------------------------------------------------------ */
/* 5. Transits                                                         */
/* ------------------------------------------------------------------ */

export function transitReport(chart: Chart, lang: PredLang = "en", when = new Date()): Section {
  const l = lang;
  const jd = dateToJd(when);
  const ayan = lahiriAyanamsha(jd);
  const sid = (p: PlanetKey) => norm360(tropicalPosition(p, jd) - ayan);
  const moon = get(chart, "Moon");
  const rel = (lon: number) => ((Math.floor(lon / 30) - moon.sign + 12) % 12) + 1;

  const satSign = Math.floor(sid("Saturn") / 30);
  const jupSign = Math.floor(sid("Jupiter") / 30);
  const rahuSign = Math.floor(sid("Rahu") / 30);
  const satH = rel(sid("Saturn"));
  const jupH = rel(sid("Jupiter"));
  const rahuH = rel(sid("Rahu"));

  const advice = (h: number): Tri =>
    [1, 4, 8, 12].includes(h)
      ? ["a phase demanding patience and conservation of energy", "ଧୈର୍ଯ୍ୟ ଓ ଶକ୍ତି ସଞ୍ଚୟ ଆବଶ୍ୟକ କରୁଥିବା ସମୟ", "धैर्य व ऊर्जा-संचय की माँग करने वाला काल"]
      : [3, 6, 11].includes(h)
        ? ["a highly favourable, gain-producing placement", "ଅତ୍ୟନ୍ତ ଶୁଭ ଓ ଲାଭଦାୟକ ସ୍ଥିତି", "अत्यंत शुभ व लाभदायक स्थिति"]
        : ["a mixed but workable influence", "ମିଶ୍ର ତଥାପି ପରିଚାଳନାଯୋଗ୍ୟ ପ୍ରଭାବ", "मिश्रित किंतु प्रबंधनीय प्रभाव"];

  const points = [
    pick(
      [
        `Saturn transits ${S(satSign, "en")}, the ${satH}th from your Moon — ${pick(advice(satH), "en")}.`,
        `ଶନି ${S(satSign, "or")}ରେ ଗୋଚର କରୁଛନ୍ତି, ଚନ୍ଦ୍ରଠାରୁ ${satH}ମ — ${pick(advice(satH), "or")}।`,
        `शनि ${S(satSign, "hi")} में गोचर कर रहे हैं, चंद्र से ${satH}वें — ${pick(advice(satH), "hi")}।`,
      ],
      l,
    ),
    pick(
      [
        `Jupiter transits ${S(jupSign, "en")}, the ${jupH}th from your Moon — ${[2, 5, 7, 9, 11].includes(jupH) ? "expansion in finances, learning and family matters" : "growth arrives with effort; avoid over-commitment"}.`,
        `ବୃହସ୍ପତି ${S(jupSign, "or")}ରେ ଗୋଚର କରୁଛନ୍ତି, ଚନ୍ଦ୍ରଠାରୁ ${jupH}ମ — ${[2, 5, 7, 9, 11].includes(jupH) ? "ଅର୍ଥ, ଶିକ୍ଷା ଓ ପାରିବାରିକ ବିଷୟରେ ବୃଦ୍ଧି" : "ପରିଶ୍ରମରେ ଅଗ୍ରଗତି; ଅତିରିକ୍ତ ପ୍ରତିଶ୍ରୁତି ଏଡ଼ାନ୍ତୁ"}।`,
        `गुरु ${S(jupSign, "hi")} में गोचर कर रहे हैं, चंद्र से ${jupH}वें — ${[2, 5, 7, 9, 11].includes(jupH) ? "धन, शिक्षा व पारिवारिक विषयों में वृद्धि" : "परिश्रम से उन्नति; अति-प्रतिबद्धता से बचें"}।`,
      ],
      l,
    ),
    pick(
      [
        `Rahu transits ${S(rahuSign, "en")} (${rahuH}th from Moon) with Ketu opposite — expect shifts in ${rahuH === 10 ? "career direction" : rahuH === 7 ? "partnerships" : rahuH === 4 ? "home and residence" : "focus and priorities"}.`,
        `ରାହୁ ${S(rahuSign, "or")}ରେ (ଚନ୍ଦ୍ରଠାରୁ ${rahuH}ମ) ଓ କେତୁ ବିପରୀତରେ — ${rahuH === 10 ? "କର୍ମ ଦିଗ" : rahuH === 7 ? "ସମ୍ପର୍କ" : rahuH === 4 ? "ଘର ଓ ବାସସ୍ଥାନ" : "ଲକ୍ଷ୍ୟ ଓ ପ୍ରାଥମିକତା"}ରେ ପରିବର୍ତ୍ତନ ଆସିବ।`,
        `राहु ${S(rahuSign, "hi")} में (चंद्र से ${rahuH}वें) व केतु सामने — ${rahuH === 10 ? "करियर की दिशा" : rahuH === 7 ? "संबंधों" : rahuH === 4 ? "घर व निवास" : "लक्ष्य व प्राथमिकताओं"} में परिवर्तन संभव है।`,
      ],
      l,
    ),
    pick(
      [
        `Monthly guidance: the 2–3 days when the transiting Moon returns to ${S(moon.sign, "en")} are best for launching personal initiatives.`,
        `ମାସିକ ମାର୍ଗଦର୍ଶନ: ଗୋଚର ଚନ୍ଦ୍ର ${S(moon.sign, "or")}କୁ ଫେରିବା ୨–୩ ଦିନ ନୂଆ କାର୍ଯ୍ୟ ଆରମ୍ଭ ପାଇଁ ଶ୍ରେଷ୍ଠ।`,
        `मासिक मार्गदर्शन: गोचर चंद्र के ${S(moon.sign, "hi")} में लौटने के 2–3 दिन नए कार्यारंभ हेतु श्रेष्ठ हैं।`,
      ],
      l,
    ),
  ];

  return { id: "transits", title: tPred("transits", l), points };
}

/* ------------------------------------------------------------------ */
/* 6. Remedies                                                         */
/* ------------------------------------------------------------------ */

interface Gem {
  stone: Tri;
  metal: Tri;
  finger: Tri;
  day: Tri;
  mantra: string;
}

const GEMSTONES: Record<PlanetKey, Gem> = {
  Sun: {
    stone: ["Ruby (Manikya)", "ମାଣିକ୍ୟ", "माणिक्य"],
    metal: ["gold or copper", "ସୁନା କିମ୍ବା ତମ୍ବା", "स्वर्ण या ताँबा"],
    finger: ["ring finger", "ଅନାମିକା", "अनामिका"],
    day: ["Sunday at sunrise", "ରବିବାର ସୂର୍ଯ୍ୟୋଦୟରେ", "रविवार सूर्योदय पर"],
    mantra: "Om Hraam Hreem Hraum Sah Suryaya Namah",
  },
  Moon: {
    stone: ["Natural Pearl (Moti)", "ମୁକ୍ତା", "मोती"],
    metal: ["silver", "ରୂପା", "चाँदी"],
    finger: ["little finger", "କନିଷ୍ଠା", "कनिष्ठा"],
    day: ["Monday evening", "ସୋମବାର ସନ୍ଧ୍ୟାରେ", "सोमवार संध्या को"],
    mantra: "Om Shraam Shreem Shraum Sah Chandraya Namah",
  },
  Mars: {
    stone: ["Red Coral (Moonga)", "ପ୍ରବାଳ", "मूँगा"],
    metal: ["copper or gold", "ତମ୍ବା କିମ୍ବା ସୁନା", "ताँबा या स्वर्ण"],
    finger: ["ring finger", "ଅନାମିକା", "अनामिका"],
    day: ["Tuesday at sunrise", "ମଙ୍ଗଳବାର ସୂର୍ଯ୍ୟୋଦୟରେ", "मंगलवार सूर्योदय पर"],
    mantra: "Om Kraam Kreem Kraum Sah Bhaumaya Namah",
  },
  Mercury: {
    stone: ["Emerald (Panna)", "ପାନ୍ନା", "पन्ना"],
    metal: ["gold", "ସୁନା", "स्वर्ण"],
    finger: ["little finger", "କନିଷ୍ଠା", "कनिष्ठा"],
    day: ["Wednesday morning", "ବୁଧବାର ସକାଳେ", "बुधवार प्रातः"],
    mantra: "Om Braam Breem Braum Sah Budhaya Namah",
  },
  Jupiter: {
    stone: ["Yellow Sapphire (Pukhraj)", "ପୁଷ୍ପରାଗ", "पुखराज"],
    metal: ["gold", "ସୁନା", "स्वर्ण"],
    finger: ["index finger", "ତର୍ଜନୀ", "तर्जनी"],
    day: ["Thursday morning", "ଗୁରୁବାର ସକାଳେ", "गुरुवार प्रातः"],
    mantra: "Om Graam Greem Graum Sah Gurave Namah",
  },
  Venus: {
    stone: ["Diamond or White Sapphire", "ହୀରା କିମ୍ବା ଶ୍ୱେତ ନୀଳମ", "हीरा या सफेद पुखराज"],
    metal: ["silver or platinum", "ରୂପା କିମ୍ବା ପ୍ଲାଟିନମ", "चाँदी या प्लेटिनम"],
    finger: ["middle finger", "ମଧ୍ୟମା", "मध्यमा"],
    day: ["Friday at sunrise", "ଶୁକ୍ରବାର ସୂର୍ଯ୍ୟୋଦୟରେ", "शुक्रवार सूर्योदय पर"],
    mantra: "Om Draam Dreem Draum Sah Shukraya Namah",
  },
  Saturn: {
    stone: ["Blue Sapphire (Neelam)", "ନୀଳମ", "नीलम"],
    metal: ["iron or silver", "ଲୁହା କିମ୍ବା ରୂପା", "लोहा या चाँदी"],
    finger: ["middle finger", "ମଧ୍ୟମା", "मध्यमा"],
    day: ["Saturday evening", "ଶନିବାର ସନ୍ଧ୍ୟାରେ", "शनिवार संध्या को"],
    mantra: "Om Praam Preem Praum Sah Shanaye Namah",
  },
  Rahu: {
    stone: ["Hessonite (Gomed)", "ଗୋମେଦ", "गोमेद"],
    metal: ["silver", "ରୂପା", "चाँदी"],
    finger: ["middle finger", "ମଧ୍ୟମା", "मध्यमा"],
    day: ["Saturday twilight", "ଶନିବାର ସନ୍ଧ୍ୟାଳୋକରେ", "शनिवार गोधूलि में"],
    mantra: "Om Bhraam Bhreem Bhraum Sah Rahave Namah",
  },
  Ketu: {
    stone: ["Cat's Eye (Lehsunia)", "ବୈଦୂର୍ଯ୍ୟ", "लहसुनिया"],
    metal: ["silver", "ରୂପା", "चाँदी"],
    finger: ["ring finger", "ଅନାମିକା", "अनामिका"],
    day: ["Tuesday twilight", "ମଙ୍ଗଳବାର ସନ୍ଧ୍ୟାଳୋକରେ", "मंगलवार गोधूलि में"],
    mantra: "Om Straam Streem Straum Sah Ketave Namah",
  },
};

const RUDRAKSHA: Record<PlanetKey, Tri> = {
  Sun: ["1 Mukhi", "୧ ମୁଖୀ", "1 मुखी"],
  Moon: ["2 Mukhi", "୨ ମୁଖୀ", "2 मुखी"],
  Mars: ["3 Mukhi", "୩ ମୁଖୀ", "3 मुखी"],
  Mercury: ["4 Mukhi", "୪ ମୁଖୀ", "4 मुखी"],
  Jupiter: ["5 Mukhi", "୫ ମୁଖୀ", "5 मुखी"],
  Venus: ["6 Mukhi", "୬ ମୁଖୀ", "6 मुखी"],
  Saturn: ["7 Mukhi", "୭ ମୁଖୀ", "7 मुखी"],
  Rahu: ["8 Mukhi", "୮ ମୁଖୀ", "8 मुखी"],
  Ketu: ["9 Mukhi", "୯ ମୁଖୀ", "9 मुखी"],
};

const CHARITY: Record<PlanetKey, Tri> = {
  Sun: ["Donate wheat, jaggery and copper on Sundays; offer water to the Sun daily.", "ରବିବାର ଗହମ, ଗୁଡ଼ ଓ ତମ୍ବା ଦାନ କରନ୍ତୁ; ପ୍ରତିଦିନ ସୂର୍ଯ୍ୟଙ୍କୁ ଅର୍ଘ୍ୟ ଦିଅନ୍ତୁ।", "रविवार को गेहूँ, गुड़ व ताँबा दान करें; प्रतिदिन सूर्य को अर्घ्य दें।"],
  Moon: ["Donate rice, milk and white cloth on Mondays; serve your mother.", "ସୋମବାର ଚାଉଳ, କ୍ଷୀର ଓ ଧଳା ବସ୍ତ୍ର ଦାନ କରନ୍ତୁ; ମାତାଙ୍କ ସେବା କରନ୍ତୁ।", "सोमवार को चावल, दूध व श्वेत वस्त्र दान करें; माता की सेवा करें।"],
  Mars: ["Donate red lentils and sweets on Tuesdays; support Hanuman temples.", "ମଙ୍ଗଳବାର ମସୁର ଡାଲି ଓ ମିଠା ଦାନ କରନ୍ତୁ; ହନୁମାନ ମନ୍ଦିରକୁ ସହଯୋଗ କରନ୍ତୁ।", "मंगलवार को मसूर दाल व मिष्ठान्न दान करें; हनुमान मंदिर में सहयोग करें।"],
  Mercury: ["Donate green moong and books on Wednesdays; help students.", "ବୁଧବାର ସବୁଜ ମୁଗ ଓ ପୁସ୍ତକ ଦାନ କରନ୍ତୁ; ଛାତ୍ରମାନଙ୍କୁ ସାହାଯ୍ୟ କରନ୍ତୁ।", "बुधवार को हरी मूँग व पुस्तकें दान करें; विद्यार्थियों की सहायता करें।"],
  Jupiter: ["Donate turmeric, chana dal and yellow cloth on Thursdays; respect teachers.", "ଗୁରୁବାର ହଳଦୀ, ଚଣା ଡାଲି ଓ ହଳଦିଆ ବସ୍ତ୍ର ଦାନ କରନ୍ତୁ; ଗୁରୁଙ୍କୁ ସମ୍ମାନ ଦିଅନ୍ତୁ।", "गुरुवार को हल्दी, चना दाल व पीत वस्त्र दान करें; गुरुजनों का सम्मान करें।"],
  Venus: ["Donate white sweets, curd and perfume on Fridays; support young girls.", "ଶୁକ୍ରବାର ଧଳା ମିଠା, ଦହି ଓ ସୁଗନ୍ଧ ଦାନ କରନ୍ତୁ; କନ୍ୟାମାନଙ୍କୁ ସହଯୋଗ କରନ୍ତୁ।", "शुक्रवार को श्वेत मिष्ठान्न, दही व इत्र दान करें; कन्याओं की सहायता करें।"],
  Saturn: ["Donate black sesame, iron and mustard oil on Saturdays; feed labourers.", "ଶନିବାର କଳା ରାଶି, ଲୁହା ଓ ସୋରିଷ ତେଲ ଦାନ କରନ୍ତୁ; ଶ୍ରମିକଙ୍କୁ ଭୋଜନ ଦିଅନ୍ତୁ।", "शनिवार को काले तिल, लोहा व सरसों तेल दान करें; श्रमिकों को भोजन कराएँ।"],
  Rahu: ["Donate blankets and coconut on Saturdays; feed stray dogs.", "ଶନିବାର କମ୍ବଳ ଓ ନଡ଼ିଆ ଦାନ କରନ୍ତୁ; ରାସ୍ତାର କୁକୁରଙ୍କୁ ଖାଦ୍ୟ ଦିଅନ୍ତୁ।", "शनिवार को कंबल व नारियल दान करें; गली के कुत्तों को भोजन दें।"],
  Ketu: ["Donate blankets and sesame; feed dogs and support ascetics.", "କମ୍ବଳ ଓ ରାଶି ଦାନ କରନ୍ତୁ; କୁକୁରଙ୍କୁ ଖାଦ୍ୟ ଦିଅନ୍ତୁ ଓ ସନ୍ନ୍ୟାସୀଙ୍କୁ ସହଯୋଗ କରନ୍ତୁ।", "कंबल व तिल दान करें; कुत्तों को भोजन दें और संतों की सेवा करें।"],
};

export function remediesReport(chart: Chart, lang: PredLang = "en"): Section {
  const l = lang;
  const lagnaLord = lordOf(chart, 1);
  const weakest = [...chart.planets]
    .filter((p) => !["Rahu", "Ketu"].includes(p.planet))
    .sort((a, b) => strengthScore(a) - strengthScore(b))[0]!;
  const active = findActivePath(dashaTree(chart), new Date())[0]?.planet ?? lagnaLord;

  const g = GEMSTONES[lagnaLord];
  const gw = GEMSTONES[weakest.planet];

  const intro = pick(
    [
      "Wear a gemstone only after energising it (pran-pratishtha) with its beej mantra on the prescribed day, and chant daily with a steady schedule.",
      "ରତ୍ନ ଧାରଣ ପୂର୍ବରୁ ନିର୍ଦ୍ଦିଷ୍ଟ ଦିନରେ ବୀଜ ମନ୍ତ୍ର ଦ୍ୱାରା ପ୍ରାଣ-ପ୍ରତିଷ୍ଠା କରନ୍ତୁ ଏବଂ ପ୍ରତିଦିନ ନିୟମିତ ଜପ କରନ୍ତୁ।",
      "रत्न धारण से पूर्व निर्धारित दिन बीज मंत्र द्वारा प्राण-प्रतिष्ठा कराएँ और प्रतिदिन नियमित जप करें।",
    ],
    l,
  );

  const points = [
    pick(
      [
        `Life-stone (Lagna lord ${P(lagnaLord, "en")}): ${pick(g.stone, "en")} set in ${pick(g.metal, "en")}, worn on the ${pick(g.finger, "en")}, first worn on ${pick(g.day, "en")}.`,
        `ଜୀବନ-ରତ୍ନ (ଲଗ୍ନାଧିପତି ${P(lagnaLord, "or")}): ${pick(g.stone, "or")}, ${pick(g.metal, "or")}ରେ ଜଡ଼ିତ, ${pick(g.finger, "or")}ରେ ଧାରଣ, ପ୍ରଥମେ ${pick(g.day, "or")} ପିନ୍ଧନ୍ତୁ।`,
        `जीवन-रत्न (लग्नेश ${P(lagnaLord, "hi")}): ${pick(g.stone, "hi")}, ${pick(g.metal, "hi")} में जड़वाकर ${pick(g.finger, "hi")} में धारण करें, प्रथम बार ${pick(g.day, "hi")}।`,
      ],
      l,
    ),
    pick(
      [
        `Supportive stone for the weakest graha ${P(weakest.planet, "en")}: ${pick(gw.stone, "en")} in ${pick(gw.metal, "en")} — wear only after a trial period.`,
        `ସର୍ବାଧିକ ଦୁର୍ବଳ ଗ୍ରହ ${P(weakest.planet, "or")} ପାଇଁ ସହାୟକ ରତ୍ନ: ${pick(gw.stone, "or")}, ${pick(gw.metal, "or")}ରେ — ପରୀକ୍ଷାମୂଳକ ଅବଧି ପରେ ହିଁ ଧାରଣ କରନ୍ତୁ।`,
        `सर्वाधिक निर्बल ग्रह ${P(weakest.planet, "hi")} हेतु सहायक रत्न: ${pick(gw.stone, "hi")}, ${pick(gw.metal, "hi")} में — परीक्षण अवधि के बाद ही धारण करें।`,
      ],
      l,
    ),
    pick(
      [
        `Beej mantra, 108 times daily: ${g.mantra}`,
        `ବୀଜ ମନ୍ତ୍ର, ପ୍ରତିଦିନ ୧୦୮ ଥର: ${g.mantra}`,
        `बीज मंत्र, प्रतिदिन 108 बार: ${g.mantra}`,
      ],
      l,
    ),
    pick(
      [
        `Running ${P(active, "en")} Mahadasha mantra: ${GEMSTONES[active].mantra}`,
        `ଚାଲୁ ${P(active, "or")} ମହାଦଶାର ମନ୍ତ୍ର: ${GEMSTONES[active].mantra}`,
        `चल रही ${P(active, "hi")} महादशा का मंत्र: ${GEMSTONES[active].mantra}`,
      ],
      l,
    ),
    pick(
      [
        `Rudraksha: ${pick(RUDRAKSHA[lagnaLord], "en")} for the Lagna lord and ${pick(RUDRAKSHA[weakest.planet], "en")} to strengthen ${P(weakest.planet, "en")}.`,
        `ରୁଦ୍ରାକ୍ଷ: ଲଗ୍ନାଧିପତି ପାଇଁ ${pick(RUDRAKSHA[lagnaLord], "or")} ଏବଂ ${P(weakest.planet, "or")}ଙ୍କୁ ବଳ ଦେବା ପାଇଁ ${pick(RUDRAKSHA[weakest.planet], "or")}।`,
        `रुद्राक्ष: लग्नेश हेतु ${pick(RUDRAKSHA[lagnaLord], "hi")} तथा ${P(weakest.planet, "hi")} को बल देने हेतु ${pick(RUDRAKSHA[weakest.planet], "hi")}।`,
      ],
      l,
    ),
    pick(CHARITY[weakest.planet], l),
    pick(
      [
        "Daily practice: light a ghee lamp at dusk, chant the Mahamrityunjaya mantra, and keep one weekly fast on your Lagna lord's day.",
        "ଦୈନନ୍ଦିନ ଅଭ୍ୟାସ: ସନ୍ଧ୍ୟାରେ ଘିଅ ଦୀପ ଜାଳନ୍ତୁ, ମହାମୃତ୍ୟୁଞ୍ଜୟ ମନ୍ତ୍ର ଜପ କରନ୍ତୁ ଏବଂ ଲଗ୍ନାଧିପତିଙ୍କ ବାରରେ ସାପ୍ତାହିକ ଉପବାସ ରଖନ୍ତୁ।",
        "दैनिक अभ्यास: संध्या को घी का दीप जलाएँ, महामृत्युंजय मंत्र का जप करें और लग्नेश के वार पर साप्ताहिक व्रत रखें।",
      ],
      l,
    ),
  ];

  return {
    id: "remedies",
    title: tPred("remedies", l),
    intro,
    points,
    timeline: dashaWindows(chart, [lagnaLord, weakest.planet], lang, 3),
  };
}

/* ------------------------------------------------------------------ */
/* Aggregate                                                           */
/* ------------------------------------------------------------------ */

export function buildPredictions(chart: Chart, lang: PredLang = "en"): Section[] {
  return [
    lifeBlueprint(chart, lang),
    careerReport(chart, lang),
    marriageReport(chart, lang),
    dashaRoadmap(chart, lang),
    transitReport(chart, lang),
    remediesReport(chart, lang),
  ];
}
