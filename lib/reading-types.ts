import type { Locale } from "@/lib/i18n";
import type { HouseSystem, PointId } from "@/lib/astro";

export type TarotReading = {
  title: string;
  overview: string;
  positions: Array<{
    position: string;
    card: string;
    insight: string;
  }>;
  pattern: string;
  nextSteps: string[];
  reflectionQuestion: string;
};

export type NatalReading = {
  title: string;
  overview: string;
  placements: Array<{
    label: string;
    placement: string;
    insight: string;
  }>;
  tension: string;
  strength: string;
  nextSteps: string[];
  reflectionQuestion: string;
};

/** Human-readable chart digest sent to the model; names are already localized. */
export type ChartSummary = {
  hasTime: boolean;
  houseSystem: HouseSystem | null;
  birth: { date: string; time: string | null; place: string };
  points: Array<{
    id: PointId;
    name: string;
    sign: string;
    degree: number;
    house: number | null;
    retrograde: boolean;
  }>;
  aspects: Array<{ a: string; b: string; type: string; orb: number }>;
};

export type TarotRequest = {
  kind: "tarot";
  locale: Locale;
  focus?: string;
  situation?: string;
  context: string;
  cards: Array<{ name: string; subtitle: string; keyword: string; meaning: string }>;
  /** Optional one-line natal digest (Sun, Moon, Ascendant). */
  natalContext?: string;
};

export type NatalRequest = {
  kind: "natal";
  locale: Locale;
  focus?: string;
  chart: ChartSummary;
};

export type ReadingRequest = TarotRequest | NatalRequest;

export type ReadingSuccess = {
  reading: TarotReading | NatalReading;
  model: string;
};

export type ReadingFailure = {
  error: string;
  code: string;
};
