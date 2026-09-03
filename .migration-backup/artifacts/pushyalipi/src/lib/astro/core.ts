// Core Vedic astronomy math: time, Julian Day, Lahiri ayanamsha, angles.

export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;

export const norm360 = (x: number) => ((x % 360) + 360) % 360;
export const sinD = (x: number) => Math.sin(x * DEG);
export const cosD = (x: number) => Math.cos(x * DEG);
export const tanD = (x: number) => Math.tan(x * DEG);

export function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function assertValidDateTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second = 0,
): void {
  if (![year, month, day, hour, minute, second].every(Number.isFinite)) {
    throw new Error("Birth date and time must contain finite numbers.");
  }
  if (!Number.isInteger(year) || year < 1 || year > 9999) {
    throw new Error("Birth year must be between 1 and 9999.");
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Birth month must be between 1 and 12.");
  }
  if (!Number.isInteger(day) || day < 1 || day > daysInMonth(year, month)) {
    throw new Error("Birth date is not valid.");
  }
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new Error("Birth hour must be between 00 and 23.");
  }
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new Error("Birth minute must be between 00 and 59.");
  }
  if (!Number.isInteger(second) || second < 0 || second > 59) {
    throw new Error("Birth second must be between 00 and 59.");
  }
}

/** Julian Day from a UTC calendar date/time. */
export function julianDay(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): number {
  assertValidDateTime(year, month, day, hour, minute, second);
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  const dayFrac = day + (hour + minute / 60 + second / 3600) / 24;
  return (
    Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + dayFrac + B - 1524.5
  );
}

function zonedParts(date: Date, timeZone: string): Record<string, number> {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    calendar: "gregory",
    numberingSystem: "latn",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
}

/** Offset in hours east of UTC for an instant in an IANA timezone. */
export function timezoneOffsetAt(date: Date, timeZone: string): number {
  if (!timeZone || !Number.isFinite(date.getTime())) throw new Error("Invalid timezone input.");
  const parts = zonedParts(date, timeZone);
  const asUtc = Date.UTC(
    parts.year ?? 0,
    (parts.month ?? 1) - 1,
    parts.day ?? 1,
    parts.hour ?? 0,
    parts.minute ?? 0,
    parts.second ?? 0,
  );
  return (asUtc - date.getTime()) / 3600000;
}

/**
 * Convert a wall-clock birth time into an instant. The timezone is preferred;
 * the numeric offset is a backwards-compatible fallback for saved charts.
 */
export function localDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone?: string,
  fallbackOffset = 0,
): { date: Date; offset: number } {
  assertValidDateTime(year, month, day, hour, minute, 0);
  const naive = Date.UTC(year, month - 1, day, hour, minute, 0);
  if (!timeZone) {
    const date = new Date(naive - fallbackOffset * 3600000);
    if (!Number.isFinite(date.getTime())) throw new Error("Could not convert birth time.");
    return { date, offset: fallbackOffset };
  }

  try {
    let offset = timezoneOffsetAt(new Date(naive), timeZone);
    let utcMs = naive - offset * 3600000;
    const corrected = timezoneOffsetAt(new Date(utcMs), timeZone);
    if (corrected !== offset) {
      offset = corrected;
      utcMs = naive - offset * 3600000;
    }
    return { date: new Date(utcMs), offset };
  } catch {
    throw new Error(`Timezone "${timeZone}" is not available in this browser.`);
  }
}

export function jdToDate(jd: number): Date {
  return new Date((jd - 2440587.5) * 86400000);
}

export function dateToJd(d: Date): number {
  return d.getTime() / 86400000 + 2440587.5;
}

/** Julian centuries since J2000.0 */
export const centuries = (jd: number) => (jd - 2451545.0) / 36525;

/** Greenwich Mean Sidereal Time in degrees. */
export function gmst(jd: number): number {
  const T = centuries(jd);
  const theta =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000;
  return norm360(theta);
}

/** Mean obliquity of the ecliptic (degrees). */
export function obliquity(jd: number): number {
  const T = centuries(jd);
  return (
    23.439291111 -
    0.0130041667 * T -
    1.6667e-7 * T * T +
    5.02778e-7 * T * T * T
  );
}

/**
 * Lahiri (Chitra Paksha) ayanamsha in degrees.
 * Anchored at 23°51'11.4" for J2000 with the standard precession rate.
 */
export function lahiriAyanamsha(jd: number): number {
  const T = centuries(jd);
  const base = 23.85319444; // 23°51'11.5" at J2000.0
  const rate = 1.396042 + 0.0003086 * T; // deg per Julian century
  return base + rate * T;
}

/** Ascendant (Lagna) tropical longitude in degrees. */
export function ascendantTropical(jd: number, latitude: number, longitude: number): number {
  const lst = norm360(gmst(jd) + longitude); // local sidereal time in degrees
  const eps = obliquity(jd);
  const ramc = lst;
  const y = -cosD(ramc);
  const x = sinD(ramc) * cosD(eps) + tanD(latitude) * sinD(eps);
  let asc = Math.atan2(y, x) * RAD;
  return norm360(asc + 180);
}

/** Midheaven (10th cusp) tropical longitude. */
export function mcTropical(jd: number, longitude: number): number {
  const ramc = norm360(gmst(jd) + longitude);
  const eps = obliquity(jd);
  return norm360(Math.atan2(sinD(ramc), cosD(ramc) * cosD(eps)) * RAD);
}

export function dmsString(deg: number): string {
  const d = Math.floor(deg);
  const mFull = (deg - d) * 60;
  const m = Math.floor(mFull);
  const s = Math.round((mFull - m) * 60);
  const mm = s === 60 ? m + 1 : m;
  const ss = s === 60 ? 0 : s;
  return `${d}° ${String(mm).padStart(2, "0")}' ${String(ss).padStart(2, "0")}"`;
}
