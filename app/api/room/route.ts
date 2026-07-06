import { NextRequest, NextResponse } from "next/server";
import { createRoom, getRoom } from "@/lib/rooms";

export const dynamic = "force-dynamic";

/** Check whether a room is still alive (viewer reload re-joins it). */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code") ?? "";
  const room = getRoom(code);
  return NextResponse.json({
    exists: Boolean(room),
    code: room?.code ?? null,
  });
}

/** Create a new room and return its 6-char code. */
export async function POST() {
  const room = createRoom();
  return NextResponse.json({ code: room.code }, { status: 201 });
}
