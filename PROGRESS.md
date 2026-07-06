# PROGRESS

Build log for the overnight WordLens goal. (All times local, 2026-07-06)

## Works (verified)

- **Scaffold**: Next.js 14.2 App Router + TS strict + Tailwind, zero external infra
- **Unit tests**: 37/37 passing (`npm test`)
  - red-pixel prefilter math (HSV detector, send threshold, page-turn ratio)
  - room dedupe (same word+page ignored, count bump on new page)
  - SSE broadcast (subscribe/unsubscribe, throwing subscriber tolerated)
  - dictionary fallback chain (cache → dictionaryapi.dev → LLM → stub)
  - known-words store (persistence, corrupt-file recovery, filter)
- **Typecheck / lint / build**: all exit 0
- **P0 features implemented**:
  1. `/viewer` — room create/re-join (localStorage), 6-char code + QR, SSE live cards,
     current-page section on top, older pages below
  2. `/camera` — getUserMedia(environment), 2s capture loop, red-diff prefilter,
     luma-grid page-turn detection, status indicator (관찰 중/감지/전송/오류), manual send
  3. `/api/frame` — vision extract → normalize → known-word filter → dedupe →
     dictionary lookup → SSE push
  4. Word card — word/phonetic/Korean meaning/example/[알아요]; known words persist
     in `.data/known-words.json` and are filtered server-side forever
  5. Page turn — >60% luma-block change bumps pageId, viewer starts new section
  6. Wake Lock on both pages; EventSource auto-reconnect (+15s SSE heartbeat)
- **P1**: `/words` vocabulary page with remove; repeated-word count badge (×N) and
  count-first ordering; large-type viewer cards
- **E2E** (Playwright, mock mode, synthetic red-underline PNG fixture drawn on canvas):
  - all pages return 200
  - underline → card on viewer (<5s, Korean meaning) → 알아요 → reload → stays gone
  - page turn moves old words to the "이전 페이지" section

## Mocked / deferred

- **MOCK MODE** is the default without `OPENROUTER_API_KEY`. The key was copied from
  66days/.env.local, so real vision extraction is wired but **untested against a real
  book photo** — that's the morning acceptance step (lighting/angle tuning may be needed).
- dictionaryapi.dev integration is code-complete but skipped in mock mode (unit-tested
  via injected deps only).
- P2 (session JSON export) not built — time-boxed out.
- PWA: manifest only (no service worker/offline; not needed for the demo).

## Reviewer pass (separate code-reviewer agent)

Verdict: no CRITICAL. 1 HIGH + 4 MEDIUM found — **all 5 fixed and re-verified**:

- **HIGH** camera MediaStream leak when unmounting during a pending `getUserMedia`
  → tracks now stopped if the effect was torn down before the promise resolved
- **MEDIUM** viewer stuck on "재연결 중" forever if the room vanished (server restart)
  → on SSE error the viewer verifies the room and mints a fresh one when gone
- **MEDIUM** SSE subscriber + heartbeat leak when a connection died without `cancel()`
  → enqueue failure now triggers full teardown (unsubscribe, clearInterval, close)
- **MEDIUM** rooms never evicted (unbounded memory)
  → lazy sweep on create/get: subscriber-less rooms older than 12h are dropped (+ unit test)
- **MEDIUM** `/api/frame` accepted unbounded bodies
  → 4MB content-length/image cap (413), mockWords capped at 20

LOW findings (stale `status` closure in the capture interval, minor) deferred — noted, no
functional impact on the demo.

## Failures & fixes along the way

- `tsc` error in `useWakeLock` (custom Navigator interface clashed with built-in DOM
  types) → switched to native `WakeLockSentinel` types.
- First E2E run failed: Playwright 1.49 needed its own Chromium build
  (`npx playwright install chromium`) → installed, re-ran.

## Morning checklist (5 min)

1. `cd ~/projects/wordlens && npm run dev`
2. Second browser window → `/viewer` → room code visible
3. Phone (same Wi-Fi, `http://<PC-IP>:3000/camera`) or laptop webcam → join with code
4. Underline a word in red → card with Korean meaning appears in ~2-5s
5. Tap 알아요 → refresh viewer → the word does not come back (`/words` to manage)
6. If detection is weak: brighter light, page fills the frame, thicker red stroke.
   To force-demo without a camera: press "지금 프레임 전송 (수동)" on /camera.
