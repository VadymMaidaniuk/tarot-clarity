import type { CardGlyph } from "@/lib/cards";

export type IconName =
  | "chevron-left"
  | "chevron-right"
  | "xmark"
  | "gear"
  | "sparkles"
  | "archive"
  | "checkmark"
  | "share"
  | "lock"
  | "heart"
  | "arrow-right"
  | "warning"
  | "trash"
  | "tray"
  | "quote"
  | "anchor"
  | "layers"
  | "checkmark-circle"
  | "globe"
  | "calendar"
  | "clock"
  | "orbit"
  | "language"
  | "person";

const paths: Record<IconName, React.ReactNode> = {
  "chevron-left": <path d="M15 5l-7 7 7 7" />,
  "chevron-right": <path d="M9 5l7 7-7 7" />,
  xmark: <path d="M6 6l12 12M18 6L6 18" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2L5.5 5.5" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3.5c.4 3.9 2.6 6.1 6.5 6.5-3.9.4-6.1 2.6-6.5 6.5-.4-3.9-2.6-6.1-6.5-6.5 3.9-.4 6.1-2.6 6.5-6.5z" />
      <path d="M5.5 14.5c.2 1.8 1.2 2.8 3 3-1.8.2-2.8 1.2-3 3-.2-1.8-1.2-2.8-3-3 1.8-.2 2.8-1.2 3-3z" />
    </>
  ),
  archive: (
    <>
      <rect x="3" y="4" width="18" height="5" rx="1.5" />
      <path d="M5 9v9.5A1.5 1.5 0 006.5 20h11a1.5 1.5 0 001.5-1.5V9M10 13h4" />
    </>
  ),
  checkmark: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  share: (
    <>
      <path d="M12 3.5v11" />
      <path d="M8 7.5l4-4 4 4" />
      <path d="M6 11.5v7a2 2 0 002 2h8a2 2 0 002-2v-7" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8 10.5V7.8a4 4 0 018 0v2.7" />
    </>
  ),
  heart: (
    <path d="M12 20.3s-7.5-4.6-7.5-10A4.2 4.2 0 0112 7.7a4.2 4.2 0 017.5 2.6c0 5.4-7.5 10-7.5 10z" />
  ),
  "arrow-right": <path d="M4 12h15M13 6l6 6-6 6" />,
  warning: (
    <>
      <path d="M12 3.8L2.8 19.5h18.4L12 3.8z" />
      <path d="M12 9.5v4.5M12 17.2v.1" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" />
    </>
  ),
  tray: (
    <>
      <path d="M3.5 13.5V17a2.5 2.5 0 002.5 2.5h12a2.5 2.5 0 002.5-2.5v-3.5" />
      <path d="M3.5 13.5h5l1.5 2.5h4l1.5-2.5h5M6 13.5L8 5h8l2 8.5" />
    </>
  ),
  quote: (
    <path d="M6.5 11.5A3.5 3.5 0 0110 8V5.5A6 6 0 004 11.5V18h6v-6.5H6.5zm10 0A3.5 3.5 0 0120 8V5.5a6 6 0 00-6 6V18h6v-6.5h-3.5z" />
  ),
  anchor: (
    <>
      <circle cx="12" cy="5.5" r="2.2" />
      <path d="M12 7.7V20M5 13.5c0 3.6 3.1 6.5 7 6.5s7-2.9 7-6.5M8 12h8" />
    </>
  ),
  layers: (
    <>
      <path d="M12 4l8 4.5-8 4.5-8-4.5L12 4z" />
      <path d="M4 13l8 4.5 8-4.5M4 16.5L12 21l8-4.5" />
    </>
  ),
  "checkmark-circle": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.3 2.3 4.7-5" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.2 2" />
    </>
  ),
  orbit: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <ellipse cx="12" cy="12" rx="9.5" ry="4" transform="rotate(-30 12 12)" />
      <circle cx="19.2" cy="7.4" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  language: (
    <>
      <path d="M4 6h9M8.5 4v2M11 6c-.6 3.5-3 6.5-6 8.5M6.5 9c1 2.2 3 4.1 5.5 5.5" />
      <path d="M13 20l4-9 4 9M14.3 17h5.4" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="8" r="3.8" />
      <path d="M4.5 20c.8-3.8 3.9-6 7.5-6s6.7 2.2 7.5 6" />
    </>
  ),
};

export function Icon({
  name,
  size = 20,
  strokeWidth = 1.9,
  className,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}

const glyphs: Record<CardGlyph, React.ReactNode> = {
  echo: (
    <>
      <circle cx="24" cy="24" r="3" />
      <path d="M17 17a10 10 0 000 14M31 17a10 10 0 010 14M12 12a17 17 0 000 24M36 12a17 17 0 010 24" />
    </>
  ),
  weave: (
    <>
      <path d="M8 16c8 0 8 16 16 16s8-16 16-16" />
      <path d="M8 32c8 0 8-16 16-16s8 16 16 16" />
      <path d="M8 24h32" strokeDasharray="2 4" />
    </>
  ),
  threshold: (
    <>
      <path d="M12 42V20a12 12 0 0124 0v22" />
      <path d="M8 42h32" />
      <path d="M24 42V28" />
      <path d="M19 42v-9a5 5 0 0110 0v9" />
    </>
  ),
  mirror: (
    <>
      <ellipse cx="24" cy="21" rx="11" ry="14" />
      <path d="M17 34l-2 8h18l-2-8" />
      <path d="M19 14c1-3 3-5 6-5" />
    </>
  ),
  lantern: (
    <>
      <path d="M17 18h14l2 16H15l2-16z" />
      <path d="M20 18v-4a4 4 0 018 0v4M22 11V7M24 34v7M20 41h8" />
      <path d="M24 22v8" strokeDasharray="1 3" />
    </>
  ),
  veil: (
    <>
      <path d="M8 8v32M40 8v32" />
      <path d="M12 8c4 8 4 24 0 32M22 8c4 8 4 24 0 32M32 8c4 8 4 24 0 32" />
    </>
  ),
  tide: (
    <>
      <path d="M6 18c4-5 8-5 12 0s8 5 12 0 8-5 12 0" />
      <path d="M6 27c4-5 8-5 12 0s8 5 12 0 8-5 12 0" />
      <path d="M6 36c4-5 8-5 12 0s8 5 12 0 8-5 12 0" />
    </>
  ),
  compass: (
    <>
      <circle cx="24" cy="24" r="17" />
      <path d="M31 17l-4 11-7 3 4-11 7-3z" />
      <circle cx="24" cy="24" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
};

export function CardGlyphIcon({ glyph, size = 64 }: { glyph: CardGlyph; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {glyphs[glyph]}
    </svg>
  );
}

/** Face-down card pattern shared by every card in the deck. */
export function CardBackPattern() {
  return (
    <svg viewBox="0 0 120 190" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="aura-dots" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="5" cy="5" r="0.8" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="120" height="190" fill="url(#aura-dots)" opacity="0.35" />
      <rect x="10" y="10" width="100" height="170" rx="10" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <circle cx="60" cy="95" r="22" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.7" />
      <path d="M60 68l3.4 20.6L84 95l-20.6 6.4L60 122l-3.4-20.6L36 95l20.6-6.4z" fill="currentColor" opacity="0.9" />
    </svg>
  );
}
