import { useEffect, useRef, useState } from "react";
import { Download, Loader2, MapPin, Pencil, Sparkles, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { searchPlaces, type GeoResult } from "@/lib/geocode";
import {
  deleteChart,
  exportSavedCharts,
  importSavedCharts,
  listSaved,
  markChartViewed,
  renameChart,
  saveChart,
  type SavedChart,
} from "@/lib/storage";
import type { BirthInput } from "@/lib/astro/vedic";

export function KundliForm({ onSubmit }: { onSubmit: (input: BirthInput) => boolean }) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [use24h, setUse24h] = useState(true);
  const [ampm, setAmpm] = useState<"AM" | "PM">("AM");
  const [hour12, setHour12] = useState("");
  const [minute, setMinute] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [place, setPlace] = useState<GeoResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState<SavedChart[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRequest = useRef(0);
  const searchController = useRef<AbortController | null>(null);

  useEffect(() => setSaved(listSaved()), []);

  useEffect(() => {
    const requestId = ++searchRequest.current;
    if (timer.current) clearTimeout(timer.current);
    searchController.current?.abort();
    if (query.trim().length < 3 || place?.label === query) {
      setResults([]);
      setSearching(false);
      return;
    }
    timer.current = setTimeout(async () => {
      const controller = new AbortController();
      searchController.current = controller;
      setSearching(true);
      try {
        const nextResults = await searchPlaces(query, controller.signal);
        if (requestId === searchRequest.current) setResults(nextResults);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (requestId === searchRequest.current) {
          toast.error("Location lookup failed. Check your connection.");
        }
      } finally {
        if (requestId === searchRequest.current) setSearching(false);
      }
    }, 550);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (requestId === searchRequest.current) searchController.current?.abort();
    };
  }, [query, place]);

  useEffect(() => {
    return () => {
      if (submitTimer.current) clearTimeout(submitTimer.current);
      searchController.current?.abort();
    };
  }, []);

  const resolvedTime = (): string | null => {
    if (use24h) {
      const match = time.match(/^(\d{2}):(\d{2})$/);
      if (!match) return null;
      const hour = Number(match[1]);
      const minute = Number(match[2]);
      return hour <= 23 && minute <= 59 ? time : null;
    }
    if (!/^\d{1,2}$/.test(hour12) || !/^\d{1,2}$/.test(minute)) return null;
    const hour = Number(hour12);
    const minutes = Number(minute);
    if (hour < 1 || hour > 12 || minutes < 0 || minutes > 59) return null;
    const hh = ampm === "PM" ? (hour % 12) + 12 : hour % 12;
    return `${String(hh).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  };

  const submit = () => {
    const tob = resolvedTime();
    if (!name.trim() || !date || !tob || !place) {
      toast.error("Please fill name, date, time and birth place.");
      return;
    }
    if (submitTimer.current) clearTimeout(submitTimer.current);
    setLoading(true);
    submitTimer.current = setTimeout(() => {
      const input: BirthInput = {
        name: name.trim(),
        date,
        time: tob,
        latitude: place.lat,
        longitude: place.lon,
        tzOffset: place.tzOffset,
        ...(place.timezone ? { timezone: place.timezone } : {}),
        place: place.label,
      };
      try {
        if (onSubmit(input)) setSaved(saveChart(input));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save this chart.");
      } finally {
        setLoading(false);
      }
    }, 350);
  };

  const downloadSaved = () => {
    const blob = new Blob([exportSavedCharts()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "pushyalipi-saved-charts.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importSaved = async (file: File | undefined) => {
    if (!file) return;
    try {
      setSaved(importSavedCharts(await file.text()));
      toast.success("Saved charts imported");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not import saved charts.");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card className="soft-shadow border-border/70">
        <CardHeader>
          <CardTitle className="font-display text-2xl">{t("generate")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">{t("fullName")}</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jataka name" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dob">{t("dob")}</Label>
              <Input id="dob" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("tob")}</Label>
                <button
                  type="button"
                  onClick={() => setUse24h((v) => !v)}
                  className="text-xs font-medium text-accent underline-offset-2 hover:underline"
                >
                  {use24h ? "Switch to 12-hour" : "Switch to 24-hour"}
                </button>
              </div>
              {use24h ? (
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              ) : (
                <div className="flex gap-2">
                  <Input
                    inputMode="numeric"
                    placeholder="hh"
                    maxLength={2}
                    value={hour12}
                    onChange={(e) => setHour12(e.target.value.replace(/\D/g, ""))}
                  />
                  <Input
                    inputMode="numeric"
                    placeholder="mm"
                    maxLength={2}
                    value={minute}
                    onChange={(e) => setMinute(e.target.value.replace(/\D/g, ""))}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setAmpm((p) => (p === "AM" ? "PM" : "AM"))}
                    className="w-20"
                  >
                    {ampm}
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="place">{t("place")}</Label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="place"
                className="pl-9"
                value={query}
                placeholder={t("searchPlace")}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPlace(null);
                }}
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>
            {results.length > 0 && (
              <ul className="max-h-56 overflow-auto rounded-md border border-border bg-popover text-sm">
                {results.map((r) => (
                  <li key={r.label}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-secondary"
                      onClick={() => {
                        setPlace(r);
                        setQuery(r.label);
                        setResults([]);
                      }}
                    >
                      {r.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {place && (
              <p className="text-xs text-muted-foreground">
                Lat {place.lat.toFixed(4)}° · Lon {place.lon.toFixed(4)}° · UTC
                {place.tzOffset >= 0 ? "+" : ""}
                 {place.tzOffset} {place.timezone ? `· ${place.timezone}` : "· estimated timezone"}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={submit} disabled={loading} size="lg" className="gap-2">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {t("generate")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="soft-shadow border-border/70">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="font-display text-xl">{t("saved")}</CardTitle>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" aria-label="Export saved charts" onClick={downloadSaved}>
                <Download className="size-4" />
              </Button>
              <label className="inline-flex size-9 cursor-pointer items-center justify-center rounded-md hover:bg-accent" aria-label="Import saved charts">
                <Upload className="size-4" />
                <input
                  className="sr-only"
                  type="file"
                  accept="application/json,.json"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = "";
                    void importSaved(file);
                  }}
                />
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {saved.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Charts you generate are stored privately in this browser.
            </p>
          )}
          {saved.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{c.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {c.date} {c.time} · {c.place.split(",")[0]}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                 <Button
                   size="sm"
                   variant="secondary"
                   onClick={() => {
                     try {
                       setSaved(markChartViewed(c.id));
                       onSubmit(c);
                     } catch (error) {
                       toast.error(error instanceof Error ? error.message : "Could not open this chart.");
                     }
                   }}
                 >
                  {t("load")}
                </Button>
                 <Button
                   size="icon"
                   variant="ghost"
                   aria-label="Rename"
                   onClick={() => {
                     const nextName = window.prompt("Rename saved chart", c.name);
                     if (nextName && nextName.trim() !== c.name) {
                       try {
                         setSaved(renameChart(c.id, nextName));
                       } catch (error) {
                         toast.error(error instanceof Error ? error.message : "Could not rename chart.");
                       }
                     }
                   }}
                 >
                   <Pencil className="size-4" />
                 </Button>
                <Button
                  size="icon"
                  variant="ghost"
                   aria-label={t("delete")}
                   onClick={() => {
                     try {
                       setSaved(deleteChart(c.id));
                     } catch (error) {
                       toast.error(error instanceof Error ? error.message : "Could not remove this chart.");
                     }
                   }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
