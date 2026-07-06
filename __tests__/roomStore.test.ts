import { describe, expect, it } from "vitest";
import { addWordCards, bumpPage } from "@/lib/rooms";
import {
  createRoomState,
  getVersionedSnapshot,
  hydrateRoom,
  loadRoomForMutation,
  persistRoom,
  roomExists,
  serializeRoom,
  type RoomState,
} from "@/lib/roomStore";
import type { WordCard } from "@/lib/types";

function makeCard(word: string, pageId: number): WordCard {
  return {
    word,
    meaning: `${word} meaning`,
    pageId,
    count: 1,
    addedAt: 1,
    source: "mock",
  };
}

const baseState: RoomState = {
  code: "TESTAA",
  createdAt: 1000,
  pageId: 2,
  version: 5,
  mockCalls: 3,
  words: [makeCard("serendipity", 1), makeCard("candid", 2)],
};

describe("hydrate/serialize round trip", () => {
  it("preserves room fields and words, bumping the version", () => {
    const room = hydrateRoom(baseState);
    expect(room.pageId).toBe(2);
    expect(room.words.get("serendipity")?.pageId).toBe(1);

    const out = serializeRoom(room, baseState.version);
    expect(out.version).toBe(6);
    expect(out.words).toHaveLength(2);
    expect(out.mockCalls).toBe(3);
    expect(out.code).toBe("TESTAA");
  });

  it("mutations on a hydrated room survive serialization", () => {
    const room = hydrateRoom(baseState);
    bumpPage(room);
    addWordCards(room, [makeCard("eloquent", room.pageId)]);
    const out = serializeRoom(room, baseState.version);
    expect(out.pageId).toBe(3);
    expect(out.words.map((w) => w.word)).toContain("eloquent");
  });
});

describe("memory-mode facade (no Redis configured)", () => {
  it("creates rooms and reports existence", async () => {
    const code = await createRoomState();
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(await roomExists(code)).toBe(true);
    expect(await roomExists("ZZZZZ2")).toBe(false);
  });

  it("returns snapshots and mutable rooms; persist is a no-op", async () => {
    const code = await createRoomState();
    const loaded = await loadRoomForMutation(code);
    expect(loaded).not.toBeNull();
    addWordCards(loaded!.room, [makeCard("resilience", 1)]);
    await persistRoom(loaded!.room, loaded!.version); // must not throw

    const snap = await getVersionedSnapshot(code);
    expect(snap?.words.map((w) => w.word)).toContain("resilience");
  });
});
