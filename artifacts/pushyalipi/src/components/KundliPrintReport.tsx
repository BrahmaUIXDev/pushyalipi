import { useMemo } from "react";

import { VedicChart } from "@/components/charts/VedicChart";
import { useI18n } from "@/lib/i18n";
import { dmsString } from "@/lib/astro/core";
import {
  HOUSE_MEANINGS,
  NAKSHATRAS,
  SIGNS,
  SIGN_LORDS,
  houseFrom,
  type Chart,
} from "@/lib/astro/vedic";
import { VARGAS, vargaSign } from "@/lib/astro/varga";
import { buildVimshottari, findActivePath, type DashaNode } from "@/lib/astro/dasha";
import {
  computeAshtakavarga,
  navaTara,
  panchadhaMaitri,
  AV_PLANETS,
} from "@/lib/astro/ashtakavarga";
import { detectDoshas, detectYogas, sadeSati, type Finding } from "@/lib/astro/yogas";
import {
  careerReport,
  marriageReport,
  remediesReport,
  transitReport,
  type Section,
} from "@/lib/astro/predictions";
import { tropicalPosition } from "@/lib/astro/ephemeris";
import { dateToJd, lahiriAyanamsha, norm360 } from "@/lib/astro/core";

const SHORT: Record<string, string> = {
  Sun: "Su", Moon: "Mo", Mars: "Ma", Mercury: "Me", Jupiter: "Ju",
  Venus: "Ve", Saturn: "Sa", Rahu: "Ra", Ketu: "Ke",
};

function fmt(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function years(a: Date, b: Date) {
  return ((b.getTime() - a.getTime()) / (365.2425 * 86400000)).toFixed(2);
}

function editorialTitle(title: string) {
  return title.replace(/blueprint/gi, "life reading").replace(/verified analysis/gi, "classical analysis");
}

function PBlock({
  title,
  subtitle,
  children,
  breakBefore,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  breakBefore?: boolean;
}) {
  return (
    <section className={`pdf-block${breakBefore ? " pdf-page-break" : ""}`}>
      <header className="pdf-block-head">
        <h2>{title}</h2>
        {subtitle && <span>{subtitle}</span>}
      </header>
      <div className="pdf-block-body">{children}</div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="pdf-field">
      <span className="pdf-field-label">{label}</span>
      <span className="pdf-field-value">{value}</span>
    </div>
  );
}

export function KundliPrintReport({ chart }: { chart: Chart }) {
  const { tSign, tPlanet, tNak } = useI18n();

  const moon = chart.planets.find((p) => p.planet === "Moon")!;
  const sun = chart.planets.find((p) => p.planet === "Sun")!;

  const dashas = useMemo(
    () => buildVimshottari(moon.longitude, chart.utcDate),
    [moon.longitude, chart.utcDate],
  );
  const activePath = useMemo(() => findActivePath(dashas, new Date()), [dashas]);
  const av = useMemo(() => computeAshtakavarga(chart.planets, chart.ascSign), [chart]);
  const maitri = useMemo(() => panchadhaMaitri(chart.planets), [chart]);
  const taras = useMemo(() => navaTara(moon.nakshatra), [moon.nakshatra]);
  const yogas: Finding[] = useMemo(() => detectYogas(chart), [chart]);
  const doshas: Finding[] = useMemo(() => detectDoshas(chart), [chart]);
  const satTransitSign = useMemo(() => {
    const jd = dateToJd(new Date());
    return Math.floor(norm360(tropicalPosition("Saturn", jd) - lahiriAyanamsha(jd)) / 30);
  }, []);
  const sadesati = useMemo(() => sadeSati(chart, satTransitSign), [chart, satTransitSign]);
  const predictions: Section[] = useMemo(
    () => [marriageReport(chart), careerReport(chart), transitReport(chart), remediesReport(chart)],
    [chart],
  );

  const chartData = (D: number) => {
    const bodies: Record<number, string[]> = {};
    for (const p of chart.planets) {
      const s = vargaSign(p.longitude, D);
      (bodies[s] ??= []).push(
        SHORT[p.planet]! + (p.retrograde && !["Rahu", "Ketu"].includes(p.planet) ? "ᴿ" : ""),
      );
    }
    const asc = vargaSign(chart.ascendant, D);
    (bodies[asc] ??= []).unshift("La");
    return { ascSign: asc, bodies, title: VARGAS.find((v) => v.d === D)?.name ?? `D${D}` };
  };

  const ascDegInSign = chart.ascendant - chart.ascSign * 30;
  const isCusp = ascDegInSign <= 0.5 || ascDegInSign >= 29.5;

  const birthDasha = dashas[0]!;
  const activeMaha: DashaNode | undefined = activePath[0];
  const activeAntar: DashaNode | undefined = activePath[1];
  const activePratyantar: DashaNode | undefined = activePath[2];

  return (
    <div className="pdf-doc">
      {/* ---------- COVER ---------- */}
      <section className="pdf-cover">
        <img src="/pushyalipi-logo.png" alt="Pushyalipi" className="pdf-logo" />
        <p className="pdf-kicker">Vedic Astrology Report · Janma Kundli</p>
        <h1 className="pdf-title">{chart.input.name}</h1>
        <p className="pdf-cover-line">
          {chart.input.date} · {chart.input.time} · {chart.input.place}
        </p>
        <p className="pdf-cover-line">
          Lat {chart.input.latitude.toFixed(4)}° · Long {chart.input.longitude.toFixed(4)}° · TZ
          UTC{chart.input.tzOffset >= 0 ? "+" : ""}
          {chart.input.tzOffset}
        </p>
        <p className="pdf-cover-meta">Generated {fmt(new Date())} · Lahiri Ayanamsha</p>
      </section>

      <PBlock title="Basic Details & Core Indicators">
        <div className="pdf-grid-4">
          <Field label="Name" value={chart.input.name} />
          <Field label="Date of Birth" value={chart.input.date} />
          <Field label="Time of Birth" value={chart.input.time} />
          <Field label="Place" value={chart.input.place} />
          <Field
            label="Coordinates"
            value={`${chart.input.latitude.toFixed(4)}°, ${chart.input.longitude.toFixed(4)}°`}
          />
          <Field
            label="Lagna (Ascendant)"
            value={`${tSign(chart.ascSign)} ${chart.ascDms}`}
          />
          <Field
            label="Lagna Nakshatra"
            value={`${tNak(NAKSHATRAS[Math.floor(chart.ascendant / (360 / 27))]!)} · Pada ${
              Math.floor((chart.ascendant % (360 / 27)) / (360 / 108)) + 1
            }`}
          />
          <Field
            label="Moon Sign & Nakshatra"
            value={`${tSign(moon.sign)} · ${tNak(NAKSHATRAS[moon.nakshatra]!)} (Pada ${moon.pada})`}
          />
          <Field label="Sun Sign" value={`${tSign(sun.sign)} ${sun.dms}`} />
          <Field label="Ayanamsha (Lahiri)" value={dmsString(chart.ayanamsha)} />
        </div>
        {isCusp && (
          <p className="pdf-badge-warn">
            Borderline Cusp (Sandhi) — High sensitivity to exact birth minute
          </p>
        )}
      </PBlock>

      <PBlock title="Panchanga at Birth">
        <div className="pdf-grid-4">
          <Field label="Tithi" value={`${chart.panchang.tithi} (${chart.panchang.tithiPaksha})`} />
          <Field label="Nakshatra" value={`${tNak(chart.panchang.nakshatra)} · Pada ${moon.pada}`} />
          <Field label="Yoga" value={chart.panchang.yoga} />
          <Field label="Karana" value={chart.panchang.karana} />
          <Field label="Vara" value={chart.panchang.vara} />
          <Field label="Lagna Lord" value={tPlanet(chart.panchang.lagnaLord)} />
          <Field label="Moon Sign Lord" value={tPlanet(chart.panchang.rashiLord)} />
          <Field label="Nakshatra Lord" value={tPlanet(chart.panchang.nakshatraLord)} />
        </div>
      </PBlock>

      {/* ---------- CHARTS ---------- */}
      <PBlock title="Kundli Charts" subtitle="D1 · D9 · D10 (North Indian)" breakBefore>
        <div className="pdf-charts">
          {[1, 9, 10].map((d) => (
            <div key={d} className="pdf-chart-cell">
              <VedicChart data={chartData(d)} style="north" size={215} />
            </div>
          ))}
        </div>
      </PBlock>

      <PBlock title="Shodashvarga Summary" subtitle="D1 → D60 sign / house per planet" breakBefore>
        <table className="pdf-table pdf-table-tight">
          <thead>
            <tr>
              <th>Varga</th>
              {chart.planets.map((p) => (
                <th key={p.planet}>{SHORT[p.planet]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {VARGAS.map((v) => {
              const asc = vargaSign(chart.ascendant, v.d);
              return (
                <tr key={v.d}>
                  <td className="pdf-strong">
                    {v.key} {v.name}
                  </td>
                  {chart.planets.map((p) => {
                    const s = vargaSign(p.longitude, v.d);
                    return (
                      <td key={p.planet}>
                        {SIGNS[s]!.slice(0, 3)}
                        <span className="pdf-muted"> /H{houseFrom(asc, s)}</span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </PBlock>

      {/* ---------- PLANETS ---------- */}
      <PBlock title="Planetary Positions" breakBefore>
        <table className="pdf-table">
          <thead>
            <tr>
              <th>Planet</th>
              <th>Rashi</th>
              <th>Degrees</th>
              <th>Bhava</th>
              <th>Nakshatra (Pada)</th>
              <th>Adhipati</th>
              <th>Status / Dignity</th>
            </tr>
          </thead>
          <tbody>
            {chart.planets.map((p) => {
              const status = [
                p.dignity !== "Neutral" ? p.dignity : null,
                p.retrograde ? "Retrograde" : null,
                p.combust ? "Combust" : null,
              ].filter(Boolean);
              return (
                <tr key={p.planet}>
                  <td className="pdf-strong">{tPlanet(p.planet)}</td>
                  <td>{tSign(p.sign)}</td>
                  <td className="pdf-num">{p.dms}</td>
                  <td className="pdf-num">{p.house}</td>
                  <td>
                    {tNak(NAKSHATRAS[p.nakshatra]!)} ({p.pada})
                  </td>
                  <td>{tPlanet(p.nakshatraLord)}</td>
                  <td>{status.length ? status.join(" · ") : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </PBlock>

      <PBlock title="Bhava (House) Overview">
        <table className="pdf-table">
          <thead>
            <tr>
              <th>House</th>
              <th>Rashi</th>
              <th>Lord</th>
              <th>Occupants</th>
              <th>Significations</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 12 }, (_, i) => {
              const sign = (chart.ascSign + i) % 12;
              const occ = chart.planets.filter((p) => p.house === i + 1);
              return (
                <tr key={i}>
                  <td className="pdf-strong">{i + 1}</td>
                  <td>{tSign(sign)}</td>
                  <td>{tPlanet(SIGN_LORDS[sign]!)}</td>
                  <td>{occ.length ? occ.map((o) => tPlanet(o.planet)).join(", ") : "—"}</td>
                  <td className="pdf-muted">{HOUSE_MEANINGS[i]}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </PBlock>

      {/* ---------- DASHA ---------- */}
      <PBlock title="Vimshottari Dasha" subtitle="120-year cycle" breakBefore>
        <div className="pdf-grid-3">
          <Field
            label="Balance of Dasha at Birth"
            value={`${tPlanet(birthDasha.planet)} — ${years(birthDasha.start, birthDasha.end)} yrs`}
          />
          <Field
            label="Active Mahadasha"
            value={
              activeMaha
                ? `${tPlanet(activeMaha.planet)} (${fmt(activeMaha.start)} – ${fmt(activeMaha.end)})`
                : "—"
            }
          />
          <Field
            label="Active Chain"
            value={activePath.map((n) => tPlanet(n.planet)).join(" → ") || "—"}
          />
        </div>

        <h3 className="pdf-subhead">Mahadasha Timeline</h3>
        <table className="pdf-table">
          <thead>
            <tr>
              <th>Mahadasha</th>
              <th>From</th>
              <th>To</th>
              <th>Years</th>
            </tr>
          </thead>
          <tbody>
            {dashas.map((n) => (
              <tr key={`${n.planet}-${n.start.getTime()}`} className={n === activeMaha ? "pdf-row-active" : ""}>
                <td className="pdf-strong">{tPlanet(n.planet)}</td>
                <td>{fmt(n.start)}</td>
                <td>{fmt(n.end)}</td>
                <td className="pdf-num">{years(n.start, n.end)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {activeMaha?.children && (
          <>
            <h3 className="pdf-subhead">
              Antardasha within {tPlanet(activeMaha.planet)} Mahadasha
            </h3>
            <table className="pdf-table">
              <thead>
                <tr>
                  <th>Antardasha</th>
                  <th>From</th>
                  <th>To</th>
                </tr>
              </thead>
              <tbody>
                {activeMaha.children.map((n) => (
                  <tr
                    key={`${n.planet}-${n.start.getTime()}`}
                    className={n === activeAntar ? "pdf-row-active" : ""}
                  >
                    <td className="pdf-strong">{tPlanet(n.planet)}</td>
                    <td>{fmt(n.start)}</td>
                    <td>{fmt(n.end)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {activeAntar?.children && (
          <>
            <h3 className="pdf-subhead">
              Pratyantardasha within {tPlanet(activeMaha!.planet)} / {tPlanet(activeAntar.planet)}
            </h3>
            <table className="pdf-table">
              <thead>
                <tr>
                  <th>Pratyantardasha</th>
                  <th>From</th>
                  <th>To</th>
                </tr>
              </thead>
              <tbody>
                {activeAntar.children.map((n) => (
                  <tr
                    key={`${n.planet}-${n.start.getTime()}`}
                    className={n === activePratyantar ? "pdf-row-active" : ""}
                  >
                    <td className="pdf-strong">{tPlanet(n.planet)}</td>
                    <td>{fmt(n.start)}</td>
                    <td>{fmt(n.end)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </PBlock>

      {/* ---------- STRENGTH ---------- */}
      <PBlock title="Ashtakavarga" subtitle={`SAV total ${av.sav.reduce((a, b) => a + b, 0)}`} breakBefore>
        <table className="pdf-table pdf-table-tight">
          <thead>
            <tr>
              <th>BAV</th>
              {SIGNS.map((s) => (
                <th key={s}>{s.slice(0, 3)}</th>
              ))}
              <th>Σ</th>
            </tr>
          </thead>
          <tbody>
            {AV_PLANETS.map((p) => (
              <tr key={p}>
                <td className="pdf-strong">{tPlanet(p)}</td>
                {av.bav[p]!.map((n, i) => (
                  <td key={i} className="pdf-num">{n}</td>
                ))}
                <td className="pdf-num pdf-strong">{av.bav[p]!.reduce((a, b) => a + b, 0)}</td>
              </tr>
            ))}
            <tr className="pdf-row-total">
              <td className="pdf-strong">SAV</td>
              {av.sav.map((n, i) => (
                <td key={i} className="pdf-num">{n}</td>
              ))}
              <td className="pdf-num pdf-strong">{av.sav.reduce((a, b) => a + b, 0)}</td>
            </tr>
          </tbody>
        </table>
      </PBlock>

      <PBlock title="Panchadha Maitri" subtitle="Five-fold planetary friendship">
        <table className="pdf-table pdf-table-tight">
          <thead>
            <tr>
              <th />
              {chart.planets.map((p) => (
                <th key={p.planet}>{SHORT[p.planet]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chart.planets.map((a) => (
              <tr key={a.planet}>
                <td className="pdf-strong">{SHORT[a.planet]}</td>
                {chart.planets.map((b) => (
                  <td key={b.planet}>
                    {a.planet === b.planet ? "—" : maitri[a.planet]![b.planet]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </PBlock>

      <PBlock title="Navatara Chakra" subtitle={`From Janma Nakshatra ${tNak(NAKSHATRAS[moon.nakshatra]!)}`}>
        <div className="pdf-tara-grid">
          {taras.map((x) => (
            <div key={x.nakshatra} className={`pdf-tara pdf-tara-${x.quality}`}>
              <span className="pdf-strong">{tNak(NAKSHATRAS[x.nakshatra]!)}</span>
              <span className="pdf-muted">{x.tara}</span>
            </div>
          ))}
        </div>
      </PBlock>

      <PBlock title="Sade Sati">
        <p className="pdf-status">
          {sadesati.active ? "Sade Sati running" : sadesati.dhaiya ? "Dhaiya running" : "Not active"}
          {" · "}
          {sadesati.phase}
        </p>
        <p className="pdf-text">{sadesati.detail}</p>
      </PBlock>

      {/* ---------- YOGAS ---------- */}
       <PBlock title="Yogas" subtitle="Classical analysis" breakBefore>
        <div className="pdf-findings">
          {yogas.map((f) => (
            <div key={f.id} className="pdf-finding">
              <div className="pdf-finding-head">
                <span className="pdf-strong">{f.name}</span>
                <span className={f.present ? "pdf-pill pdf-pill-on" : "pdf-pill"}>
                  {f.present ? "Present" : "Absent"}
                </span>
              </div>
              <p className="pdf-muted">{f.detail}</p>
              <p className="pdf-text">{f.effect}</p>
            </div>
          ))}
        </div>
      </PBlock>

      {/* ---------- DOSHAS ---------- */}
      <PBlock title="Dosha Analysis" subtitle="Status with classical cancellation notes" breakBefore>
        <div className="pdf-findings">
          {doshas.map((f) => (
            <div key={f.id} className="pdf-finding">
              <div className="pdf-finding-head">
                <span className="pdf-strong">{f.name}</span>
                <span className={f.present ? "pdf-pill pdf-pill-warn" : "pdf-pill"}>
                  {f.present ? "Present" : "Absent"}
                </span>
              </div>
              <p className="pdf-muted">{f.detail}</p>
              <p className="pdf-text">{f.effect}</p>
            </div>
          ))}
        </div>
      </PBlock>

      {/* ---------- PREDICTIONS ---------- */}
      <PBlock title="Predictions & Life Domains" subtitle="Marriage · Career · Transit · Remedies" breakBefore>
          <div className="pdf-sections">
          {predictions.map((s) => (
            <div key={s.title} className="pdf-section">
              <div className="pdf-finding-head">
                 <span className="pdf-strong">{editorialTitle(s.title)}</span>
                {s.score !== undefined && <span className="pdf-pill">{s.score}/100</span>}
              </div>
              <ul className="pdf-list">
                {s.points.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </PBlock>

      <footer className="pdf-footer">
        Pushyalipi · Vedic Astrology Report for {chart.input.name} · Lahiri Ayanamsha ·
        Computed positions are sidereal.
      </footer>
    </div>
  );
}
