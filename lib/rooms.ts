import type { SnapshotEvent, WordCard, WordsEvent } from "@/lib/types";

type Subscriber = (chunk: string) => void;

export interface Room {
  code: string;
  createdAt: number;
  pageId: number;
  words: Map<string, WordCard>;
  subscribers: Set<Subscriber>;
  mockCalls: number;
}

/** Survive Next.js dev hot-reload module re-evaluation. */
const globalStore = globalThis as unknown as {
  __wordlensRooms?: Map<string, Room>;
};

function roomsMap(): Map<string, Room> {
  if (!globalStore.__wordlensRooms) {
    globalStore.__wordlensRooms = new Map();
  }
  return globalStore.__wordlensRooms;
}

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L

/** Idle rooms (no subscribers) older than this are swept lazily. */
export const ROOM_TTL_MS = 12 * 60 * 60 * 1000;

/** Drop expired subscriber-less rooms; called on every create/get. */
export function sweepRooms(now = Date.now()): number {
  const rooms = roomsMap();
  let swept = 0;
  rooms.forEach((room, code) => {
    if (room.subscribers.size === 0 && now - room.createdAt > ROOM_TTL_MS) {
      rooms.delete(code);
      swept++;
    }
  });
  return swept;
}

export function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export function createRoom(): Room {
  sweepRooms();
  const rooms = roomsMap();
  let code = generateRoomCode();
  while (rooms.has(code)) code = generateRoomCode();
  const room: Room = {
    code,
    createdAt: Date.now(),
    pageId: 1,
    words: new Map(),
    subscribers: new Set(),
    mockCalls: 0,
  };
  rooms.set(code, room);
  return room;
}

export function getRoom(code: string): Room | undefined {
  sweepRooms();
  return roomsMap().get(code.trim().toUpperCase());
}

export function formatSseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function subscribe(room: Room, fn: Subscriber): () => void {
  room.subscribers.add(fn);
  return () => {
    room.subscribers.delete(fn);
  };
}

export function broadcast(room: Room, event: string, data: unknown): void {
  const chunk = formatSseEvent(event, data);
  room.subscribers.forEach((fn) => {
    try {
      fn(chunk);
    } catch {
      // subscriber stream already closed; drop silently
    }
  });
}

export function bumpPage(room: Room): number {
  room.pageId += 1;
  return room.pageId;
}

export function snapshot(room: Room): SnapshotEvent {
  return {
    pageId: room.pageId,
    words: Array.from(room.words.values()),
  };
}

/**
 * Add word cards with dedupe:
 * - same word on the same page -> ignored
 * - same word on a new page -> count bumped, moved to current page
 * - new word -> added
 * Broadcasts a `words` event when anything changed.
 */
export function addWordCards(
  room: Room,
  cards: WordCard[],
): { added: WordCard[]; updated: WordCard[] } {
  const added: WordCard[] = [];
  const updated: WordCard[] = [];
  for (const card of cards) {
    const key = card.word.toLowerCase();
    const existing = room.words.get(key);
    if (existing) {
      if (existing.pageId === card.pageId) continue; // duplicate on same page
      existing.count += 1;
      existing.pageId = card.pageId;
      updated.push(existing);
    } else {
      room.words.set(key, card);
      added.push(card);
    }
  }
  if (added.length > 0 || updated.length > 0) {
    const event: WordsEvent = { pageId: room.pageId, added, updated };
    broadcast(room, "words", event);
  }
  return { added, updated };
}

/** Remove a word from the room (e.g. after user marks it as known). */
export function removeWord(room: Room, word: string): boolean {
  const removed = room.words.delete(word.toLowerCase());
  if (removed) {
    broadcast(room, "removed", { word: word.toLowerCase() });
  }
  return removed;
}
