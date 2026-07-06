# WordLens 🔍📖

**Underline an unknown word with a red pen while reading a physical book — its definition appears on your tablet in real time.**

```
[Phone /camera] --frame every 2s--> red-underline detected --POST--> [Server /api/frame]
                                                                       │ vision extract
                                                                       │ dictionary lookup
                                                                       │ known-word filter
[Tablet /viewer] <-------------------- SSE realtime push -------------┘
```

## How it works

1. **Pair two devices** — the tablet opens `/viewer` and shows a 6-char room code + QR; the phone opens `/camera` and joins.
2. **Watch the book** — after you tap **Enable camera**, the phone captures a frame every 2 seconds. A canvas-based HSV red-pixel prefilter runs entirely on-device; a frame is only uploaded when *new* red ink appears, so vision-API cost stays near zero.
3. **Extract & define** — the server sends the frame to a vision LLM (via OpenRouter) that returns only the red-underlined words, then resolves each word through a lookup chain: file cache → [dictionaryapi.dev](https://dictionaryapi.dev) → LLM (Korean meaning + example sentence) → fallback stub.
4. **Show instantly** — word cards stream to the tablet over Server-Sent Events. The current page is pinned on top; a >60% frame change is treated as a page turn.
5. **Listen & learn** — tap the 🔊 icon to hear the pronunciation (Web Speech API), or the ✓ icon when you know the word — it goes to your vocabulary and never shows again. Manage it at `/words`.

**No database, no Docker** — rooms live in server memory; the vocabulary and dictionary cache are JSON files under `.data/`. Runs with a single `npm run dev`.

## Quick start

```bash
npm install
cp .env.example .env.local   # optional — works without any key (mock mode)
npm run dev                  # http://localhost:3000
```

Without `OPENROUTER_API_KEY` the app runs in **MOCK MODE**: the full two-device UX works end-to-end with a canned word set, so you can try everything before wiring a key.

### Two-device demo

1. **Tablet**: open `/viewer` → room code + QR appears
2. **Phone**: scan the QR (or open `/camera` and type the code), then tap **Enable camera** and allow the permission
3. Mount the phone above the book — bright light, whole page in frame
4. Underline a word in red → the definition card appears within ~2–5s
5. Tap ✓ on words you know — they never come back

### Camera permission notes

- Browsers require **HTTPS** for camera access (localhost is exempt). For phone
  testing, use the deployed URL or `npx next dev --experimental-https`.
- iOS Safari only grants the camera from a **user tap** — that's why the camera
  starts from the Enable button, not automatically.
- If you denied the permission once, the app shows per-browser recovery steps
  and a retry button.

## Deployment (Vercel)

```bash
vercel --prod
vercel env add OPENROUTER_API_KEY production
```

Works out of the box on a single warm instance (Fluid Compute). Caveats of the
no-database design on serverless:

- Rooms live in instance memory. If the platform spins up a second instance or
  recycles it, the viewer detects the lost room and mints a fresh code — re-pair
  the phone when that happens.
- The vocabulary file lives on the instance's disk and resets on redeploy.
  For durable vocabulary across deploys, wire a small KV store (e.g. Upstash
  Redis via the Vercel Marketplace) behind `lib/knownWords.ts`.

For an always-on personal setup, any small Node host (`npm run build && npm start`)
avoids both caveats entirely.

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
| `npm test` | Vitest unit tests — prefilter math, SSE rooms, dictionary chain, vocabulary store |
| `npm run test:e2e` | Playwright E2E in mock mode with programmatically generated red-underline PNG fixtures |

## Tech notes

- **Stack**: Next.js 14 (App Router) · TypeScript strict · Tailwind CSS · SSE (no WebSocket infra)
- **Cost gate**: client-side red-pixel diff means the vision model is called only when a new underline appears — a reading session costs a handful of calls per page
- **Resilience**: EventSource auto-reconnects; if the server restarts and the room is gone, the viewer detects it and mints a fresh room; vision failures degrade to mock mode instead of breaking the session
- **Pronunciation** uses the browser's Web Speech API — no audio files, no network
- **Model names** live only in [`lib/ai.ts`](lib/ai.ts) constants, overridable via env

## Known limitations

- Rooms are in-memory: a server restart clears active sessions (the vocabulary file survives locally)
- Recognition quality depends heavily on lighting and camera angle — bright light and a straight-down view work best
- Single-user, single-instance by design (SSE rooms are not shared across processes)

## License

MIT
