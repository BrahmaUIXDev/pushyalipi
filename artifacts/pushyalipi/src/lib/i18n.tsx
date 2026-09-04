import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "en" | "or" | "hi";

export const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "or", label: "ଓଡ଼ିଆ" },
  { code: "hi", label: "हिं" },
];

type Dict = Record<string, [string, string, string]>; // [en, or, hi]

const UI: Dict = {
  appName: ["Pushyalipi", "ପୁଷ୍ୟଲିପି", "पुष्यलिपि"],
  tagline: ["Vedic Astrology Technology", "ବୈଦିକ ଜ୍ୟୋତିଷ ପ୍ରଯୁକ୍ତି", "वैदिक ज्योतिष प्रौद्योगिकी"],
  heroTitle: ["The Authentic Vedic Astrological Blueprint", "ପ୍ରାମାଣିକ ବୈଦିକ ଜ୍ୟୋତିଷ ନକ୍ସା", "प्रामाणिक वैदिक ज्योतिषीय खाका"],
  heroSub: [
    "Complete Shodashvarga kundli, Vimshottari dasha, yogas, doshas and predictions — computed entirely in your browser.",
    "ସମ୍ପୂର୍ଣ୍ଣ ଷୋଡଶବର୍ଗ କୁଣ୍ଡଳୀ, ବିଂଶୋତ୍ତରୀ ଦଶା, ଯୋଗ, ଦୋଷ ଓ ଭବିଷ୍ୟବାଣୀ — ସମ୍ପୂର୍ଣ୍ଣ ଆପଣଙ୍କ ବ୍ରାଉଜରରେ ଗଣନା।",
    "सम्पूर्ण षोडशवर्ग कुंडली, विंशोत्तरी दशा, योग, दोष एवं भविष्यवाणी — पूरी तरह आपके ब्राउज़र में गणना।",
  ],
  fullName: ["Full Name", "ପୂର୍ଣ୍ଣ ନାମ", "पूरा नाम"],
  dob: ["Date of Birth", "ଜନ୍ମ ତାରିଖ", "जन्म तिथि"],
  tob: ["Time of Birth", "ଜନ୍ମ ସମୟ", "जन्म समय"],
  place: ["Birth Place", "ଜନ୍ମ ସ୍ଥାନ", "जन्म स्थान"],
  searchPlace: ["Search city or village…", "ସହର କିମ୍ବା ଗାଁ ଖୋଜନ୍ତୁ…", "शहर या गाँव खोजें…"],
  generate: ["Generate Pushyalipi Kundli", "ପୁଷ୍ୟଲିପି କୁଣ୍ଡଳୀ ତିଆରି କରନ୍ତୁ", "पुष्यलिपि कुंडली बनाएँ"],
  demo: ["Load Demo Kundli", "ନମୁନା କୁଣ୍ଡଳୀ", "डेमो कुंडली"],
  saved: ["Saved Kundlis", "ସଞ୍ଚିତ କୁଣ୍ଡଳୀ", "सहेजी कुंडलियाँ"],
  overview: ["Overview", "ସାରାଂଶ", "अवलोकन"],
  charts: ["Charts", "ଚକ୍ର", "चक्र"],
  planets: ["Planets", "ଗ୍ରହ", "ग्रह"],
  dasha: ["Dasha", "ଦଶା", "दशा"],
  strength: ["Strength", "ବଳ", "बल"],
  yogas: ["Yogas", "ଯୋଗ", "योग"],
  doshas: ["Doshas", "ଦୋଷ", "दोष"],
  predictions: ["Predictions", "ଭବିଷ୍ୟବାଣୀ", "भविष्यवाणी"],
  remedies: ["Remedies", "ଉପଚାର", "उपाय"],
  panchang: ["Panchang", "ପଞ୍ଚାଙ୍ଗ", "पंचांग"],
  tithi: ["Tithi", "ତିଥି", "तिथि"],
  yoga: ["Yoga", "ଯୋଗ", "योग"],
  karana: ["Karana", "କରଣ", "करण"],
  vara: ["Vara", "ବାର", "वार"],
  nakshatra: ["Nakshatra", "ନକ୍ଷତ୍ର", "नक्षत्र"],
  lagna: ["Lagna", "ଲଗ୍ନ", "लग्न"],
  moonSign: ["Moon Sign", "ଚନ୍ଦ୍ର ରାଶି", "चंद्र राशि"],
  sunSign: ["Sun Sign", "ସୂର୍ଯ୍ୟ ରାଶି", "सूर्य राशि"],
  house: ["House", "ଭାବ", "भाव"],
  sign: ["Sign", "ରାଶି", "राशि"],
  lord: ["Lord", "ଅଧିପତି", "स्वामी"],
  degree: ["Degree", "ଅଂଶ", "अंश"],
  pada: ["Pada", "ପାଦ", "पाद"],
  status: ["Status", "ସ୍ଥିତି", "स्थिति"],
  exportPdf: ["Export Full Kundli PDF", "ସମ୍ପୂର୍ଣ୍ଣ PDF ଡାଉନଲୋଡ୍", "पूर्ण कुंडली PDF"],
  north: ["North Indian", "ଉତ୍ତର ଭାରତୀୟ", "उत्तर भारतीय"],
  south: ["South Indian", "ଦକ୍ଷିଣ ଭାରତୀୟ", "दक्षिण भारतीय"],
  east: ["East / Odia", "ପୂର୍ବ / ଓଡ଼ିଆ", "पूर्व / ओड़िया"],
  bhavas: ["12 Bhavas", "୧୨ ଭାବ", "१२ भाव"],
  present: ["Present", "ଅଛି", "उपस्थित"],
  absent: ["Not Present", "ନାହିଁ", "अनुपस्थित"],
  ashtakavarga: ["Ashtakavarga", "ଅଷ୍ଟକବର୍ଗ", "अष्टकवर्ग"],
  maitri: ["Panchadha Maitri", "ପଞ୍ଚଧା ମୈତ୍ରୀ", "पंचधा मैत्री"],
  tara: ["Nava Tara Chakra", "ନବତାରା ଚକ୍ର", "नवतारा चक्र"],
  shodashvarga: ["Shodashvarga Summary", "ଷୋଡଶବର୍ଗ ସାରଣୀ", "षोडशवर्ग सारणी"],
  active: ["Active", "ସକ୍ରିୟ", "सक्रिय"],
  newChart: ["New Kundli", "ନୂଆ କୁଣ୍ଡଳୀ", "नई कुंडली"],
  delete: ["Delete", "ବିଲୋପ", "हटाएँ"],
  load: ["Load", "ଖୋଲନ୍ତୁ", "खोलें"],
  sadeSati: ["Sade Sati & Dhaiya", "ସାଢେସାତି ଓ ଢେୟା", "साढ़ेसाती व ढैया"],
};

const SIGNS_I18N: [string, string, string][] = [
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

const PLANETS_I18N: Record<string, [string, string, string]> = {
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

const NAK_I18N: Record<string, [string, string]> = {
  Ashwini: ["ଅଶ୍ୱିନୀ", "अश्विनी"],
  Bharani: ["ଭରଣୀ", "भरणी"],
  Krittika: ["କୃତ୍ତିକା", "कृत्तिका"],
  Rohini: ["ରୋହିଣୀ", "रोहिणी"],
  Mrigashira: ["ମୃଗଶିରା", "मृगशिरा"],
  Ardra: ["ଆର୍ଦ୍ରା", "आर्द्रा"],
  Punarvasu: ["ପୁନର୍ବସୁ", "पुनर्वसु"],
  Pushya: ["ପୁଷ୍ୟା", "पुष्य"],
  Ashlesha: ["ଆଶ୍ଳେଷା", "आश्लेषा"],
  Magha: ["ମଘା", "मघा"],
  "Purva Phalguni": ["ପୂର୍ବ ଫାଲ୍ଗୁନୀ", "पूर्व फाल्गुनी"],
  "Uttara Phalguni": ["ଉତ୍ତର ଫାଲ୍ଗୁନୀ", "उत्तर फाल्गुनी"],
  Hasta: ["ହସ୍ତା", "हस्त"],
  Chitra: ["ଚିତ୍ରା", "चित्रा"],
  Swati: ["ସ୍ୱାତୀ", "स्वाति"],
  Vishakha: ["ବିଶାଖା", "विशाखा"],
  Anuradha: ["ଅନୁରାଧା", "अनुराधा"],
  Jyeshtha: ["ଜ୍ୟେଷ୍ଠା", "ज्येष्ठा"],
  Mula: ["ମୂଳା", "मूल"],
  "Purva Ashadha": ["ପୂର୍ବାଷାଢ଼ା", "पूर्वाषाढ़ा"],
  "Uttara Ashadha": ["ଉତ୍ତରାଷାଢ଼ା", "उत्तराषाढ़ा"],
  Shravana: ["ଶ୍ରବଣା", "श्रवण"],
  Dhanishta: ["ଧନିଷ୍ଠା", "धनिष्ठा"],
  Shatabhisha: ["ଶତଭିଷା", "शतभिषा"],
  "Purva Bhadrapada": ["ପୂର୍ବ ଭାଦ୍ରପଦ", "पूर्व भाद्रपद"],
  "Uttara Bhadrapada": ["ଉତ୍ତର ଭାଦ୍ରପଦ", "उत्तर भाद्रपद"],
  Revati: ["ରେବତୀ", "रेवती"],
};

const idx = (l: Lang) => (l === "en" ? 0 : l === "or" ? 1 : 2);

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: keyof typeof UI | string) => string;
  tSign: (i: number) => string;
  tPlanet: (p: string) => string;
  tNak: (n: string) => string;
}

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("pushyalipi-lang") as Lang | null;
      if (saved === "en" || saved === "or" || saved === "hi") setLang(saved);
    } catch {
      // The app can continue with English when browser storage is unavailable.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<Ctx>(() => {
    const i = idx(lang);
    return {
      lang,
      setLang: (l) => {
        setLang(l);
        try {
          localStorage.setItem("pushyalipi-lang", l);
        } catch {
          // Language changes still apply for this session if storage is blocked.
        }
      },
      t: (key) => UI[key as string]?.[i] ?? (key as string),
      tSign: (s) => SIGNS_I18N[s]?.[i] ?? "",
      tPlanet: (p) => PLANETS_I18N[p]?.[i] ?? p,
      tNak: (n) => (i === 0 ? n : (NAK_I18N[n]?.[i - 1] ?? n)),
    };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
