import { chromium } from "playwright-core";
import { readFile, writeFile } from "node:fs/promises";

// Rasterizes public/icons/aura.svg into the PNG sizes the manifest and
// <link rel="apple-touch-icon"> need. Maskable variant is full-bleed with the
// glyph kept inside the 80% safe zone.
const svg = await readFile("public/icons/aura.svg", "utf8");
const maskable = svg
  .replace(/rx="114"/g, 'rx="0"')
  .replace("<circle cx=\"256\" cy=\"256\" r=\"152\"", '<g transform="translate(256 256) scale(0.8) translate(-256 -256)"><circle cx="256" cy="256" r="152"')
  .replace("</svg>", "</g></svg>");

async function launch() {
  try {
    return await chromium.launch({ headless: true });
  } catch {
    return chromium.launch({ headless: true, channel: "chrome" });
  }
}

const browser = await launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

async function render(source, size, file) {
  await page.setViewportSize({ width: size, height: size });
  const sized = source.replace("<svg ", `<svg width="${size}" height="${size}" `);
  await page.setContent(
    `<!doctype html><html><body style="margin:0;background:transparent">${sized}</body></html>`,
  );
  const buffer = await page.screenshot({
    omitBackground: true,
    clip: { x: 0, y: 0, width: size, height: size },
  });
  await writeFile(file, buffer);
  console.log(`${file} (${buffer.length} bytes)`);
}

await render(svg, 180, "public/icons/aura-180.png");
await render(svg, 192, "public/icons/aura-192.png");
await render(svg, 512, "public/icons/aura-512.png");
await render(maskable, 512, "public/icons/aura-512-maskable.png");
await browser.close();
