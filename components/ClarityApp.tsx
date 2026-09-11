"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cardById, cards, cardText, type TarotCard } from "@/lib/cards";
import {
  detectLocale,
  isLocale,
  locales,
  messages,
  STORAGE_LOCALE,
  type Locale,
  type Messages,
} from "@/lib/i18n";
import {
  aspectGlyphs,
  computeChart,
  formatDegree,
  planetOrder,
  pointGlyphs,
  signGlyphs,
  type Chart,
  type ChartPoint,
  type PointId,
} from "@/lib/astro";
import { formatPlace, isValidDateString, searchPlaces, zonedToUtc, type Place } from "@/lib/geo";
import type { ChartSummary, NatalReading, TarotReading } from "@/lib/reading-types";
import { CardBackPattern, CardGlyphIcon, Icon, type IconName } from "@/components/icons";
import ChartWheel from "@/components/ChartWheel";

type Tab = "ritual" | "archive";
type Mode = "tarot" | "natal";
type Theme = "system" | "light" | "dark";
type Origin = "flow" | "archive";
type PlaceStatus = "idle" | "searching" | "empty" | "error";

type BirthData = {
  date: string;
  time: string | null;
  place: Place;
};

type ArchivedTarot = {
  id: string;
  createdAt: string;
  kind: "tarot";
  locale: Locale;
  focus: string;
  cardIds: string[];
  reading: TarotReading;
};

type ArchivedNatal = {
  id: string;
  createdAt: string;
  kind: "natal";
  locale: Locale;
  focus: string;
  birth: { date: string; time: string | null; place: string };
  reading: NatalReading;
};

type ArchivedReading = ArchivedTarot | ArchivedNatal;

const TAROT_STEPS = 6;
const NATAL_STEPS = 3;
const ARCHIVE_LIMIT = 30;
const STORAGE_ARCHIVE = "aura-archive";
const STORAGE_THEME = "aura-theme";
const STORAGE_BIRTH = "aura-birth";
const STORAGE_ENRICH = "aura-enrich";

const featureIcons: IconName[] = ["lock", "heart", "arrow-right"];
const principleIcons: IconName[] = ["anchor", "layers", "checkmark-circle"];
const bigThree: PointId[] = ["sun", "moon", "asc"];

function cssVars(vars: Record<string, number | string>) {
  return vars as React.CSSProperties;
}

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Insecure contexts (plain http on a LAN) have no randomUUID.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function shuffle<T>(list: readonly T[]) {
  const copy = [...list];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function formatDate(iso: string, tag: string) {
  return new Date(iso).toLocaleDateString(tag, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatBirthDate(date: string, tag: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(tag, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function loadArchive(): ArchivedReading[] {
  const raw = localStorage.getItem(STORAGE_ARCHIVE);
  if (!raw) return [];
  const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
  return parsed
    .filter((item) => item && item.id && item.reading && item.createdAt)
    .map((item) => {
      const locale = isLocale(item.locale) ? item.locale : "uk";
      if (item.kind === "natal") {
        return {
          id: String(item.id),
          createdAt: String(item.createdAt),
          kind: "natal" as const,
          locale,
          focus: typeof item.focus === "string" ? item.focus : "",
          birth: (item.birth as ArchivedNatal["birth"]) ?? { date: "", time: null, place: "" },
          reading: item.reading as NatalReading,
        };
      }
      // Older archives stored whole card objects instead of ids.
      const cardIds =
        (item.cardIds as string[] | undefined) ??
        (item.cards as Array<{ id: string }> | undefined)?.map((card) => card.id) ??
        [];
      return {
        id: String(item.id),
        createdAt: String(item.createdAt),
        kind: "tarot" as const,
        locale,
        focus: typeof item.focus === "string" ? item.focus : "",
        cardIds,
        reading: item.reading as TarotReading,
      };
    });
}

function loadBirth(): BirthData | null {
  const raw = localStorage.getItem(STORAGE_BIRTH);
  if (!raw) return null;
  const parsed = JSON.parse(raw) as Partial<BirthData>;
  const place = parsed.place;
  if (
    !parsed.date ||
    !isValidDateString(parsed.date) ||
    !place ||
    typeof place.lat !== "number" ||
    typeof place.lon !== "number" ||
    typeof place.tz !== "string"
  ) {
    return null;
  }
  return {
    date: parsed.date,
    time: typeof parsed.time === "string" && /^\d{2}:\d{2}$/.test(parsed.time) ? parsed.time : null,
    place,
  };
}

function buildChart(birth: BirthData): Chart {
  const utc = zonedToUtc(birth.date, birth.time ?? "12:00", birth.place.tz);
  return computeChart({ utc, lat: birth.place.lat, lon: birth.place.lon, hasTime: birth.time !== null });
}

function describePoint(point: ChartPoint, t: Messages) {
  return `${t.natal.signs[point.sign]} ${formatDegree(point.degree)}`;
}

function chartSummary(chart: Chart, birth: BirthData, t: Messages): ChartSummary {
  const name = (id: PointId) => t.natal.planets[id];
  return {
    hasTime: chart.hasTime,
    houseSystem: chart.houseSystem,
    birth: { date: birth.date, time: birth.time, place: formatPlace(birth.place) },
    points: chart.points.map((point) => ({
      id: point.id,
      name: name(point.id),
      sign: t.natal.signs[point.sign],
      degree: Math.round(point.degree * 10) / 10,
      house: point.house,
      retrograde: point.retrograde,
    })),
    aspects: chart.aspects.slice(0, 8).map((aspect) => ({
      a: name(aspect.a),
      b: name(aspect.b),
      type: t.natal.aspects[aspect.type],
      orb: aspect.orb,
    })),
  };
}

function natalDigest(chart: Chart, t: Messages) {
  return bigThree
    .map((id) => chart.points.find((point) => point.id === id))
    .filter((point): point is ChartPoint => Boolean(point))
    .map((point) => `${t.natal.planets[point.id]}: ${t.natal.signs[point.sign]}`)
    .join(", ");
}

function tarotShareText(reading: TarotReading, cardNames: string[], t: Messages) {
  return [
    reading.title,
    "",
    reading.overview,
    "",
    ...reading.positions.map(
      (item, index) => `${index + 1}. ${item.position} — ${item.card}\n${item.insight}`,
    ),
    "",
    `${t.reading.pattern}: ${reading.pattern}`,
    "",
    `${t.reading.steps}:`,
    ...reading.nextSteps.map((text, index) => `${index + 1}. ${text}`),
    "",
    `${t.reading.journal}: ${reading.reflectionQuestion}`,
    "",
    `${t.reading.shareSpread}: ${cardNames.join(" · ")}`,
    "— AURA",
  ].join("\n");
}

function natalShareText(reading: NatalReading, t: Messages) {
  return [
    reading.title,
    "",
    reading.overview,
    "",
    ...reading.placements.map((item) => `${item.label} — ${item.placement}\n${item.insight}`),
    "",
    `${t.natal.reading.tension}: ${reading.tension}`,
    `${t.natal.reading.strength}: ${reading.strength}`,
    "",
    `${t.reading.steps}:`,
    ...reading.nextSteps.map((text, index) => `${index + 1}. ${text}`),
    "",
    `${t.reading.journal}: ${reading.reflectionQuestion}`,
    "— AURA",
  ].join("\n");
}

function Spinner() {
  return (
    <div className="spinner" aria-hidden="true">
      {Array.from({ length: 12 }, (_, index) => (
        <i key={index} style={cssVars({ "--n": index })} />
      ))}
    </div>
  );
}

function FeatureList({
  items,
  icons,
}: {
  items: ReadonlyArray<{ title: string; text: string }>;
  icons: IconName[];
}) {
  return (
    <div className="features">
      {items.map((item, index) => (
        <div className="feature" key={item.title}>
          <div className="feature-icon">
            <Icon name={icons[index]} size={30} strokeWidth={1.6} />
          </div>
          <div>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      className="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    />
  );
}

export default function ClarityApp() {
  const [mounted, setMounted] = useState(false);
  const [locale, setLocale] = useState<Locale>("ru");
  const [theme, setTheme] = useState<Theme>("system");
  const [tab, setTab] = useState<Tab>("ritual");
  const [mode, setMode] = useState<Mode>("tarot");
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const [focus, setFocus] = useState("");
  const [situation, setSituation] = useState(-1);
  const [context, setContext] = useState("");
  const [deck, setDeck] = useState<string[]>(() => cards.map((card) => card.id));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [birth, setBirth] = useState<BirthData | null>(null);
  const [enrich, setEnrich] = useState(true);
  const [draftDate, setDraftDate] = useState("");
  const [draftTime, setDraftTime] = useState("");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [draftPlace, setDraftPlace] = useState<Place | null>(null);
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeResults, setPlaceResults] = useState<Place[]>([]);
  const [placeStatus, setPlaceStatus] = useState<PlaceStatus>("idle");
  const [chart, setChart] = useState<Chart | null>(null);
  const [natalFocus, setNatalFocus] = useState("");

  const [tarotReading, setTarotReading] = useState<TarotReading | null>(null);
  const [natalReading, setNatalReading] = useState<NatalReading | null>(null);
  const [origin, setOrigin] = useState<Origin>("flow");
  const [archivedId, setArchivedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [archive, setArchive] = useState<ArchivedReading[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const searchRef = useRef<AbortController | null>(null);

  const t = messages[locale];

  const selectedCards = useMemo(
    () =>
      selectedIds
        .map((id) => cardById(id))
        .filter((card): card is TarotCard => Boolean(card)),
    [selectedIds],
  );

  const archivedItem = useMemo(
    () => archive.find((item) => item.id === archivedId) ?? null,
    [archive, archivedId],
  );

  useEffect(() => {
    let savedLocale: Locale | null = null;
    try {
      const storedLocale = localStorage.getItem(STORAGE_LOCALE);
      savedLocale = isLocale(storedLocale) ? storedLocale : null;
      const savedTheme = localStorage.getItem(STORAGE_THEME);
      if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);
      setArchive(loadArchive());
      setBirth(loadBirth());
      setEnrich(localStorage.getItem(STORAGE_ENRICH) !== "false");
    } catch {
      // Storage is optional: private mode may disable it.
    }
    setLocale(savedLocale ?? detectLocale());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (theme === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", theme);
    }
    try {
      if (theme === "system") {
        localStorage.removeItem(STORAGE_THEME);
      } else {
        localStorage.setItem(STORAGE_THEME, theme);
      }
    } catch {
      // Ignore storage failures.
    }
    // Keep the browser chrome / status bar in sync with a forced scheme.
    document
      .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
      .forEach((meta) => {
        const darkMeta = meta.media.includes("dark");
        const dark = theme === "system" ? darkMeta : theme === "dark";
        meta.content = dark ? "#000000" : "#f2f2f7";
      });
  }, [theme, mounted]);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.lang = locale;
    try {
      localStorage.setItem(STORAGE_LOCALE, locale);
    } catch {
      // Ignore storage failures.
    }
  }, [locale, mounted]);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_ENRICH, enrich ? "true" : "false");
    } catch {
      // Ignore storage failures.
    }
  }, [enrich, mounted]);

  useEffect(() => {
    document.body.classList.toggle("sheet-open", settingsOpen);
    if (!settingsOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSettingsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("sheet-open");
    };
  }, [settingsOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  // Debounced place lookup for the birth form.
  useEffect(() => {
    const query = placeQuery.trim();
    if (draftPlace && query === formatPlace(draftPlace)) return;
    if (query.length < 2) {
      setPlaceResults([]);
      setPlaceStatus("idle");
      return;
    }
    const controller = new AbortController();
    searchRef.current?.abort();
    searchRef.current = controller;
    setPlaceStatus("searching");
    const timer = setTimeout(async () => {
      try {
        const results = await searchPlaces(query, locale, controller.signal);
        if (controller.signal.aborted) return;
        setPlaceResults(results);
        setPlaceStatus(results.length ? "idle" : "empty");
      } catch {
        if (controller.signal.aborted) return;
        setPlaceResults([]);
        setPlaceStatus("error");
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [placeQuery, draftPlace, locale]);

  const goTo = useCallback(
    (next: number) => {
      setDirection(next >= step ? 1 : -1);
      setStep(next);
      setError("");
      window.scrollTo(0, 0);
    },
    [step],
  );

  function persistArchive(update: (current: ArchivedReading[]) => ArchivedReading[]) {
    setArchive((current) => {
      const next = update(current);
      try {
        localStorage.setItem(STORAGE_ARCHIVE, JSON.stringify(next));
      } catch {
        // Ignore storage failures.
      }
      return next;
    });
  }

  function persistBirth(next: BirthData | null) {
    setBirth(next);
    try {
      if (next) {
        localStorage.setItem(STORAGE_BIRTH, JSON.stringify(next));
      } else {
        localStorage.removeItem(STORAGE_BIRTH);
      }
    } catch {
      // Ignore storage failures.
    }
  }

  function clearReadingState() {
    abortRef.current?.abort();
    setTarotReading(null);
    setNatalReading(null);
    setOrigin("flow");
    setArchivedId(null);
    setLoading(false);
    setError("");
  }

  function resetRitual() {
    clearReadingState();
    setTab("ritual");
    setMode("tarot");
    setDirection(-1);
    setStep(0);
    setFocus("");
    setSituation(-1);
    setContext("");
    setSelectedIds([]);
    setChart(null);
    setNatalFocus("");
    setSettingsOpen(false);
    window.scrollTo(0, 0);
  }

  function backToArchive() {
    clearReadingState();
    setTab("archive");
    setDirection(-1);
    setStep(0);
    window.scrollTo(0, 0);
  }

  function switchTab(next: Tab) {
    setTab(next);
    setDirection(next === "archive" ? 1 : -1);
    setStep(0);
    window.scrollTo(0, 0);
  }

  function startTarot() {
    setMode("tarot");
    goTo(1);
  }

  function prefillBirthForm(source: BirthData | null) {
    setDraftDate(source?.date ?? "");
    setDraftTime(source?.time ?? "");
    setTimeUnknown(source ? source.time === null : false);
    setDraftPlace(source?.place ?? null);
    setPlaceQuery(source ? formatPlace(source.place) : "");
    setPlaceResults([]);
    setPlaceStatus("idle");
  }

  function openNatal(edit = false) {
    clearReadingState();
    setSettingsOpen(false);
    setTab("ritual");
    setMode("natal");
    setNatalFocus("");
    prefillBirthForm(birth);
    if (birth && !edit) {
      setChart(buildChart(birth));
      goTo(2);
    } else {
      setChart(null);
      goTo(1);
    }
  }

  function startDeck() {
    setDeck(shuffle(cards.map((card) => card.id)));
    setSelectedIds([]);
    goTo(4);
  }

  function chooseCard(cardId: string) {
    setSelectedIds((current) => {
      if (current.includes(cardId)) {
        return current.filter((id) => id !== cardId);
      }
      if (current.length >= 3) return current;
      return [...current, cardId];
    });
  }

  const birthFormValid =
    isValidDateString(draftDate) &&
    draftPlace !== null &&
    (timeUnknown || /^\d{2}:\d{2}$/.test(draftTime));

  function calculateChart() {
    if (!birthFormValid || !draftPlace) return;
    const next: BirthData = {
      date: draftDate,
      time: timeUnknown ? null : draftTime,
      place: draftPlace,
    };
    persistBirth(next);
    setChart(buildChart(next));
    goTo(2);
  }

  async function requestReading(payload: Record<string, unknown>) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError("");
    setOrigin("flow");
    setArchivedId(null);

    try {
      const response = await fetch("/api/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ ...payload, locale }),
      });
      const result = (await response.json()) as {
        reading?: TarotReading | NatalReading;
        error?: string;
      };
      if (!response.ok || !result.reading) {
        throw new Error(result.error ?? t.errors.generic);
      }
      return { reading: result.reading, aborted: false as const };
    } catch (caught) {
      if (controller.signal.aborted) return { reading: null, aborted: true as const };
      const message =
        caught instanceof TypeError
          ? t.errors.network
          : caught instanceof Error
            ? caught.message
            : t.errors.generic;
      setError(message);
      return { reading: null, aborted: false as const };
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  async function generateTarotReading() {
    setTarotReading(null);
    goTo(6);
    const natalContext =
      enrich && birth ? natalDigest(chart ?? buildChart(birth), t) : undefined;
    const outcome = await requestReading({
      kind: "tarot",
      focus,
      situation: t.situation.items[situation]?.title,
      context,
      cards: selectedCards.map((card) => cardText(card, locale)),
      natalContext,
    });
    if (!outcome.reading) return;
    const reading = outcome.reading as TarotReading;
    const item: ArchivedTarot = {
      id: makeId(),
      createdAt: new Date().toISOString(),
      kind: "tarot",
      locale,
      focus: focus || t.situation.items[situation]?.title || "",
      cardIds: selectedIds,
      reading,
    };
    setTarotReading(reading);
    setArchivedId(item.id);
    persistArchive((current) => [item, ...current].slice(0, ARCHIVE_LIMIT));
  }

  async function generateNatalReading() {
    if (!chart || !birth) return;
    setNatalReading(null);
    goTo(3);
    const outcome = await requestReading({
      kind: "natal",
      focus: natalFocus,
      chart: chartSummary(chart, birth, t),
    });
    if (!outcome.reading) return;
    const reading = outcome.reading as NatalReading;
    const item: ArchivedNatal = {
      id: makeId(),
      createdAt: new Date().toISOString(),
      kind: "natal",
      locale,
      focus: natalFocus,
      birth: { date: birth.date, time: birth.time, place: formatPlace(birth.place) },
      reading,
    };
    setNatalReading(reading);
    setArchivedId(item.id);
    persistArchive((current) => [item, ...current].slice(0, ARCHIVE_LIMIT));
  }

  function retryReading() {
    if (mode === "natal") {
      void generateNatalReading();
    } else {
      void generateTarotReading();
    }
  }

  function openArchived(item: ArchivedReading) {
    clearReadingState();
    setTab("ritual");
    setOrigin("archive");
    setArchivedId(item.id);
    if (item.kind === "natal") {
      setMode("natal");
      setNatalReading(item.reading);
      setNatalFocus(item.focus);
      goTo(3);
    } else {
      setMode("tarot");
      setFocus(item.focus);
      setSelectedIds(item.cardIds);
      setTarotReading(item.reading);
      goTo(6);
    }
  }

  function deleteArchived(id: string | null) {
    if (!id) return;
    if (!window.confirm(t.settings.confirmDelete)) return;
    persistArchive((current) => current.filter((item) => item.id !== id));
    backToArchive();
  }

  function clearArchive() {
    if (!window.confirm(t.settings.confirmClear)) return;
    persistArchive(() => []);
  }

  function deleteBirth() {
    if (!window.confirm(t.settings.confirmBirthDelete)) return;
    persistBirth(null);
    setChart(null);
  }

  async function share() {
    let text = "";
    let title = "";
    if (mode === "natal" && natalReading) {
      text = natalShareText(natalReading, t);
      title = natalReading.title;
    } else if (tarotReading) {
      text = tarotShareText(
        tarotReading,
        selectedCards.map((card) => cardText(card, locale).name),
        t,
      );
      title = tarotReading.title;
    }
    if (!text) return;
    try {
      if (navigator.share) {
        await navigator.share({ title, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setToast(t.reading.copied);
    } catch (caught) {
      if (caught instanceof Error && caught.name === "AbortError") return;
      setToast(t.reading.shareFailed);
    }
  }

  const inFlow = tab === "ritual" && step > 0;
  const showTabBar = step === 0;
  const contextReady = context.trim().length >= 12;
  const totalSteps = mode === "natal" ? NATAL_STEPS : TAROT_STEPS;
  const readingStep = mode === "natal" ? 3 : 6;
  const onReading = inFlow && step === readingStep;
  const currentReading = mode === "natal" ? natalReading : tarotReading;
  const readingReady = onReading && Boolean(currentReading) && !loading;

  const footer = (() => {
    if (!inFlow) return null;
    if (mode === "natal") {
      switch (step) {
        case 1:
          return (
            <button className="btn" disabled={!birthFormValid} onClick={calculateChart}>
              {t.natal.calculate}
            </button>
          );
        case 2:
          return (
            <button className="btn" onClick={generateNatalReading}>
              {t.natal.create}
            </button>
          );
        case 3:
          return readingReady && origin === "flow" ? (
            <button className="btn" onClick={resetRitual}>
              {t.reading.newRitual}
            </button>
          ) : null;
        default:
          return null;
      }
    }
    switch (step) {
      case 1:
        return (
          <button className="btn" disabled={situation < 0} onClick={() => goTo(2)}>
            {t.situation.continue}
          </button>
        );
      case 2:
        return (
          <button className="btn" onClick={() => goTo(3)}>
            {t.principles.cta}
          </button>
        );
      case 3:
        return (
          <button className="btn" disabled={!contextReady} onClick={startDeck}>
            {t.story.continue}
          </button>
        );
      case 4:
        return (
          <button className="btn" disabled={selectedIds.length < 3} onClick={() => goTo(5)}>
            {t.deck.reveal}
          </button>
        );
      case 5:
        return (
          <button className="btn" onClick={generateTarotReading}>
            {t.spread.create}
          </button>
        );
      case 6:
        return readingReady && origin === "flow" ? (
          <button className="btn" onClick={resetRitual}>
            {t.reading.newRitual}
          </button>
        ) : null;
      default:
        return null;
    }
  })();

  const navTitle = (() => {
    if (tab === "archive") return t.nav.archive;
    if (step === 0) return t.nav.home;
    if (mode === "natal") {
      return [t.nav.natalForm, t.nav.natalChart, t.nav.reading][step - 1];
    }
    return [t.nav.situation, t.nav.principles, t.nav.story, t.nav.deck, t.nav.spread, t.nav.reading][
      step - 1
    ];
  })();

  function handleBack() {
    if (onReading && origin === "archive") {
      backToArchive();
      return;
    }
    if (mode === "natal" && step === 2) {
      prefillBirthForm(birth);
      goTo(1);
      return;
    }
    goTo(step - 1);
  }

  const birthSummary = birth
    ? `${formatBirthDate(birth.date, t.tag)} · ${birth.place.name}`
    : t.home.natalEmpty;

  if (!mounted) {
    return <div className="app" aria-hidden="true" />;
  }

  const renderPointRow = (point: ChartPoint) => (
    <div className="row with-icon" key={point.id}>
      <span className="glyph-icon" aria-hidden="true">
        {pointGlyphs[point.id]}
      </span>
      <span>
        <span className="row-title">{t.natal.planets[point.id]}</span>
        <span className="row-subtitle">
          {signGlyphs[point.sign]} {describePoint(point, t)}
        </span>
      </span>
      <span className="row-trailing">
        {point.retrograde && <span className="pill retro">{t.natal.retro}</span>}
        {point.house && <span className="pill">{t.natal.house(point.house)}</span>}
      </span>
    </div>
  );

  const readingHeaderCaption = (() => {
    if (mode === "natal") {
      const source =
        archivedItem?.kind === "natal"
          ? archivedItem.birth
          : birth
            ? { date: birth.date, time: birth.time, place: formatPlace(birth.place) }
            : null;
      if (!source) return "";
      return [formatBirthDate(source.date, t.tag), source.time, source.place].filter(Boolean).join(" · ");
    }
    const created = archivedItem ? `${formatDate(archivedItem.createdAt, t.tag)} · ` : "";
    return `${created}${selectedCards.map((card) => cardText(card, locale).name).join(" · ")}`;
  })();

  return (
    <div className={`app ${showTabBar ? "has-tabbar" : ""} ${footer ? "has-footer" : ""}`}>
      <header className="nav material hairline-bottom">
        <div className="nav-inner">
          <div className="nav-leading">
            {inFlow && (
              <button className="nav-button back" onClick={handleBack} aria-label={t.nav.back}>
                <Icon name="chevron-left" size={24} strokeWidth={2.4} />
                <span>{t.nav.back}</span>
              </button>
            )}
          </div>
          <h1
            className={`nav-title ${!inFlow && tab === "ritual" ? "wordmark" : ""} ${
              tab === "archive" && !scrolled ? "fade" : ""
            }`}
          >
            {navTitle}
          </h1>
          <div className="nav-trailing">
            {!inFlow && (
              <button
                className="nav-button"
                onClick={() => setSettingsOpen(true)}
                aria-label={t.nav.settings}
              >
                <Icon name="gear" size={24} strokeWidth={1.8} />
              </button>
            )}
            {readingReady && (
              <button className="nav-button" onClick={share} aria-label={t.nav.share}>
                <Icon name="share" size={22} strokeWidth={1.9} />
              </button>
            )}
            {inFlow && !readingReady && (
              <button
                className="nav-button"
                onClick={origin === "archive" ? backToArchive : resetRitual}
              >
                {t.nav.cancel}
              </button>
            )}
          </div>
          {inFlow && (
            <div className="nav-progress" aria-hidden="true">
              <i style={{ width: `${(step / totalSteps) * 100}%` }} />
            </div>
          )}
        </div>
      </header>

      <main style={cssVars({ "--dir": direction })}>
        {tab === "archive" && (
          <section className="screen content" key="archive">
            <div className="hero">
              <h2 className="large-title">{t.archive.title}</h2>
              <p>{t.archive.subtitle}</p>
            </div>
            {archive.length === 0 ? (
              <div className="empty">
                <Icon name="tray" size={44} strokeWidth={1.5} />
                <h2>{t.archive.emptyTitle}</h2>
                <p>{t.archive.emptyText}</p>
              </div>
            ) : (
              <div className="group">
                {archive.map((item) => (
                  <button className="row no-leading" key={item.id} onClick={() => openArchived(item)}>
                    <div>
                      <div className="row-meta">
                        <span className="kind-badge">
                          <Icon name={item.kind === "natal" ? "orbit" : "sparkles"} size={12} strokeWidth={2.2} />
                          {item.kind === "natal" ? t.archive.kindNatal : t.archive.kindTarot}
                        </span>
                        {formatDate(item.createdAt, t.tag)}
                      </div>
                      <div className="row-title">{item.reading.title}</div>
                      <div className="row-subtitle">
                        {item.kind === "natal"
                          ? item.birth.place
                          : item.cardIds
                              .map((id) => {
                                const card = cardById(id);
                                return card ? cardText(card, locale).name : null;
                              })
                              .filter(Boolean)
                              .join(" · ")}
                      </div>
                    </div>
                    <Icon name="chevron-right" className="row-chevron" size={16} strokeWidth={2.4} />
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === "ritual" && step === 0 && (
          <section className="screen content" key="home">
            <div className="hero centered">
              <div className="app-mark">
                <Icon name="sparkles" size={38} strokeWidth={1.5} />
              </div>
              <h2 className="title-1">{t.home.title}</h2>
              <p>{t.home.subtitle}</p>
            </div>
            <div className="stack">
              <div>
                <div className="section-label">{t.home.tarotSection}</div>
                <div className="group">
                  <div className="field">
                    <input
                      id="focus"
                      aria-label={t.home.focusLabel}
                      value={focus}
                      onChange={(event) => setFocus(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") startTarot();
                      }}
                      placeholder={t.home.focusPlaceholder}
                      enterKeyHint="go"
                      maxLength={200}
                      autoComplete="off"
                    />
                  </div>
                  <div className="chips">
                    {t.home.chips.map((chip) => (
                      <button
                        key={chip}
                        className="chip"
                        aria-pressed={focus === chip}
                        onClick={() => setFocus(focus === chip ? "" : chip)}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="section-footer">{t.home.focusFooter}</div>
              </div>
              <button className="btn" onClick={startTarot}>
                {t.home.start}
              </button>
              <div>
                <div className="section-label">{t.home.natalSection}</div>
                <div className="group">
                  <button className="row with-icon" onClick={() => openNatal()}>
                    <span className="row-icon">
                      <Icon name="orbit" size={18} strokeWidth={1.9} />
                    </span>
                    <span>
                      <span className="row-title">{t.home.natalTitle}</span>
                      <span className="row-subtitle">{birthSummary}</span>
                    </span>
                    <Icon name="chevron-right" className="row-chevron" size={16} strokeWidth={2.4} />
                  </button>
                </div>
                <div className="section-footer">{t.home.natalFooter}</div>
              </div>
              <FeatureList items={t.home.features} icons={featureIcons} />
            </div>
          </section>
        )}

        {tab === "ritual" && mode === "tarot" && step === 1 && (
          <section className="screen content" key="situation">
            <div className="hero">
              <h2 className="title-1">{t.situation.title}</h2>
              <p>{t.situation.subtitle}</p>
            </div>
            <div className="group">
              {t.situation.items.map((item, index) => (
                <button
                  key={item.title}
                  className="row no-leading"
                  aria-pressed={situation === index}
                  onClick={() => setSituation(index)}
                >
                  <div>
                    <div className="row-title">{item.title}</div>
                    <div className="row-subtitle">{item.description}</div>
                  </div>
                  <span className="row-check">
                    <Icon name="checkmark" size={20} strokeWidth={2.6} />
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {tab === "ritual" && mode === "tarot" && step === 2 && (
          <section className="screen content" key="principles">
            <div className="hero centered">
              <h2 className="title-1">{t.principles.title}</h2>
              <p>{t.principles.subtitle}</p>
            </div>
            <FeatureList items={t.principles.items} icons={principleIcons} />
          </section>
        )}

        {tab === "ritual" && mode === "tarot" && step === 3 && (
          <section className="screen content" key="context">
            <div className="hero">
              <h2 className="title-1">{t.story.title}</h2>
              <p>{t.story.subtitle}</p>
            </div>
            <div className="group">
              <textarea
                className="textarea"
                id="context"
                aria-label={t.story.label}
                value={context}
                onChange={(event) => setContext(event.target.value)}
                placeholder={t.story.placeholder}
                maxLength={4000}
                rows={8}
              />
            </div>
            <div className="section-footer between">
              <span>{contextReady ? t.story.privacyHint : t.story.minHint}</span>
              <span>{context.length} / 4000</span>
            </div>
          </section>
        )}

        {tab === "ritual" && mode === "tarot" && step === 4 && (
          <section className="screen content" key="deck">
            <div className="hero">
              <h2 className="title-1">{t.deck.title}</h2>
              <p>{t.deck.subtitle}</p>
            </div>
            <div className="deck-status" aria-live="polite">
              <span>{t.deck.remaining(3 - selectedIds.length)}</span>
              <div className="dots" aria-hidden="true">
                {[0, 1, 2].map((dot) => (
                  <i key={dot} className={dot < selectedIds.length ? "on" : ""} />
                ))}
              </div>
            </div>
            <div className={`deck ${selectedIds.length === 3 ? "full" : ""}`}>
              {deck.map((id, index) => {
                const order = selectedIds.indexOf(id);
                return (
                  <button
                    key={id}
                    className="card-back"
                    style={cssVars({ "--i": index })}
                    aria-pressed={order >= 0}
                    aria-label={t.deck.cardLabel(index + 1)}
                    onClick={() => chooseCard(id)}
                  >
                    <CardBackPattern />
                    {order >= 0 && <span className="badge">{order + 1}</span>}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {tab === "ritual" && mode === "tarot" && step === 5 && (
          <section className="screen content" key="reveal">
            <div className="hero">
              <h2 className="title-1">{t.spread.title}</h2>
              <p>{t.spread.subtitle}</p>
            </div>
            <div className="spread">
              {selectedCards.map((card, index) => {
                const text = cardText(card, locale);
                return (
                  <article className="spread-item" key={card.id} style={cssVars({ "--i": index })}>
                    <div className="position">
                      <b>{index + 1}</b>
                      {t.spread.positions[index]}
                    </div>
                    <div className="card-face">
                      <div className="card-art" style={cssVars({ "--hue": card.hue })}>
                        <CardGlyphIcon glyph={card.glyph} size={56} />
                      </div>
                      <div>
                        <h2>{text.name}</h2>
                        <p>{text.subtitle}</p>
                        <span className="tag">{text.keyword}</span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {tab === "ritual" && mode === "natal" && step === 1 && (
          <section className="screen content" key="birth">
            <div className="hero">
              <h2 className="title-1">{t.natal.formTitle}</h2>
              <p>{t.natal.formSubtitle}</p>
            </div>
            <div className="stack">
              <div>
                <div className="group">
                  <label className="row with-icon input-row">
                    <span className="row-icon">
                      <Icon name="calendar" size={17} strokeWidth={2} />
                    </span>
                    <span className="row-title">{t.natal.date}</span>
                    <input
                      type="date"
                      aria-label={t.natal.date}
                      value={draftDate}
                      max={new Date().toISOString().slice(0, 10)}
                      min="1900-01-01"
                      onChange={(event) => setDraftDate(event.target.value)}
                    />
                  </label>
                  <label className="row with-icon input-row">
                    <span className="row-icon teal">
                      <Icon name="clock" size={17} strokeWidth={2} />
                    </span>
                    <span className="row-title">{t.natal.time}</span>
                    <input
                      type="time"
                      aria-label={t.natal.time}
                      value={draftTime}
                      disabled={timeUnknown}
                      onChange={(event) => setDraftTime(event.target.value)}
                    />
                  </label>
                  <div className="row with-icon">
                    <span className="row-icon gray">
                      <Icon name="clock" size={17} strokeWidth={2} />
                    </span>
                    <span className="row-title">{t.natal.timeUnknown}</span>
                    <Switch checked={timeUnknown} onChange={setTimeUnknown} label={t.natal.timeUnknown} />
                  </div>
                </div>
                {timeUnknown && <div className="section-footer">{t.natal.timeUnknownHint}</div>}
              </div>

              <div>
                <div className="section-label">{t.natal.place}</div>
                <div className="group">
                  <div className="field">
                    <Icon name="globe" className="leading-icon" size={20} strokeWidth={1.8} />
                    <input
                      aria-label={t.natal.place}
                      value={placeQuery}
                      onChange={(event) => {
                        setPlaceQuery(event.target.value);
                        setDraftPlace(null);
                      }}
                      placeholder={t.natal.placePlaceholder}
                      autoComplete="off"
                      enterKeyHint="search"
                    />
                  </div>
                  {placeStatus === "searching" && <div className="status-line">{t.natal.searching}</div>}
                  {placeStatus === "empty" && <div className="status-line">{t.natal.noResults}</div>}
                  {placeStatus === "error" && <div className="status-line error">{t.natal.geoError}</div>}
                  {placeResults.map((place) => (
                    <button
                      key={place.id}
                      className="row no-leading"
                      aria-pressed={draftPlace?.id === place.id}
                      onClick={() => {
                        setDraftPlace(place);
                        setPlaceQuery(formatPlace(place));
                        setPlaceResults([]);
                        setPlaceStatus("idle");
                      }}
                    >
                      <div>
                        <div className="row-title">{place.name}</div>
                        <div className="row-subtitle">
                          {[place.region, place.country].filter(Boolean).join(", ")}
                        </div>
                      </div>
                      <span className="row-check">
                        <Icon name="checkmark" size={20} strokeWidth={2.6} />
                      </span>
                    </button>
                  ))}
                  {draftPlace && placeResults.length === 0 && (
                    <div className="row no-leading">
                      <div>
                        <div className="row-title">{draftPlace.name}</div>
                        <div className="row-subtitle">
                          {[draftPlace.region, draftPlace.country].filter(Boolean).join(", ")} · {draftPlace.tz}
                        </div>
                      </div>
                      <span className="row-check" style={{ opacity: 1, transform: "none" }}>
                        <Icon name="checkmark" size={20} strokeWidth={2.6} />
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {tab === "ritual" && mode === "natal" && step === 2 && chart && birth && (
          <section className="screen content" key="chart">
            <div className="hero">
              <h2 className="title-1">{t.natal.chartTitle}</h2>
              <p>
                {[formatBirthDate(birth.date, t.tag), birth.time, formatPlace(birth.place)]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="stack">
              <div className="wheel-card">
                <ChartWheel chart={chart} label={t.natal.chartTitle} />
              </div>

              {!chart.hasTime && (
                <div className="group">
                  <div className="notice-row">
                    <Icon name="clock" size={18} strokeWidth={1.9} />
                    <span>{t.natal.noTime}</span>
                  </div>
                </div>
              )}

              <div>
                <div className="section-label">{t.natal.bigThree}</div>
                <div className="group">
                  {bigThree
                    .map((id) => chart.points.find((point) => point.id === id))
                    .filter((point): point is ChartPoint => Boolean(point))
                    .map((point) => renderPointRow(point))}
                </div>
              </div>

              <div>
                <div className="section-head">
                  <div className="section-label">{t.natal.planetsLabel}</div>
                  {chart.houseSystem && (
                    <div className="section-meta">
                      {chart.houseSystem === "placidus" ? t.natal.housesPlacidus : t.natal.housesWhole}
                    </div>
                  )}
                </div>
                <div className="group">
                  {planetOrder
                    .filter((id) => id !== "sun" && id !== "moon")
                    .map((id) => chart.points.find((point) => point.id === id))
                    .filter((point): point is ChartPoint => Boolean(point))
                    .map((point) => renderPointRow(point))}
                  {chart.points
                    .filter((point) => point.id === "mc")
                    .map((point) => renderPointRow(point))}
                </div>
              </div>

              {chart.aspects.length > 0 && (
                <div>
                  <div className="section-label">{t.natal.aspectsLabel}</div>
                  <div className="group">
                    {chart.aspects.slice(0, 6).map((aspect) => (
                      <div className="row with-icon" key={`${aspect.a}-${aspect.b}-${aspect.type}`}>
                        <span className="aspect-glyphs" aria-hidden="true">
                          {pointGlyphs[aspect.a]} {aspectGlyphs[aspect.type]} {pointGlyphs[aspect.b]}
                        </span>
                        <div>
                          <div className="row-title">
                            {t.natal.planets[aspect.a]} — {t.natal.planets[aspect.b]}
                          </div>
                          <div className="row-subtitle">
                            {t.natal.aspects[aspect.type]} · {t.natal.orb} {aspect.orb}°
                          </div>
                        </div>
                        <span />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="section-label">{t.natal.focusLabel}</div>
                <div className="group">
                  <div className="field">
                    <input
                      aria-label={t.natal.focusLabel}
                      value={natalFocus}
                      onChange={(event) => setNatalFocus(event.target.value)}
                      placeholder={t.natal.focusPlaceholder}
                      maxLength={300}
                      autoComplete="off"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {onReading && (
          <section className="screen content" key={`reading-${mode}`}>
            {loading && (
              <div className="state" role="status">
                <Spinner />
                <h2>{t.reading.loadingTitle}</h2>
                <p>{t.reading.loadingText}</p>
              </div>
            )}

            {error && !loading && (
              <div className="state" role="alert">
                <Icon name="warning" size={40} strokeWidth={1.6} className="warning-icon" />
                <h2>{t.reading.errorTitle}</h2>
                <p>{error}</p>
                <button className="btn tinted" onClick={retryReading}>
                  {t.reading.retry}
                </button>
              </div>
            )}

            {mode === "tarot" && tarotReading && !loading && (
              <div className="stack">
                <header className="reading-header">
                  <div className="footnote secondary">{readingHeaderCaption}</div>
                  <h2 className="title-1">{tarotReading.title}</h2>
                </header>

                <div className="group">
                  <p className="prose">{tarotReading.overview}</p>
                </div>

                <div>
                  <div className="section-label">{t.reading.positions}</div>
                  <div className="group">
                    {tarotReading.positions.map((item, index) => (
                      <div className="insight-row" key={`${item.card}-${index}`}>
                        <span className="insight-num">{index + 1}</span>
                        <div>
                          <small>{item.position}</small>
                          <h3>{item.card}</h3>
                          <p>{item.insight}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="section-label">{t.reading.pattern}</div>
                  <div className="group">
                    <p className="prose">{tarotReading.pattern}</p>
                  </div>
                </div>

                <div>
                  <div className="section-label">{t.reading.steps}</div>
                  <div className="group">
                    {tarotReading.nextSteps.map((text, index) => (
                      <div className="step-row" key={index}>
                        <Icon name="checkmark" className="check" size={20} strokeWidth={2.4} />
                        <span>{text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="quote-card">
                  <div className="quote-label">
                    <Icon name="quote" size={16} strokeWidth={0} />
                    {t.reading.journal}
                  </div>
                  <p>{tarotReading.reflectionQuestion}</p>
                </div>

                <div className="actions">
                  <button className="btn tinted" onClick={share}>
                    <Icon name="share" size={20} />
                    {t.reading.share}
                  </button>
                  {origin === "archive" && (
                    <button className="btn plain destructive" onClick={() => deleteArchived(archivedId)}>
                      {t.reading.deleteFromArchive}
                    </button>
                  )}
                </div>
              </div>
            )}

            {mode === "natal" && natalReading && !loading && (
              <div className="stack">
                <header className="reading-header">
                  <div className="footnote secondary">{readingHeaderCaption}</div>
                  <h2 className="title-1">{natalReading.title}</h2>
                </header>

                <div className="group">
                  <p className="prose">{natalReading.overview}</p>
                </div>

                <div>
                  <div className="section-label">{t.natal.reading.placements}</div>
                  <div className="group">
                    {natalReading.placements.map((item, index) => (
                      <div className="insight-row" key={`${item.placement}-${index}`}>
                        <span className="insight-num">{index + 1}</span>
                        <div>
                          <small>{item.label}</small>
                          <h3>{item.placement}</h3>
                          <p>{item.insight}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="section-label">{t.natal.reading.tension}</div>
                  <div className="group">
                    <p className="prose">{natalReading.tension}</p>
                  </div>
                </div>

                <div>
                  <div className="section-label">{t.natal.reading.strength}</div>
                  <div className="group">
                    <p className="prose">{natalReading.strength}</p>
                  </div>
                </div>

                <div>
                  <div className="section-label">{t.reading.steps}</div>
                  <div className="group">
                    {natalReading.nextSteps.map((text, index) => (
                      <div className="step-row" key={index}>
                        <Icon name="checkmark" className="check" size={20} strokeWidth={2.4} />
                        <span>{text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="quote-card">
                  <div className="quote-label">
                    <Icon name="quote" size={16} strokeWidth={0} />
                    {t.reading.journal}
                  </div>
                  <p>{natalReading.reflectionQuestion}</p>
                </div>

                <div className="actions">
                  <button className="btn tinted" onClick={share}>
                    <Icon name="share" size={20} />
                    {t.reading.share}
                  </button>
                  {origin === "archive" && (
                    <button className="btn plain destructive" onClick={() => deleteArchived(archivedId)}>
                      {t.reading.deleteFromArchive}
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {footer && (
        <div className="footer material hairline-top">
          <div className="footer-inner">{footer}</div>
        </div>
      )}

      {showTabBar && (
        <nav className="tabbar material hairline-top">
          <button aria-current={tab === "ritual" ? "page" : undefined} onClick={() => switchTab("ritual")}>
            <Icon name="sparkles" size={26} strokeWidth={1.7} />
            {t.tabs.ritual}
          </button>
          <button aria-current={tab === "archive" ? "page" : undefined} onClick={() => switchTab("archive")}>
            <Icon name="archive" size={26} strokeWidth={1.7} />
            {t.tabs.archive}
          </button>
        </nav>
      )}

      {settingsOpen && (
        <div
          className="backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSettingsOpen(false);
          }}
        >
          <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="settings-title">
            <div className="grabber" aria-hidden="true" />
            <header className="sheet-header">
              <span />
              <h2 id="settings-title">{t.settings.title}</h2>
              <button className="nav-button bold" onClick={() => setSettingsOpen(false)} autoFocus>
                {t.nav.done}
              </button>
            </header>
            <div className="stack">
              <div>
                <div className="section-label">{t.settings.appearance}</div>
                <div className="group">
                  <div className="segmented-row">
                    <div className="segmented" role="group" aria-label={t.settings.appearance}>
                      {(["system", "light", "dark"] as Theme[]).map((value) => (
                        <button key={value} aria-pressed={theme === value} onClick={() => setTheme(value)}>
                          {t.settings.themes[value]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="section-label">{t.settings.language}</div>
                <div className="group">
                  <div className="segmented-row language-row">
                    <div className="segmented" role="group" aria-label={t.settings.language}>
                      {locales.map((value) => (
                        <button key={value} aria-pressed={locale === value} onClick={() => setLocale(value)}>
                          {messages[value].name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="section-label">{t.settings.birth}</div>
                <div className="group">
                  <button className="row with-icon" onClick={() => openNatal(true)}>
                    <span className="row-icon">
                      <Icon name="person" size={17} strokeWidth={2} />
                    </span>
                    <span>
                      <span className="row-title">
                        {birth ? formatBirthDate(birth.date, t.tag) : t.settings.birthEmpty}
                      </span>
                      {birth && (
                        <span className="row-subtitle">
                          {[birth.time, formatPlace(birth.place)].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </span>
                    <span className="row-value tint">{t.settings.birthEdit}</span>
                  </button>
                  {birth && (
                    <div className="row with-icon">
                      <span className="row-icon teal">
                        <Icon name="sparkles" size={17} strokeWidth={2} />
                      </span>
                      <span className="row-title">{t.settings.enrich}</span>
                      <Switch checked={enrich} onChange={setEnrich} label={t.settings.enrich} />
                    </div>
                  )}
                  {birth && (
                    <button className="row with-icon" onClick={deleteBirth}>
                      <span className="row-icon red">
                        <Icon name="trash" size={17} strokeWidth={2} />
                      </span>
                      <span className="row-title destructive">{t.settings.birthDelete}</span>
                      <span />
                    </button>
                  )}
                </div>
                {birth && <div className="section-footer">{t.settings.enrichFooter}</div>}
              </div>

              <div>
                <div className="section-label">{t.settings.archive}</div>
                <div className="group">
                  <div className="row with-icon">
                    <span className="row-icon gray">
                      <Icon name="archive" size={17} strokeWidth={2} />
                    </span>
                    <span className="row-title">{t.settings.saved}</span>
                    <span className="row-value">{archive.length}</span>
                  </div>
                  <button className="row with-icon" onClick={clearArchive} disabled={archive.length === 0}>
                    <span className="row-icon red">
                      <Icon name="trash" size={17} strokeWidth={2} />
                    </span>
                    <span className="row-title destructive">{t.settings.clear}</span>
                    <span />
                  </button>
                </div>
                <div className="section-footer">{t.settings.archiveFooter}</div>
              </div>

              <div>
                <div className="section-label">{t.settings.about}</div>
                <div className="group">
                  <div className="row with-icon">
                    <span className="row-icon">
                      <Icon name="sparkles" size={17} strokeWidth={2} />
                    </span>
                    <span className="row-title">{t.settings.version}</span>
                    <span className="row-value">0.3</span>
                  </div>
                  <div className="row with-icon">
                    <span className="row-icon teal">
                      <Icon name="lock" size={17} strokeWidth={2} />
                    </span>
                    <span className="row-title">{t.settings.model}</span>
                    <span className="row-value">OpenRouter</span>
                  </div>
                </div>
                <div className="section-footer">{t.settings.aboutFooter}</div>
              </div>
            </div>
          </section>
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          <Icon name="checkmark" size={16} strokeWidth={2.6} />
          {toast}
        </div>
      )}
    </div>
  );
}
