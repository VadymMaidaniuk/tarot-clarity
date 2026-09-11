import { NextResponse } from "next/server";
import { isLocale, messages, type Locale } from "@/lib/i18n";
import type {
  ChartSummary,
  NatalReading,
  NatalRequest,
  ReadingRequest,
  TarotReading,
  TarotRequest,
} from "@/lib/reading-types";

export const runtime = "nodejs";
export const maxDuration = 120;

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemma-4-26b-a4b-it:free";
const DEFAULT_MAX_TOKENS = 4_000;
const DEFAULT_REASONING = "low";
const MAX_ATTEMPTS = 3;

type ErrorCode = keyof (typeof messages)["ru"]["errors"];

class ReadingError extends Error {
  code: ErrorCode;
  constructor(code: ErrorCode, detail?: string) {
    super(detail ?? code);
    this.code = code;
  }
}

function classifyError(error: unknown): ErrorCode {
  if (error instanceof ReadingError) return error.code;
  if (!(error instanceof Error)) return "generic";
  if (
    error.name === "TimeoutError" ||
    error.name === "AbortError" ||
    /timeout|timed out|aborted/i.test(error.message)
  ) {
    return "timeout";
  }
  if (/429|rate.?limit/i.test(error.message)) return "rateLimited";
  return "generic";
}

function extractJson<T extends object>(content: string): T {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new ReadingError("noJson");
  }
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    throw new ReadingError("noJson");
  }
}

const shared = (language: string) => `Write every JSON string value in natural, modern ${language}, regardless of the language of the input.
Proofread grammar; avoid calques, artificial words and unfinished sentences.
Do not translate JSON keys. Do not add markdown, explanations or reasoning outside the JSON. The first character of the reply must be { and the last must be }.`;

function tarotPrompt(body: TarotRequest) {
  const t = messages[body.locale];
  const [first, second, third] = t.spread.positions;
  const natalHint = body.natalContext
    ? `\nThe user also shares a natal digest in "natalContext". You may weave one or two gentle references to it into the overview or the pattern, always as a metaphor and never as a deterministic claim.`
    : "";

  return [
    {
      role: "system",
      content: `You are AURA, a psychologically grounded guide for reflection that uses tarot imagery.
Never predict the future, never diagnose, and never claim to know another person's hidden feelings.
Treat the cards as metaphors for self-reflection. Write warmly, concretely, calmly and without judgement.
${shared(t.languageName)}
Be concise: overview up to 120 words, each insight up to 70 words, each next step a single sentence.
In "card" use the exact card name from the "name" field of the spread, in the same order as the spread (never the keyword or subtitle).
Use exactly these position labels: "${first}", "${second}", "${third}".${natalHint}
Return valid JSON with exactly this structure:
{
  "title": "short evocative title",
  "overview": "2–3 paragraphs in one string",
  "positions": [
    {"position":"${first}","card":"name of the first card","insight":"concrete reflection"},
    {"position":"${second}","card":"name of the second card","insight":"concrete reflection"},
    {"position":"${third}","card":"name of the third card","insight":"concrete reflection"}
  ],
  "pattern": "synthesis of the three cards",
  "nextSteps": ["action 1","action 2","action 3"],
  "reflectionQuestion": "one precise question"
}`,
    },
    {
      role: "user",
      content: JSON.stringify({
        reflectiveFocus: body.focus,
        selectedSituation: body.situation,
        userNarrative: body.context,
        spread: body.cards,
        natalContext: body.natalContext,
      }),
    },
  ];
}

function natalPrompt(body: NatalRequest) {
  const t = messages[body.locale];
  const timeNote = body.chart.hasTime
    ? "Houses and the Ascendant are available; you may refer to them."
    : "The birth time is unknown: never mention the Ascendant or houses, and treat the Moon sign as approximate.";

  return [
    {
      role: "system",
      content: `You are AURA, a psychologically grounded guide for reflection that uses the natal chart as a symbolic language (psychological astrology).
Never predict events, never diagnose, and never make claims about health, death, money, or other people. Treat placements as tendencies and metaphors, not facts about the person; prefer wording such as "may" and "tends to".
${timeNote}
${shared(t.languageName)}
Be concise: overview up to 130 words; three or four placements, each insight up to 60 words; "tension" and "strength" up to 60 words each; each next step a single sentence.
Choose the placements that matter most for the user's focus (if given) — usually the Sun, the Moon, the Ascendant when available, and the tightest aspect.
Return valid JSON with exactly this structure:
{
  "title": "short evocative title",
  "overview": "2–3 paragraphs in one string",
  "placements": [
    {"label":"short theme label","placement":"e.g. Sun in Gemini, house 10","insight":"concrete reflection"}
  ],
  "tension": "one challenging pattern framed as a growth edge",
  "strength": "one resource the chart suggests",
  "nextSteps": ["action 1","action 2","action 3"],
  "reflectionQuestion": "one precise question"
}`,
    },
    {
      role: "user",
      content: JSON.stringify({
        reflectiveFocus: body.focus,
        chart: body.chart,
      }),
    },
  ];
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

// OpenRouter's unified reasoning parameter. Some models (Gemini 3.x among
// them) reject `enabled: false`, so reasoning stays on at low effort by
// default; OPENROUTER_REASONING=none switches it off for models that allow it.
function reasoningConfig() {
  const effort = (process.env.OPENROUTER_REASONING ?? DEFAULT_REASONING).trim().toLowerCase();
  if (effort === "none") {
    return { reasoning: { enabled: false } };
  }
  const level = ["low", "medium", "high"].includes(effort) ? effort : DEFAULT_REASONING;
  return { reasoning: { effort: level, exclude: true } };
}

async function callOpenRouter(prompt: Array<{ role: string; content: string }>) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new ReadingError("noKey");
  }

  const model = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;
  const timeoutMs = Number(process.env.OPENROUTER_TIMEOUT_MS ?? 90_000);
  const maxTokens = Number(process.env.OPENROUTER_MAX_TOKENS ?? DEFAULT_MAX_TOKENS);

  const requestOptions: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.APP_URL ?? "http://localhost:3000",
      "X-Title": "AURA Tarot Clarity",
    },
    body: JSON.stringify({
      model,
      messages: prompt,
      temperature: 0.6,
      max_tokens: maxTokens,
      stream: false,
      ...reasoningConfig(),
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  };

  let response: Response | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    response = await fetch(OPENROUTER_ENDPOINT, requestOptions);
    if (response.ok) break;

    const detail = await response.text();
    const retryable = [429, 502, 503, 504].includes(response.status);
    if (!retryable || attempt === MAX_ATTEMPTS) {
      throw new Error(
        `OpenRouter returned ${response.status}: ${detail.slice(0, 500)}`,
      );
    }

    const retryAfter = Number(response.headers.get("retry-after"));
    const delay =
      Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1_000, 10_000)
        : attempt * 2_000;
    await wait(delay);
  }

  if (!response?.ok) {
    throw new Error("OpenRouter did not return a successful response.");
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new ReadingError("empty");
  }

  return { content, model };
}

function clip(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function sanitizeTarot(raw: Record<string, unknown>, locale: Locale): TarotRequest | null {
  const context = clip(raw.context, 4_000);
  const cards = Array.isArray(raw.cards) ? raw.cards.slice(0, 3) : [];
  if (!context || cards.length !== 3) return null;
  return {
    kind: "tarot",
    locale,
    focus: clip(raw.focus, 200) || undefined,
    situation: clip(raw.situation, 200) || undefined,
    context,
    cards: cards.map((card: Record<string, unknown>) => ({
      name: clip(card?.name, 80),
      subtitle: clip(card?.subtitle, 120),
      keyword: clip(card?.keyword, 40),
      meaning: clip(card?.meaning, 400),
    })),
    natalContext: clip(raw.natalContext, 300) || undefined,
  };
}

function sanitizeNatal(raw: Record<string, unknown>, locale: Locale): NatalRequest | null {
  const chart = raw.chart as Partial<ChartSummary> | undefined;
  if (!chart || !Array.isArray(chart.points) || chart.points.length < 5) return null;
  const summary: ChartSummary = {
    hasTime: Boolean(chart.hasTime),
    houseSystem:
      chart.houseSystem === "placidus" || chart.houseSystem === "whole" ? chart.houseSystem : null,
    birth: {
      date: clip(chart.birth?.date, 20),
      time: chart.birth?.time ? clip(chart.birth.time, 10) : null,
      place: clip(chart.birth?.place, 120),
    },
    points: chart.points.slice(0, 13).map((point) => ({
      id: point.id,
      name: clip(point.name, 40),
      sign: clip(point.sign, 40),
      degree: Number.isFinite(point.degree) ? Math.round(Number(point.degree) * 10) / 10 : 0,
      house: Number.isInteger(point.house) ? (point.house as number) : null,
      retrograde: Boolean(point.retrograde),
    })),
    aspects: (Array.isArray(chart.aspects) ? chart.aspects : []).slice(0, 8).map((aspect) => ({
      a: clip(aspect.a, 40),
      b: clip(aspect.b, 40),
      type: clip(aspect.type, 40),
      orb: Number.isFinite(aspect.orb) ? Number(aspect.orb) : 0,
    })),
  };
  return { kind: "natal", locale, focus: clip(raw.focus, 300) || undefined, chart: summary };
}

function validateTarot(reading: TarotReading) {
  if (
    !reading.title ||
    !reading.overview ||
    !Array.isArray(reading.positions) ||
    reading.positions.length < 3 ||
    !Array.isArray(reading.nextSteps) ||
    !reading.reflectionQuestion
  ) {
    throw new ReadingError("incomplete");
  }
  return reading;
}

function validateNatal(reading: NatalReading) {
  if (
    !reading.title ||
    !reading.overview ||
    !Array.isArray(reading.placements) ||
    reading.placements.length < 2 ||
    !reading.tension ||
    !reading.strength ||
    !Array.isArray(reading.nextSteps) ||
    !reading.reflectionQuestion
  ) {
    throw new ReadingError("incomplete");
  }
  return reading;
}

function failure(locale: Locale, code: ErrorCode, status: number) {
  return NextResponse.json({ error: messages[locale].errors[code], code }, { status });
}

export async function POST(request: Request) {
  let raw: Record<string, unknown>;
  try {
    raw = (await request.json()) as Record<string, unknown>;
  } catch {
    return failure("ru", "invalid", 400);
  }

  const locale: Locale = isLocale(raw.locale) ? raw.locale : "ru";
  const body: ReadingRequest | null =
    raw.kind === "natal" ? sanitizeNatal(raw, locale) : sanitizeTarot(raw, locale);
  if (!body) {
    return failure(locale, "invalid", 400);
  }

  try {
    const prompt = body.kind === "natal" ? natalPrompt(body) : tarotPrompt(body);
    const { content, model } = await callOpenRouter(prompt);
    const reading =
      body.kind === "natal"
        ? validateNatal(extractJson<NatalReading>(content))
        : validateTarot(extractJson<TarotReading>(content));
    return NextResponse.json({ reading, model, kind: body.kind });
  } catch (error) {
    console.error("[api/reading]", error);
    return failure(locale, classifyError(error), 502);
  }
}
