import { NextRequest, NextResponse } from "next/server";
import { createRoomState, roomExists } from "@/lib/roomStore";

export const dynamic = "force-dynamic";

/** Check whether a room is still alive (viewer reload re-joins it). */
export async function GET(request: NextRequest) {
  const code = (request.nextUrl.searchParams.get("code") ?? "")
    .trim()
    .toUpperCase();
  const exists = code.length === 6 ? await roomExists(code) : false;
  return NextResponse.json({
    exists,
    code: exists ? code : null,
  });
}

/** Create a new room and return its 6-char code. */
export async function POST() {
  const code = await createRoomState();
  return NextResponse.json({ code }, { status: 201 });
}
