import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";

// End-to-end walk through the ritual on a phone-sized viewport.
// The OpenRouter call is intercepted so the smoke test needs no API key.
const fixture = {
  reading: {
    title: "Шлях до ясності",
    overview:
      "Цей розклад не претендує на знання прихованих почуттів іншої людини. Він відображає напруження між вашою потребою у визначеності та інформацією, яка справді доступна.",
    positions: [
      { position: "Ваш внутрішній стан", card: "Відлуння", insight: "Помітьте, що повторюється лише у пам’яті." },
      { position: "Динаміка між вами", card: "Плетиво", insight: "Кілька потреб переплелися. Розділіть їх м’яко." },
      { position: "Конструктивний наступний крок", card: "Поріг", insight: "Один чесний вибір виведе ситуацію з невизначеності." },
    ],
    pattern: "Спільна тема — ваша здатність діяти, навіть коли невизначеність залишається.",
    nextSteps: [
      "Запишіть окремо те, що знаєте, що припускаєте і чого потребуєте.",
      "Оберіть одну спокійну дію, яка дасть нову інформацію.",
      "Визначте межу, що захищатиме вашу увагу наступного тижня.",
    ],
    reflectionQuestion: "Який вибір збереже вашу самоповагу незалежно від відповіді?",
  },
  model: "smoke-fixture",
};

const baseUrl = process.env.SMOKE_URL ?? "http://localhost:3000";
const browser = await chromium.launch({ headless: true });

const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
});

await page.route("**/api/reading", (route) =>
  route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fixture) }),
);

const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});

await mkdir("artifacts", { recursive: true });
await page.goto(baseUrl, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
await page.screenshot({ path: "artifacts/home-mobile.png", fullPage: true });

await page.getByLabel("Фокус рефлексії").fill("мовчання після нашої останньої розмови");
await page.getByRole("button", { name: "Почати ритуал" }).click();
await page.getByRole("button", { name: /Я постійно думаю/ }).click();
await page.getByRole("button", { name: "Продовжити" }).click();
await page.getByRole("button", { name: "Я розумію" }).click();
await page.getByLabel("Ваша історія").fill(
  "Ми майже не спілкуємося вже два тижні. Я намагаюся тлумачити кожну коротку відповідь і хочу діяти, не втрачаючи самоповаги.",
);
await page.getByRole("button", { name: "Продовжити" }).click();

const deckCards = page.locator(".card-back");
for (let index = 0; index < 3; index += 1) {
  await deckCards.nth(index).click();
}
await page.screenshot({ path: "artifacts/deck-mobile.png", fullPage: true });

await page.getByRole("button", { name: "Відкрити розклад" }).click();
if ((await page.locator(".card-face").count()) !== 3) {
  throw new Error("Expected exactly three revealed cards.");
}

await page.getByRole("button", { name: "Створити рефлексію" }).click();
await page.getByRole("heading", { name: fixture.reading.title }).waitFor({
  state: "visible",
  timeout: 15_000,
});
await page.waitForTimeout(700);
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: "artifacts/reading-mobile.png", fullPage: true });
const insightRows = await page.locator(".insight-row").count();

// The reading must land in the on-device archive.
await page.getByRole("button", { name: "Новий ритуал" }).click();
await page.getByRole("button", { name: "Архів" }).click();
const archived = await page.locator(".row").count();

const result = {
  title: await page.title(),
  url: page.url(),
  insightRows,
  archivedReadings: archived,
  consoleErrors,
};

console.log(JSON.stringify(result, null, 2));
await browser.close();

if (archived < 1) {
  throw new Error("Expected the reading to be archived.");
}
