# AURA — Tarot Clarity PWA

An installable, mobile-first reflection ritual based on the supplied Stitch
design. The app includes the complete flow from intention and context through
card selection, reveal, an LLM-generated reading, and a device-local archive.

## Run locally

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

### Test on another device in the same Wi-Fi network

```bash
npm run dev:lan
```

Then open the `Network` URL printed by Next.js on the other device. The computer
running the app and the testing device must be connected to the same local
network.

### Ollama

The default local endpoint is Ollama's OpenAI-compatible API:

```bash
ollama pull llama3.2:3b
ollama serve
```

Relevant settings:

```env
LLM_PROVIDER=local
LOCAL_LLM_BASE_URL=http://127.0.0.1:11434/v1
LOCAL_LLM_MODEL=llama3.2:3b
```

LM Studio and llama.cpp also work. Point `LOCAL_LLM_BASE_URL` at their
OpenAI-compatible `/v1` endpoint and set the matching model name.

If no local model is running, development uses a deterministic demo reading
when `LLM_FALLBACK_TO_DEMO=true`. The UI shows a notice when this occurs.

## Deploy to Vercel with OpenRouter

Add these environment variables to the Vercel project:

```env
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=your_server_side_key
OPENROUTER_MODEL=openai/gpt-4.1-mini
APP_URL=https://your-domain.example
ALLOW_PROVIDER_OVERRIDE=false
LLM_FALLBACK_TO_DEMO=false
```

With `LLM_PROVIDER=auto`, the app selects the local adapter outside Vercel and
OpenRouter when `VERCEL=1`. The OpenRouter key is read only in the server API
route and is never sent to the browser.

## PWA behavior

The production build registers `/sw.js`, caches the application shell and
visual assets, and keeps the ritual UI available offline. Generating a new
reading still requires access to the configured LLM.

## Checks

```bash
npm run lint
npm run build
npm audit
```
