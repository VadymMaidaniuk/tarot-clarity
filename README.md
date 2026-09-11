# AURA — Tarot Clarity PWA

An installable, mobile-first reflection ritual built with Next.js. The UI
follows Apple's Human Interface Guidelines: system typography, semantic
light/dark colors, inset-grouped lists, a translucent navigation bar and tab
bar, bottom sheets, and one primary action per screen.

The flow: intention → situation → principles → your story → drawing three
cards → the spread → an LLM-generated reflection that is archived on the
device.

## Architecture

- `app/api/reading/route.ts` — the only server code. Calls OpenRouter with the
  server-side key, retries on 429/5xx, validates the JSON reflection.
- `components/ClarityApp.tsx` — the whole client experience (steps, archive,
  settings sheet, share).
- `components/icons.tsx` — inline SF-Symbols-style icons and card glyphs.
- `lib/cards.ts` — the eight-card deck and spread positions.
- `public/sw.js` — caches the app shell for offline use; generating a new
  reading always needs the network.

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
OPENROUTER_MODEL=google/gemma-4-26b-a4b-it:free
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
user's story is sent to the model for generation only and is not stored on the
server; the archive lives in the browser's `localStorage`.

## Checks

```bash
npm run lint    # tsc --noEmit
npm run build
npm run smoke   # needs `npm run dev` in another terminal; the API is mocked
npm run icons   # regenerate PNG app icons from public/icons/aura.svg
```
