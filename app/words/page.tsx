"use client";

import { useCallback, useEffect, useState } from "react";

export default function WordsPage() {
  const [words, setWords] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/known-words");
    const json = (await res.json()) as { words: string[] };
    setWords(json.words);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unknow = useCallback(async (word: string) => {
    setWords((prev) => prev.filter((w) => w !== word));
    await fetch("/api/known-words", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word }),
    });
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-2xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">📚 My vocabulary</h1>
        <a href="/viewer" className="text-sm text-slate-400 underline">
          ← Back to viewer
        </a>
      </header>
      <p className="mb-4 text-sm text-slate-500">
        Words you marked as known. Remove one to see it again.
      </p>
      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : words.length === 0 ? (
        <p className="text-slate-600">No known words yet.</p>
      ) : (
        <ul className="space-y-2">
          {words.map((word) => (
            <li
              key={word}
              data-testid={`known-word-${word}`}
              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-3"
            >
              <span className="text-lg">{word}</span>
              <button
                onClick={() => void unknow(word)}
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-slate-400 transition hover:bg-red-900 hover:text-white"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
