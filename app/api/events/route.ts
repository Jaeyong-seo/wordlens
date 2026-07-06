import { NextRequest } from "next/server";
import { formatSseEvent, getRoom, snapshot, subscribe } from "@/lib/rooms";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/** Keep the SSE stream alive as long as the platform allows (Vercel: 300s). */
export const maxDuration = 300;

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
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const teardown = () => {
        if (closed) return;
        closed = true;
        unsubscribe?.();
        if (heartbeat) clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // already closed by the runtime
        }
      };
      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // connection died without cancel(): release subscriber + heartbeat
          teardown();
        }
      };
      unsubscribe = subscribe(room, send);
      send(formatSseEvent("snapshot", snapshot(room)));
      heartbeat = setInterval(() => send(": ping\n\n"), HEARTBEAT_MS);
    },
    cancel() {
      closed = true;
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
