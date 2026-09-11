import type { Locale } from "@/lib/i18n";

export type Place = {
  id: number;
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
  tz: string;
};

// Open-Meteo's geocoder is keyless and returns the IANA time zone with every
// result, which is exactly what converting a birth time to UTC needs.
const GEOCODING_ENDPOINT = "https://geocoding-api.open-meteo.com/v1/search";

type GeocodingResult = {
  id: number;
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
};

export async function searchPlaces(
  query: string,
  locale: Locale,
  signal?: AbortSignal,
): Promise<Place[]> {
  const url = new URL(GEOCODING_ENDPOINT);
  url.searchParams.set("name", query);
  url.searchParams.set("count", "6");
  url.searchParams.set("language", locale);
  url.searchParams.set("format", "json");

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Geocoding failed with ${response.status}`);
  }
  const payload = (await response.json()) as { results?: GeocodingResult[] };
  return (payload.results ?? [])
    .filter((item) => item.timezone)
    .map((item) => ({
      id: item.id,
      name: item.name,
      region: item.admin1 && item.admin1 !== item.name ? item.admin1 : "",
      country: item.country ?? "",
      lat: item.latitude,
      lon: item.longitude,
      tz: item.timezone as string,
    }));
}

export function formatPlace(place: Place) {
  return [place.name, place.region, place.country].filter(Boolean).join(", ");
}

/** Returns a zone identifier the runtime accepts, falling back to UTC. */
export function resolveTimeZone(tz: string) {
  const candidates = [tz, tz.replace("Kyiv", "Kiev")];
  for (const candidate of candidates) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: candidate });
      return candidate;
    } catch {
      // Try the next spelling.
    }
  }
  return "UTC";
}

/**
 * Converts a wall-clock birth time in an IANA zone to UTC using only Intl,
 * so historical offsets (e.g. Soviet decree time) come from the runtime's
 * tz database.
 */
export function zonedToUtc(date: string, time: string, tz: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const zone = resolveTimeZone(tz);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const wall = Date.UTC(year, month - 1, day, hour, minute, 0);
  let guess = wall;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(
      formatter
        .formatToParts(new Date(guess))
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, Number(part.value)]),
    ) as Record<string, number>;
    const shown = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    const diff = shown - wall;
    if (diff === 0) break;
    guess -= diff;
  }
  return new Date(guess);
}

export function isValidDateString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day &&
    year >= 1900 &&
    probe.getTime() <= Date.now()
  );
}
