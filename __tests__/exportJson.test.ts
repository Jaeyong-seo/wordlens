import { describe, expect, it } from "vitest";
import { buildExportPayload } from "@/lib/exportJson";

describe("buildExportPayload", () => {
  it("builds a vocabulary export payload with count and array passthrough", () => {
    const items = ["serendipity", "candid"];
    const payload = buildExportPayload("vocabulary", items) as {
      app: string;
      kind: string;
      exportedAt: string;
      count: number;
      items: string[];
    };

    expect(payload.app).toBe("wordlens");
    expect(payload.kind).toBe("vocabulary");
    expect(payload.count).toBe(2);
    expect(payload.items).toBe(items);
  });

  it("sets exportedAt to a valid ISO date string", () => {
    const payload = buildExportPayload("session", []) as {
      exportedAt: string;
    };

    expect(Number.isNaN(Date.parse(payload.exportedAt))).toBe(false);
    expect(new Date(payload.exportedAt).toISOString()).toBe(
      payload.exportedAt,
    );
  });

  it("normalizes non-array data to an empty items list", () => {
    const payload = buildExportPayload("session", "oops") as {
      count: number;
      items: unknown[];
    };
    expect(payload.count).toBe(0);
    expect(payload.items).toEqual([]);
  });
});
