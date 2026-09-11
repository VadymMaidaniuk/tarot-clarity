import {
  Body,
  Ecliptic,
  EclipticGeoMoon,
  GeoVector,
  MakeTime,
  SiderealTime,
  e_tilt,
} from "astronomy-engine";

export type PlanetId =
  | "sun"
  | "moon"
  | "mercury"
  | "venus"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune"
  | "pluto"
  | "node";

export type PointId = PlanetId | "asc" | "mc";

export type AspectType = "conjunction" | "opposition" | "trine" | "square" | "sextile";

export type HouseSystem = "placidus" | "whole";

export type ChartPoint = {
  id: PointId;
  /** Tropical ecliptic longitude, 0–360. */
  lon: number;
  /** Zodiac sign index, 0 = Aries. */
  sign: number;
  /** Degrees within the sign, 0–30. */
  degree: number;
  retrograde: boolean;
  house: number | null;
};

export type Aspect = {
  a: PointId;
  b: PointId;
  type: AspectType;
  orb: number;
};

export type Chart = {
  utc: string;
  lat: number;
  lon: number;
  hasTime: boolean;
  houseSystem: HouseSystem | null;
  /** Cusps of houses 1–12 as longitudes, or null without a birth time. */
  cusps: number[] | null;
  points: ChartPoint[];
  aspects: Aspect[];
};

export const planetOrder: PlanetId[] = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
  "node",
];

// U+FE0E keeps the symbols in text presentation instead of emoji.
export const pointGlyphs: Record<PointId, string> = {
  sun: "☉︎",
  moon: "☽︎",
  mercury: "☿︎",
  venus: "♀︎",
  mars: "♂︎",
  jupiter: "♃︎",
  saturn: "♄︎",
  uranus: "♅︎",
  neptune: "♆︎",
  pluto: "♇︎",
  node: "☊︎",
  asc: "AC",
  mc: "MC",
};

export const signGlyphs = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"].map(
  (glyph) => `${glyph}︎`,
);

export const aspectGlyphs: Record<AspectType, string> = {
  conjunction: "☌︎",
  opposition: "☍︎",
  trine: "△",
  square: "□",
  sextile: "⚹",
};

const DEG = Math.PI / 180;

const planetBodies: Array<[PlanetId, Body]> = [
  ["sun", Body.Sun],
  ["mercury", Body.Mercury],
  ["venus", Body.Venus],
  ["mars", Body.Mars],
  ["jupiter", Body.Jupiter],
  ["saturn", Body.Saturn],
  ["uranus", Body.Uranus],
  ["neptune", Body.Neptune],
  ["pluto", Body.Pluto],
];

// [type, exact angle, orb]. Luminaries get one extra degree of orb.
const aspectDefinitions: Array<[AspectType, number, number]> = [
  ["conjunction", 0, 8],
  ["opposition", 180, 8],
  ["trine", 120, 7],
  ["square", 90, 7],
  ["sextile", 60, 5],
];

export function normalizeDegrees(degrees: number) {
  return ((degrees % 360) + 360) % 360;
}

/** Signed shortest arc from `from` to `to`, in (-180, 180]. */
export function signedArc(from: number, to: number) {
  const delta = normalizeDegrees(to - from);
  return delta > 180 ? delta - 360 : delta;
}

function julianDay(date: Date) {
  return date.getTime() / 86_400_000 + 2_440_587.5;
}

function eclipticOfDate(date: Date) {
  const time = MakeTime(date);
  const longitudes = new Map<PlanetId, number>();
  for (const [id, body] of planetBodies) {
    longitudes.set(id, normalizeDegrees(Ecliptic(GeoVector(body, time, true)).elon));
  }
  longitudes.set("moon", normalizeDegrees(EclipticGeoMoon(time).lon));
  longitudes.set("node", meanNodeLongitude(date));
  return longitudes;
}

/** Mean longitude of the Moon's ascending node (Meeus, Astronomical Algorithms 47.7). */
function meanNodeLongitude(date: Date) {
  const t = (julianDay(date) - 2_451_545) / 36_525;
  return normalizeDegrees(
    125.0445479 -
      1934.1362891 * t +
      0.0020754 * t * t +
      (t * t * t) / 467_441 -
      (t * t * t * t) / 60_616_000,
  );
}

function meanObliquity(date: Date) {
  const t = (julianDay(date) - 2_451_545) / 36_525;
  return 23.439291 - 0.0130042 * t - 1.64e-7 * t * t + 5.04e-7 * t * t * t;
}

function obliquity(date: Date) {
  const tilt = e_tilt(MakeTime(date)) as { tobl?: number; mobl?: number };
  return tilt.tobl ?? tilt.mobl ?? meanObliquity(date);
}

/** Longitude of the ecliptic point that has the given right ascension. */
function eclipticFromRightAscension(raDeg: number, epsDeg: number) {
  const ra = raDeg * DEG;
  return normalizeDegrees(Math.atan2(Math.sin(ra), Math.cos(ra) * Math.cos(epsDeg * DEG)) / DEG);
}

function computeAngles(date: Date, lat: number, lon: number) {
  const eps = obliquity(date);
  const ramc = normalizeDegrees(SiderealTime(MakeTime(date)) * 15 + lon);
  const r = ramc * DEG;
  const e = eps * DEG;
  const phi = lat * DEG;
  const mc = eclipticFromRightAscension(ramc, eps);
  const asc = normalizeDegrees(
    Math.atan2(Math.cos(r), -(Math.sin(r) * Math.cos(e) + Math.tan(phi) * Math.sin(e))) / DEG,
  );
  return { asc, mc, ramc, eps };
}

/**
 * Placidus cusps by iterating on the ascensional difference of each cusp
 * point. Returns null where the system is undefined (circumpolar latitudes).
 */
function placidusCusps(ramc: number, lat: number, eps: number, asc: number, mc: number) {
  const phi = lat * DEG;
  const e = eps * DEG;

  const cusp = (offset: number, fraction: number) => {
    let ra = ramc + offset;
    for (let iteration = 0; iteration < 24; iteration += 1) {
      const lambda = eclipticFromRightAscension(ra, eps) * DEG;
      const declination = Math.asin(Math.sin(e) * Math.sin(lambda));
      const x = Math.tan(phi) * Math.tan(declination);
      if (Math.abs(x) >= 1) return null;
      ra = ramc + offset + (fraction * Math.asin(x)) / DEG;
    }
    return eclipticFromRightAscension(ra, eps);
  };

  const c11 = cusp(30, 1 / 3);
  const c12 = cusp(60, 2 / 3);
  const c2 = cusp(120, 2 / 3);
  const c3 = cusp(150, 1 / 3);
  if (c11 === null || c12 === null || c2 === null || c3 === null) return null;

  return [
    asc,
    c2,
    c3,
    normalizeDegrees(mc + 180),
    normalizeDegrees(c11 + 180),
    normalizeDegrees(c12 + 180),
    normalizeDegrees(asc + 180),
    normalizeDegrees(c2 + 180),
    normalizeDegrees(c3 + 180),
    mc,
    c11,
    c12,
  ];
}

function wholeSignCusps(asc: number) {
  const start = Math.floor(asc / 30) * 30;
  return Array.from({ length: 12 }, (_, index) => normalizeDegrees(start + index * 30));
}

export function houseOf(lon: number, cusps: number[]) {
  for (let index = 0; index < 12; index += 1) {
    const start = cusps[index];
    const end = cusps[(index + 1) % 12];
    if (normalizeDegrees(lon - start) < normalizeDegrees(end - start)) {
      return index + 1;
    }
  }
  return 12;
}

function findAspects(points: ChartPoint[]): Aspect[] {
  const found: Aspect[] = [];
  const angles = new Set<PointId>(["asc", "mc", "node"]);
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const a = points[i];
      const b = points[j];
      if (angles.has(a.id) && angles.has(b.id)) continue;
      const separation = Math.abs(signedArc(a.lon, b.lon));
      const bonus = a.id === "sun" || a.id === "moon" || b.id === "sun" || b.id === "moon" ? 1 : 0;
      for (const [type, exact, orb] of aspectDefinitions) {
        const distance = Math.abs(separation - exact);
        if (distance <= orb + bonus) {
          found.push({ a: a.id, b: b.id, type, orb: Math.round(distance * 10) / 10 });
          break;
        }
      }
    }
  }
  return found.sort((left, right) => left.orb - right.orb);
}

function toPoint(id: PointId, lon: number, retrograde: boolean, cusps: number[] | null): ChartPoint {
  const sign = Math.floor(lon / 30) % 12;
  return {
    id,
    lon,
    sign,
    degree: lon - sign * 30,
    retrograde,
    house: cusps ? houseOf(lon, cusps) : null,
  };
}

export function computeChart(input: {
  utc: Date;
  lat: number;
  lon: number;
  hasTime: boolean;
}): Chart {
  const { utc, lat, lon, hasTime } = input;
  const now = eclipticOfDate(utc);
  const later = eclipticOfDate(new Date(utc.getTime() + 3_600_000));

  let cusps: number[] | null = null;
  let houseSystem: HouseSystem | null = null;
  let angles: { asc: number; mc: number } | null = null;

  if (hasTime) {
    const computed = computeAngles(utc, lat, lon);
    angles = computed;
    const placidus =
      Math.abs(lat) < 66 ? placidusCusps(computed.ramc, lat, computed.eps, computed.asc, computed.mc) : null;
    cusps = placidus ?? wholeSignCusps(computed.asc);
    houseSystem = placidus ? "placidus" : "whole";
  }

  const points: ChartPoint[] = planetOrder.map((id) => {
    const current = now.get(id) as number;
    const next = later.get(id) as number;
    const retrograde = id !== "sun" && id !== "moon" && id !== "node" && signedArc(current, next) < 0;
    return toPoint(id, current, retrograde, cusps);
  });

  if (angles && cusps) {
    points.push(toPoint("asc", angles.asc, false, cusps), toPoint("mc", angles.mc, false, cusps));
  }

  return {
    utc: utc.toISOString(),
    lat,
    lon,
    hasTime,
    houseSystem,
    cusps,
    points,
    aspects: findAspects(points),
  };
}

export function formatDegree(degree: number) {
  const whole = Math.floor(degree);
  const minutes = Math.round((degree - whole) * 60);
  if (minutes === 60) return `${whole + 1}°00′`;
  return `${whole}°${String(minutes).padStart(2, "0")}′`;
}
