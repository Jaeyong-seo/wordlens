"use client";

import QRCode from "qrcode";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { speakWord } from "@/lib/speak";
import { useWakeLock } from "@/lib/useWakeLock";
import type { SnapshotEvent, WordCard, WordsEvent } from "@/lib/types";

const ROOM_STORAGE_KEY = "wordlens-room";

type Connection = "connecting" | "live" | "reconnecting";

export default function ViewerPage() {
  useWakeLock();
  const [code, setCode] = useState<string | null>(null);
  const [connection, setConnection] = useState<Connection>("connecting");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [words, setWords] = useState<Map<string, WordCard>>(new Map());
  const [currentPageId, setCurrentPageId] = useState(1);
  const sourceRef = useRef<EventSource | null>(null);
  const recoveringRef = useRef(false);

  // Create a room, or re-join the one from a previous load if still alive.
  useEffect(() => {
    let cancelled = false;
    const ensureRoom = async () => {
      const saved = window.localStorage.getItem(ROOM_STORAGE_KEY);
      if (saved) {
        const res = await fetch(`/api/room?code=${encodeURIComponent(saved)}`);
        const json = (await res.json()) as { exists: boolean };
        if (!cancelled && json.exists) {
          setCode(saved);
          return;
        }
      }
      const res = await fetch("/api/room", { method: "POST" });
      const json = (await res.json()) as { code: string };
      if (!cancelled) {
        window.localStorage.setItem(ROOM_STORAGE_KEY, json.code);
        setCode(json.code);
      }
    };
    void ensureRoom();
    return () => {
      cancelled = true;
    };
  }, []);

  // QR code that opens /camera pre-filled with the room code.
  useEffect(() => {
    if (!code) return;
    const url = `${window.location.origin}/camera?room=${code}`;
    QRCode.toDataURL(url, { width: 240, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [code]);

  // SSE subscription with automatic reconnect (EventSource retries itself).
  useEffect(() => {
    if (!code) return;
    const source = new EventSource(`/api/events?room=${code}`);
    sourceRef.current = source;
    source.onopen = () => setConnection("live");
    source.onerror = () => {
      setConnection("reconnecting");
      // If the room vanished server-side (dev restart), EventSource would
      // retry a 404 forever — verify and mint a fresh room instead.
      if (recoveringRef.current) return;
      recoveringRef.current = true;
      void (async () => {
        try {
          const res = await fetch(`/api/room?code=${code}`);
          const json = (await res.json()) as { exists: boolean };
          if (!json.exists) {
            const created = await fetch("/api/room", { method: "POST" });
            const next = (await created.json()) as { code: string };
            window.localStorage.setItem(ROOM_STORAGE_KEY, next.code);
            setWords(new Map());
            setCurrentPageId(1);
            setCode(next.code);
          }
        } catch {
          // server unreachable; let EventSource keep retrying
        } finally {
          recoveringRef.current = false;
        }
      })();
    };
    source.addEventListener("snapshot", (e) => {
      const data = JSON.parse((e as MessageEvent).data) as SnapshotEvent;
      const next = new Map<string, WordCard>();
      data.words.forEach((w) => next.set(w.word, w));
      setWords(next);
      setCurrentPageId(data.pageId);
    });
    source.addEventListener("words", (e) => {
      const data = JSON.parse((e as MessageEvent).data) as WordsEvent;
      setWords((prev) => {
        const next = new Map(prev);
        [...data.added, ...data.updated].forEach((w) => next.set(w.word, w));
        return next;
      });
      setCurrentPageId(data.pageId);
    });
    source.addEventListener("removed", (e) => {
      const data = JSON.parse((e as MessageEvent).data) as { word: string };
      setWords((prev) => {
        const next = new Map(prev);
        next.delete(data.word);
        return next;
      });
    });
    return () => {
      source.close();
      sourceRef.current = null;
    };
  }, [code]);

  const markKnown = useCallback(
    async (word: string) => {
      setWords((prev) => {
        const next = new Map(prev);
        next.delete(word);
        return next;
      });
      await fetch("/api/known-words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word, room: code }),
      });
    },
    [code],
  );

  const { current, older } = useMemo(() => {
    const all = Array.from(words.values());
    const sortFn = (a: WordCard, b: WordCard) =>
      b.count - a.count || b.addedAt - a.addedAt;
    return {
      current: all.filter((w) => w.pageId === currentPageId).sort(sortFn),
      older: all.filter((w) => w.pageId !== currentPageId).sort(sortFn),
    };
  }, [words, currentPageId]);

  return (
    <main className="mx-auto min-h-screen max-w-3xl p-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Word<span className="text-red-500">Lens</span> Viewer
          </h1>
          <p className="text-sm text-slate-400">
            Connection:{" "}
            <span
              data-testid="connection-status"
              className={
                connection === "live" ? "text-green-400" : "text-amber-400"
              }
            >
              {connection === "live"
                ? "Live"
                : connection === "connecting"
                  ? "Connecting…"
                  : "Reconnecting…"}
            </span>
          </p>
        </div>
        <a href="/words" className="text-sm text-slate-400 underline">
          My vocabulary →
        </a>
      </header>

      {words.size === 0 && (
        <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center">
          <p className="mb-2 text-slate-300">
            Enter this code on your phone
          </p>
          <p
            data-testid="room-code"
            className="text-5xl font-bold tracking-[0.3em] text-red-400"
          >
            {code ?? "······"}
          </p>
          {qrDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt="QR code linking to the camera page"
              className="mx-auto mt-4 rounded-lg bg-white p-2"
            />
          )}
          <p className="mt-4 text-sm text-slate-500">
            Scan the QR code, or open <code>/camera</code> on your phone and
            type the code.
          </p>
        </section>
      )}

      {words.size > 0 && (
        <p className="mb-4 text-xs text-slate-500">
          Room code: <span data-testid="room-code">{code}</span>
        </p>
      )}

      <section aria-label="current page words">
        <h2 className="mb-3 text-lg font-semibold text-slate-300">
          📖 Current page{" "}
          <span className="text-sm text-slate-500">p.{currentPageId}</span>
        </h2>
        {current.length === 0 ? (
          <p className="mb-6 text-slate-600">
            Underline a word in red — it will appear here.
          </p>
        ) : (
          <ul className="mb-8 space-y-3">
            {current.map((w) => (
              <WordCardItem key={w.word} card={w} onKnown={markKnown} large />
            ))}
          </ul>
        )}
      </section>

      {older.length > 0 && (
        <section aria-label="earlier page words">
          <h2 className="mb-3 text-lg font-semibold text-slate-500">
            Earlier pages
          </h2>
          <ul className="space-y-2">
            {older.map((w) => (
              <WordCardItem key={w.word} card={w} onKnown={markKnown} />
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function WordCardItem({
  card,
  onKnown,
  large = false,
}: {
  card: WordCard;
  onKnown: (word: string) => void;
  large?: boolean;
}) {
  return (
    <li
      data-testid={`word-card-${card.word}`}
      className={`rounded-2xl border border-slate-800 bg-slate-900 ${
        large ? "p-5" : "p-4"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`font-bold ${large ? "text-3xl" : "text-xl"}`}>
            {card.word}
            {card.phonetic && (
              <span className="ml-2 text-sm font-normal text-slate-500">
                {card.phonetic}
              </span>
            )}
            {card.count > 1 && (
              <span className="ml-2 rounded-full bg-red-900 px-2 py-0.5 text-xs text-red-300">
                ×{card.count}
              </span>
            )}
          </p>
          <p className={`mt-1 text-slate-200 ${large ? "text-xl" : ""}`}>
            {card.meaning}
          </p>
          {card.example && (
            <p className="mt-1 text-sm italic text-slate-500">
              “{card.example}”
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            data-testid={`speak-button-${card.word}`}
            onClick={() => speakWord(card.word)}
            aria-label={`Pronounce ${card.word}`}
            title="Pronounce"
            className="rounded-xl bg-slate-800 p-2.5 text-slate-300 transition hover:bg-sky-800 hover:text-white"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M11 5 6 9H2v6h4l5 4V5z" />
              <path d="M15.5 8.5a5 5 0 0 1 0 7" />
              <path d="M18.8 5.8a9 9 0 0 1 0 12.4" />
            </svg>
          </button>
          <button
            data-testid={`know-button-${card.word}`}
            onClick={() => onKnown(card.word)}
            aria-label={`I know ${card.word}`}
            title="I know this word"
            className="rounded-xl bg-slate-800 p-2.5 text-slate-300 transition hover:bg-green-800 hover:text-white"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </button>
        </div>
      </div>
    </li>
  );
}
