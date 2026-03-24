import { useEffect, useRef } from "react";

type UseLiveRefreshOptions = {
  enabled: boolean;
  intervalMs: number;
  onRefresh: () => Promise<void> | void;
  runImmediately?: boolean;
  runOnFocus?: boolean;
};

export function useLiveRefresh({
  enabled,
  intervalMs,
  onRefresh,
  runImmediately = true,
  runOnFocus = true,
}: UseLiveRefreshOptions) {
  const refreshRef = useRef(onRefresh);
  const pendingRef = useRef(false);

  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    let disposed = false;

    async function runRefresh() {
      if (disposed || pendingRef.current) {
        return;
      }

      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }

      pendingRef.current = true;

      try {
        await refreshRef.current();
      } finally {
        pendingRef.current = false;
      }
    }

    function handleVisibilityRefresh() {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }

      void runRefresh();
    }

    if (runImmediately) {
      void runRefresh();
    }

    const intervalId = window.setInterval(() => {
      void runRefresh();
    }, intervalMs);

    if (runOnFocus) {
      window.addEventListener("focus", handleVisibilityRefresh);
      document.addEventListener("visibilitychange", handleVisibilityRefresh);
    }

    return () => {
      disposed = true;
      window.clearInterval(intervalId);

      if (runOnFocus) {
        window.removeEventListener("focus", handleVisibilityRefresh);
        document.removeEventListener("visibilitychange", handleVisibilityRefresh);
      }
    };
  }, [enabled, intervalMs, runImmediately, runOnFocus]);
}
