import { NextRequest, NextResponse } from "next/server";
import {
  addKnownWord,
  getKnownWords,
  removeKnownWord,
} from "@/lib/knownWords";
import { getRoom, removeWord } from "@/lib/rooms";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ words: Array.from(getKnownWords()).sort() });
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
  const words = addKnownWord(word);
  if (body.room) {
    const room = getRoom(body.room);
    if (room) removeWord(room, word);
  }
  return NextResponse.json({ ok: true, total: words.size });
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
  const words = removeKnownWord(word);
  return NextResponse.json({ ok: true, total: words.size });
}
