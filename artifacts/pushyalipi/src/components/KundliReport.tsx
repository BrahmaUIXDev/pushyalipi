import { useMemo, useState, type ReactNode } from "react";
import { Check, CheckCircle2, ChevronRight, Download, FileText, RotateCcw, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VedicChart, type ChartStyle } from "@/components/charts/VedicChart";
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
import { KundliPrintReport } from "@/components/KundliPrintReport";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SHORT: Record<string, string> = {
  Sun: "Su", Moon: "Mo", Mars: "Ma", Mercury: "Me", Jupiter: "Ju",
  Venus: "Ve", Saturn: "Sa", Rahu: "Ra", Ketu: "Ke",
};

function fmt(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function editorialTitle(title: string) {
  return title.replace(/blueprint/gi, "life reading").replace(/verified analysis/gi, "classical analysis");
}

function Stat({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
      {children}
    </div>
  );
}


function FindingCard({ f }: { f: Finding }) {
  return (
    <Card className="print-avoid-break border-border/70">
      <CardContent className="space-y-2 pt-5">
        <div className="flex items-start justify-between gap-3">
          <h4 className="font-display text-lg font-semibold">{f.name}</h4>
          {f.present ? (
            <Badge className="gap-1 bg-primary text-primary-foreground">
              <CheckCircle2 className="size-3" /> Present
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-muted-foreground">
              <XCircle className="size-3" /> Absent
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{f.detail}</p>
        <p className="text-sm">{f.effect}</p>
      </CardContent>
    </Card>
  );
}

function SectionCard({ s }: { s: Section }) {
  return (
    <Card className="print-avoid-break border-border/70">
      <CardHeader className="flex-row items-center justify-between space-y-0">
         <CardTitle className="font-display text-xl">{editorialTitle(s.title)}</CardTitle>
        {s.score !== undefined && (
          <Badge className="bg-accent text-accent-foreground">{s.score}/100</Badge>
        )}
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {s.points.map((p, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <ChevronRight className="mt-0.5 size-4 shrink-0 text-accent" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function DashaTree({ nodes, activeIds, depth = 0 }: { nodes: DashaNode[]; activeIds: Set<string>; depth?: number }) {
  const [open, setOpen] = useState<string | null>(null);
  const key = (n: DashaNode) => `${n.planet}-${n.start.getTime()}`;
  return (
    <ul className={depth === 0 ? "space-y-1" : "ml-4 space-y-1 border-l border-border pl-3"}>
      {nodes.map((n) => {
        const k = key(n);
        const active = activeIds.has(k);
        return (
          <li key={k}>
            <button
              type="button"
              onClick={() => setOpen((o) => (o === k ? null : k))}
              className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-secondary ${
                active ? "bg-primary/10 font-semibold text-primary" : ""
              }`}
            >
              <span>{n.planet}</span>
              <span className="text-xs text-muted-foreground">
                {fmt(n.start)} – {fmt(n.end)} {active ? "· active" : ""}
              </span>
            </button>
            {open === k && n.children && n.children.length > 0 && (
              <DashaTree nodes={n.children} activeIds={activeIds} depth={depth + 1} />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function KundliReport({ chart, onReset }: { chart: Chart; onReset: () => void }) {
  const { t, tSign, tPlanet, tNak } = useI18n();
  const [style, setStyle] = useState<ChartStyle>("north");
  const [varga, setVarga] = useState<number>(1);
  const [exportOpen, setExportOpen] = useState(false);

  const moon = chart.planets.find((p) => p.planet === "Moon")!;

  const dashas = useMemo(
    () => buildVimshottari(moon.longitude, chart.utcDate),
    [moon.longitude, chart.utcDate],
  );
  const activePath = useMemo(() => findActivePath(dashas, new Date()), [dashas]);
  const activeIds = useMemo(
    () => new Set(activePath.map((n) => `${n.planet}-${n.start.getTime()}`)),
    [activePath],
  );

  const av = useMemo(() => computeAshtakavarga(chart.planets, chart.ascSign), [chart]);
  const maitri = useMemo(() => panchadhaMaitri(chart.planets), [chart]);
  const taras = useMemo(() => navaTara(moon.nakshatra), [moon.nakshatra]);
  const yogas = useMemo(() => detectYogas(chart), [chart]);
  const doshas = useMemo(() => detectDoshas(chart), [chart]);

  const satTransitSign = useMemo(() => {
    const jd = dateToJd(new Date());
    return Math.floor(norm360(tropicalPosition("Saturn", jd) - lahiriAyanamsha(jd)) / 30);
  }, []);
  const sadesati = useMemo(() => sadeSati(chart, satTransitSign), [chart, satTransitSign]);

  const predictions = useMemo(
    () => [marriageReport(chart), careerReport(chart), transitReport(chart), remediesReport(chart)],
    [chart],
  );

  const printReport = () => {
    setExportOpen(false);
    window.setTimeout(() => {
      window.print();
    }, 120);
  };

  const chartData = (D: number) => {
    const bodies: Record<number, string[]> = {};
    for (const p of chart.planets) {
      const s = vargaSign(p.longitude, D);
      (bodies[s] ??= []).push(SHORT[p.planet]! + (p.retrograde && !["Rahu", "Ketu"].includes(p.planet) ? "ᴿ" : ""));
    }
    const asc = vargaSign(chart.ascendant, D);
    (bodies[asc] ??= []).unshift("La");
    return { ascSign: asc, bodies, title: VARGAS.find((v) => v.d === D)?.name ?? `D${D}` };
  };

  // Bhava Sandhi / Rashi cusp detection — display only, no change to the
  // Lagna calculation itself.
  const ascDegInSign = chart.ascendant - chart.ascSign * 30;
  const isCusp = ascDegInSign <= 0.5 || ascDegInSign >= 29.5;

  return (
    <div className="space-y-6">
      {/* Print-only full report (aggregates every tab's data) */}
      <div className="hidden print:block">
        <KundliPrintReport chart={chart} />
      </div>

      {/* Interactive UI — hidden when printing */}
      <div className="space-y-6 no-print">
      <div className="report-masthead no-print">
        <div className="report-heading">
          <p className="report-kicker">JANMA KUNDLI · SIDEREAL READING</p>
          <h2 className="font-display text-3xl font-semibold">{chart.input.name}</h2>
          <p className="text-sm text-muted-foreground">
            {chart.input.date} · {chart.input.time} · {chart.input.place}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onReset} className="gap-2">
            <RotateCcw className="size-4" /> {t("newChart")}
          </Button>
          <Button onClick={() => setExportOpen(true)} className="gap-2" data-testid="button-open-export">
            <Download className="size-4" /> {t("exportPdf")}
          </Button>
        </div>
      </div>

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="export-dialog">
          <DialogHeader>
            <p className="dialog-kicker">A REPORT TO KEEP</p>
            <DialogTitle className="font-display text-3xl">Keep this reading.</DialogTitle>
            <DialogDescription>Print the complete report from this exact chart. No account or upload is required.</DialogDescription>
          </DialogHeader>
          <div className="export-options">
            <button type="button" className="export-option" onClick={printReport} data-testid="button-export-report">
              <span className="export-option-icon"><FileText className="size-5" /></span>
              <span className="export-option-copy"><strong>Print complete report</strong><small>Birth details, Panchanga, D1, D9, D10, vargas, dashas, strengths, findings, guidance, and remedies.</small></span>
              <span className="export-option-tag">A4</span>
            </button>
          </div>
          <DialogFooter className="export-dialog-footer"><span><Check className="size-3.5" /> Complete report</span><span><Check className="size-3.5" /> No watermarks</span></DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t("lagna")} value={`${tSign(chart.ascSign)} ${chart.ascDms}`}>
          {isCusp && (
            <Badge
              variant="outline"
              className="mt-1.5 whitespace-normal border-accent/60 text-left text-[10px] font-medium leading-tight text-accent"
            >
              Borderline Cusp (Sandhi) — High sensitivity to exact birth minute
            </Badge>
          )}
        </Stat>
        <Stat label={t("moonSign")} value={`${tSign(moon.sign)} · ${tNak(NAKSHATRAS[moon.nakshatra]!)}`} />
        <Stat label={t("sunSign")} value={tSign(chart.planets[0]!.sign)} />
        <Stat label="Ayanamsha (Lahiri)" value={dmsString(chart.ayanamsha)} />
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="no-print flex h-auto w-full flex-wrap justify-start gap-1">
          {[
            ["overview", t("overview")],
            ["charts", t("charts")],
            ["planets", t("planets")],
            ["dasha", t("dasha")],
            ["strength", t("strength")],
            ["yogas", t("yogas")],
            ["doshas", t("doshas")],
            ["predictions", t("predictions")],
          ].map(([v, label]) => (
            <TabsTrigger key={v} value={v!}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="mt-5 space-y-5 print-block">
          <Card className="print-avoid-break">
            <CardHeader>
              <CardTitle className="font-display text-xl">{t("panchang")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <Stat label={t("tithi")} value={`${chart.panchang.tithi} (${chart.panchang.tithiPaksha})`} />
              <Stat label={t("nakshatra")} value={`${tNak(chart.panchang.nakshatra)} · Pada ${moon.pada}`} />
              <Stat label={t("yoga")} value={chart.panchang.yoga} />
              <Stat label={t("karana")} value={chart.panchang.karana} />
              <Stat label={t("vara")} value={chart.panchang.vara} />
              <Stat label={`${t("lagna")} ${t("lord")}`} value={tPlanet(chart.panchang.lagnaLord)} />
              <Stat label={`${t("moonSign")} ${t("lord")}`} value={tPlanet(chart.panchang.rashiLord)} />
              <Stat label={`${t("nakshatra")} ${t("lord")}`} value={tPlanet(chart.panchang.nakshatraLord)} />
            </CardContent>
          </Card>

          <Card className="print-avoid-break">
            <CardHeader>
              <CardTitle className="font-display text-xl">{t("bhavas")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 12 }, (_, i) => {
                const sign = (chart.ascSign + i) % 12;
                const occupants = chart.planets.filter((p) => p.house === i + 1);
                return (
                  <div key={i} className="rounded-md border border-border bg-card p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-display text-lg font-semibold text-primary">
                        {t("house")} {i + 1}
                      </p>
                      <Badge variant="secondary">{tSign(sign)}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{HOUSE_MEANINGS[i]}</p>
                    <p className="mt-2 text-xs">
                      {t("lord")}: <strong>{tPlanet(SIGN_LORDS[sign]!)}</strong>
                      {occupants.length > 0 && ` · ${occupants.map((o) => tPlanet(o.planet)).join(", ")}`}
                    </p>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="print-avoid-break">
            <CardHeader>
              <CardTitle className="font-display text-xl">{t("sadeSati")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div>
                <Badge className={sadesati.active ? "bg-destructive text-destructive-foreground" : "bg-secondary text-secondary-foreground"}>
                  {sadesati.active ? "Sade Sati running" : sadesati.dhaiya ? "Dhaiya running" : "Not active"}
                </Badge>
              </div>
              <p className="font-medium">{sadesati.phase}</p>
              <p className="text-muted-foreground">{sadesati.detail}</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CHARTS */}
        <TabsContent value="charts" className="mt-5 space-y-5 print-block print-break">
          <Card className="print-avoid-break">
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
              <CardTitle className="font-display text-xl">{t("charts")}</CardTitle>
              <div className="no-print flex flex-wrap gap-2">
                {(["north", "south", "east"] as ChartStyle[]).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={style === s ? "default" : "outline"}
                    onClick={() => setStyle(s)}
                  >
                    {t(s)}
                  </Button>
                ))}
                <Select value={String(varga)} onValueChange={(v) => setVarga(Number(v))}>
                  <SelectTrigger className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VARGAS.map((v) => (
                      <SelectItem key={v.d} value={String(v.d)}>
                        {v.key} — {v.name} ({v.meaning})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {[1, 9, 10, varga].filter((d, i, a) => a.indexOf(d) === i).map((d) => (
                <VedicChart key={d} data={chartData(d)} style={style} />
              ))}
            </CardContent>
          </Card>

          <Card className="print-avoid-break">
            <CardHeader>
              <CardTitle className="font-display text-xl">{t("shodashvarga")}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-xs">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="p-2">Varga</th>
                    {chart.planets.map((p) => (
                      <th key={p.planet} className="p-2">{SHORT[p.planet]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {VARGAS.map((v) => {
                    const asc = vargaSign(chart.ascendant, v.d);
                    return (
                      <tr key={v.d} className="border-b border-border/50">
                        <td className="p-2 font-medium">{v.key} {v.name}</td>
                        {chart.planets.map((p) => {
                          const s = vargaSign(p.longitude, v.d);
                          return (
                            <td key={p.planet} className="p-2">
                              {SIGNS[s]!.slice(0, 3)}
                              <span className="text-muted-foreground"> /H{houseFrom(asc, s)}</span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PLANETS */}
        <TabsContent value="planets" className="mt-5 print-block print-break">
          <Card className="print-avoid-break">
            <CardHeader>
              <CardTitle className="font-display text-xl">{t("planets")}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="p-2">{t("planets")}</th>
                    <th className="p-2">{t("sign")}</th>
                    <th className="p-2">{t("degree")}</th>
                    <th className="p-2">{t("house")}</th>
                    <th className="p-2">{t("nakshatra")}</th>
                    <th className="p-2">{t("pada")}</th>
                    <th className="p-2">{t("lord")}</th>
                    <th className="p-2">{t("status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {chart.planets.map((p) => (
                    <tr key={p.planet} className="border-b border-border/50">
                      <td className="p-2 font-medium">{tPlanet(p.planet)}</td>
                      <td className="p-2">{tSign(p.sign)}</td>
                      <td className="p-2 tabular-nums">{p.dms}</td>
                      <td className="p-2">{p.house}</td>
                      <td className="p-2">{tNak(NAKSHATRAS[p.nakshatra]!)}</td>
                      <td className="p-2">{p.pada}</td>
                      <td className="p-2">{tPlanet(p.nakshatraLord)}</td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1">
                          {p.retrograde && <Badge variant="outline">R</Badge>}
                          {p.combust && <Badge variant="outline">Combust</Badge>}
                          {p.dignity !== "Neutral" && (
                            <Badge
                              className={
                                p.dignity === "Debilitated"
                                  ? "bg-destructive text-destructive-foreground"
                                  : "bg-accent text-accent-foreground"
                              }
                            >
                              {p.dignity}
                            </Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DASHA */}
        <TabsContent value="dasha" className="mt-5 space-y-4 print-block print-break">
          <Card className="print-avoid-break">
            <CardHeader>
              <CardTitle className="font-display text-xl">Vimshottari Dasha</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("active")}:{" "}
                <strong className="text-primary">
                  {activePath.map((n) => tPlanet(n.planet)).join(" → ")}
                </strong>
              </p>
              <DashaTree nodes={dashas} activeIds={activeIds} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* STRENGTH */}
        <TabsContent value="strength" className="mt-5 space-y-5 print-block print-break">
          <Card className="print-avoid-break">
            <CardHeader>
              <CardTitle className="font-display text-xl">{t("ashtakavarga")}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-xs">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="p-2">BAV</th>
                    {SIGNS.map((s) => (
                      <th key={s} className="p-2">{s.slice(0, 3)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {AV_PLANETS.map((p) => (
                    <tr key={p} className="border-b border-border/50">
                      <td className="p-2 font-medium">{tPlanet(p)}</td>
                      {av.bav[p]!.map((n, i) => (
                        <td key={i} className="p-2 tabular-nums">{n}</td>
                      ))}
                    </tr>
                  ))}
                  <tr className="bg-secondary font-semibold">
                    <td className="p-2">SAV</td>
                    {av.sav.map((n, i) => (
                      <td key={i} className="p-2 tabular-nums">{n}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card className="print-avoid-break">
            <CardHeader>
              <CardTitle className="font-display text-xl">{t("maitri")}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-xs">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="p-2" />
                    {chart.planets.map((p) => (
                      <th key={p.planet} className="p-2">{SHORT[p.planet]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chart.planets.map((a) => (
                    <tr key={a.planet} className="border-b border-border/50">
                      <td className="p-2 font-medium">{SHORT[a.planet]}</td>
                      {chart.planets.map((b) => (
                        <td key={b.planet} className="p-2">
                          {a.planet === b.planet ? "—" : maitri[a.planet]![b.planet]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card className="print-avoid-break">
            <CardHeader>
              <CardTitle className="font-display text-xl">{t("tara")}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {taras.map((x) => (
                <div
                  key={x.nakshatra}
                  className={`rounded-md border p-2 text-xs ${
                    x.quality === "good"
                      ? "border-accent/40 bg-accent/10"
                      : x.quality === "bad"
                        ? "border-destructive/40 bg-destructive/10"
                        : "border-border bg-card"
                  }`}
                >
                  <p className="font-medium">{tNak(NAKSHATRAS[x.nakshatra]!)}</p>
                  <p className="text-muted-foreground">{x.tara}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* YOGAS */}
        <TabsContent value="yogas" className="mt-5 grid gap-4 md:grid-cols-2 print-block print-break">
          {yogas.map((f) => (
            <FindingCard key={f.id} f={f} />
          ))}
        </TabsContent>

        {/* DOSHAS */}
        <TabsContent value="doshas" className="mt-5 grid gap-4 md:grid-cols-2 print-block print-break">
          {doshas.map((f) => (
            <FindingCard key={f.id} f={f} />
          ))}
        </TabsContent>

        {/* PREDICTIONS */}
        <TabsContent value="predictions" className="mt-5 space-y-4 print-block print-break">
          {predictions.map((s) => (
            <SectionCard key={s.title} s={s} />
          ))}
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
