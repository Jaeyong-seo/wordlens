import fs from "node:fs";
import path from "node:path";

function dataDir(): string {
  return process.env.WORDLENS_DATA_DIR ?? path.join(process.cwd(), ".data");
}

function knownWordsFile(): string {
  return path.join(dataDir(), "known-words.json");
}

function ensureDataDir(): void {
  fs.mkdirSync(dataDir(), { recursive: true });
}

export function getKnownWords(): Set<string> {
  try {
    const raw = fs.readFileSync(knownWordsFile(), "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((w): w is string => typeof w === "string"));
    }
  } catch {
    // missing or corrupt file -> empty set
  }
  return new Set();
}

function save(words: Set<string>): void {
  ensureDataDir();
  fs.writeFileSync(
    knownWordsFile(),
    JSON.stringify(Array.from(words).sort(), null, 2),
  );
}

export function addKnownWord(word: string): Set<string> {
  const words = getKnownWords();
  words.add(word.trim().toLowerCase());
  save(words);
  return words;
}

export function removeKnownWord(word: string): Set<string> {
  const words = getKnownWords();
  words.delete(word.trim().toLowerCase());
  save(words);
  return words;
}

/** Pure helper: filter out words the user already knows. */
export function filterUnknown(
  words: string[],
  known: Set<string>,
): string[] {
  return words.filter((w) => !known.has(w.trim().toLowerCase()));
}
