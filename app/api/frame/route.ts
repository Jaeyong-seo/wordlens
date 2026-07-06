import { NextRequest, NextResponse } from "next/server";
import { extractUnderlinedWords, isMockMode } from "@/lib/ai";
import { lookupDefinition } from "@/lib/dictionary";
import { filterUnknown, getKnownWords } from "@/lib/knownWords";
import { normalizeWords } from "@/lib/normalize";
import { addWordCards, bumpPage, getRoom } from "@/lib/rooms";
import type { FramePayload, WordCard } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: FramePayload;
  try {
    body = (await request.json()) as FramePayload;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (!body.room) {
    return NextResponse.json({ error: "room is required" }, { status: 400 });
  }
  const room = getRoom(body.room);
  if (!room) {
    return NextResponse.json({ error: "room not found" }, { status: 404 });
  }

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
  const unknown = filterUnknown(words, getKnownWords());

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

  return NextResponse.json({
    pageId: room.pageId,
    extracted: words.length,
    filtered: words.length - unknown.length,
    added: added.length,
    updated: updated.length,
    mock: usedMock,
  });
}
