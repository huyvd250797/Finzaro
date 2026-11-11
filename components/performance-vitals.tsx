"use client";

import { useEffect } from "react";

/** Opt-in, local-only browser diagnostics. No financial or personal data is collected. */
export function PerformanceVitals() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_FINZARO_PERF_DEBUG !== "1" || typeof PerformanceObserver === "undefined") return;
    const metrics: Record<string, number> = {};
    const observers: PerformanceObserver[] = [];
    const supported = new Set(PerformanceObserver.supportedEntryTypes ?? []);
    const register = (type: string, callback: (entry: PerformanceEntry) => void) => {
      if (!supported.has(type)) return;
      try {
        const observer = new PerformanceObserver((list) => list.getEntries().forEach(callback));
        observer.observe({ type, buffered: true });
        observers.push(observer);
      } catch { /* Older Safari builds may not support buffered observation. */ }
    };
    register("largest-contentful-paint", (entry) => { metrics.LCP = Math.round(entry.startTime); });
    register("layout-shift", (entry) => {
      const shift = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
      if (!shift.hadRecentInput) metrics.CLS = Number(((metrics.CLS ?? 0) + (shift.value ?? 0)).toFixed(4));
    });
    register("event", (entry) => { metrics.eventDurationMax = Math.max(metrics.eventDurationMax ?? 0, entry.duration); });
    const report = () => {
      if (document.visibilityState !== "hidden") return;
      const section = window.location.pathname.split("/")[1];
      const route = ["overview", "accounts", "transactions", "categories", "reports", "settings"].includes(section) ? section : "other";
      // Event duration is diagnostic only; it is not a certified INP percentile.
      console.info("[Finzaro local performance]", { route, ...metrics });
    };
    document.addEventListener("visibilitychange", report);
    return () => {
      document.removeEventListener("visibilitychange", report);
      observers.forEach((observer) => observer.disconnect());
    };
  }, []);
  return null;
}
