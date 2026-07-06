import { NextRequest } from "next/server";
import { formatSseEvent, getRoom, snapshot, subscribe } from "@/lib/rooms";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HEARTBEAT_MS = 15_000;

/** SSE stream: snapshot on connect, then live word events. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("room") ?? "";
  const room = getRoom(code);
  if (!room) {
    return new Response("room not found", { status: 404 });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // stream closed under us; unsubscribe on next cancel
        }
      };
      unsubscribe = subscribe(room, send);
      send(formatSseEvent("snapshot", snapshot(room)));
      heartbeat = setInterval(() => send(": ping\n\n"), HEARTBEAT_MS);
    },
    cancel() {
      unsubscribe?.();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
