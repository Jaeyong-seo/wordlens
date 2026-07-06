/**
 * All LLM access goes through OpenRouter. Model names live here only.
 * When OPENROUTER_API_KEY is absent (or WORDLENS_MOCK=1), MOCK MODE keeps
 * the whole pipeline demoable without any network calls.
 */

export const VISION_MODEL =
  process.env.WORDLENS_VISION_MODEL ?? "openai/gpt-4o-mini";
export const TEXT_MODEL =
  process.env.WORDLENS_TEXT_MODEL ?? "openai/gpt-4o-mini";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 20_000;

export function isMockMode(): boolean {
  return process.env.WORDLENS_MOCK === "1" || !process.env.OPENROUTER_API_KEY;
}

/** Canned extraction results so the demo works with zero configuration. */
export const MOCK_WORD_SETS: string[][] = [
  ["serendipity"],
  ["ephemeral", "ubiquitous"],
  ["meticulous"],
  ["resilience", "candid"],
  ["eloquent"],
];

export const MOCK_DICT: Record<
  string,
  { meaning: string; example: string; phonetic?: string }
> = {
  serendipity: {
    meaning: "뜻밖의 행운, 우연한 발견",
    example: "Meeting her was pure serendipity.",
    phonetic: "/ˌserənˈdɪpəti/",
  },
  ephemeral: {
    meaning: "수명이 짧은, 덧없는",
    example: "Fame in the internet age is ephemeral.",
    phonetic: "/ɪˈfemərəl/",
  },
  ubiquitous: {
    meaning: "어디에나 있는, 아주 흔한",
    example: "Smartphones have become ubiquitous.",
    phonetic: "/juːˈbɪkwɪtəs/",
  },
  meticulous: {
    meaning: "꼼꼼한, 세심한",
    example: "She kept meticulous notes of every meeting.",
    phonetic: "/məˈtɪkjələs/",
  },
  resilience: {
    meaning: "회복력, 복원력",
    example: "The team showed great resilience after the setback.",
    phonetic: "/rɪˈzɪliəns/",
  },
  candid: {
    meaning: "솔직한, 숨김없는",
    example: "He was candid about his mistakes.",
    phonetic: "/ˈkændɪd/",
  },
  eloquent: {
    meaning: "웅변의, 유창한",
    example: "She gave an eloquent speech at the ceremony.",
    phonetic: "/ˈeləkwənt/",
  },
};

async function callOpenRouter(body: Record<string, unknown>): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenRouter returned empty content");
    return content;
  } finally {
    clearTimeout(timer);
  }
}

/** Pull the first JSON object out of an LLM reply, tolerating code fences. */
export function extractJson<T>(text: string): T | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

export interface ExtractOptions {
  image?: string;
  mockWords?: string[];
  /** Rotates through MOCK_WORD_SETS deterministically in mock mode. */
  mockSeed?: number;
}

/**
 * Extract words underlined/highlighted in RED from a book-page photo.
 * Mock mode returns canned words; real mode asks the vision model.
 */
export async function extractUnderlinedWords(
  opts: ExtractOptions,
): Promise<string[]> {
  if (isMockMode()) {
    if (opts.mockWords && opts.mockWords.length > 0) return opts.mockWords;
    const seed = opts.mockSeed ?? 0;
    return MOCK_WORD_SETS[seed % MOCK_WORD_SETS.length];
  }
  if (!opts.image) return [];
  const content = await callOpenRouter({
    model: VISION_MODEL,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "This is a photo of a printed book page. The reader marks unknown " +
              "words with a RED pen (underline or highlight). Extract ONLY the " +
              "English words that are marked in red. Ignore words without red " +
              "marks. Reply with strict JSON only, no prose: " +
              '{"underlined": ["word1", "word2"]}. If none, return {"underlined": []}.',
          },
          { type: "image_url", image_url: { url: opts.image } },
        ],
      },
    ],
    temperature: 0,
  });
  const parsed = extractJson<{ underlined?: unknown }>(content);
  if (!parsed || !Array.isArray(parsed.underlined)) return [];
  return parsed.underlined.filter(
    (w): w is string => typeof w === "string" && w.length > 0,
  );
}

export interface LlmDefinition {
  meaning: string;
  example?: string;
  phonetic?: string;
}

/** Korean meaning + one example sentence for an English word. */
export async function llmDefine(word: string): Promise<LlmDefinition | null> {
  if (isMockMode()) {
    const hit = MOCK_DICT[word.toLowerCase()];
    if (hit) return hit;
    return {
      meaning: `${word}의 뜻 (모의 사전)`,
      example: `This is a mock example sentence with "${word}".`,
    };
  }
  const content = await callOpenRouter({
    model: TEXT_MODEL,
    messages: [
      {
        role: "user",
        content:
          `English word: "${word}". Give a concise Korean meaning and one short ` +
          "English example sentence. Reply with strict JSON only: " +
          '{"meaning": "한국어 뜻", "example": "English example.", "phonetic": "/IPA/"}',
      },
    ],
    temperature: 0,
  });
  const parsed = extractJson<LlmDefinition>(content);
  if (!parsed || typeof parsed.meaning !== "string") return null;
  return parsed;
}
