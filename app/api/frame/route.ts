import { NextRequest, NextResponse } from "next/server";
import { extractUnderlinedWords, isMockMode } from "@/lib/ai";
import { lookupDefinition } from "@/lib/dictionary";
import { filterUnknown, getKnownWordsAsync } from "@/lib/knownWords";
import { normalizeWords } from "@/lib/normalize";
import { addWordCards, bumpPage } from "@/lib/rooms";
import { loadRoomForMutation, persistRoom } from "@/lib/roomStore";
import type { FramePayload, WordCard } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 960px JPEG frames are ~100-300KB base64; anything near this is abuse. */
const MAX_FRAME_BYTES = 4 * 1024 * 1024;
const MAX_MOCK_WORDS = 20;

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_FRAME_BYTES) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }
  let body: FramePayload;
  try {
    body = (await request.json()) as FramePayload;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (body.image && body.image.length > MAX_FRAME_BYTES) {
    return NextResponse.json({ error: "image too large" }, { status: 413 });
  }
  if (body.mockWords) {
    body.mockWords = body.mockWords.slice(0, MAX_MOCK_WORDS);
  }
  if (!body.room) {
    return NextResponse.json({ error: "room is required" }, { status: 400 });
  }
  const loaded = await loadRoomForMutation(body.room);
  if (!loaded) {
    return NextResponse.json({ error: "room not found" }, { status: 404 });
  }
  const { room, version } = loaded;

  if (body.pageChanged) {
    bumpPage(room);
  }

  let extracted: string[];
  let usedMock = isMockMode();
  try {
    extracted = await extractUnderlinedWords({
      image: body.image,
      mockWords: usedMock ? body.mockWords : undefined,
      mockSeed: room.mockCalls++,
    });
  } catch {
    // Vision failure -> degrade to mock so the session keeps working.
    usedMock = true;
    extracted = [];
  }

  const words = normalizeWords(extracted);
  const unknown = filterUnknown(words, await getKnownWordsAsync());

  const cards: WordCard[] = [];
  for (const word of unknown) {
    const existing = room.words.get(word);
    if (existing && existing.pageId === room.pageId) continue; // dedupe early
    const def = await lookupDefinition(word);
    cards.push({
      ...def,
      pageId: room.pageId,
      count: 1,
      addedAt: Date.now(),
    });
  }
  const { added, updated } = addWordCards(room, cards);
  if (added.length > 0 || updated.length > 0 || body.pageChanged) {
    await persistRoom(room, version);
  }

  return NextResponse.json({
    pageId: room.pageId,
    extracted: words.length,
    filtered: words.length - unknown.length,
    added: added.length,
    updated: updated.length,
    mock: usedMock,
  });
}
