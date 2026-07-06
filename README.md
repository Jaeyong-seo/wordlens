# WordLens 🔍📖

**Underline an unknown word with a red pen while reading a physical book — its Korean definition appears on your tablet in real time.**

책을 읽다가 모르는 단어에 **빨간 펜으로 밑줄**만 치세요.
폰 카메라가 이를 감지하고, 옆에 거치한 태블릿에 **한국어 뜻이 실시간으로** 나타납니다.

```
[Phone /camera] --frame every 2s--> red-underline detected --POST--> [Server /api/frame]
                                                                       │ vision extract
                                                                       │ dictionary lookup
                                                                       │ known-word filter
[Tablet /viewer] <-------------------- SSE realtime push -------------┘
```

## How it works

1. **Pair two devices** — the tablet opens `/viewer` and shows a 6-char room code + QR; the phone opens `/camera` and joins.
2. **Watch the book** — the phone captures a frame every 2 seconds. A canvas-based HSV red-pixel prefilter runs entirely on-device; a frame is only uploaded when *new* red ink appears, so vision-API cost stays near zero.
3. **Extract & define** — the server sends the frame to a vision LLM (via OpenRouter) that returns only the red-underlined words, then resolves each word through a lookup chain: file cache → [dictionaryapi.dev](https://dictionaryapi.dev) → LLM (Korean meaning + example) → fallback stub.
4. **Show instantly** — word cards stream to the tablet over Server-Sent Events. Current page pinned on top; a >60% frame change is treated as a page turn.
5. **Learn** — tap **알아요** ("I know this") and the word is saved to your vocabulary and never shown again. Manage it at `/words`.

**No database, no Docker** — rooms live in server memory; the vocabulary and dictionary cache are JSON files under `.data/`. Runs with a single `npm run dev`.

## Quick start

```bash
npm install
cp .env.example .env.local   # optional — works without any key (mock mode)
npm run dev                  # http://localhost:3000
```

Without `OPENROUTER_API_KEY` the app runs in **MOCK MODE**: the full two-device UX works end-to-end with a canned word set, so you can try everything before wiring a key.

### Two-device demo

1. **Tablet**: open `http://<your-pc-ip>:3000/viewer` → room code + QR appears
2. **Phone**: scan the QR (or open `/camera` and type the code) → allow camera
3. Mount the phone above the book — bright light, whole page in frame
4. Underline a word in red → the Korean meaning card appears within ~2–5s
5. Tap **알아요** on words you know — they never come back

> iOS Safari may block the camera on plain HTTP. Use
> `npx next dev --experimental-https`, or demo with two desktop browser
> windows first (the camera page has a manual "지금 프레임 전송" button).

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | No | Enables real vision/LLM calls. Absent → mock mode |
| `WORDLENS_MOCK` | No | `1` forces mock mode even with a key (used by tests) |
| `WORDLENS_VISION_MODEL` | No | Default `openai/gpt-4o-mini` (OpenRouter format) |
| `WORDLENS_TEXT_MODEL` | No | Default `openai/gpt-4o-mini` |
| `WORDLENS_DATA_DIR` | No | Default `.data/` — vocabulary + dictionary cache location |

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` / `build` / `start` | Dev server / production build / serve |
| `npm run typecheck` / `lint` | TypeScript strict check / ESLint |
| `npm test` | Vitest unit tests (38) — prefilter math, SSE rooms, dictionary chain, vocabulary store |
| `npm run test:e2e` | Playwright E2E in mock mode with programmatically generated red-underline PNG fixtures |

## Tech notes

- **Stack**: Next.js 14 (App Router) · TypeScript strict · Tailwind CSS · SSE (no WebSocket infra)
- **Cost gate**: client-side red-pixel diff means the vision model is called only when a new underline appears — a reading session costs a handful of calls per page
- **Resilience**: EventSource auto-reconnects; if the server restarts and the room is gone, the viewer detects it and mints a fresh room; vision failures degrade to mock mode instead of breaking the session
- **Model names** live only in [`lib/ai.ts`](lib/ai.ts) constants, overridable via env

## Known limitations

- Rooms are in-memory: a dev-server restart clears active sessions (the vocabulary file survives)
- Recognition quality depends heavily on lighting and camera angle — bright light and a straight-down view work best
- Single-user, single-instance by design (SSE rooms are not shared across processes)

## License

MIT
