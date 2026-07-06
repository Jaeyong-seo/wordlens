# WordLens

책을 읽다가 모르는 단어에 **빨간 펜으로 밑줄**만 치세요.
폰 카메라가 이를 감지하고, 옆에 거치한 태블릿에 **한국어 뜻이 실시간으로** 나타납니다.

```
[폰 /camera] --2초마다 관찰--> 빨간 밑줄 감지 --POST--> [서버 /api/frame]
                                                          │ vision 추출 → 사전 조회 → 아는 단어 필터
[태블릿 /viewer] <------------- SSE 실시간 push ----------┘
```

## Setup

```bash
npm install
cp .env.example .env.local   # or create .env.local with the key below
npm run dev                  # http://localhost:3000
```

### Environment variables (`.env.local`)

| Variable | Required | Description |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | No | Vision/LLM 호출용. **없으면 자동으로 MOCK MODE** (고정 단어 세트로 전체 UX 시연 가능) |
| `WORDLENS_MOCK` | No | `1`이면 키가 있어도 강제 mock (테스트용) |
| `WORDLENS_VISION_MODEL` | No | 기본 `openai/gpt-4o-mini` (OpenRouter 형식) |
| `WORDLENS_TEXT_MODEL` | No | 기본 `openai/gpt-4o-mini` |
| `WORDLENS_DATA_DIR` | No | 기본 `.data/` — 아는 단어 목록·사전 캐시 저장 위치 |

## Two-device demo

1. **태블릿**: 브라우저에서 `http://<PC-IP>:3000/viewer` 열기 → 6자리 방 코드 + QR 표시
2. **폰**: QR을 스캔하거나 `/camera`에서 코드 입력 → 카메라 권한 허용
3. 폰을 책 위가 보이도록 거치 (조명 밝게, 페이지 전체가 프레임에)
4. 빨간 펜으로 모르는 단어에 밑줄 → 2초 내 감지 → 태블릿에 뜻 카드 표시
5. 아는 단어는 **[알아요]** 탭 → 단어장에 저장되어 다시 나타나지 않음 (`/words`에서 관리)

> 같은 Wi-Fi에서 폰/태블릿으로 접속하려면 `npm run dev` 후 PC의 로컬 IP를 사용하세요.
> iOS Safari는 HTTP 환경에서 카메라를 허용하지 않을 수 있습니다 — 그 경우
> `npx next dev --experimental-https` 또는 데스크톱 크롬 두 창으로 먼저 시연하세요.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` / `start` | 프로덕션 빌드/실행 |
| `npm run typecheck` / `lint` | TS strict 검사 / ESLint |
| `npm test` | Vitest 유닛 테스트 (37개) |
| `npm run test:e2e` | Playwright E2E (mock mode, 합성 빨간밑줄 픽스처) |

## Architecture

- **No DB, no Docker** — 방은 서버 메모리, 아는 단어·사전 캐시는 `.data/` JSON 파일
- **실시간**: 뷰어는 SSE(`/api/events`) 구독, EventSource가 자동 재연결
- **비용 게이트**: 클라이언트 canvas에서 빨간 픽셀 diff(HSV 필터)로 새 밑줄이
  생겼을 때만 프레임 전송 → vision 호출 최소화
- **페이지 전환**: 프레임 루마 그리드가 60% 이상 변하면 새 페이지 섹션 시작
- **MOCK MODE**: API 키 없거나 vision 실패 시 고정 단어 세트로 파이프라인 유지
- 모델명은 `lib/ai.ts`의 상수에서만 관리 (환경변수로 오버라이드)

## Known limitations

- 방 상태는 서버 메모리에 있어 **dev 서버 재시작 시 방이 사라짐** (단어장은 파일이라 유지)
- 인식 품질은 조명·거치 각도에 크게 좌우됨 — 밝은 조명 + 페이지 정면 뷰 권장
- 실기기 vision 정확도(굵기 얇은 밑줄, 형광펜 색 변형)는 실물 테스트로 튜닝 필요
- 단일 사용자/단일 서버 전제 (멀티 인스턴스 배포 시 SSE 룸 공유 안 됨)
