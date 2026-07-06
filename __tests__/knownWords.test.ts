import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addKnownWord,
  filterUnknown,
  getKnownWords,
  removeKnownWord,
} from "@/lib/knownWords";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wordlens-test-"));
  process.env.WORDLENS_DATA_DIR = tmpDir;
});

afterEach(() => {
  delete process.env.WORDLENS_DATA_DIR;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("known-words store", () => {
  it("starts empty when no file exists", () => {
    expect(getKnownWords().size).toBe(0);
  });

  it("persists added words across reads (survives refresh)", () => {
    addKnownWord("Serendipity");
    addKnownWord("ephemeral ");
    const words = getKnownWords();
    expect(words.has("serendipity")).toBe(true);
    expect(words.has("ephemeral")).toBe(true);
    expect(words.size).toBe(2);
  });

  it("removes words", () => {
    addKnownWord("candid");
    removeKnownWord("CANDID");
    expect(getKnownWords().has("candid")).toBe(false);
  });

  it("recovers from a corrupt file", () => {
    fs.writeFileSync(path.join(tmpDir, "known-words.json"), "not json{");
    expect(getKnownWords().size).toBe(0);
  });
});

describe("filterUnknown", () => {
  it("filters out known words case-insensitively", () => {
    const known = new Set(["serendipity", "candid"]);
    expect(
      filterUnknown(["Serendipity", "eloquent", "CANDID", "resilience"], known),
    ).toEqual(["eloquent", "resilience"]);
  });

  it("returns everything when nothing is known", () => {
    expect(filterUnknown(["a", "b"], new Set())).toEqual(["a", "b"]);
  });
});
