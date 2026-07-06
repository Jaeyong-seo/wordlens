import { beforeEach, describe, expect, it, vi } from "vitest";
import { lookupDefinition, type LookupDeps } from "@/lib/dictionary";
import type { Definition } from "@/lib/types";

// Deterministic mock mode: source becomes "mock" when the LLM step succeeds.
beforeEach(() => {
  process.env.WORDLENS_MOCK = "1";
});

function makeDeps(overrides: Partial<LookupDeps> = {}): LookupDeps {
  return {
    fetchDict: vi.fn().mockResolvedValue(null),
    llmDefine: vi.fn().mockResolvedValue(null),
    cacheGet: vi.fn().mockReturnValue(null),
    cacheSet: vi.fn(),
    ...overrides,
  };
}

describe("lookupDefinition fallback chain", () => {
  it("returns the cached definition without calling any source", async () => {
    const cached: Definition = {
      word: "candid",
      meaning: "솔직한",
      source: "mock",
    };
    const deps = makeDeps({ cacheGet: vi.fn().mockReturnValue(cached) });
    const result = await lookupDefinition("Candid", deps);
    expect(result).toBe(cached);
    expect(deps.fetchDict).not.toHaveBeenCalled();
    expect(deps.llmDefine).not.toHaveBeenCalled();
  });

  it("merges dictionary phonetics with LLM Korean meaning", async () => {
    const deps = makeDeps({
      fetchDict: vi.fn().mockResolvedValue({
        phonetic: "/ˈkændɪd/",
        englishDef: "truthful and straightforward",
        example: "A candid interview.",
      }),
      llmDefine: vi.fn().mockResolvedValue({ meaning: "솔직한" }),
    });
    const result = await lookupDefinition("candid", deps);
    expect(result.meaning).toBe("솔직한");
    expect(result.phonetic).toBe("/ˈkændɪd/");
    expect(result.example).toBe("A candid interview.");
    expect(deps.cacheSet).toHaveBeenCalledWith("candid", result);
  });

  it("survives a throwing dictionary source", async () => {
    const deps = makeDeps({
      fetchDict: vi.fn().mockRejectedValue(new Error("network down")),
      llmDefine: vi.fn().mockResolvedValue({
        meaning: "덧없는",
        example: "Life is ephemeral.",
      }),
    });
    const result = await lookupDefinition("ephemeral", deps);
    expect(result.meaning).toBe("덧없는");
    expect(result.example).toBe("Life is ephemeral.");
  });

  it("falls back to the English definition when the LLM fails", async () => {
    const deps = makeDeps({
      fetchDict: vi.fn().mockResolvedValue({
        englishDef: "existing everywhere",
      }),
      llmDefine: vi.fn().mockRejectedValue(new Error("llm down")),
    });
    const result = await lookupDefinition("ubiquitous", deps);
    expect(result.meaning).toBe("existing everywhere");
    expect(result.source).toBe("dictionary");
  });

  it("returns a stub when every source fails", async () => {
    const deps = makeDeps();
    const result = await lookupDefinition("meticulous", deps);
    expect(result.meaning).toBe("뜻을 찾지 못했습니다");
    expect(result.source).toBe("fallback");
    expect(deps.cacheSet).toHaveBeenCalled();
  });

  it("normalizes the word before lookup", async () => {
    const deps = makeDeps({
      llmDefine: vi.fn().mockResolvedValue({ meaning: "회복력" }),
    });
    const result = await lookupDefinition("  Resilience ", deps);
    expect(result.word).toBe("resilience");
    expect(deps.llmDefine).toHaveBeenCalledWith("resilience");
  });
});
