"use client";

import { useEffect } from "react";

/** Keep the screen on while the page is visible (best-effort). */
export function useWakeLock(): void {
  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;
    let disposed = false;

    const request = async () => {
      try {
        if (!("wakeLock" in navigator)) return;
        sentinel = await navigator.wakeLock.request("screen");
      } catch {
        // denied or unsupported; screen may sleep
      }
    };

    const onVisibility = () => {
      if (!disposed && document.visibilityState === "visible") {
        void request();
      }
    };

    void request();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void sentinel?.release().catch(() => undefined);
    };
  }, []);
}
