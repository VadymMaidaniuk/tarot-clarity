# AURA — Clarity rituals PWA

An installable, mobile-first reflection app built with Next.js. The UI follows
Apple's Human Interface Guidelines: system typography, semantic light/dark
colors, inset-grouped lists, a translucent navigation bar and tab bar, bottom
sheets, and one primary action per screen. Russian, Ukrainian and English are
supported; the language is detected from the device and can be changed in
settings.

Two rituals share one archive:

- **Tarot** — intention → situation → principles → your story → drawing three
  cards → the spread → an LLM-written reflection.
- **Natal chart** — date, time and place of birth → planetary positions,
  Ascendant/Midheaven, Placidus houses and major aspects computed on the
  device → a chart wheel → an LLM-written psychological reflection. Birth
  data is stored only on the device and can optionally enrich tarot readings
  with the Sun, Moon and Ascendant.

Both rituals are framed as reflection, not prophecy: the model is instructed
never to predict, diagnose, or claim knowledge of other people's feelings.

## Architecture

- `app/api/reading/route.ts` — the only server code. Calls OpenRouter with the
  server-side key, retries on 429/5xx, validates the JSON reflection. Handles
  `kind: "tarot"` and `kind: "natal"` requests and answers in the requested
  language.
- `components/ClarityApp.tsx` — the whole client experience (both flows,
  archive, settings sheet, share).
- `components/ChartWheel.tsx` — SVG natal chart wheel.
- `components/icons.tsx` — inline SF-Symbols-style icons and card glyphs.
- `lib/i18n.ts` — dictionaries for `ru`, `uk`, `en`.
- `lib/cards.ts` — the eight-card deck with localized text.
- `lib/astro.ts` — chart math on top of `astronomy-engine` (MIT): tropical
  longitudes of Sun–Pluto and the mean lunar node, retrograde flags,
  Ascendant/MC, Placidus houses (whole-sign fallback above 66° latitude),
  major aspects with orbs.
- `lib/geo.ts` — place search via the Open-Meteo geocoding API (keyless) and
  wall-clock → UTC conversion through the runtime's IANA tz database.
- `public/sw.js` — caches the app shell for offline use; readings and place
  search always need the network.

## Run locally

```bash
npm install
copy .env.example .env.local
npm run configure:openrouter
npm run dev
```

`configure:openrouter` prompts for the OpenRouter key without leaving it in
shell history. Open `http://localhost:3000`.

To test on a phone in the same Wi-Fi network run `npm run dev:lan` and open the
`Network` URL that Next.js prints.

## Deploy to Vercel

Set these environment variables in the Vercel project:

```env
OPENROUTER_API_KEY=your_server_side_key
OPENROUTER_MODEL=google/gemini-3.5-flash-lite
OPENROUTER_TIMEOUT_MS=90000
OPENROUTER_MAX_TOKENS=4000
OPENROUTER_REASONING=low
APP_URL=https://your-domain.example
```

`OPENROUTER_REASONING` accepts `low` (default), `medium`, `high` or `none`.
Reasoning tokens count toward `OPENROUTER_MAX_TOKENS` on thinking models, so
keep the budget generous. `APP_URL` is optional; it is only sent to OpenRouter
as the referer for usage attribution.

The key is read only inside the API route and never reaches the browser. The
user's story and the chart digest are sent to the model for generation only
and are not stored on the server; the archive and birth data live in the
browser's `localStorage`.

Place search uses Open-Meteo's geocoding API, which is free for
non-commercial use. Swap `lib/geo.ts` for a paid geocoder before commercial
launch.

## Checks

```bash
npm run lint    # tsc --noEmit
npm run build
npm run smoke   # needs `npm run dev` in another terminal; the API and geocoder are mocked
npm run icons   # regenerate PNG app icons from public/icons/aura.svg
```
