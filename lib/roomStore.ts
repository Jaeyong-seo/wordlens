/**
 * Storage facade for rooms. Two modes:
 * - Memory (default): the in-memory rooms from lib/rooms.ts — instant SSE
 *   broadcast, correct for local dev / single-process servers.
 * - Redis (when configured): room state serialized to Redis so it survives
 *   serverless instance hops; SSE streams poll for version changes.
 */

import { isRedisConfigured, redisGetJson, redisSetJson } from "@/lib/redis";
import {
  createRoom as memCreateRoom,
  generateRoomCode,
  getRoom as memGetRoom,
  snapshot,
  type Room,
} from "@/lib/rooms";
import type { SnapshotEvent, WordCard } from "@/lib/types";

export const ROOM_TTL_SECONDS = 12 * 60 * 60;
export const POLL_INTERVAL_MS = 2_500;

export interface RoomState {
  code: string;
  createdAt: number;
  pageId: number;
  version: number;
  mockCalls: number;
  words: WordCard[];
}

export interface VersionedSnapshot extends SnapshotEvent {
  version: number;
}

function roomKey(code: string): string {
  return `wordlens:room:${code.trim().toUpperCase()}`;
}

/** Build an in-memory Room from persisted state so lib/rooms helpers apply. */
export function hydrateRoom(state: RoomState): Room {
  return {
    code: state.code,
    createdAt: state.createdAt,
    pageId: state.pageId,
    words: new Map(state.words.map((w) => [w.word.toLowerCase(), w])),
    subscribers: new Set(),
    mockCalls: state.mockCalls,
  };
}

/** Serialize a (mutated) Room back to persistable state, bumping version. */
export function serializeRoom(room: Room, previousVersion: number): RoomState {
  return {
    code: room.code,
    createdAt: room.createdAt,
    pageId: room.pageId,
    version: previousVersion + 1,
    mockCalls: room.mockCalls,
    words: Array.from(room.words.values()),
  };
}

export async function createRoomState(): Promise<string> {
  if (!isRedisConfigured()) {
    return memCreateRoom().code;
  }
  const code = generateRoomCode();
  const state: RoomState = {
    code,
    createdAt: Date.now(),
    pageId: 1,
    version: 0,
    mockCalls: 0,
    words: [],
  };
  await redisSetJson(roomKey(code), state, ROOM_TTL_SECONDS);
  return code;
}

export async function roomExists(code: string): Promise<boolean> {
  if (!isRedisConfigured()) {
    return Boolean(memGetRoom(code));
  }
  return (await redisGetJson<RoomState>(roomKey(code))) !== null;
}

export async function getVersionedSnapshot(
  code: string,
): Promise<VersionedSnapshot | null> {
  if (!isRedisConfigured()) {
    const room = memGetRoom(code);
    return room ? { ...snapshot(room), version: 0 } : null;
  }
  const state = await redisGetJson<RoomState>(roomKey(code));
  if (!state) return null;
  return { pageId: state.pageId, words: state.words, version: state.version };
}

/**
 * Load a room for mutation. Redis mode hydrates a detached Room from the
 * persisted state (caller must persistRoom afterwards); memory mode returns
 * the live Room whose mutations broadcast immediately.
 */
export async function loadRoomForMutation(
  code: string,
): Promise<{ room: Room; version: number } | null> {
  if (!isRedisConfigured()) {
    const room = memGetRoom(code);
    return room ? { room, version: 0 } : null;
  }
  const state = await redisGetJson<RoomState>(roomKey(code));
  if (!state) return null;
  return { room: hydrateRoom(state), version: state.version };
}

export async function persistRoom(room: Room, version: number): Promise<void> {
  if (!isRedisConfigured()) return; // live object already mutated + broadcast
  await redisSetJson(
    roomKey(room.code),
    serializeRoom(room, version),
    ROOM_TTL_SECONDS,
  );
}
