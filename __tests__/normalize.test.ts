import { describe, expect, it } from "vitest";
import { normalizeWords } from "@/lib/normalize";

describe("normalizeWords", () => {
  it("lowercases and strips punctuation", () => {
    expect(normalizeWords(["Serendipity,", "  Candid!"])).toEqual([
      "serendipity",
      "candid",
    ]);
  });

  it("dedupes case-insensitively", () => {
    expect(normalizeWords(["Word", "word", "WORD"])).toEqual(["word"]);
  });

  it("drops single letters and empty strings", () => {
    expect(normalizeWords(["a", "", "I", "ok"])).toEqual(["ok"]);
  });

  it("keeps apostrophes and hyphens", () => {
    expect(normalizeWords(["don't", "well-known"])).toEqual([
      "don't",
      "well-known",
    ]);
  });
});
