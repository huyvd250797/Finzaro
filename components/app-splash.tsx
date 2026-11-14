"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

/** Cold-start splash only. Wait for the first real page content, never for a fixed animation timer.
 * Navigation inside the app uses the existing small progress indicator instead.
 */
export function AppSplash() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    let stopped = false;
    let painting = false;
    let frame = 0;
    let settleFrame = 0;
    const ready = () => {
      // Overview renders a streaming skeleton before its essential balances arrive.
      // Keep the branded splash until those critical numbers are ready.
      if (window.location.pathname === "/overview") return Boolean(document.querySelector("[data-fin-startup-ready]"));
      return Boolean(document.querySelector(
        ".fin-page-shell:not(.fin-route-skeleton), main.finzaro-grid, .fin-print-document, [data-fin-app-ready]"
      ));
    };
    const observer = new MutationObserver(() => check());
    function finish() {
      if (stopped) return;
      stopped = true;
      observer.disconnect();
      window.clearTimeout(fallback);
      setVisible(false);
      if (process.env.NODE_ENV === "development") performance.mark("finzaro.splash.ready");
    }
    function check() {
      if (stopped || painting || !ready()) return;
      painting = true;
      // Let the real page paint first; do not flash a blank dashboard.
      frame = window.requestAnimationFrame(() => {
        settleFrame = window.requestAnimationFrame(finish);
      });
    }
    // Fail open when the route is an error/unknown page (never trap users behind a splash).
    const fallback = window.setTimeout(finish, 4000);
    observer.observe(document.body, { childList: true, subtree: true });
    check();
    return () => {
      stopped = true;
      observer.disconnect();
      window.clearTimeout(fallback);
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(settleFrame);
    };
  }, []);
  if (!visible) return null;
  return (
    <div className="finzaro-splash" role="status" aria-live="polite" aria-label="Đang mở Finzaro">
      <div className="finzaro-splash-mark" aria-hidden="true">
        <Image src="/icons/finzaro-v0012-192.png" alt="" width={80} height={80} priority unoptimized className="size-full rounded-[1.3rem] object-cover" />
      </div>
      <div className="text-center"><div className="text-2xl font-black tracking-tight">Finzaro</div><div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Personal Finance</div></div>
      <div className="finzaro-splash-loader"><span /></div>
    </div>
  );
}
