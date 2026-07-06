/** Keep only plausible English words; lowercase + strip punctuation + dedupe. */
export function normalizeWords(words: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of words) {
    const w = raw
      .trim()
      .toLowerCase()
      .replace(/[^a-z'-]/g, "");
    if (w.length < 2 || seen.has(w)) continue;
    seen.add(w);
    out.push(w);
  }
  return out;
}
