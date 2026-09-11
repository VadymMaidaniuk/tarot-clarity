import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";

// End-to-end walk through onboarding and both rituals on a phone-sized
// viewport with the Russian UI. The OpenRouter call and the geocoder are
// intercepted, so the smoke test needs neither an API key nor network access.
const tarotFixture = {
  kind: "tarot",
  model: "smoke-fixture",
  reading: {
    title: "Путь к ясности",
    overview:
      "Этот расклад не претендует на знание скрытых чувств другого человека. Он отражает напряжение между вашей потребностью в определённости и информацией, которая действительно доступна.",
    positions: [
      { position: "Ваше внутреннее состояние", card: "Эхо", insight: "Заметьте, что повторяется лишь в памяти." },
      { position: "Динамика между вами", card: "Сплетение", insight: "Несколько потребностей переплелись. Разделите их мягко." },
      { position: "Конструктивный следующий шаг", card: "Порог", insight: "Один честный выбор выведет ситуацию из неопределённости." },
    ],
    pattern: "Общая тема — ваша способность действовать, даже когда неопределённость остаётся.",
    nextSteps: [
      "Запишите отдельно то, что знаете, что предполагаете и в чём нуждаетесь.",
      "Выберите одно спокойное действие, которое даст новую информацию.",
      "Определите границу, которая защитит ваше внимание на следующей неделе.",
    ],
    reflectionQuestion: "Какой выбор сохранит ваше самоуважение независимо от ответа?",
  },
};

const natalFixture = {
  kind: "natal",
  model: "smoke-fixture",
  reading: {
    title: "Карта как язык о себе",
    overview:
      "Натальная карта здесь — не приговор, а словарь метафор. Положения планет описывают склонности, с которыми можно работать осознанно.",
    placements: [
      { label: "Ядро", placement: "Солнце в Близнецах, 12 дом", insight: "Потребность понимать и называть происходящее." },
      { label: "Чувства", placement: "Луна в Рыбах, 9 дом", insight: "Тонкая восприимчивость к настроению других." },
      { label: "Образ", placement: "Асцендент в Раке", insight: "Стремление к безопасности в контакте." },
    ],
    tension: "Напряжение между желанием всё понять и потребностью просто чувствовать.",
    strength: "Способность переводить переживания в слова и делиться ими.",
    nextSteps: [
      "Назовите одно чувство, которое избегаете формулировать.",
      "Выберите разговор, в котором можно быть прямым и мягким одновременно.",
      "Отметьте, когда анализ заменяет действие.",
    ],
    reflectionQuestion: "Что вы узнаете о себе, если перестанете объяснять и начнёте замечать?",
  },
};

const geocodingFixture = {
  results: [
    {
      id: 703448,
      name: "Киев",
      country: "Украина",
      admin1: "Киев",
      latitude: 50.45466,
      longitude: 30.5238,
      timezone: "Europe/Kyiv",
    },
  ],
};

const baseUrl = process.env.SMOKE_URL ?? "http://localhost:3000";
const browser = await chromium.launch({ headless: true });

const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
  locale: "ru-RU",
});

await page.addInitScript(() => {
  localStorage.setItem("aura-locale", "ru");
});

await page.route("**/api/reading", (route) => {
  const body = route.request().postDataJSON();
  const fixture = body?.kind === "natal" ? natalFixture : tarotFixture;
  return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fixture) });
});

await page.route("**/geocoding-api.open-meteo.com/**", (route) =>
  route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(geocodingFixture) }),
);

const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});

await mkdir("artifacts", { recursive: true });
await page.goto(baseUrl, { waitUntil: "networkidle" });
await page.waitForTimeout(600);

// --- First-launch onboarding ---------------------------------------------
await page.getByRole("heading", { name: "Добро пожаловать в AURA" }).waitFor({ state: "visible" });
await page.screenshot({ path: "artifacts/onboarding-mobile.png", fullPage: true });
for (let index = 0; index < 3; index += 1) {
  await page.getByRole("button", { name: "Далее" }).click();
}
await page.getByRole("button", { name: "Начать" }).click();

// --- Ritual chooser -------------------------------------------------------
await page.getByRole("heading", { name: "Выберите ритуал" }).waitFor({ state: "visible" });
await page.screenshot({ path: "artifacts/home-mobile.png", fullPage: true });

// --- Tarot ritual ---------------------------------------------------------
await page.getByRole("button", { name: /Расклад таро/ }).click();
await page.getByRole("button", { name: /Я постоянно думаю/ }).click();
await page.getByRole("button", { name: "Продолжить" }).click();
await page.getByLabel("Ваша история").fill(
  "Мы почти не общаемся уже две недели. Я пытаюсь толковать каждый короткий ответ и хочу действовать, не теряя самоуважения.",
);
await page.getByRole("button", { name: "молчание" }).click();
await page.screenshot({ path: "artifacts/story-mobile.png", fullPage: true });
await page.getByRole("button", { name: "Продолжить" }).click();

const deckCards = page.locator(".card-back");
for (let index = 0; index < 3; index += 1) {
  await deckCards.nth(index).click();
}
await page.screenshot({ path: "artifacts/deck-mobile.png", fullPage: true });

await page.getByRole("button", { name: "Открыть расклад" }).click();
if ((await page.locator(".card-face").count()) !== 3) {
  throw new Error("Expected exactly three revealed cards.");
}

await page.getByRole("button", { name: "Создать рефлексию" }).click();
await page.getByRole("heading", { name: tarotFixture.reading.title }).waitFor({
  state: "visible",
  timeout: 15_000,
});
await page.waitForTimeout(700);
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: "artifacts/reading-mobile.png", fullPage: true });
const insightRows = await page.locator(".insight-row").count();
await page.getByRole("button", { name: "Новый ритуал" }).click();

// --- Natal chart ----------------------------------------------------------
await page.getByRole("button", { name: /Натальная карта/ }).click();
await page.getByLabel("День").selectOption("15");
await page.getByLabel("Месяц").selectOption("06");
await page.getByLabel("Год").selectOption("1990");
await page.getByLabel("Часы").selectOption("08");
await page.getByLabel("Минуты").selectOption("30");
await page.getByLabel("Место рождения").fill("Киев");
await page.getByRole("button", { name: /Киев/ }).first().click();
await page.screenshot({ path: "artifacts/birth-form-mobile.png", fullPage: true });
await page.getByRole("button", { name: "Рассчитать карту" }).click();
await page.locator(".wheel").waitFor({ state: "visible", timeout: 10_000 });
const planetRows = await page.locator(".glyph-icon").count();
await page.waitForTimeout(500);
await page.screenshot({ path: "artifacts/natal-chart-mobile.png", fullPage: true });

await page.getByRole("button", { name: "Создать рефлексию" }).click();
await page.getByRole("heading", { name: natalFixture.reading.title }).waitFor({
  state: "visible",
  timeout: 15_000,
});
await page.waitForTimeout(700);
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: "artifacts/natal-reading-mobile.png", fullPage: true });
await page.getByRole("button", { name: "Новый ритуал" }).click();

// Both readings must land in the on-device archive, and the onboarding must
// not come back after a reload.
await page.getByRole("button", { name: "Архив" }).click();
const archived = await page.locator(".row").count();
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(500);
const onboardingAgain = await page.locator(".onboarding").count();

const result = {
  title: await page.title(),
  url: page.url(),
  insightRows,
  planetRows,
  archivedReadings: archived,
  onboardingAgain,
  consoleErrors,
};

console.log(JSON.stringify(result, null, 2));
await browser.close();

if (insightRows !== 3) throw new Error("Expected three tarot insight rows.");
if (planetRows < 12) throw new Error("Expected the natal chart to list the planets.");
if (archived < 2) throw new Error("Expected both readings to be archived.");
if (onboardingAgain !== 0) throw new Error("Onboarding must be shown only once.");
