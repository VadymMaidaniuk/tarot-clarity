import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Provider = "auto" | "local" | "openrouter" | "demo";

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
  provider?: Provider;
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
    return "Модель не встигла відповісти. Перевірте, чи вона завантажена в LM Studio, і спробуйте ще раз.";
  }

  return error.message;
}

function demoReading(body: ReadingRequest): Reading {
  const selected = body.cards?.slice(0, 3) ?? [];
  const labels = [
    "Ваш внутрішній стан",
    "Динаміка між вами",
    "Конструктивний наступний крок",
  ];

  return {
    title: "Шлях до ясності",
    overview:
      "Цей розклад не претендує на знання прихованих почуттів іншої людини. Він відображає напруження між вашою потребою у визначеності та інформацією, яка справді доступна. Корисний напрям — перейти від інтерпретацій до спостереження за фактами й одного свідомого вибору.",
    positions: selected.map((card, index) => ({
      position: labels[index],
      card: card.name,
      insight: `${card.meaning} У цій позиції карта «${card.name}» пропонує сприймати тему «${card.keyword.toLowerCase()}» як практику, а не передбачення.`,
    })),
    pattern:
      "Спільна тема розкладу — ваша здатність діяти. Невизначеність може залишитися, але ви можете зменшити емоційну ціну, яку платите, несучи її наодинці.",
    nextSteps: [
      "Запишіть окремо те, що ви знаєте, що припускаєте і чого потребуєте. Не змішуйте ці три списки.",
      "Оберіть одну спокійну й конкретну дію, яка дасть нову інформацію та не порушить ваших меж.",
      "Якщо дія зараз недоречна, визначте межу, яка захищатиме вашу увагу протягом наступних семи днів.",
    ],
    reflectionQuestion:
      "Який вибір збереже вашу самоповагу, навіть якщо відповідь іншої людини буде не такою, як ви сподіваєтеся?",
  };
}

function resolveProvider(requested: Provider | undefined): Exclude<Provider, "auto"> {
  const configured = (process.env.LLM_PROVIDER ?? "auto") as Provider;
  const overrideAllowed =
    process.env.ALLOW_PROVIDER_OVERRIDE === "true" ||
    process.env.NODE_ENV !== "production";
  const candidate =
    overrideAllowed && requested && requested !== "auto"
      ? requested
      : configured;

  if (candidate === "auto") {
    return process.env.VERCEL ? "openrouter" : "local";
  }

  return candidate;
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

async function callModel(provider: "local" | "openrouter", body: ReadingRequest) {
  const isOpenRouter = provider === "openrouter";
  const baseUrl = isOpenRouter
    ? "https://openrouter.ai/api/v1"
    : (process.env.LOCAL_LLM_BASE_URL ?? "http://127.0.0.1:11434/v1");
  const model = isOpenRouter
    ? (process.env.OPENROUTER_MODEL ?? "openai/gpt-4.1-mini")
    : (process.env.LOCAL_LLM_MODEL ?? "llama3.2:3b");
  const apiKey = isOpenRouter
    ? process.env.OPENROUTER_API_KEY
    : process.env.LOCAL_LLM_API_KEY;
  const timeoutMs = Number(
    isOpenRouter
      ? (process.env.OPENROUTER_TIMEOUT_MS ?? 90_000)
      : (process.env.LOCAL_LLM_TIMEOUT_MS ?? 90_000),
  );
  const maxTokens = Number(
    isOpenRouter
      ? (process.env.OPENROUTER_MAX_TOKENS ?? 1_600)
      : (process.env.LOCAL_LLM_MAX_TOKENS ?? 1_200),
  );

  if (isOpenRouter && !apiKey) {
    throw new Error("OPENROUTER_API_KEY не налаштовано.");
  }

  const response = await fetch(
    `${baseUrl.replace(/\/$/, "")}/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        ...(isOpenRouter
          ? {
              "HTTP-Referer": process.env.APP_URL ?? "http://localhost:3000",
              "X-Title": "AURA Tarot Clarity",
            }
          : {}),
      },
      body: JSON.stringify({
        model,
        messages: buildPrompt(body),
        temperature: isOpenRouter ? 0.6 : 0.35,
        max_tokens: maxTokens,
        stream: false,
        ...(!isOpenRouter ? { reasoning_effort: "none" } : {}),
        response_format: isOpenRouter
          ? { type: "json_object" }
          : { type: "text" },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `${provider} повернув помилку ${response.status}: ${detail.slice(0, 240)}`,
    );
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

  const provider = resolveProvider(body.provider);
  if (provider === "demo") {
    return NextResponse.json({
      reading: demoReading(body),
      provider,
      model: "deterministic-demo",
    });
  }

  try {
    const result = await callModel(provider, body);
    return NextResponse.json({ ...result, provider });
  } catch (error) {
    const mayFallback =
      provider === "local" &&
      process.env.NODE_ENV !== "production" &&
      process.env.LLM_FALLBACK_TO_DEMO !== "false";

    if (mayFallback) {
      return NextResponse.json({
        reading: demoReading(body),
        provider: "demo",
        model: "deterministic-demo",
        fallback: true,
        warning: userFacingError(error),
      });
    }

    return NextResponse.json(
      {
        error: userFacingError(error),
      },
      { status: 502 },
    );
  }
}
