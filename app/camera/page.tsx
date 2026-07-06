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
type CameraState =
  | "idle"
  | "starting"
  | "active"
  | "denied"
  | "unavailable"
  | "insecure";

const STATUS_LABEL: Record<Status, string> = {
  idle: "Watching",
  detected: "Underline detected",
  sent: "Sent",
  error: "Error",
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
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");
  const [stats, setStats] = useState({ frames: 0, sent: 0, words: 0 });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);
  const prevRedRef = useRef(0);
  const prevLumaRef = useRef<number[] | null>(null);
  const busyRef = useRef(false);

  // Pre-fill room code from ?room=CODE (QR scan path).
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("room");
    if (param) setRoomInput(param.toUpperCase());
  }, []);

  // Track mount state; stop any live tracks on unmount.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const join = useCallback(async (codeRaw: string) => {
    const code = codeRaw.trim().toUpperCase();
    if (code.length !== 6) {
      setJoinError("Enter the 6-character code");
      return;
    }
    const res = await fetch(`/api/room?code=${encodeURIComponent(code)}`);
    const json = (await res.json()) as { exists: boolean };
    if (!json.exists) {
      setJoinError("Room not found. Check the code on the viewer screen.");
      return;
    }
    setJoinError(null);
    setRoom(code);
    // Camera capability preflight — the actual request needs a user gesture
    // (required by iOS Safari), so we only classify here.
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCameraState("insecure");
    } else {
      setCameraState("idle");
    }
  }, []);

  /** Must be called from a user gesture (button tap) for iOS Safari. */
  const startCamera = useCallback(async () => {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCameraState("insecure");
      return;
    }
    setCameraState("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 } },
        audio: false,
      });
      if (!mountedRef.current || !videoRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraState("active");
    } catch (err) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setCameraState("denied");
      } else {
        setCameraState("unavailable");
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraState("idle");
  }, []);

  const postFrame = useCallback(
    async (roomCode: string, image: string, pageChanged: boolean) => {
      setStatus("detected");
      try {
        const res = await fetch("/api/frame", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room: roomCode, image, pageChanged }),
        });
        if (res.status === 404) {
          setStatus("error");
          setMessage("Room expired — reopen the viewer and rejoin.");
          return;
        }
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
            ? `Mock mode: ${json.added} word(s) added`
            : `${json.added} word(s) added`,
        );
      } catch {
        setStatus("error");
        setMessage("Upload failed — check your connection.");
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
        const newRed = shouldSendFrame(
          prevRedRef.current,
          redCount,
          totalPixels,
        );

        setStats((s) => ({ ...s, frames: s.frames + 1 }));
        if (newRed || pageChanged || force) {
          const image = canvas.toDataURL("image/jpeg", 0.7);
          await postFrame(roomCode, image, pageChanged);
        } else {
          setStatus((s) => (s === "error" ? s : "idle"));
        }
        prevRedRef.current = redCount;
        prevLumaRef.current = luma;
      } finally {
        busyRef.current = false;
      }
    },
    [postFrame],
  );

  // Capture loop runs only while the camera is active.
  useEffect(() => {
    if (!room || cameraState !== "active") return;
    const timer = setInterval(
      () => void captureTick(room),
      CAPTURE_INTERVAL_MS,
    );
    return () => clearInterval(timer);
  }, [room, cameraState, captureTick]);

  if (!room) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
        <h1 className="text-2xl font-bold">
          Word<span className="text-red-500">Lens</span> Camera
        </h1>
        <p className="text-slate-400">
          Enter the 6-character room code shown on the viewer screen.
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
          Connect
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">
          📷 Room <span className="text-red-400">{room}</span>
        </h1>
        <span
          data-testid="status-indicator"
          className={`rounded-full px-3 py-1 text-sm text-white ${STATUS_COLOR[status]}`}
        >
          {STATUS_LABEL[status]}
        </span>
      </header>

      {cameraState === "insecure" && (
        <div className="rounded-xl bg-amber-950 p-4 text-sm text-amber-200">
          <p className="font-semibold">Camera needs a secure connection</p>
          <p className="mt-1 text-amber-300/80">
            Browsers only allow camera access over HTTPS. Open this page via
            the deployed HTTPS URL (or localhost) and try again.
          </p>
        </div>
      )}

      {cameraState === "denied" && (
        <div className="rounded-xl bg-red-950 p-4 text-sm text-red-200">
          <p className="font-semibold">Camera permission was denied</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-red-300/90">
            <li>iOS Safari: tap the ᴀA / lock icon in the address bar → Website Settings → Camera → Allow, then reload.</li>
            <li>Chrome: tap the lock icon → Permissions → Camera → Allow.</li>
          </ul>
          <div className="mt-3 flex gap-2">
            <button
              data-testid="retry-camera"
              onClick={() => void startCamera()}
              className="rounded-lg bg-red-700 px-4 py-2 font-semibold text-white transition hover:bg-red-600"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-slate-800 px-4 py-2 text-slate-200 transition hover:bg-slate-700"
            >
              Reload page
            </button>
          </div>
        </div>
      )}

      {cameraState === "unavailable" && (
        <div className="rounded-xl bg-red-950 p-4 text-sm text-red-200">
          <p className="font-semibold">Could not start the camera</p>
          <p className="mt-1 text-red-300/80">
            Another app may be using it, or this device has no rear camera.
          </p>
          <button
            data-testid="retry-camera"
            onClick={() => void startCamera()}
            className="mt-3 rounded-lg bg-red-700 px-4 py-2 font-semibold text-white transition hover:bg-red-600"
          >
            Try again
          </button>
        </div>
      )}

      {(cameraState === "idle" || cameraState === "starting") && (
        <button
          data-testid="enable-camera"
          onClick={() => void startCamera()}
          disabled={cameraState === "starting"}
          className="rounded-2xl bg-red-600 py-6 text-xl font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
        >
          {cameraState === "starting"
            ? "Requesting camera…"
            : "📷 Enable camera"}
        </button>
      )}

      <video
        ref={videoRef}
        playsInline
        muted
        className={`w-full rounded-2xl border border-slate-800 ${
          cameraState === "active" ? "" : "hidden"
        }`}
      />
      <canvas ref={canvasRef} className="hidden" />

      {cameraState === "active" && (
        <>
          <p className="text-sm text-slate-400">{message || " "}</p>
          <p className="text-xs text-slate-600">
            frames {stats.frames} · sent {stats.sent} · words {stats.words}
          </p>
          <div className="flex gap-2">
            <button
              data-testid="manual-send"
              onClick={() => void captureTick(room, true)}
              className="flex-1 rounded-xl bg-slate-800 py-3 text-slate-200 transition hover:bg-slate-700"
            >
              Send frame now
            </button>
            <button
              onClick={stopCamera}
              className="rounded-xl border border-slate-700 px-4 py-3 text-slate-400 transition hover:bg-slate-900"
            >
              Stop
            </button>
          </div>
          <p className="text-xs leading-5 text-slate-600">
            Mount the phone above the book. Underline a word in red and it is
            detected within ~2 seconds. The screen stays awake automatically.
          </p>
        </>
      )}
    </main>
  );
}
