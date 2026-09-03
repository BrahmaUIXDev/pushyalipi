export interface GeoResult {
  label: string;
  lat: number;
  lon: number;
  tzOffset: number;
  timezone: string;
}

/** Rough timezone offset from longitude, refined for well-known regions. */
export function estimateTimezone(lat: number, lon: number, label: string): number {
  const l = label.toLowerCase();
  if (l.includes("india") || l.includes("भारत") || l.includes("ଭାରତ")) return 5.5;
  if (l.includes("nepal")) return 5.75;
  if (l.includes("sri lanka")) return 5.5;
  if (l.includes("bangladesh")) return 6;
  if (l.includes("pakistan")) return 5;
  void lat;
  return Math.round((lon / 15) * 2) / 2;
}

export async function searchPlaces(query: string): Promise<GeoResult[]> {
  if (query.trim().length < 3) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=6&addressdetails=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
  const json = (await res.json()) as { display_name: string; lat: string; lon: string }[];
  return json.map((r) => {
    const lat = parseFloat(r.lat);
    const lon = parseFloat(r.lon);
    // The chart engine accepts a numeric offset, so geocoding stays dependency-free
    // and graceful in offline builds. Country-specific offsets above cover the
    // primary Pushyalipi audience; longitude remains the documented fallback.
    const timezone = "";
    const tzOffset = estimateTimezone(lat, lon, r.display_name);
    return {
      label: r.display_name,
      lat,
      lon,
      tzOffset,
      timezone,
    };
  });
}
