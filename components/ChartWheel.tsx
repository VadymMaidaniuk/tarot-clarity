import { normalizeDegrees, pointGlyphs, signGlyphs, type Chart } from "@/lib/astro";

const SIZE = 400;
const CENTER = SIZE / 2;
const R_OUTER = 192;
const R_ZODIAC = 164;
const R_HOUSE_LABEL = 112;
const R_ASPECT = 98;
const R_PLANET = 138;
const R_PLANET_INNER = 121;

type Props = {
  chart: Chart;
  /** Accessible description, e.g. "Natal chart". */
  label: string;
};

/**
 * Converts an ecliptic longitude to SVG coordinates. The Ascendant (or 0°
 * Aries without a birth time) sits on the left, longitudes grow
 * counter-clockwise as on a printed chart.
 */
function polar(lon: number, radius: number, ascendant: number) {
  const angle = (180 + lon - ascendant) * (Math.PI / 180);
  return {
    x: CENTER + radius * Math.cos(angle),
    y: CENTER - radius * Math.sin(angle),
  };
}

function arcPath(from: number, to: number, radius: number, ascendant: number) {
  const start = polar(from, radius, ascendant);
  const end = polar(to, radius, ascendant);
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 0 0 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

export default function ChartWheel({ chart, label }: Props) {
  const ascendant = chart.points.find((point) => point.id === "asc")?.lon ?? 0;
  const byId = new Map(chart.points.map((point) => [point.id, point]));

  // Planets that sit within a few degrees of each other alternate between
  // two radii so their glyphs never overlap.
  const sorted = [...chart.points]
    .filter((point) => point.id !== "asc" && point.id !== "mc")
    .sort((a, b) => a.lon - b.lon);
  const radii = new Map<string, number>();
  let previousLon = -999;
  let inner = false;
  for (const point of sorted) {
    const close = normalizeDegrees(point.lon - previousLon) < 9;
    inner = close ? !inner : false;
    radii.set(point.id, inner ? R_PLANET_INNER : R_PLANET);
    previousLon = point.lon;
  }

  return (
    <svg className="wheel" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={label}>
      <circle className="wheel-ring" cx={CENTER} cy={CENTER} r={R_OUTER} />
      <circle className="wheel-ring" cx={CENTER} cy={CENTER} r={R_ZODIAC} />
      <circle className="wheel-ring faint" cx={CENTER} cy={CENTER} r={R_ASPECT} />

      {signGlyphs.map((glyph, index) => {
        const start = index * 30;
        const boundary = polar(start, R_OUTER, ascendant);
        const boundaryInner = polar(start, R_ZODIAC, ascendant);
        const mid = polar(start + 15, (R_OUTER + R_ZODIAC) / 2, ascendant);
        return (
          <g key={glyph}>
            <line
              className="wheel-ring"
              x1={boundary.x}
              y1={boundary.y}
              x2={boundaryInner.x}
              y2={boundaryInner.y}
            />
            <text className="wheel-sign" x={mid.x} y={mid.y}>
              {glyph}
            </text>
          </g>
        );
      })}

      {chart.cusps &&
        chart.cusps.map((cusp, index) => {
          const outer = polar(cusp, R_ZODIAC, ascendant);
          const innerPoint = polar(cusp, R_ASPECT, ascendant);
          const next = chart.cusps ? chart.cusps[(index + 1) % 12] : cusp + 30;
          const span = normalizeDegrees(next - cusp);
          const labelPoint = polar(cusp + span / 2, R_HOUSE_LABEL, ascendant);
          const isAxis = index % 3 === 0;
          return (
            <g key={`cusp-${index}`}>
              <line
                className={`wheel-cusp ${isAxis ? "axis" : ""}`}
                x1={outer.x}
                y1={outer.y}
                x2={innerPoint.x}
                y2={innerPoint.y}
              />
              <text className="wheel-house" x={labelPoint.x} y={labelPoint.y}>
                {index + 1}
              </text>
            </g>
          );
        })}

      {!chart.cusps && (
        <path className="wheel-cusp axis" d={arcPath(0, 0.01, R_ZODIAC, ascendant)} />
      )}

      {chart.aspects
        .filter((aspect) => aspect.type !== "conjunction")
        .slice(0, 14)
        .map((aspect) => {
          const a = byId.get(aspect.a);
          const b = byId.get(aspect.b);
          if (!a || !b) return null;
          const from = polar(a.lon, R_ASPECT, ascendant);
          const to = polar(b.lon, R_ASPECT, ascendant);
          const tone = aspect.type === "square" || aspect.type === "opposition" ? "hard" : "soft";
          return (
            <line
              key={`${aspect.a}-${aspect.b}-${aspect.type}`}
              className={`wheel-aspect ${tone}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
            />
          );
        })}

      {chart.points.map((point) => {
        const isAngle = point.id === "asc" || point.id === "mc";
        const radius = isAngle ? R_ZODIAC + 12 : (radii.get(point.id) ?? R_PLANET);
        const at = polar(point.lon, radius, ascendant);
        const tick = polar(point.lon, R_ZODIAC, ascendant);
        const tickInner = polar(point.lon, R_ZODIAC - 6, ascendant);
        return (
          <g key={point.id} className={`wheel-point ${isAngle ? "angle" : ""}`}>
            {!isAngle && (
              <line className="wheel-tick" x1={tick.x} y1={tick.y} x2={tickInner.x} y2={tickInner.y} />
            )}
            <text x={at.x} y={at.y}>
              {pointGlyphs[point.id]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
