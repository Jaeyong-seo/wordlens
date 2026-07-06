"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  countRedPixels,
  downsampleLuma,
  isPageTurn,
  shouldSendFrame,
} from "@/lib/prefilter";
import { useWakeLock } from "@/lib/useWakeLock";

const CAPTURE_INTERVAL_MS = 2_000;
const CAPTURE_WIDTH = 960;

type Status = "idle" | "detected" | "sent" | "error";

const STATUS_LABEL: Record<Status, string> = {
  idle: "관찰 중",
  detected: "밑줄 감지!",
  sent: "전송 완료",
  error: "오류",
};

const STATUS_COLOR: Record<Status, string> = {
  idle: "bg-slate-700",
  detected: "bg-amber-600",
  sent: "bg-green-700",
  error: "bg-red-700",
};

export default function CameraPage() {
  useWakeLock();
  const [roomInput, setRoomInput] = useState("");
  const [room, setRoom] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [stats, setStats] = useState({ frames: 0, sent: 0, words: 0 });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevRedRef = useRef(0);
  const prevLumaRef = useRef<number[] | null>(null);
  const busyRef = useRef(false);

  // Pre-fill room code from ?room=CODE (QR scan path).
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("room");
    if (param) setRoomInput(param.toUpperCase());
  }, []);

  const join = useCallback(async (codeRaw: string) => {
    const code = codeRaw.trim().toUpperCase();
    if (code.length !== 6) {
      setJoinError("6자리 코드를 입력하세요");
      return;
    }
    const res = await fetch(`/api/room?code=${encodeURIComponent(code)}`);
    const json = (await res.json()) as { exists: boolean };
    if (!json.exists) {
      setJoinError("방을 찾을 수 없습니다. 뷰어 화면의 코드를 확인하세요.");
      return;
    }
    setJoinError(null);
    setRoom(code);
  }, []);

  // Camera + capture loop, active while joined.
  useEffect(() => {
    if (!room) return;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let disposed = false;

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 } },
          audio: false,
        });
        if (disposed || !videoRef.current) {
          // effect torn down while the permission prompt was pending:
          // stop the just-acquired tracks or the camera stays on forever
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraError(null);
      } catch {
        setCameraError(
          "카메라를 열 수 없습니다. 권한을 허용했는지 확인하세요.",
        );
        return;
      }
      timer = setInterval(() => void captureTick(room), CAPTURE_INTERVAL_MS);
    };

    void start();
    return () => {
      disposed = true;
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  const postFrame = useCallback(
    async (roomCode: string, image: string, pageChanged: boolean) => {
      setStatus("detected");
      try {
        const res = await fetch("/api/frame", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room: roomCode, image, pageChanged }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as { added: number; mock: boolean };
        setStats((s) => ({
          frames: s.frames,
          sent: s.sent + 1,
          words: s.words + json.added,
        }));
        setStatus("sent");
        setMessage(
          json.mock
            ? `모의 모드: 단어 ${json.added}개 추가`
            : `단어 ${json.added}개 추가`,
        );
      } catch {
        setStatus("error");
        setMessage("전송 실패 — 네트워크를 확인하세요");
      }
    },
    [],
  );

  const captureTick = useCallback(
    async (roomCode: string, force = false) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2 || busyRef.current) return;
      busyRef.current = true;
      try {
        const scale = CAPTURE_WIDTH / video.videoWidth;
        canvas.width = CAPTURE_WIDTH;
        canvas.height = Math.round(video.videoHeight * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const totalPixels = canvas.width * canvas.height;

        const redCount = countRedPixels(data);
        const luma = downsampleLuma(data, canvas.width, canvas.height);
        const pageChanged =
          prevLumaRef.current !== null &&
          isPageTurn(prevLumaRef.current, luma);
        const newRed = shouldSendFrame(prevRedRef.current, redCount, totalPixels);

        setStats((s) => ({ ...s, frames: s.frames + 1 }));
        if (newRed || pageChanged || force) {
          const image = canvas.toDataURL("image/jpeg", 0.7);
          await postFrame(roomCode, image, pageChanged);
        } else if (status !== "error") {
          setStatus("idle");
        }
        prevRedRef.current = redCount;
        prevLumaRef.current = luma;
      } finally {
        busyRef.current = false;
      }
    },
    [postFrame, status],
  );

  if (!room) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
        <h1 className="text-2xl font-bold">
          Word<span className="text-red-500">Lens</span> 카메라
        </h1>
        <p className="text-slate-400">
          태블릿 뷰어 화면에 표시된 6자리 방 코드를 입력하세요.
        </p>
        <input
          data-testid="room-input"
          value={roomInput}
          onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
          maxLength={6}
          placeholder="ABC123"
          className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-center text-3xl tracking-[0.3em] text-white outline-none focus:border-red-500"
        />
        {joinError && <p className="text-sm text-red-400">{joinError}</p>}
        <button
          data-testid="join-button"
          onClick={() => void join(roomInput)}
          className="rounded-xl bg-red-600 py-4 text-xl font-semibold transition hover:bg-red-500"
        >
          연결하기
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">
          📷 방 <span className="text-red-400">{room}</span>
        </h1>
        <span
          data-testid="status-indicator"
          className={`rounded-full px-3 py-1 text-sm text-white ${STATUS_COLOR[status]}`}
        >
          {STATUS_LABEL[status]}
        </span>
      </header>

      {cameraError ? (
        <p className="rounded-xl bg-red-950 p-4 text-red-300">{cameraError}</p>
      ) : (
        <video
          ref={videoRef}
          playsInline
          muted
          className="w-full rounded-2xl border border-slate-800"
        />
      )}
      <canvas ref={canvasRef} className="hidden" />

      <p className="text-sm text-slate-400">{message || " "}</p>
      <p className="text-xs text-slate-600">
        프레임 {stats.frames} · 전송 {stats.sent} · 단어 {stats.words}
      </p>

      <button
        data-testid="manual-send"
        onClick={() => void captureTick(room, true)}
        className="rounded-xl bg-slate-800 py-3 text-slate-200 transition hover:bg-slate-700"
      >
        지금 프레임 전송 (수동)
      </button>
      <p className="text-xs leading-5 text-slate-600">
        폰을 책 위에 거치하세요. 빨간 펜으로 밑줄을 치면 2초 안에 자동
        감지됩니다. 화면은 자동으로 꺼지지 않습니다.
      </p>
    </main>
  );
}
