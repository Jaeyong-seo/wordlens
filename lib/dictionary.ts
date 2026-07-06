import fs from "node:fs";
import path from "node:path";
import { isMockMode, llmDefine, type LlmDefinition } from "@/lib/ai";
import type { Definition } from "@/lib/types";

const DICT_API_URL = "https://api.dictionaryapi.dev/api/v2/entries/en";
const DICT_TIMEOUT_MS = 4_000;

export interface DictSourceResult {
  phonetic?: string;
  englishDef?: string;
  example?: string;
}

export interface LookupDeps {
  fetchDict: (word: string) => Promise<DictSourceResult | null>;
  llmDefine: (word: string) => Promise<LlmDefinition | null>;
  cacheGet: (word: string) => Definition | null;
  cacheSet: (word: string, def: Definition) => void;
}

function dataDir(): string {
  return process.env.WORDLENS_DATA_DIR ?? path.join(process.cwd(), ".data");
}

function cacheFile(): string {
  return path.join(dataDir(), "dict-cache.json");
}

function readCache(): Record<string, Definition> {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(cacheFile(), "utf8"));
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, Definition>;
    }
  } catch {
    // missing/corrupt cache -> start fresh
  }
  return {};
}

function writeCache(cache: Record<string, Definition>): void {
  fs.mkdirSync(dataDir(), { recursive: true });
  fs.writeFileSync(cacheFile(), JSON.stringify(cache, null, 2));
}

/** Free dictionary API: phonetic + English definition + example. */
async function fetchDictionaryApi(
  word: string,
): Promise<DictSourceResult | null> {
  if (isMockMode()) return null; // no network in mock mode
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DICT_TIMEOUT_MS);
  try {
    const res = await fetch(
      `${DICT_API_URL}/${encodeURIComponent(word.toLowerCase())}`,
      { signal: controller.signal },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as Array<{
      phonetic?: string;
      phonetics?: { text?: string }[];
      meanings?: {
        definitions?: { definition?: string; example?: string }[];
      }[];
    }>;
    const entry = json[0];
    if (!entry) return null;
    const def = entry.meanings?.[0]?.definitions?.[0];
    return {
      phonetic:
        entry.phonetic ?? entry.phonetics?.find((p) => p.text)?.text,
      englishDef: def?.definition,
      example: def?.example,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function defaultDeps(): LookupDeps {
  return {
    fetchDict: fetchDictionaryApi,
    llmDefine,
    cacheGet: (word) => readCache()[word.toLowerCase()] ?? null,
    cacheSet: (word, def) => {
      const cache = readCache();
      cache[word.toLowerCase()] = def;
      writeCache(cache);
    },
  };
}

/**
 * Lookup chain: cache -> dictionaryapi.dev -> LLM (Korean meaning) -> stub.
 * Every step is injectable so the chain is unit-testable without network.
 */
export async function lookupDefinition(
  word: string,
  deps: LookupDeps = defaultDeps(),
): Promise<Definition> {
  const normalized = word.trim().toLowerCase();
  const cached = deps.cacheGet(normalized);
  if (cached) return cached;

  let phonetic: string | undefined;
  let example: string | undefined;
  let meaning: string | undefined;
  let source: Definition["source"] = "fallback";

  let dict: DictSourceResult | null = null;
  try {
    dict = await deps.fetchDict(normalized);
  } catch {
    dict = null;
  }
  if (dict) {
    phonetic = dict.phonetic;
    example = dict.example;
  }

  let llm: LlmDefinition | null = null;
  try {
    llm = await deps.llmDefine(normalized);
  } catch {
    llm = null;
  }
  if (llm) {
    meaning = llm.meaning;
    example = example ?? llm.example;
    phonetic = phonetic ?? llm.phonetic;
    source = isMockMode() ? "mock" : "llm";
  } else if (dict?.englishDef) {
    // LLM unavailable: fall back to the English definition.
    meaning = dict.englishDef;
    source = "dictionary";
  }

  const def: Definition = {
    word: normalized,
    phonetic,
    meaning: meaning ?? "뜻을 찾지 못했습니다",
    example,
    source,
  };
  deps.cacheSet(normalized, def);
  return def;
}
