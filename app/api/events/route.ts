import { NextRequest } from "next/server";
import { isRedisConfigured } from "@/lib/redis";
import { formatSseEvent, getRoom, snapshot, subscribe } from "@/lib/rooms";
import { getVersionedSnapshot, POLL_INTERVAL_MS } from "@/lib/roomStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/** Keep the SSE stream alive as long as the platform allows (Vercel: 300s). */
export const maxDuration = 300;

const HEARTBEAT_MS = 15_000;

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
};

/**
 * SSE stream: snapshot on connect, then live word events.
 * Redis mode polls the shared state for version changes (cross-instance);
 * memory mode subscribes to the in-process room for instant push.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("room") ?? "";
  const encoder = new TextEncoder();

  if (isRedisConfigured()) {
    const initial = await getVersionedSnapshot(code);
    if (!initial) {
      return new Response("room not found", { status: 404 });
    }
    let poll: ReturnType<typeof setInterval> | null = null;
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    let closed = false;
    let lastVersion = initial.version;

    const stream = new ReadableStream({
      start(controller) {
        const teardown = () => {
          if (closed) return;
          closed = true;
          if (poll) clearInterval(poll);
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
            teardown();
          }
        };
        send(
          formatSseEvent("snapshot", {
            pageId: initial.pageId,
            words: initial.words,
          }),
        );
        poll = setInterval(() => {
          void (async () => {
            try {
              const s = await getVersionedSnapshot(code);
              if (!s) {
                teardown(); // room expired -> client re-mints via recovery
                return;
              }
              if (s.version !== lastVersion) {
                lastVersion = s.version;
                send(
                  formatSseEvent("snapshot", {
                    pageId: s.pageId,
                    words: s.words,
                  }),
                );
              }
            } catch {
              // transient Redis error; retry on the next tick
            }
          })();
        }, POLL_INTERVAL_MS);
        heartbeat = setInterval(() => send(": ping\n\n"), HEARTBEAT_MS);
      },
      cancel() {
        closed = true;
        if (poll) clearInterval(poll);
        if (heartbeat) clearInterval(heartbeat);
      },
    });
    return new Response(stream, { headers: SSE_HEADERS });
  }

  // Memory mode: in-process pub/sub with instant delivery.
  const room = getRoom(code);
  if (!room) {
    return new Response("room not found", { status: 404 });
  }
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

  return new Response(stream, { headers: SSE_HEADERS });
}
