"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Sparkles, X } from "lucide-react";
import { APP_RELEASE_NAME, APP_VERSION, APP_VERSION_LABEL } from "@/lib/app-version";

type VersionPayload = { version?: string; release?: string };

export function PwaRegister() {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const [availableRelease, setAvailableRelease] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (!standalone) return;

    const preventGesture = (event: Event) => event.preventDefault();
    const preventMultiTouch = (event: TouchEvent) => {
      if (event.touches.length > 1) event.preventDefault();
    };

    document.addEventListener("gesturestart", preventGesture, { passive: false });
    document.addEventListener("gesturechange", preventGesture, { passive: false });
    document.addEventListener("gestureend", preventGesture, { passive: false });
    document.addEventListener("touchmove", preventMultiTouch, { passive: false });

    return () => {
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("gesturechange", preventGesture);
      document.removeEventListener("gestureend", preventGesture);
      document.removeEventListener("touchmove", preventMultiTouch);
    };
  }, []);

  const showUpdate = useCallback((version?: string, release?: string) => {
    const candidate = version && version !== APP_VERSION ? version : version ?? "mới";
    const sessionKey = `finzaro-update-dismissed-${candidate}`;
    if (typeof window !== "undefined") {
      try {
        if (sessionStorage.getItem(sessionKey) === "1") return;
      } catch {
        // Storage can be unavailable in restrictive browser modes; update detection must still work.
      }
    }
    setAvailableVersion(candidate);
    setAvailableRelease(release ?? null);
    setDismissed(false);
  }, []);

  const checkServerVersion = useCallback(async () => {
    try {
      const response = await fetch(`/api/version?t=${Date.now()}`, { cache: "no-store", headers: { "Cache-Control": "no-cache" } });
      if (!response.ok) return;
      const data = (await response.json()) as VersionPayload;
      if (data.version && data.version !== APP_VERSION) showUpdate(data.version, data.release);
    } catch {
      // Offline is expected for a PWA. The service-worker update path will retry later.
    }
  }, [showUpdate]);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;

    let disposed = false;
    let periodic: number | undefined;

    const watchRegistration = (registration: ServiceWorkerRegistration) => {
      registrationRef.current = registration;
      if (registration.waiting && navigator.serviceWorker.controller) showUpdate();

      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) showUpdate();
        });
      });
    };

    navigator.serviceWorker
      .register(`/sw.js?v=${encodeURIComponent(APP_VERSION)}`, { updateViaCache: "none" })
      .then(async (registration) => {
        if (disposed) return;
        watchRegistration(registration);
        try { await registration.update(); } catch { /* network may be offline */ }
      })
      .catch(() => undefined);

    void checkServerVersion();

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void checkServerVersion();
      const registration = registrationRef.current;
      if (registration) void registration.update().catch(() => undefined);
    };
    const onOnline = () => onVisible();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    periodic = window.setInterval(onVisible, 15 * 60 * 1000);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      if (periodic) window.clearInterval(periodic);
    };
  }, [checkServerVersion, showUpdate]);

  const updateNow = useCallback(async () => {
    if (!("serviceWorker" in navigator)) {
      window.location.reload();
      return;
    }

    setUpdating(true);
    let reloaded = false;
    const reload = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", reload, { once: true });

    try {
      const targetVersion = availableVersion && availableVersion !== "mới" ? availableVersion : APP_VERSION;
      const registration = await navigator.serviceWorker.register(`/sw.js?v=${encodeURIComponent(targetVersion)}`, { updateViaCache: "none" });
      registrationRef.current = registration;
      if (registration) {
        try { await registration.update(); } catch { /* still reload below */ }

        const activate = (worker: ServiceWorker | null) => {
          if (!worker) return false;
          if (worker.state === "installed") worker.postMessage({ type: "SKIP_WAITING" });
          else worker.addEventListener("statechange", () => {
            if (worker.state === "installed") worker.postMessage({ type: "SKIP_WAITING" });
          });
          return true;
        };

        if (registration.waiting) registration.waiting.postMessage({ type: "SKIP_WAITING" });
        else activate(registration.installing);
      }
    } finally {
      // Navigation requests are network-only in Finzaro, so this also refreshes the
      // latest Next.js build when the server version changed before SW reached waiting.
      window.setTimeout(reload, 1200);
    }
  }, [availableVersion]);

  if (!availableVersion || dismissed) return null;

  const dismiss = () => {
    const sessionKey = `finzaro-update-dismissed-${availableVersion}`;
    try { sessionStorage.setItem(sessionKey, "1"); } catch { /* ignore storage restrictions */ }
    setDismissed(true);
  };

  return (
    <div className="fixed inset-x-3 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] z-[100] mx-auto max-w-md lg:bottom-5" role="status" aria-live="polite">
      <div className="rounded-2xl border border-emerald-500/30 bg-[color:var(--card)]/98 p-4 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--sidebar-accent)] text-[var(--primary)]"><Sparkles className="size-4.5" /></div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black">Có phiên bản Finzaro mới</p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
                  Đang dùng {APP_VERSION_LABEL} · {APP_RELEASE_NAME}. {availableVersion !== "mới" ? <>Bản <strong>V{availableVersion}</strong>{availableRelease ? ` · ${availableRelease}` : ""} đã sẵn sàng.</> : <>Bản cập nhật mới đã sẵn sàng.</>}
                </p>
              </div>
              <button type="button" onClick={dismiss} aria-label="Để sau" className="grid size-8 shrink-0 place-items-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--muted)]"><X className="size-4" /></button>
            </div>
            <button type="button" onClick={updateNow} disabled={updating} className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-xs font-black text-white disabled:opacity-70">
              <RefreshCw className={`size-3.5 ${updating ? "animate-spin" : ""}`} /> {updating ? "Đang cập nhật..." : "Cập nhật ngay"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
