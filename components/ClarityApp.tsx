"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cardById, cards, positions, type TarotCard } from "@/lib/cards";
import { CardBackPattern, CardGlyphIcon, Icon } from "@/components/icons";

type Reading = {
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

type ArchivedReading = {
  id: string;
  createdAt: string;
  focus: string;
  cardIds: string[];
  reading: Reading;
};

type Tab = "ritual" | "archive";
type Theme = "system" | "light" | "dark";
type Origin = "flow" | "archive";

const TOTAL_STEPS = 6;
const ARCHIVE_LIMIT = 30;
const STORAGE_ARCHIVE = "aura-archive";
const STORAGE_THEME = "aura-theme";

const stepTitles = ["AURA", "Ситуація", "Принципи", "Історія", "Колода", "Розклад", "Рефлексія"];

const focusChips = ["тривога", "туга", "мовчання", "ревнощі"];

const situations = [
  {
    title: "Я не можу зрозуміти їхні сигнали",
    description: "Невпевненість через приховані наміри або ледь помітні зміни в поведінці.",
  },
  {
    title: "Останнім часом ми віддалилися",
    description: "Там, де раніше був глибокий зв’язок, з’явилася тиха дистанція.",
  },
  {
    title: "Я не знаю, чи варто написати",
    description: "Ви стоїте на порозі розмови, але вагаєтеся через минулий досвід.",
  },
  {
    title: "Я постійно думаю про те, що вони відчувають",
    description: "Розум створює нескінченні сценарії, намагаючись знайти правду в тінях.",
  },
  {
    title: "Щось інше",
    description: "Особлива ситуація, яка потребує більш особистої рефлексії.",
  },
];

const homeFeatures = [
  {
    icon: "lock",
    title: "Приватно",
    text: "Історія надсилається моделі лише для створення рефлексії. Архів зберігається на цьому пристрої.",
  },
  {
    icon: "heart",
    title: "Психологічно виважено",
    text: "Без пророцтв, діагнозів і тверджень про чужі почуття.",
  },
  {
    icon: "arrow-right",
    title: "Один конкретний крок",
    text: "Кожна сесія завершується дією, яку можна зробити сьогодні.",
  },
] as const;

const principles = [
  {
    icon: "anchor",
    title: "Внутрішня опора",
    text: "Ми не передбачаємо чужі почуття чи майбутнє. Ми повертаємо увагу до того, що ви можете помітити й обрати.",
  },
  {
    icon: "layers",
    title: "Психологічна глибина",
    text: "Карти — це метафори для рефлексії, а не діагнози й не вироки.",
  },
  {
    icon: "checkmark-circle",
    title: "Свідома дія",
    text: "Кожна рефлексія завершується одним конкретним кроком, який ви можете зробити сьогодні.",
  },
] as const;

const themeLabels: Record<Theme, string> = {
  system: "Авто",
  light: "Світла",
  dark: "Темна",
};

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

function selectionLabel(count: number) {
  if (count === 0) return "Оберіть три карти";
  if (count === 1) return "Оберіть ще дві";
  if (count === 2) return "Оберіть ще одну";
  return "Три карти обрано";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function readingToText(reading: Reading, spread: TarotCard[]) {
  const lines = [
    reading.title,
    "",
    reading.overview,
    "",
    ...reading.positions.map(
      (item, index) => `${index + 1}. ${item.position} — ${item.card}\n${item.insight}`,
    ),
    "",
    `Спільна тема: ${reading.pattern}`,
    "",
    "Наступні кроки:",
    ...reading.nextSteps.map((text, index) => `${index + 1}. ${text}`),
    "",
    `Для щоденника: ${reading.reflectionQuestion}`,
    "",
    `Розклад: ${spread.map((card) => card.name).join(" · ")}`,
    "— AURA",
  ];
  return lines.join("\n");
}

function loadArchive(): ArchivedReading[] {
  const raw = localStorage.getItem(STORAGE_ARCHIVE);
  if (!raw) return [];
  const parsed = JSON.parse(raw) as Array<
    Partial<ArchivedReading> & { cards?: Array<{ id: string }> }
  >;
  return parsed
    .filter((item) => item && item.id && item.reading && item.createdAt)
    .map((item) => ({
      id: item.id as string,
      createdAt: item.createdAt as string,
      focus: item.focus ?? "",
      // Older archives stored whole card objects instead of ids.
      cardIds: item.cardIds ?? item.cards?.map((card) => card.id) ?? [],
      reading: item.reading as Reading,
    }));
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
}: {
  items: ReadonlyArray<{ icon: string; title: string; text: string }>;
}) {
  return (
    <div className="features">
      {items.map((item) => (
        <div className="feature" key={item.title}>
          <div className="feature-icon">
            <Icon name={item.icon as never} size={30} strokeWidth={1.6} />
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

export default function ClarityApp() {
  const [tab, setTab] = useState<Tab>("ritual");
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [focus, setFocus] = useState("");
  const [situation, setSituation] = useState("");
  const [context, setContext] = useState("");
  const [deck, setDeck] = useState<string[]>(() => cards.map((card) => card.id));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reading, setReading] = useState<Reading | null>(null);
  const [origin, setOrigin] = useState<Origin>("flow");
  const [archivedId, setArchivedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [archive, setArchive] = useState<ArchivedReading[]>([]);
  const [theme, setTheme] = useState<Theme>("system");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

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
    try {
      setArchive(loadArchive());
      const savedTheme = localStorage.getItem(STORAGE_THEME);
      if (savedTheme === "light" || savedTheme === "dark") {
        setTheme(savedTheme);
      }
    } catch {
      // Storage is optional: private mode may disable it.
    }
  }, []);

  useEffect(() => {
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
  }, [theme]);

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

  function resetRitual() {
    abortRef.current?.abort();
    setTab("ritual");
    setDirection(-1);
    setStep(0);
    setFocus("");
    setSituation("");
    setContext("");
    setSelectedIds([]);
    setReading(null);
    setOrigin("flow");
    setArchivedId(null);
    setLoading(false);
    setError("");
    setSettingsOpen(false);
    window.scrollTo(0, 0);
  }

  function backToArchive() {
    abortRef.current?.abort();
    setTab("archive");
    setDirection(-1);
    setStep(0);
    setReading(null);
    setOrigin("flow");
    setArchivedId(null);
    setLoading(false);
    setError("");
    window.scrollTo(0, 0);
  }

  function switchTab(next: Tab) {
    setTab(next);
    setDirection(next === "archive" ? 1 : -1);
    setStep(0);
    window.scrollTo(0, 0);
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

  async function generateReading() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError("");
    setReading(null);
    setOrigin("flow");
    setArchivedId(null);
    goTo(6);

    try {
      const response = await fetch("/api/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          focus,
          situation,
          context,
          cards: selectedCards.map(({ name, subtitle, keyword, meaning }) => ({
            name,
            subtitle,
            keyword,
            meaning,
          })),
        }),
      });
      const payload = (await response.json()) as { reading?: Reading; error?: string };

      if (!response.ok || !payload.reading) {
        throw new Error(payload.error ?? "Не вдалося створити рефлексію.");
      }

      const item: ArchivedReading = {
        id: makeId(),
        createdAt: new Date().toISOString(),
        focus: focus || situation,
        cardIds: selectedIds,
        reading: payload.reading,
      };
      setReading(payload.reading);
      setArchivedId(item.id);
      persistArchive((current) => [item, ...current].slice(0, ARCHIVE_LIMIT));
    } catch (caught) {
      if (controller.signal.aborted) return;
      setError(
        caught instanceof Error ? caught.message : "Не вдалося створити рефлексію.",
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  function openArchived(item: ArchivedReading) {
    setFocus(item.focus);
    setSelectedIds(item.cardIds);
    setReading(item.reading);
    setOrigin("archive");
    setArchivedId(item.id);
    setError("");
    setLoading(false);
    setTab("ritual");
    goTo(6);
  }

  function deleteArchived(id: string | null) {
    if (!id) return;
    if (!window.confirm("Видалити цю рефлексію з архіву?")) return;
    persistArchive((current) => current.filter((item) => item.id !== id));
    backToArchive();
  }

  function clearArchive() {
    if (!window.confirm("Очистити весь архів на цьому пристрої?")) return;
    persistArchive(() => []);
  }

  async function share() {
    if (!reading) return;
    const text = readingToText(reading, selectedCards);
    try {
      if (navigator.share) {
        await navigator.share({ title: reading.title, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setToast("Скопійовано");
    } catch (caught) {
      if (caught instanceof Error && caught.name === "AbortError") return;
      setToast("Не вдалося поділитися");
    }
  }

  const inFlow = tab === "ritual" && step > 0;
  const showTabBar = step === 0;
  const contextReady = context.trim().length >= 12;

  const footer = (() => {
    if (!inFlow) return null;
    switch (step) {
      case 1:
        return (
          <button className="btn" disabled={!situation} onClick={() => goTo(2)}>
            Продовжити
          </button>
        );
      case 2:
        return (
          <button className="btn" onClick={() => goTo(3)}>
            Я розумію
          </button>
        );
      case 3:
        return (
          <button className="btn" disabled={!contextReady} onClick={startDeck}>
            Продовжити
          </button>
        );
      case 4:
        return (
          <button className="btn" disabled={selectedIds.length < 3} onClick={() => goTo(5)}>
            Відкрити розклад
          </button>
        );
      case 5:
        return (
          <button className="btn" onClick={generateReading}>
            Створити рефлексію
          </button>
        );
      case 6:
        return reading && !loading && origin === "flow" ? (
          <button className="btn" onClick={resetRitual}>
            Новий ритуал
          </button>
        ) : null;
      default:
        return null;
    }
  })();

  const navTitle = tab === "archive" ? "Архів" : stepTitles[step];

  return (
    <div
      className={`app ${showTabBar ? "has-tabbar" : ""} ${footer ? "has-footer" : ""}`}
    >
      <header className="nav material hairline-bottom">
        <div className="nav-inner">
          <div className="nav-leading">
            {inFlow && (
              <button
                className="nav-button back"
                onClick={() => (step === 6 && origin === "archive" ? backToArchive() : goTo(step - 1))}
                aria-label="Назад"
              >
                <Icon name="chevron-left" size={24} strokeWidth={2.4} />
                <span>Назад</span>
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
                aria-label="Налаштування"
              >
                <Icon name="gear" size={24} strokeWidth={1.8} />
              </button>
            )}
            {inFlow && step === 6 && reading && !loading && (
              <button className="nav-button" onClick={share} aria-label="Поділитися">
                <Icon name="share" size={22} strokeWidth={1.9} />
              </button>
            )}
            {inFlow && !(step === 6 && reading && !loading) && (
              <button className="nav-button" onClick={origin === "archive" ? backToArchive : resetRitual}>
                Скасувати
              </button>
            )}
          </div>
          {inFlow && (
            <div className="nav-progress" aria-hidden="true">
              <i style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
            </div>
          )}
        </div>
      </header>

      <main style={cssVars({ "--dir": direction })}>
        {tab === "archive" && (
          <section className="screen content" key="archive">
            <div className="hero">
              <h2 className="large-title">Архів</h2>
              <p>Рефлексії зберігаються лише на цьому пристрої.</p>
            </div>
            {archive.length === 0 ? (
              <div className="empty">
                <Icon name="tray" size={44} strokeWidth={1.5} />
                <h2>Поки порожньо</h2>
                <p>Завершені рефлексії з’являтимуться тут.</p>
              </div>
            ) : (
              <div className="group">
                {archive.map((item) => (
                  <button className="row no-leading" key={item.id} onClick={() => openArchived(item)}>
                    <div>
                      <div className="row-meta">{formatDate(item.createdAt)}</div>
                      <div className="row-title">{item.reading.title}</div>
                      <div className="row-subtitle">
                        {item.cardIds
                          .map((id) => cardById(id)?.name)
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
              <h2 className="title-1">Від тривоги — до ясності.</h2>
              <p>
                Керована рефлексія з образами таро про те, що ви можете помітити
                й обрати. Не пророцтво.
              </p>
            </div>
            <div className="stack">
              <div>
                <div className="section-label">Фокус рефлексії</div>
                <div className="group">
                  <div className="field">
                    <input
                      id="focus"
                      aria-label="Фокус рефлексії"
                      value={focus}
                      onChange={(event) => setFocus(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") goTo(1);
                      }}
                      placeholder="Що непокоїть вас сьогодні?"
                      enterKeyHint="go"
                      maxLength={200}
                      autoComplete="off"
                    />
                  </div>
                  <div className="chips" aria-label="Запропоновані теми">
                    {focusChips.map((chip) => (
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
                <div className="section-footer">
                  Необов’язково. Допомагає точніше зрозуміти, про що йдеться.
                </div>
              </div>
              <button className="btn" onClick={() => goTo(1)}>
                Почати ритуал
              </button>
              <FeatureList items={homeFeatures} />
            </div>
          </section>
        )}

        {tab === "ritual" && step === 1 && (
          <section className="screen content" key="situation">
            <div className="hero">
              <h2 className="title-1">Що привело вас сьогодні?</h2>
              <p>Оберіть те, що найбільше відгукується вашому стану.</p>
            </div>
            <div className="group">
              {situations.map((item) => (
                <button
                  key={item.title}
                  className="row no-leading"
                  aria-pressed={situation === item.title}
                  onClick={() => setSituation(item.title)}
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

        {tab === "ritual" && step === 2 && (
          <section className="screen content" key="principles">
            <div className="hero centered">
              <h2 className="title-1">Ясність, а не пророцтво.</h2>
              <p>
                Це не передбачення чужих почуттів чи майбутнього. Це керована
                рефлексія про те, що ви можете помітити й обрати.
              </p>
            </div>
            <FeatureList items={principles} />
          </section>
        )}

        {tab === "ritual" && step === 3 && (
          <section className="screen content" key="context">
            <div className="hero">
              <h2 className="title-1">Розкажіть, що сталося.</h2>
              <p>Що досі залишається невирішеним? Пишіть вільно.</p>
            </div>
            <div className="group">
              <textarea
                className="textarea"
                id="context"
                aria-label="Ваша історія"
                value={context}
                onChange={(event) => setContext(event.target.value)}
                placeholder="Пишіть вільно…"
                maxLength={4000}
                rows={8}
              />
            </div>
            <div className="section-footer between">
              <span>
                {contextReady
                  ? "Текст потрібен лише для цієї рефлексії."
                  : "Щонайменше 12 символів."}
              </span>
              <span>{context.length} / 4000</span>
            </div>
          </section>
        )}

        {tab === "ritual" && step === 4 && (
          <section className="screen content" key="deck">
            <div className="hero">
              <h2 className="title-1">Зробіть вдих.</h2>
              <p>Побудьте із ситуацією. Коли будете готові, оберіть три карти.</p>
            </div>
            <div className="deck-status" aria-live="polite">
              <span>{selectionLabel(selectedIds.length)}</span>
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
                    aria-label={`Карта ${index + 1}`}
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

        {tab === "ritual" && step === 5 && (
          <section className="screen content" key="reveal">
            <div className="hero">
              <h2 className="title-1">Ваш розклад</h2>
              <p>Три образи для трьох запитань.</p>
            </div>
            <div className="spread">
              {selectedCards.map((card, index) => (
                <article className="spread-item" key={card.id} style={cssVars({ "--i": index })}>
                  <div className="position">
                    <b>{index + 1}</b>
                    {positions[index]}
                  </div>
                  <div className="card-face">
                    <div className="card-art" style={cssVars({ "--hue": card.hue })}>
                      <CardGlyphIcon glyph={card.glyph} size={56} />
                    </div>
                    <div>
                      <h2>{card.name}</h2>
                      <p>{card.subtitle}</p>
                      <span className="tag">{card.keyword}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === "ritual" && step === 6 && (
          <section className="screen content" key="reading">
            {loading && (
              <div className="state" role="status">
                <Spinner />
                <h2>Збираємо нитки воєдино…</h2>
                <p>Це може тривати до хвилини. Не закривайте застосунок.</p>
              </div>
            )}

            {error && !loading && (
              <div className="state" role="alert">
                <Icon name="warning" size={40} strokeWidth={1.6} className="warning-icon" />
                <h2>Не вдалося створити рефлексію</h2>
                <p>{error}</p>
                <button className="btn tinted" onClick={generateReading}>
                  Спробувати ще раз
                </button>
              </div>
            )}

            {reading && !loading && (
              <div className="stack">
                <header className="reading-header">
                  <div className="footnote secondary">
                    {archivedItem ? `${formatDate(archivedItem.createdAt)} · ` : ""}
                    {selectedCards.map((card) => card.name).join(" · ")}
                  </div>
                  <h2 className="title-1">{reading.title}</h2>
                </header>

                <div className="group">
                  <p className="prose">{reading.overview}</p>
                </div>

                <div>
                  <div className="section-label">Три позиції</div>
                  <div className="group">
                    {reading.positions.map((item, index) => (
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
                  <div className="section-label">Спільна тема</div>
                  <div className="group">
                    <p className="prose">{reading.pattern}</p>
                  </div>
                </div>

                <div>
                  <div className="section-label">Наступні кроки</div>
                  <div className="group">
                    {reading.nextSteps.map((text, index) => (
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
                    Для вашого щоденника
                  </div>
                  <p>{reading.reflectionQuestion}</p>
                </div>

                <div className="actions">
                  <button className="btn tinted" onClick={share}>
                    <Icon name="share" size={20} />
                    Поділитися
                  </button>
                  {origin === "archive" && (
                    <button className="btn plain destructive" onClick={() => deleteArchived(archivedId)}>
                      Видалити з архіву
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
        <nav className="tabbar material hairline-top" aria-label="Основна навігація">
          <button
            aria-current={tab === "ritual" ? "page" : undefined}
            onClick={() => switchTab("ritual")}
          >
            <Icon name="sparkles" size={26} strokeWidth={1.7} />
            Ритуал
          </button>
          <button
            aria-current={tab === "archive" ? "page" : undefined}
            onClick={() => switchTab("archive")}
          >
            <Icon name="archive" size={26} strokeWidth={1.7} />
            Архів
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
          <section
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
          >
            <div className="grabber" aria-hidden="true" />
            <header className="sheet-header">
              <span />
              <h2 id="settings-title">Налаштування</h2>
              <button className="nav-button bold" onClick={() => setSettingsOpen(false)} autoFocus>
                Готово
              </button>
            </header>
            <div className="stack">
              <div>
                <div className="section-label">Вигляд</div>
                <div className="group">
                  <div className="segmented-row">
                    <div className="segmented" role="group" aria-label="Тема оформлення">
                      {(Object.keys(themeLabels) as Theme[]).map((value) => (
                        <button
                          key={value}
                          aria-pressed={theme === value}
                          onClick={() => setTheme(value)}
                        >
                          {themeLabels[value]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="section-label">Архів</div>
                <div className="group">
                  <div className="row with-icon">
                    <span className="row-icon gray">
                      <Icon name="archive" size={17} strokeWidth={2} />
                    </span>
                    <span className="row-title">Збережено рефлексій</span>
                    <span className="row-value">{archive.length}</span>
                  </div>
                  <button
                    className="row with-icon"
                    onClick={clearArchive}
                    disabled={archive.length === 0}
                  >
                    <span className="row-icon red">
                      <Icon name="trash" size={17} strokeWidth={2} />
                    </span>
                    <span className="row-title destructive">Очистити архів</span>
                    <span />
                  </button>
                </div>
                <div className="section-footer">
                  Архів зберігається лише в цьому браузері на цьому пристрої.
                </div>
              </div>

              <div>
                <div className="section-label">Про застосунок</div>
                <div className="group">
                  <div className="row with-icon">
                    <span className="row-icon">
                      <Icon name="sparkles" size={17} strokeWidth={2} />
                    </span>
                    <span className="row-title">Версія</span>
                    <span className="row-value">0.2</span>
                  </div>
                  <div className="row with-icon">
                    <span className="row-icon teal">
                      <Icon name="lock" size={17} strokeWidth={2} />
                    </span>
                    <span className="row-title">Модель</span>
                    <span className="row-value">OpenRouter</span>
                  </div>
                </div>
                <div className="section-footer">
                  Рефлексію створює мовна модель. Ваша історія надсилається лише
                  для генерації і не зберігається на сервері.
                </div>
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
