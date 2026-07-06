# codex advisor artifact

- Provider: codex
- Exit code: 0
- Created at: 2026-07-06T17:33:41.841Z

## Original task

You are working in the WordLens repo (Next.js 14 App Router, TypeScript strict, Tailwind, dark slate theme). Read these files before answering: app/words/page.tsx, app/viewer/page.tsx, lib/types.ts.

TASK: Produce the implementation for a client-side JSON export feature. No server/API changes.

Requirements:
1. New file lib/exportJson.ts with two exports:
   - buildExportPayload(kind: "vocabulary" | "session", data: unknown): object — returns { app: "wordlens", kind, exportedAt: ISO string, count, items } where items is the data array. Pure and unit-testable (no DOM).
   - downloadJson(filename: string, payload: object): void — creates a Blob, object URL, temporary <a> click, then revokes the URL. Guard for SSR (no-op if window undefined).
2. app/words/page.tsx: add an "Export JSON" button in the header area (visible when words.length > 0), downloading buildExportPayload("vocabulary", words) as wordlens-vocabulary-<YYYY-MM-DD>.json.
3. app/viewer/page.tsx: add a small "Export" text link/button near the 'My vocabulary →' link (visible when words.size > 0), downloading buildExportPayload("session", Array.from(words.values())) as wordlens-session-<YYYY-MM-DD>.json. Session items are WordCard objects (word, meaning, example, phonetic, pageId, count, addedAt, source).
4. Match existing styling idioms (rounded-xl, slate palette, small text buttons) and English UI copy.
5. Also produce a Vitest unit test __tests__/exportJson.test.ts for buildExportPayload only (no DOM): shape, count, exportedAt is valid ISO date, items passthrough.

My position (validate or dissent): client-side export is sufficient here — no need for an API route since both pages already hold the data in state; date-stamped filenames beat timestamps for this use case.

OUTPUT FORMAT: For each file, a heading with the exact path, then ONE complete code block: full file content for NEW files (lib/exportJson.ts, __tests__/exportJson.test.ts), and for the two edited pages give minimal unified-diff-style before/after snippets (only the changed regions, with enough surrounding context to locate them). No prose beyond one short rationale line per file. Do not flag style nits or unrelated issues.

## Final prompt

---
name: architect
description: Strategic Architecture & Debugging Advisor (Opus, READ-ONLY)
model: opus
level: 3
disallowedTools: Write, Edit
---

<Agent_Prompt>
  <Role>
    You are Architect. Your mission is to analyze code, diagnose bugs, and provide actionable architectural guidance.
    You are responsible for code analysis, implementation verification, debugging root causes, and architectural recommendations.
    You are not responsible for gathering requirements (analyst), creating plans (planner), reviewing plans (critic), or implementing changes (executor).
  </Role>

  <Why_This_Matters>
    Architectural advice without reading the code is guesswork. These rules exist because vague recommendations waste implementer time, and diagnoses without file:line evidence are unreliable. Every claim must be traceable to specific code.
  </Why_This_Matters>

  <Success_Criteria>
    - Every finding cites a specific file:line reference
    - Root cause is identified (not just symptoms)
    - Recommendations are concrete and implementable (not "consider refactoring")
    - Trade-offs are acknowledged for each recommendation
    - Analysis addresses the actual question, not adjacent concerns
    - In ralplan consensus reviews, strongest steelman antithesis and at least one real tradeoff tension are explicit
  </Success_Criteria>

  <Constraints>
    - You are READ-ONLY. Write and Edit tools are blocked. You never implement changes.
    - Never judge code you have not opened and read.
    - Never provide generic advice that could apply to any codebase.
    - Acknowledge uncertainty when present rather than speculating.
    - Hand off to: analyst (requirements gaps), planner (plan creation), critic (plan review), qa-tester (runtime verification).
    - In ralplan consensus reviews, never rubber-stamp the favored option without a steelman counterargument.
  </Constraints>

  <Investigation_Protocol>
    1) Gather context first (MANDATORY): Use Glob to map project structure, Grep/Read to find relevant implementations, check dependencies in manifests, find existing tests. Execute these in parallel.
    2) For debugging: Read error messages completely. Check recent changes with git log/blame. Find working examples of similar code. Compare broken vs working to identify the delta.
    3) Form a hypothesis and document it BEFORE looking deeper.
    4) Cross-reference hypothesis against actual code. Cite file:line for every claim.
    5) Synthesize into: Summary, Diagnosis, Root Cause, Recommendations (prioritized), Trade-offs, References.
    6) For non-obvious bugs, follow the 4-phase protocol: Root Cause Analysis, Pattern Analysis, Hypothesis Testing, Recommendation.
    7) Apply the 3-failure circuit breaker: if 3+ fix attempts fail, question the architecture rather than trying variations.
    8) For ralplan consensus reviews: include (a) strongest antithesis against favored direction, (b) at least one meaningful tradeoff tension, (c) synthesis if feasible, and (d) in deliberate mode, explicit principle-violation flags.
  </Investigation_Protocol>

  <Tool_Usage>
    - Use Glob/Grep/Read for codebase exploration (execute in parallel for speed).
    - Use lsp_diagnostics to check specific files for type errors.
    - Use lsp_diagnostics_directory to verify project-wide health.
    - Use ast_grep_search to find structural patterns (e.g., "all async functions without try/catch").
    - Use Bash with git blame/log for change history analysis.
    <External_Consultation>
      When a second opinion would improve quality, spawn a Claude Task agent:
      - Use `Task(subagent_type="oh-my-claudecode:critic", ...)` for plan/design challenge
      - Use `/team` to spin up a CLI worker for large-context architectural analysis
      Skip silently if delegation is unavailable. Never block on external consultation.
    </External_Consultation>
  </Tool_Usage>

  <Execution_Policy>
    - Default effort: high (thorough analysis with evidence).
    - Stop when diagnosis is complete and all recommendations have file:line references.
    - For obvious bugs (typo, missing import): skip to recommendation with verification.
  </Execution_Policy>

  <Output_Format>
    ## Summary
    [2-3 sentences: what you found and main recommendation]

    ## Analysis
    [Detailed findings with file:line references]

    ## Root Cause
    [The fundamental issue, not symptoms]

    ## Recommendations
    1. [Highest priority] - [effort level] - [impact]
    2. [Next priority] - [effort level] - [impact]

    ## Trade-offs
    | Option | Pros | Cons |
    |--------|------|------|
    | A | ... | ... |
    | B | ... | ... |

    ## Consensus Addendum (ralplan reviews only)
    - **Antithesis (steelman):** [Strongest counterargument against favored direction]
    - **Tradeoff tension:** [Meaningful tension that cannot be ignored]
    - **Synthesis (if viable):** [How to preserve strengths from competing options]
    - **Principle violations (deliberate mode):** [Any principle broken, with severity]

    ## References
    - `path/to/file.ts:42` - [what it shows]
    - `path/to/other.ts:108` - [what it shows]
  </Output_Format>

  <Failure_Modes_To_Avoid>
    - Armchair analysis: Giving advice without reading the code first. Always open files and cite line numbers.
    - Symptom chasing: Recommending null checks everywhere when the real question is "why is it undefined?" Always find root cause.
    - Vague recommendations: "Consider refactoring this module." Instead: "Extract the validation logic from `auth.ts:42-80` into a `validateToken()` function to separate concerns."
    - Scope creep: Reviewing areas not asked about. Answer the specific question.
    - Missing trade-offs: Recommending approach A without noting what it sacrifices. Always acknowledge costs.
  </Failure_Modes_To_Avoid>

  <Examples>
    <Good>"The race condition originates at `server.ts:142` where `connections` is modified without a mutex. The `handleConnection()` at line 145 reads the array while `cleanup()` at line 203 can mutate it concurrently. Fix: wrap both in a lock. Trade-off: slight latency increase on connection handling."</Good>
    <Bad>"There might be a concurrency issue somewhere in the server code. Consider adding locks to shared state." This lacks specificity, evidence, and trade-off analysis.</Bad>
  </Examples>

  <Final_Checklist>
    - Did I read the actual code before forming conclusions?
    - Does every finding cite a specific file:line?
    - Is the root cause identified (not just symptoms)?
    - Are recommendations concrete and implementable?
    - Did I acknowledge trade-offs?
    - If this was a ralplan review, did I provide antithesis + tradeoff tension (+ synthesis when possible)?
    - In deliberate mode reviews, did I flag principle violations explicitly?
  </Final_Checklist>
</Agent_Prompt>

You are working in the WordLens repo (Next.js 14 App Router, TypeScript strict, Tailwind, dark slate theme). Read these files before answering: app/words/page.tsx, app/viewer/page.tsx, lib/types.ts.

TASK: Produce the implementation for a client-side JSON export feature. No server/API changes.

Requirements:
1. New file lib/exportJson.ts with two exports:
   - buildExportPayload(kind: "vocabulary" | "session", data: unknown): object — returns { app: "wordlens", kind, exportedAt: ISO string, count, items } where items is the data array. Pure and unit-testable (no DOM).
   - downloadJson(filename: string, payload: object): void — creates a Blob, object URL, temporary <a> click, then revokes the URL. Guard for SSR (no-op if window undefined).
2. app/words/page.tsx: add an "Export JSON" button in the header area (visible when words.length > 0), downloading buildExportPayload("vocabulary", words) as wordlens-vocabulary-<YYYY-MM-DD>.json.
3. app/viewer/page.tsx: add a small "Export" text link/button near the 'My vocabulary →' link (visible when words.size > 0), downloading buildExportPayload("session", Array.from(words.values())) as wordlens-session-<YYYY-MM-DD>.json. Session items are WordCard objects (word, meaning, example, phonetic, pageId, count, addedAt, source).
4. Match existing styling idioms (rounded-xl, slate palette, small text buttons) and English UI copy.
5. Also produce a Vitest unit test __tests__/exportJson.test.ts for buildExportPayload only (no DOM): shape, count, exportedAt is valid ISO date, items passthrough.

My position (validate or dissent): client-side export is sufficient here — no need for an API route since both pages already hold the data in state; date-stamped filenames beat timestamps for this use case.

OUTPUT FORMAT: For each file, a heading with the exact path, then ONE complete code block: full file content for NEW files (lib/exportJson.ts, __tests__/exportJson.test.ts), and for the two edited pages give minimal unified-diff-style before/after snippets (only the changed regions, with enough surrounding context to locate them). No prose beyond one short rationale line per file. Do not flag style nits or unrelated issues.

## Raw output

```text
### lib/exportJson.ts
Pure payload builder plus browser-only download helper.

```ts
export function buildExportPayload(
  kind: "vocabulary" | "session",
  data: unknown,
): object {
  const items = Array.isArray(data) ? data : [];

  return {
    app: "wordlens",
    kind,
    exportedAt: new Date().toISOString(),
    count: items.length,
    items,
  };
}

export function downloadJson(filename: string, payload: object): void {
  if (typeof window === "undefined") return;

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(url);
}
```

### __tests__/exportJson.test.ts
Covers the pure export payload shape without DOM dependencies.

```ts
import { describe, expect, it } from "vitest";
import { buildExportPayload } from "@/lib/exportJson";

describe("buildExportPayload", () => {
  it("builds a vocabulary export payload with count and array passthrough", () => {
    const items = ["serendipity", "candid"];
    const payload = buildExportPayload("vocabulary", items) as {
      app: string;
      kind: string;
      exportedAt: string;
      count: number;
      items: string[];
    };

    expect(payload.app).toBe("wordlens");
    expect(payload.kind).toBe("vocabulary");
    expect(payload.count).toBe(2);
    expect(payload.items).toBe(items);
  });

  it("sets exportedAt to a valid ISO date string", () => {
    const payload = buildExportPayload("session", []) as {
      exportedAt: string;
    };

    expect(Number.isNaN(Date.parse(payload.exportedAt))).toBe(false);
    expect(new Date(payload.exportedAt).toISOString()).toBe(
      payload.exportedAt,
    );
  });
});
```

### app/words/page.tsx
Client-side export is sufficient because this page already has the vocabulary array in state.

```diff
--- a/app/words/page.tsx
+++ b/app/words/page.tsx
@@
 "use client";
 
 import { useCallback, useEffect, useState } from "react";
+import { buildExportPayload, downloadJson } from "@/lib/exportJson";
@@
   const unknow = useCallback(async (word: string) => {
     setWords((prev) => prev.filter((w) => w !== word));
     await fetch("/api/known-words", {
       method: "DELETE",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ word }),
     });
   }, []);
+
+  const exportWords = useCallback(() => {
+    const date = new Date().toISOString().slice(0, 10);
+    downloadJson(
+      `wordlens-vocabulary-${date}.json`,
+      buildExportPayload("vocabulary", words),
+    );
+  }, [words]);
 
   return (
     <main className="mx-auto min-h-screen max-w-2xl p-6">
       <header className="mb-6 flex items-center justify-between">
         <h1 className="text-2xl font-bold">📚 My vocabulary</h1>
-        <a href="/viewer" className="text-sm text-slate-400 underline">
-          ← Back to viewer
-        </a>
+        <div className="flex items-center gap-3">
+          {words.length > 0 && (
+            <button
+              type="button"
+              onClick={exportWords}
+              className="rounded-xl bg-slate-800 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-slate-700 hover:text-white"
+            >
+              Export JSON
+            </button>
+          )}
+          <a href="/viewer" className="text-sm text-slate-400 underline">
+            ← Back to viewer
+          </a>
+        </div>
       </header>
```

### app/viewer/page.tsx
Date-stamped session exports fit the review/share use case better than timestamped filenames here.

```diff
--- a/app/viewer/page.tsx
+++ b/app/viewer/page.tsx
@@
 import QRCode from "qrcode";
 import { useCallback, useEffect, useMemo, useRef, useState } from "react";
+import { buildExportPayload, downloadJson } from "@/lib/exportJson";
 import { speakWord } from "@/lib/speak";
 import { useWakeLock } from "@/lib/useWakeLock";
 import type { SnapshotEvent, WordCard, WordsEvent } from "@/lib/types";
@@
   const markKnown = useCallback(
     async (word: string) => {
       setWords((prev) => {
         const next = new Map(prev);
         next.delete(word);
@@
     [code],
   );
+
+  const exportSession = useCallback(() => {
+    const date = new Date().toISOString().slice(0, 10);
+    downloadJson(
+      `wordlens-session-${date}.json`,
+      buildExportPayload("session", Array.from(words.values())),
+    );
+  }, [words]);
 
   const { current, older } = useMemo(() => {
@@
-        <a href="/words" className="text-sm text-slate-400 underline">
-          My vocabulary →
-        </a>
+        <div className="flex items-center gap-3">
+          {words.size > 0 && (
+            <button
+              type="button"
+              onClick={exportSession}
+              className="text-sm text-slate-400 underline transition hover:text-slate-200"
+            >
+              Export
+            </button>
+          )}
+          <a href="/words" className="text-sm text-slate-400 underline">
+            My vocabulary →
+          </a>
+        </div>
       </header>
```


OpenAI Codex v0.142.5
--------
workdir: /Users/jyong/projects/wordlens
model: gpt-5.5
provider: openai
approval: never
sandbox: danger-full-access
reasoning effort: high
reasoning summaries: none
session id: 019f387d-1d51-7491-83de-a4e3d1ea34b4
--------
user
---
name: architect
description: Strategic Architecture & Debugging Advisor (Opus, READ-ONLY)
model: opus
level: 3
disallowedTools: Write, Edit
---

<Agent_Prompt>
  <Role>
    You are Architect. Your mission is to analyze code, diagnose bugs, and provide actionable architectural guidance.
    You are responsible for code analysis, implementation verification, debugging root causes, and architectural recommendations.
    You are not responsible for gathering requirements (analyst), creating plans (planner), reviewing plans (critic), or implementing changes (executor).
  </Role>

  <Why_This_Matters>
    Architectural advice without reading the code is guesswork. These rules exist because vague recommendations waste implementer time, and diagnoses without file:line evidence are unreliable. Every claim must be traceable to specific code.
  </Why_This_Matters>

  <Success_Criteria>
    - Every finding cites a specific file:line reference
    - Root cause is identified (not just symptoms)
    - Recommendations are concrete and implementable (not "consider refactoring")
    - Trade-offs are acknowledged for each recommendation
    - Analysis addresses the actual question, not adjacent concerns
    - In ralplan consensus reviews, strongest steelman antithesis and at least one real tradeoff tension are explicit
  </Success_Criteria>

  <Constraints>
    - You are READ-ONLY. Write and Edit tools are blocked. You never implement changes.
    - Never judge code you have not opened and read.
    - Never provide generic advice that could apply to any codebase.
    - Acknowledge uncertainty when present rather than speculating.
    - Hand off to: analyst (requirements gaps), planner (plan creation), critic (plan review), qa-tester (runtime verification).
    - In ralplan consensus reviews, never rubber-stamp the favored option without a steelman counterargument.
  </Constraints>

  <Investigation_Protocol>
    1) Gather context first (MANDATORY): Use Glob to map project structure, Grep/Read to find relevant implementations, check dependencies in manifests, find existing tests. Execute these in parallel.
    2) For debugging: Read error messages completely. Check recent changes with git log/blame. Find working examples of similar code. Compare broken vs working to identify the delta.
    3) Form a hypothesis and document it BEFORE looking deeper.
    4) Cross-reference hypothesis against actual code. Cite file:line for every claim.
    5) Synthesize into: Summary, Diagnosis, Root Cause, Recommendations (prioritized), Trade-offs, References.
    6) For non-obvious bugs, follow the 4-phase protocol: Root Cause Analysis, Pattern Analysis, Hypothesis Testing, Recommendation.
    7) Apply the 3-failure circuit breaker: if 3+ fix attempts fail, question the architecture rather than trying variations.
    8) For ralplan consensus reviews: include (a) strongest antithesis against favored direction, (b) at least one meaningful tradeoff tension, (c) synthesis if feasible, and (d) in deliberate mode, explicit principle-violation flags.
  </Investigation_Protocol>

  <Tool_Usage>
    - Use Glob/Grep/Read for codebase exploration (execute in parallel for speed).
    - Use lsp_diagnostics to check specific files for type errors.
    - Use lsp_diagnostics_directory to verify project-wide health.
    - Use ast_grep_search to find structural patterns (e.g., "all async functions without try/catch").
    - Use Bash with git blame/log for change history analysis.
    <External_Consultation>
      When a second opinion would improve quality, spawn a Claude Task agent:
      - Use `Task(subagent_type="oh-my-claudecode:critic", ...)` for plan/design challenge
      - Use `/team` to spin up a CLI worker for large-context architectural analysis
      Skip silently if delegation is unavailable. Never block on external consultation.
    </External_Consultation>
  </Tool_Usage>

  <Execution_Policy>
    - Default effort: high (thorough analysis with evidence).
    - Stop when diagnosis is complete and all recommendations have file:line references.
    - For obvious bugs (typo, missing import): skip to recommendation with verification.
  </Execution_Policy>

  <Output_Format>
    ## Summary
    [2-3 sentences: what you found and main recommendation]

    ## Analysis
    [Detailed findings with file:line references]

    ## Root Cause
    [The fundamental issue, not symptoms]

    ## Recommendations
    1. [Highest priority] - [effort level] - [impact]
    2. [Next priority] - [effort level] - [impact]

    ## Trade-offs
    | Option | Pros | Cons |
    |--------|------|------|
    | A | ... | ... |
    | B | ... | ... |

    ## Consensus Addendum (ralplan reviews only)
    - **Antithesis (steelman):** [Strongest counterargument against favored direction]
    - **Tradeoff tension:** [Meaningful tension that cannot be ignored]
    - **Synthesis (if viable):** [How to preserve strengths from competing options]
    - **Principle violations (deliberate mode):** [Any principle broken, with severity]

    ## References
    - `path/to/file.ts:42` - [what it shows]
    - `path/to/other.ts:108` - [what it shows]
  </Output_Format>

  <Failure_Modes_To_Avoid>
    - Armchair analysis: Giving advice without reading the code first. Always open files and cite line numbers.
    - Symptom chasing: Recommending null checks everywhere when the real question is "why is it undefined?" Always find root cause.
    - Vague recommendations: "Consider refactoring this module." Instead: "Extract the validation logic from `auth.ts:42-80` into a `validateToken()` function to separate concerns."
    - Scope creep: Reviewing areas not asked about. Answer the specific question.
    - Missing trade-offs: Recommending approach A without noting what it sacrifices. Always acknowledge costs.
  </Failure_Modes_To_Avoid>

  <Examples>
    <Good>"The race condition originates at `server.ts:142` where `connections` is modified without a mutex. The `handleConnection()` at line 145 reads the array while `cleanup()` at line 203 can mutate it concurrently. Fix: wrap both in a lock. Trade-off: slight latency increase on connection handling."</Good>
    <Bad>"There might be a concurrency issue somewhere in the server code. Consider adding locks to shared state." This lacks specificity, evidence, and trade-off analysis.</Bad>
  </Examples>

  <Final_Checklist>
    - Did I read the actual code before forming conclusions?
    - Does every finding cite a specific file:line?
    - Is the root cause identified (not just symptoms)?
    - Are recommendations concrete and implementable?
    - Did I acknowledge trade-offs?
    - If this was a ralplan review, did I provide antithesis + tradeoff tension (+ synthesis when possible)?
    - In deliberate mode reviews, did I flag principle violations explicitly?
  </Final_Checklist>
</Agent_Prompt>

You are working in the WordLens repo (Next.js 14 App Router, TypeScript strict, Tailwind, dark slate theme). Read these files before answering: app/words/page.tsx, app/viewer/page.tsx, lib/types.ts.

TASK: Produce the implementation for a client-side JSON export feature. No server/API changes.

Requirements:
1. New file lib/exportJson.ts with two exports:
   - buildExportPayload(kind: "vocabulary" | "session", data: unknown): object — returns { app: "wordlens", kind, exportedAt: ISO string, count, items } where items is the data array. Pure and unit-testable (no DOM).
   - downloadJson(filename: string, payload: object): void — creates a Blob, object URL, temporary <a> click, then revokes the URL. Guard for SSR (no-op if window undefined).
2. app/words/page.tsx: add an "Export JSON" button in the header area (visible when words.length > 0), downloading buildExportPayload("vocabulary", words) as wordlens-vocabulary-<YYYY-MM-DD>.json.
3. app/viewer/page.tsx: add a small "Export" text link/button near the 'My vocabulary →' link (visible when words.size > 0), downloading buildExportPayload("session", Array.from(words.values())) as wordlens-session-<YYYY-MM-DD>.json. Session items are WordCard objects (word, meaning, example, phonetic, pageId, count, addedAt, source).
4. Match existing styling idioms (rounded-xl, slate palette, small text buttons) and English UI copy.
5. Also produce a Vitest unit test __tests__/exportJson.test.ts for buildExportPayload only (no DOM): shape, count, exportedAt is valid ISO date, items passthrough.

My position (validate or dissent): client-side export is sufficient here — no need for an API route since both pages already hold the data in state; date-stamped filenames beat timestamps for this use case.

OUTPUT FORMAT: For each file, a heading with the exact path, then ONE complete code block: full file content for NEW files (lib/exportJson.ts, __tests__/exportJson.test.ts), and for the two edited pages give minimal unified-diff-style before/after snippets (only the changed regions, with enough surrounding context to locate them). No prose beyond one short rationale line per file. Do not flag style nits or unrelated issues.
2026-07-06T17:32:32.694472Z ERROR rmcp::transport::worker: worker quit with fatal: Transport channel closed, when AuthRequired(AuthRequiredError { www_authenticate_header: "Bearer realm=\"OAuth\", resource_metadata=\"https://mcp.notion.com/.well-known/oauth-protected-resource/mcp\", error=\"invalid_token\", error_description=\"Missing or invalid access token\"" })
codex
I’ll inspect the repo guidance and the three required files first, then I’ll return only the implementation snippets in the format you asked for.
exec
/bin/zsh -lc "if [ -f AGENTS.md ]; then sed -n '1,220p' AGENTS.md; fi" in /Users/jyong/projects/wordlens
 succeeded in 0ms:
exec
/bin/zsh -lc "sed -n '1,320p' app/viewer/page.tsx" in /Users/jyong/projects/wordlens
 succeeded in 0ms:
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

exec
/bin/zsh -lc "sed -n '1,220p' lib/types.ts" in /Users/jyong/projects/wordlens
exec
/bin/zsh -lc "sed -n '1,260p' app/words/page.tsx" in /Users/jyong/projects/wordlens
 succeeded in 0ms:
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

 succeeded in 0ms:
export interface Definition {
  word: string;
  phonetic?: string;
  meaning: string;
  example?: string;
  source: "dictionary" | "llm" | "mock" | "fallback";
}

export interface WordCard extends Definition {
  pageId: number;
  count: number;
  addedAt: number;
}

export interface FramePayload {
  room: string;
  image?: string;
  pageChanged?: boolean;
  /** Test/demo hook: only honored in mock mode. */
  mockWords?: string[];
}

export interface SnapshotEvent {
  pageId: number;
  words: WordCard[];
}

export interface WordsEvent {
  pageId: number;
  added: WordCard[];
  updated: WordCard[];
}

exec
/bin/zsh -lc "pwd && rg --files -g 'AGENTS.md' -g 'package.json' -g 'vitest.config.*' -g 'app/words/page.tsx' -g 'app/viewer/page.tsx' -g 'lib/types.ts' -g '__tests__/**'" in /Users/jyong/projects/wordlens
 succeeded in 406ms:
vitest.config.ts
lib/types.ts
package.json
__tests__/rooms.test.ts
__tests__/dictionary.test.ts
__tests__/roomStore.test.ts
__tests__/normalize.test.ts
__tests__/prefilter.test.ts
__tests__/knownWords.test.ts
app/viewer/page.tsx
app/words/page.tsx

codex
I’ve confirmed the target pages are simple client components, and the viewer already keeps session cards in a `Map<string, WordCard>`. I’m checking the test setup now so the Vitest file matches the existing project conventions.
exec
/bin/zsh -lc "sed -n '320,520p' app/viewer/page.tsx" in /Users/jyong/projects/wordlens
 succeeded in 0ms:
        </div>
      </div>
    </li>
  );
}

exec
/bin/zsh -lc "sed -n '1,220p' package.json" in /Users/jyong/projects/wordlens
 succeeded in 0ms:
{
  "name": "wordlens",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "next": "14.2.32",
    "qrcode": "^1.5.4",
    "react": "18.3.1",
    "react-dom": "18.3.1"
  },
  "devDependencies": {
    "@playwright/test": "^1.49.1",
    "@types/node": "^20.17.10",
    "@types/qrcode": "^1.5.5",
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "autoprefixer": "^10.4.20",
    "eslint": "^8.57.1",
    "eslint-config-next": "14.2.32",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}

exec
/bin/zsh -lc "sed -n '1,200p' vitest.config.ts" in /Users/jyong/projects/wordlens
exec
/bin/zsh -lc "sed -n '1,180p' __tests__/normalize.test.ts && sed -n '1,180p' __tests__/knownWords.test.ts" in /Users/jyong/projects/wordlens
 succeeded in 0ms:
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    include: ["__tests__/**/*.test.ts"],
    environment: "node",
  },
});

 succeeded in 0ms:
import { describe, expect, it } from "vitest";
import { normalizeWords } from "@/lib/normalize";

describe("normalizeWords", () => {
  it("lowercases and strips punctuation", () => {
    expect(normalizeWords(["Serendipity,", "  Candid!"])).toEqual([
      "serendipity",
      "candid",
    ]);
  });

  it("dedupes case-insensitively", () => {
    expect(normalizeWords(["Word", "word", "WORD"])).toEqual(["word"]);
  });

  it("drops single letters and empty strings", () => {
    expect(normalizeWords(["a", "", "I", "ok"])).toEqual(["ok"]);
  });

  it("keeps apostrophes and hyphens", () => {
    expect(normalizeWords(["don't", "well-known"])).toEqual([
      "don't",
      "well-known",
    ]);
  });
});
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addKnownWord,
  filterUnknown,
  getKnownWords,
  removeKnownWord,
} from "@/lib/knownWords";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wordlens-test-"));
  process.env.WORDLENS_DATA_DIR = tmpDir;
});

afterEach(() => {
  delete process.env.WORDLENS_DATA_DIR;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("known-words store", () => {
  it("starts empty when no file exists", () => {
    expect(getKnownWords().size).toBe(0);
  });

  it("persists added words across reads (survives refresh)", () => {
    addKnownWord("Serendipity");
    addKnownWord("ephemeral ");
    const words = getKnownWords();
    expect(words.has("serendipity")).toBe(true);
    expect(words.has("ephemeral")).toBe(true);
    expect(words.size).toBe(2);
  });

  it("removes words", () => {
    addKnownWord("candid");
    removeKnownWord("CANDID");
    expect(getKnownWords().has("candid")).toBe(false);
  });

  it("recovers from a corrupt file", () => {
    fs.writeFileSync(path.join(tmpDir, "known-words.json"), "not json{");
    expect(getKnownWords().size).toBe(0);
  });
});

describe("filterUnknown", () => {
  it("filters out known words case-insensitively", () => {
    const known = new Set(["serendipity", "candid"]);
    expect(
      filterUnknown(["Serendipity", "eloquent", "CANDID", "resilience"], known),
    ).toEqual(["eloquent", "resilience"]);
  });

  it("returns everything when nothing is known", () => {
    expect(filterUnknown(["a", "b"], new Set())).toEqual(["a", "b"]);
  });
});

codex
### lib/exportJson.ts
Pure payload builder plus browser-only download helper.

```ts
export function buildExportPayload(
  kind: "vocabulary" | "session",
  data: unknown,
): object {
  const items = Array.isArray(data) ? data : [];

  return {
    app: "wordlens",
    kind,
    exportedAt: new Date().toISOString(),
    count: items.length,
    items,
  };
}

export function downloadJson(filename: string, payload: object): void {
  if (typeof window === "undefined") return;

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(url);
}
```

### __tests__/exportJson.test.ts
Covers the pure export payload shape without DOM dependencies.

```ts
import { describe, expect, it } from "vitest";
import { buildExportPayload } from "@/lib/exportJson";

describe("buildExportPayload", () => {
  it("builds a vocabulary export payload with count and array passthrough", () => {
    const items = ["serendipity", "candid"];
    const payload = buildExportPayload("vocabulary", items) as {
      app: string;
      kind: string;
      exportedAt: string;
      count: number;
      items: string[];
    };

    expect(payload.app).toBe("wordlens");
    expect(payload.kind).toBe("vocabulary");
    expect(payload.count).toBe(2);
    expect(payload.items).toBe(items);
  });

  it("sets exportedAt to a valid ISO date string", () => {
    const payload = buildExportPayload("session", []) as {
      exportedAt: string;
    };

    expect(Number.isNaN(Date.parse(payload.exportedAt))).toBe(false);
    expect(new Date(payload.exportedAt).toISOString()).toBe(
      payload.exportedAt,
    );
  });
});
```

### app/words/page.tsx
Client-side export is sufficient because this page already has the vocabulary array in state.

```diff
--- a/app/words/page.tsx
+++ b/app/words/page.tsx
@@
 "use client";
 
 import { useCallback, useEffect, useState } from "react";
+import { buildExportPayload, downloadJson } from "@/lib/exportJson";
@@
   const unknow = useCallback(async (word: string) => {
     setWords((prev) => prev.filter((w) => w !== word));
     await fetch("/api/known-words", {
       method: "DELETE",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ word }),
     });
   }, []);
+
+  const exportWords = useCallback(() => {
+    const date = new Date().toISOString().slice(0, 10);
+    downloadJson(
+      `wordlens-vocabulary-${date}.json`,
+      buildExportPayload("vocabulary", words),
+    );
+  }, [words]);
 
   return (
     <main className="mx-auto min-h-screen max-w-2xl p-6">
       <header className="mb-6 flex items-center justify-between">
         <h1 className="text-2xl font-bold">📚 My vocabulary</h1>
-        <a href="/viewer" className="text-sm text-slate-400 underline">
-          ← Back to viewer
-        </a>
+        <div className="flex items-center gap-3">
+          {words.length > 0 && (
+            <button
+              type="button"
+              onClick={exportWords}
+              className="rounded-xl bg-slate-800 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-slate-700 hover:text-white"
+            >
+              Export JSON
+            </button>
+          )}
+          <a href="/viewer" className="text-sm text-slate-400 underline">
+            ← Back to viewer
+          </a>
+        </div>
       </header>
```

### app/viewer/page.tsx
Date-stamped session exports fit the review/share use case better than timestamped filenames here.

```diff
--- a/app/viewer/page.tsx
+++ b/app/viewer/page.tsx
@@
 import QRCode from "qrcode";
 import { useCallback, useEffect, useMemo, useRef, useState } from "react";
+import { buildExportPayload, downloadJson } from "@/lib/exportJson";
 import { speakWord } from "@/lib/speak";
 import { useWakeLock } from "@/lib/useWakeLock";
 import type { SnapshotEvent, WordCard, WordsEvent } from "@/lib/types";
@@
   const markKnown = useCallback(
     async (word: string) => {
       setWords((prev) => {
         const next = new Map(prev);
         next.delete(word);
@@
     [code],
   );
+
+  const exportSession = useCallback(() => {
+    const date = new Date().toISOString().slice(0, 10);
+    downloadJson(
+      `wordlens-session-${date}.json`,
+      buildExportPayload("session", Array.from(words.values())),
+    );
+  }, [words]);
 
   const { current, older } = useMemo(() => {
@@
-        <a href="/words" className="text-sm text-slate-400 underline">
-          My vocabulary →
-        </a>
+        <div className="flex items-center gap-3">
+          {words.size > 0 && (
+            <button
+              type="button"
+              onClick={exportSession}
+              className="text-sm text-slate-400 underline transition hover:text-slate-200"
+            >
+              Export
+            </button>
+          )}
+          <a href="/words" className="text-sm text-slate-400 underline">
+            My vocabulary →
+          </a>
+        </div>
       </header>
```
tokens used
22,225

```

## Concise summary

Provider completed successfully. Review the raw output for details.

## Action items

- Review the response and extract decisions you want to apply.
- Capture follow-up implementation tasks if needed.
