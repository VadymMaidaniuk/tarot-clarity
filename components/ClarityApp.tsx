"use client";

import { useEffect, useMemo, useState } from "react";
import { cards, positions, type TarotCard } from "@/lib/cards";

type Provider = "auto" | "local" | "openrouter" | "demo";

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
  cards: TarotCard[];
  reading: Reading;
  provider: string;
};

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

const providerLabels: Record<Provider, string> = {
  auto: "Автоматично",
  local: "Локальна LLM",
  openrouter: "OpenRouter",
  demo: "Демо",
};

function cardsToChoose(count: number) {
  if (count === 1) return "Оберіть ще 1 карту";
  if (count >= 2 && count <= 4) return `Оберіть ще ${count} карти`;
  return "Три карти обрано";
}

export default function ClarityApp() {
  const [step, setStep] = useState(0);
  const [focus, setFocus] = useState("");
  const [situation, setSituation] = useState("");
  const [context, setContext] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [provider, setProvider] = useState<Provider>("auto");
  const [reading, setReading] = useState<Reading | null>(null);
  const [readingProvider, setReadingProvider] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archive, setArchive] = useState<ArchivedReading[]>([]);

  const selectedCards = useMemo(
    () =>
      selectedIds
        .map((id) => cards.find((card) => card.id === id))
        .filter((card): card is TarotCard => Boolean(card)),
    [selectedIds],
  );

  useEffect(() => {
    try {
      const savedProvider = localStorage.getItem("aura-provider") as Provider | null;
      const savedArchive = localStorage.getItem("aura-archive");
      if (savedProvider && providerLabels[savedProvider]) {
        setProvider(savedProvider);
      }
      if (savedArchive) {
        setArchive(JSON.parse(savedArchive) as ArchivedReading[]);
      }
    } catch {
      // Сховище необов’язкове: приватний режим може його вимкнути.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("aura-provider", provider);
  }, [provider]);

  function goTo(nextStep: number) {
    setStep(nextStep);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetRitual() {
    setStep(0);
    setFocus("");
    setSituation("");
    setContext("");
    setSelectedIds([]);
    setReading(null);
    setReadingProvider("");
    setError("");
    setWarning("");
    setSettingsOpen(false);
    setArchiveOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    setLoading(true);
    setError("");
    setWarning("");
    goTo(6);

    try {
      const response = await fetch("/api/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
          provider,
        }),
      });
      const payload = (await response.json()) as {
        reading?: Reading;
        provider?: string;
        model?: string;
        fallback?: boolean;
        warning?: string;
        error?: string;
      };

      if (!response.ok || !payload.reading) {
        throw new Error(payload.error ?? "Не вдалося створити рефлексію.");
      }

      setReading(payload.reading);
      setReadingProvider(payload.provider ?? "невідомо");
      if (payload.fallback) {
        setWarning(
          "Локальна модель недоступна, тому використано демонстраційну відповідь.",
        );
      }

      const item: ArchivedReading = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        focus: focus || situation,
        cards: selectedCards,
        reading: payload.reading,
        provider: payload.provider ?? "невідомо",
      };
      setArchive((current) => {
        const next = [item, ...current].slice(0, 20);
        localStorage.setItem("aura-archive", JSON.stringify(next));
        return next;
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Не вдалося створити рефлексію.",
      );
    } finally {
      setLoading(false);
    }
  }

  function openArchived(item: ArchivedReading) {
    setFocus(item.focus);
    setSelectedIds(item.cards.map((card) => card.id));
    setReading(item.reading);
    setReadingProvider(item.provider);
    setArchiveOpen(false);
    goTo(6);
  }

  return (
    <div className="app-shell">
      <div className="progress-track" aria-hidden="true">
        <div className="progress-value" style={{ width: `${(step / 6) * 100}%` }} />
      </div>

      <header className="topbar">
        <button className="icon-button close-icon" onClick={resetRitual} aria-label="Почати спочатку">
          <span />
          <span />
        </button>
        <button className="wordmark" onClick={() => goTo(0)} aria-label="На головну AURA">
          AURA
        </button>
        <button
          className="icon-button menu-icon"
          onClick={() => setSettingsOpen(true)}
          aria-label="Відкрити налаштування"
        >
          <i />
          <i />
          <i />
        </button>
      </header>

      <main className={`ritual-canvas step-${step}`}>
        {step === 0 && (
          <section className="screen landing-screen enter">
            <div className="eyebrow">Внутрішній простір</div>
            <h1>
              Коли ви знову і знову перечитуєте
              <em>їхнє останнє повідомлення.</em>
            </h1>
            <p className="lead">
              Від надмірних роздумів — до ясності. Керований ритуал для серця,
              а не пророцтво про майбутнє.
            </p>

            <div className="glass-panel focus-panel">
              <label htmlFor="focus">Фокус рефлексії</label>
              <input
                id="focus"
                value={focus}
                onChange={(event) => setFocus(event.target.value)}
                placeholder="Що непокоїть вас сьогодні?"
              />
              <div className="chips" aria-label="Запропоновані теми">
                {["тривога", "туга", "мовчання"].map((chip) => (
                  <button key={chip} onClick={() => setFocus(chip)}>
                    {chip}
                  </button>
                ))}
              </div>
              <button className="primary-button" onClick={() => goTo(1)}>
                Знайти ясність
              </button>
            </div>

            <div className="intentional">
              <div>
                <h2><span>✦</span> Простір наміру</h2>
                <ul>
                  <li>Приватний і неупереджений погляд на динаміку ваших стосунків.</li>
                  <li>Психологічно виважені інсайти, поєднані з давнім ритуалом.</li>
                </ul>
              </div>
              <img src="/images/candle.jpg" alt="Свічка, віддзеркалена у темній воді" />
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="screen situation-screen enter">
            <div className="screen-heading">
              <h1>Що привело вас сюди сьогодні?</h1>
              <p>Оберіть шлях, який найбільше відгукується вашому теперішньому стану.</p>
            </div>
            <div className="situation-grid">
              {situations.map((item, index) => (
                <button
                  key={item.title}
                  className={`situation-card ${situation === item.title ? "selected" : ""}`}
                  onClick={() => setSituation(item.title)}
                  aria-pressed={situation === item.title}
                >
                  <span className="number">{String(index + 1).padStart(2, "0")}</span>
                  <strong>{item.title}</strong>
                  <small>{item.description}</small>
                </button>
              ))}
            </div>
            <div className="ritual-divider"><span>Ритуал рефлексії</span></div>
            <button
              className="primary-button wide-button"
              disabled={!situation}
              onClick={() => goTo(2)}
            >
              Почати сесію ясності
            </button>
          </section>
        )}

        {step === 2 && (
          <section className="screen philosophy-screen enter">
            <div className="vertical-mark" />
            <h1>Ясність, <em>а не пророцтво.</em></h1>
            <p className="philosophy-copy">
              Це не передбачення чужих почуттів чи майбутнього. Це керована
              рефлексія про те, що ви можете помітити й обрати.
            </p>
            <ul className="principles">
              <li>Внутрішня опора</li>
              <li>Психологічна глибина</li>
              <li>Свідома дія</li>
            </ul>
            <button className="primary-button compact-button" onClick={() => goTo(3)}>
              Я розумію
            </button>
            <img
              className="philosophy-image"
              src="/images/philosophy.jpg"
              alt="Золоте світло у темному тихому просторі"
            />
          </section>
        )}

        {step === 3 && (
          <section className="screen context-screen enter">
            <div className="screen-heading">
              <h1>Ситуація.</h1>
              <p>Що сталося і що досі залишається невирішеним?</p>
            </div>
            <label className="narrative-label" htmlFor="context">
              Ваша історія
            </label>
            <div className="narrative-wrap">
              <textarea
                id="context"
                value={context}
                onChange={(event) => setContext(event.target.value)}
                placeholder="Пишіть вільно..."
                maxLength={4000}
              />
              <span className="diamonds">◇ ◆</span>
            </div>
            <button
              className="primary-button wide-button"
              disabled={context.trim().length < 12}
              onClick={() => goTo(4)}
            >
              Продовжити рефлексію
            </button>
            <div className="step-count">Крок 4 із 6</div>
          </section>
        )}

        {step === 4 && (
          <section className="screen deck-screen enter">
            <div className="screen-heading">
              <h1>Зробіть вдих.</h1>
              <p>
                Побудьте із ситуацією м’яко. Коли будете готові, оберіть три
                карти з колоди нижче.
              </p>
            </div>
            <div className="choose-count">
              {cardsToChoose(3 - selectedIds.length)}
              <div>
                {[0, 1, 2].map((dot) => (
                  <i key={dot} className={dot < selectedIds.length ? "active" : ""} />
                ))}
              </div>
            </div>
            <div className="deck-grid">
              {cards.map((card, index) => {
                const order = selectedIds.indexOf(card.id);
                return (
                  <button
                    key={card.id}
                    className={`card-back ${order >= 0 ? "selected" : ""}`}
                    style={{ "--card-image": `url(${card.image})` } as React.CSSProperties}
                    onClick={() => chooseCard(card.id)}
                    aria-label={`${order >= 0 ? "Скасувати вибір" : "Обрати"} карти ${index + 1}`}
                    aria-pressed={order >= 0}
                  >
                    <span className="card-glyph">◆</span>
                    <span className="card-line" />
                    {order >= 0 && <b>{order + 1}</b>}
                  </button>
                );
              })}
            </div>
            {selectedIds.length === 3 && (
              <button className="primary-button reveal-button" onClick={() => goTo(5)}>
                Відкрити розклад
              </button>
            )}
          </section>
        )}

        {step === 5 && (
          <section className="screen reveal-screen enter">
            <div className="eyebrow gold">Одкровення</div>
            <h1>Інсайт цієї миті</h1>
            <div className="short-rule" />
            <div className="reveal-list">
              {selectedCards.map((card, index) => (
                <article key={card.id}>
                  <div className="position-label">
                    {index + 1}. {positions[index]}
                  </div>
                  <div className="revealed-card">
                    <img src={card.image} alt="" />
                    <div>
                      <h2>{card.name}</h2>
                      <em>“{card.subtitle}”</em>
                      <span>◆ {card.keyword} ◆</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <button className="primary-button wide-button" onClick={generateReading}>
              Переглянути повну рефлексію
            </button>
          </section>
        )}

        {step === 6 && (
          <section className="screen reading-screen enter">
            <div className="screen-heading">
              <h1>Ваша особиста рефлексія.</h1>
              <p>
                Виважене прочитання трьох карт з урахуванням вашої ситуації.
              </p>
            </div>

            {loading && (
              <div className="reading-loader" role="status">
                <div className="orb" />
                <h2>Збираємо нитки воєдино...</h2>
                <p>Створення рефлексії може тривати кілька хвилин.</p>
              </div>
            )}

            {error && (
              <div className="error-panel">
                <h2>Зв’язок перервався.</h2>
                <p>{error}</p>
                <button className="primary-button" onClick={generateReading}>
                  Спробувати ще раз
                </button>
              </div>
            )}

            {reading && !loading && (
              <>
                {warning && <div className="notice">{warning}</div>}
                <div className="spread-hero">
                  <img src="/images/spread.jpg" alt="Три карти таро на темному шовку" />
                  <div>
                    <span>Розклад</span>
                    <h2>{reading.title}</h2>
                  </div>
                </div>
                <article className="reading-copy">
                  <div className="reading-meta">
                    <span>Інсайт</span>
                    <span>{providerLabels[readingProvider as Provider] ?? readingProvider}</span>
                  </div>
                  <p className="overview">{reading.overview}</p>

                  {reading.positions.map((item, index) => (
                    <section className="reading-position" key={`${item.card}-${index}`}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <small>{item.position}</small>
                        <h3>{item.card}</h3>
                        <p>{item.insight}</p>
                      </div>
                    </section>
                  ))}

                  <section className="pattern-block">
                    <small>Спільна тема</small>
                    <p>{reading.pattern}</p>
                  </section>

                  <section className="next-steps">
                    <small>Практичні наступні кроки</small>
                    <ol>
                      {reading.nextSteps.map((item) => <li key={item}>{item}</li>)}
                    </ol>
                  </section>

                  <blockquote>
                    <span>Для вашого щоденника</span>
                    {reading.reflectionQuestion}
                  </blockquote>
                </article>
                <button className="primary-button wide-button" onClick={resetRitual}>
                  Почати новий ритуал
                </button>
              </>
            )}
          </section>
        )}
      </main>

      <nav className="bottom-nav" aria-label="Основна навігація">
        <button className={!archiveOpen ? "active" : ""} onClick={() => { setArchiveOpen(false); goTo(0); }}>
          <span>✦</span>
          <small>Ритуал</small>
        </button>
        <button className={archiveOpen ? "active" : ""} onClick={() => setArchiveOpen(true)}>
          <span>▧</span>
          <small>Архів</small>
        </button>
        <button onClick={() => setSettingsOpen(true)}>
          <span>◎</span>
          <small>Профіль</small>
        </button>
      </nav>

      {settingsOpen && (
        <div className="modal-backdrop" onMouseDown={() => setSettingsOpen(false)}>
          <section className="sheet" onMouseDown={(event) => event.stopPropagation()}>
            <button className="sheet-close" onClick={() => setSettingsOpen(false)} aria-label="Закрити налаштування">×</button>
            <div className="eyebrow">Налаштування ритуалу</div>
            <h2>Оберіть модель, яка створюватиме рефлексію.</h2>
            <label htmlFor="provider">Провайдер LLM</label>
            <select
              id="provider"
              value={provider}
              onChange={(event) => setProvider(event.target.value as Provider)}
            >
              {Object.entries(providerLabels).map(([value, label]) => (
                <option value={value} key={value}>{label}</option>
              ))}
            </select>
            <p className="settings-note">
              Автоматичний режим використовує локальну OpenAI-сумісну модель
              під час розробки та OpenRouter після деплою на Vercel. API-ключі
              залишаються на сервері.
            </p>
            <button className="primary-button" onClick={() => setSettingsOpen(false)}>
              Зберегти
            </button>
          </section>
        </div>
      )}

      {archiveOpen && (
        <div className="archive-overlay">
          <div className="archive-header">
            <div>
              <div className="eyebrow">Приватний архів</div>
              <h2>Ваші рефлексії</h2>
            </div>
            <button onClick={() => setArchiveOpen(false)} aria-label="Закрити архів">×</button>
          </div>
          {archive.length === 0 ? (
            <div className="empty-archive">
              <span>◇</span>
              <p>Завершені рефлексії зберігатимуться тут, на цьому пристрої.</p>
            </div>
          ) : (
            <div className="archive-list">
              {archive.map((item) => (
                <button key={item.id} onClick={() => openArchived(item)}>
                  <time>{new Date(item.createdAt).toLocaleDateString("uk-UA")}</time>
                  <strong>{item.reading.title}</strong>
                  <span>{item.cards.map((card) => card.name).join(" · ")}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
