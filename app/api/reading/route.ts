import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemma-4-26b-a4b-it:free";
const MAX_ATTEMPTS = 3;

type ReadingRequest = {
  focus?: string;
  situation?: string;
  context?: string;
  cards?: Array<{
    name: string;
    subtitle: string;
    keyword: string;
    meaning: string;
  }>;
};

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

function userFacingError(error: unknown) {
  if (!(error instanceof Error)) {
    return "Не вдалося створити рефлексію.";
  }

  if (
    error.name === "TimeoutError" ||
    error.name === "AbortError" ||
    /timeout|timed out|aborted/i.test(error.message)
  ) {
    return "Модель не встигла відповісти. Спробуйте ще раз за кілька хвилин.";
  }

  if (/429|rate.?limit/i.test(error.message)) {
    return "Модель зараз перевантажена. Зачекайте кілька хвилин і спробуйте ще раз.";
  }

  return error.message;
}

function extractJson(content: string): Reading {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("Модель не повернула JSON-об’єкт.");
  }

  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as Reading;
  if (
    !parsed.title ||
    !parsed.overview ||
    !Array.isArray(parsed.positions) ||
    !Array.isArray(parsed.nextSteps)
  ) {
    throw new Error("Модель повернула неповну рефлексію.");
  }
  return parsed;
}

function buildPrompt(body: ReadingRequest) {
  return [
    {
      role: "system",
      content: `Ти — AURA, психологічно виважений провідник рефлексії з образами таро.
Ніколи не передбачай майбутнє, не став діагнозів і не стверджуй, що знаєш приховані почуття іншої людини.
Сприймай карти таро як метафори для саморефлексії. Пиши тепло, конкретно, спокійно й без осуду.
Увесь текст у значеннях JSON обов’язково пиши природною сучасною українською мовою, незалежно від мови вхідного тексту.
Пиши стисло: overview — до 120 слів, кожен insight — до 70 слів, кожен наступний крок — одне речення.
Вичитай граматику й уникай кальок, штучних слів і незавершених речень.
Не перекладай назви JSON-полів. Не додавай markdown, пояснення чи міркування поза JSON. Перший символ відповіді — {, останній — }.
Поверни валідний JSON точно такої структури:
{
  "title": "короткий образний заголовок українською",
  "overview": "2–3 абзаци українською в одному рядку",
  "positions": [
    {"position":"Ваш внутрішній стан","card":"назва карти","insight":"конкретна рефлексія українською"},
    {"position":"Динаміка між вами","card":"назва карти","insight":"конкретна рефлексія українською"},
    {"position":"Конструктивний наступний крок","card":"назва карти","insight":"конкретна рефлексія українською"}
  ],
  "pattern": "синтез трьох карт українською",
  "nextSteps": ["дія 1","дія 2","дія 3"],
  "reflectionQuestion": "одне точне запитання українською"
}`,
    },
    {
      role: "user",
      content: JSON.stringify({
        reflectiveFocus: body.focus,
        selectedSituation: body.situation,
        userNarrative: body.context,
        spread: body.cards,
      }),
    },
  ];
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function callOpenRouter(body: ReadingRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY не налаштовано.");
  }

  const model = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;
  const timeoutMs = Number(process.env.OPENROUTER_TIMEOUT_MS ?? 90_000);
  const maxTokens = Number(process.env.OPENROUTER_MAX_TOKENS ?? 1_600);

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
      messages: buildPrompt(body),
      temperature: 0.6,
      max_tokens: maxTokens,
      stream: false,
      reasoning: { enabled: false },
      include_reasoning: false,
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
        `OpenRouter повернув помилку ${response.status}: ${detail.slice(0, 500)}`,
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
    throw new Error("OpenRouter не повернув успішної відповіді.");
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Модель повернула порожню відповідь.");
  }

  return { reading: extractJson(content), model };
}

export async function POST(request: Request) {
  let body: ReadingRequest;
  try {
    body = (await request.json()) as ReadingRequest;
  } catch {
    return NextResponse.json({ error: "Некоректний JSON у запиті." }, { status: 400 });
  }

  if (!body.context?.trim() || !body.cards || body.cards.length !== 3) {
    return NextResponse.json(
      { error: "Потрібні опис ситуації та рівно три карти." },
      { status: 400 },
    );
  }

  const sanitized: ReadingRequest = {
    focus: body.focus?.trim().slice(0, 200),
    situation: body.situation?.trim().slice(0, 200),
    context: body.context.trim().slice(0, 4_000),
    cards: body.cards.slice(0, 3).map((card) => ({
      name: String(card.name ?? "").slice(0, 80),
      subtitle: String(card.subtitle ?? "").slice(0, 120),
      keyword: String(card.keyword ?? "").slice(0, 40),
      meaning: String(card.meaning ?? "").slice(0, 400),
    })),
  };

  try {
    const result = await callOpenRouter(sanitized);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/reading]", error);
    return NextResponse.json(
      { error: userFacingError(error) },
      { status: 502 },
    );
  }
}
