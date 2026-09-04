import type { BirthInput } from "./astro/vedic";

const KEY = "pushyalipi-charts";
const MAX_SAVED = 50;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{2}):(\d{2})$/;

export interface SavedChart extends BirthInput {
  id: string;
  savedAt: string;
  createdAt: string;
  lastViewedAt: string;
}

function validBirthInput(value: unknown): value is BirthInput {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const date = typeof v.date === "string" ? v.date.match(DATE_PATTERN) : null;
  const time = typeof v.time === "string" ? v.time.match(TIME_PATTERN) : null;
  const year = date ? Number(date[1]) : NaN;
  const month = date ? Number(date[2]) : NaN;
  const day = date ? Number(date[3]) : NaN;
  const hour = time ? Number(time[1]) : NaN;
  const minute = time ? Number(time[2]) : NaN;
  const parsedDate = date ? new Date(0) : null;
  if (parsedDate) {
    parsedDate.setUTCFullYear(year, month - 1, day);
    parsedDate.setUTCHours(0, 0, 0, 0);
  }
  return (
    typeof v.name === "string" &&
    v.name.trim().length > 0 &&
    date !== null &&
    year >= 1 &&
    year <= 9999 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    parsedDate !== null &&
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() === month - 1 &&
    parsedDate.getUTCDate() === day &&
    time !== null &&
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59 &&
    typeof v.place === "string" &&
    v.place.trim().length > 0 &&
    typeof v.latitude === "number" &&
    Number.isFinite(v.latitude) &&
    v.latitude >= -90 &&
    v.latitude <= 90 &&
    typeof v.longitude === "number" &&
    Number.isFinite(v.longitude) &&
    v.longitude >= -180 &&
    v.longitude <= 180 &&
    typeof v.tzOffset === "number" &&
    Number.isFinite(v.tzOffset) &&
    v.tzOffset >= -14 &&
    v.tzOffset <= 14 &&
    (v.timezone === undefined || typeof v.timezone === "string")
  );
}

function normalise(value: unknown): SavedChart | null {
  if (!validBirthInput(value)) return null;
  const v = value as BirthInput & Partial<SavedChart>;
  const now = new Date().toISOString();
  return {
    ...v,
    id: typeof v.id === "string" && v.id ? v.id : createId(),
    savedAt: typeof v.savedAt === "string" ? v.savedAt : now,
    createdAt: typeof v.createdAt === "string" ? v.createdAt : (v.savedAt ?? now),
    lastViewedAt: typeof v.lastViewedAt === "string" ? v.lastViewedAt : (v.savedAt ?? now),
  };
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function writeSaved(charts: SavedChart[]): SavedChart[] {
  if (typeof window === "undefined") return charts;
  const limited = charts.slice(0, MAX_SAVED);
  try {
    localStorage.setItem(KEY, JSON.stringify(limited));
    return limited;
  } catch {
    throw new Error("Could not save charts in this browser. Storage may be full or blocked.");
  }
}

export function listSaved(): SavedChart[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalise)
      .filter((chart): chart is SavedChart => chart !== null)
      .sort((a, b) => b.lastViewedAt.localeCompare(a.lastViewedAt));
  } catch {
    return [];
  }
}

export function saveChart(input: BirthInput): SavedChart[] {
  if (!validBirthInput(input)) {
    throw new Error("Cannot save invalid birth details.");
  }
  const list = listSaved();
  const now = new Date().toISOString();
  const duplicate = list.find(
    (chart) =>
      chart.name.toLocaleLowerCase() === input.name.toLocaleLowerCase() &&
      chart.date === input.date &&
      chart.time === input.time &&
      chart.place === input.place,
  );
  if (duplicate) {
    const updated = { ...duplicate, ...input, savedAt: now, lastViewedAt: now };
    return writeSaved([updated, ...list.filter((chart) => chart.id !== duplicate.id)]);
  }
  const entry: SavedChart = {
    ...input,
    id: createId(),
    savedAt: now,
    createdAt: now,
    lastViewedAt: now,
  };
  return writeSaved([entry, ...list]);
}

export function markChartViewed(id: string): SavedChart[] {
  const now = new Date().toISOString();
  const list = listSaved();
  const hit = list.find((chart) => chart.id === id);
  if (!hit) return list;
  return writeSaved([
    { ...hit, lastViewedAt: now },
    ...list.filter((chart) => chart.id !== id),
  ]);
}

export function renameChart(id: string, name: string): SavedChart[] {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Chart name cannot be empty.");
  return writeSaved(
    listSaved().map((chart) =>
      chart.id === id ? { ...chart, name: trimmed, savedAt: new Date().toISOString() } : chart,
    ),
  );
}

export function deleteChart(id: string): SavedChart[] {
  return writeSaved(listSaved().filter((c) => c.id !== id));
}

export function exportSavedCharts(): string {
  return JSON.stringify(
    {
      format: "pushyalipi-saved-charts",
      version: 1,
      exportedAt: new Date().toISOString(),
      charts: listSaved(),
    },
    null,
    2,
  );
}

export function importSavedCharts(json: string): SavedChart[] {
  const parsed = JSON.parse(json) as unknown;
  const rawCharts =
    Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && Array.isArray((parsed as { charts?: unknown }).charts)
        ? (parsed as { charts: unknown[] }).charts
        : null;
  if (!rawCharts) throw new Error("This file is not a Pushyalipi chart export.");
  const imported = rawCharts.map(normalise).filter((chart): chart is SavedChart => chart !== null);
  if (!imported.length) throw new Error("No valid charts were found in this file.");

  const combined = [...imported, ...listSaved()];
  const unique = combined.filter(
    (chart, index, all) =>
      all.findIndex(
        (candidate) =>
          candidate.name.toLocaleLowerCase() === chart.name.toLocaleLowerCase() &&
          candidate.date === chart.date &&
          candidate.time === chart.time &&
          candidate.place === chart.place,
      ) === index,
  );
  return writeSaved(unique);
}
