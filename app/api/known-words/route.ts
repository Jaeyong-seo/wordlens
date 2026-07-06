import { NextRequest, NextResponse } from "next/server";
import {
  addKnownWordAsync,
  getKnownWordsAsync,
  removeKnownWordAsync,
} from "@/lib/knownWords";
import { removeWord } from "@/lib/rooms";
import { loadRoomForMutation, persistRoom } from "@/lib/roomStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const words = await getKnownWordsAsync();
  return NextResponse.json({ words: Array.from(words).sort() });
}

/** Mark a word as known; optionally remove it from a live room. */
export async function POST(request: NextRequest) {
  let body: { word?: string; room?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const word = body.word?.trim().toLowerCase();
  if (!word) {
    return NextResponse.json({ error: "word is required" }, { status: 400 });
  }
  const total = await addKnownWordAsync(word);
  if (body.room) {
    const loaded = await loadRoomForMutation(body.room);
    if (loaded && removeWord(loaded.room, word)) {
      await persistRoom(loaded.room, loaded.version);
    }
  }
  return NextResponse.json({ ok: true, total });
}

/** Un-know a word (vocabulary management). */
export async function DELETE(request: NextRequest) {
  let body: { word?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const word = body.word?.trim().toLowerCase();
  if (!word) {
    return NextResponse.json({ error: "word is required" }, { status: 400 });
  }
  const total = await removeKnownWordAsync(word);
  return NextResponse.json({ ok: true, total });
}
