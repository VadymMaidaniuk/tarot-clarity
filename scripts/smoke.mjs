import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";

const browser = await chromium.launch({ headless: true });

const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
});

await page.addInitScript(() => {
  localStorage.setItem("aura-provider", "demo");
});

const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});

await mkdir("artifacts", { recursive: true });
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.waitForTimeout(900);
await page.screenshot({ path: "artifacts/landing-mobile.png", fullPage: true });

await page.getByLabel("Фокус рефлексії").fill("мовчання після нашої останньої розмови");
await page.getByRole("button", { name: "Знайти ясність" }).click();
await page.getByRole("button", { name: /Я постійно думаю/ }).click();
await page.getByRole("button", { name: "Почати сесію ясності" }).click();
await page.getByRole("button", { name: "Я розумію" }).click();
await page.getByLabel("Ваша історія").fill(
  "Ми майже не спілкуємося вже два тижні. Я намагаюся тлумачити кожну коротку відповідь і хочу діяти, не втрачаючи самоповаги.",
);
await page.getByRole("button", { name: "Продовжити рефлексію" }).click();

const deckCards = page.locator(".card-back");
for (let index = 0; index < 3; index += 1) {
  await deckCards.nth(index).click();
}

await page.getByRole("button", { name: "Відкрити розклад" }).click();
if ((await page.locator(".revealed-card").count()) !== 3) {
  throw new Error("Expected exactly three revealed cards.");
}

await page.getByRole("button", { name: "Переглянути повну рефлексію" }).click();
await page.getByRole("heading", { name: "Шлях до ясності" }).waitFor({
  state: "visible",
  timeout: 15_000,
});
await page.waitForTimeout(900);
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: "artifacts/reading-mobile.png", fullPage: true });

const result = {
  title: await page.title(),
  url: page.url(),
  revealedCards: await page.locator(".reading-position").count(),
  provider: await page.locator(".reading-meta span").nth(1).textContent(),
  readingOpacity: await page
    .locator(".reading-screen")
    .evaluate((element) => getComputedStyle(element).opacity),
  consoleErrors,
};

console.log(JSON.stringify(result, null, 2));
await browser.close();
