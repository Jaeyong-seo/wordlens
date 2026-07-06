import { describe, expect, it } from "vitest";
import {
  addWordCards,
  broadcast,
  bumpPage,
  createRoom,
  formatSseEvent,
  generateRoomCode,
  getRoom,
  removeWord,
  ROOM_TTL_MS,
  snapshot,
  subscribe,
  sweepRooms,
} from "@/lib/rooms";
import type { WordCard } from "@/lib/types";

function makeCard(word: string, pageId: number): WordCard {
  return {
    word,
    meaning: `${word} 뜻`,
    pageId,
    count: 1,
    addedAt: 1,
    source: "mock",
  };
}

describe("room lifecycle", () => {
  it("generates 6-char codes without ambiguous characters", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateRoomCode()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    }
  });

  it("creates and retrieves rooms case-insensitively", () => {
    const room = createRoom();
    expect(getRoom(room.code.toLowerCase())).toBe(room);
    expect(getRoom("XXXXXX")).toBeUndefined();
  });

  it("sweeps expired subscriber-less rooms but keeps active ones", () => {
    const stale = createRoom();
    stale.createdAt = Date.now() - ROOM_TTL_MS - 1;
    const staleButSubscribed = createRoom();
    staleButSubscribed.createdAt = Date.now() - ROOM_TTL_MS - 1;
    subscribe(staleButSubscribed, () => undefined);
    const fresh = createRoom();

    sweepRooms();
    expect(getRoom(stale.code)).toBeUndefined();
    expect(getRoom(staleButSubscribed.code)).toBe(staleButSubscribed);
    expect(getRoom(fresh.code)).toBe(fresh);
  });
});

describe("dedupe in addWordCards", () => {
  it("ignores the same word on the same page", () => {
    const room = createRoom();
    addWordCards(room, [makeCard("ephemeral", 1)]);
    const second = addWordCards(room, [makeCard("ephemeral", 1)]);
    expect(second.added).toHaveLength(0);
    expect(second.updated).toHaveLength(0);
    expect(room.words.size).toBe(1);
  });

  it("bumps count when the word reappears on a new page", () => {
    const room = createRoom();
    addWordCards(room, [makeCard("candid", 1)]);
    bumpPage(room);
    const result = addWordCards(room, [makeCard("candid", 2)]);
    expect(result.updated).toHaveLength(1);
    expect(result.updated[0].count).toBe(2);
    expect(result.updated[0].pageId).toBe(2);
    expect(room.words.size).toBe(1);
  });

  it("adds genuinely new words", () => {
    const room = createRoom();
    const result = addWordCards(room, [
      makeCard("eloquent", 1),
      makeCard("resilience", 1),
    ]);
    expect(result.added).toHaveLength(2);
    expect(snapshot(room).words).toHaveLength(2);
  });
});

describe("SSE broadcast", () => {
  it("formats SSE events correctly", () => {
    expect(formatSseEvent("words", { a: 1 })).toBe(
      'event: words\ndata: {"a":1}\n\n',
    );
  });

  it("delivers word events to subscribers and respects unsubscribe", () => {
    const room = createRoom();
    const received: string[] = [];
    const unsubscribe = subscribe(room, (chunk) => received.push(chunk));

    addWordCards(room, [makeCard("serendipity", 1)]);
    expect(received).toHaveLength(1);
    expect(received[0]).toContain("event: words");
    expect(received[0]).toContain("serendipity");

    unsubscribe();
    addWordCards(room, [makeCard("meticulous", 1)]);
    expect(received).toHaveLength(1);
  });

  it("keeps broadcasting when one subscriber throws", () => {
    const room = createRoom();
    const received: string[] = [];
    subscribe(room, () => {
      throw new Error("closed stream");
    });
    subscribe(room, (chunk) => received.push(chunk));
    broadcast(room, "words", { ok: true });
    expect(received).toHaveLength(1);
  });

  it("broadcasts removals", () => {
    const room = createRoom();
    addWordCards(room, [makeCard("ubiquitous", 1)]);
    const received: string[] = [];
    subscribe(room, (chunk) => received.push(chunk));
    expect(removeWord(room, "UBIQUITOUS")).toBe(true);
    expect(received[0]).toContain("event: removed");
    expect(room.words.size).toBe(0);
  });
});
