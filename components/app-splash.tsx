"use client";

import { useEffect, useState } from "react";

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
        ".fin-page-shell, main.finzaro-grid, .fin-print-document, [data-fin-app-ready]"
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
        <svg viewBox="0 0 64 64" className="size-16">
          <defs><linearGradient id="splash-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#0f9f78" /><stop offset="100%" stopColor="#0a4438" /></linearGradient></defs>
          <rect x="3" y="3" width="58" height="58" rx="19" fill="url(#splash-bg)" />
          <rect x="15" y="35" width="8" height="12" rx="3" fill="#e9fff7" /><rect x="28" y="28" width="8" height="19" rx="3" fill="#e9fff7" /><rect x="41" y="21" width="8" height="26" rx="3" fill="#e9fff7" />
          <path d="M16 29 27.5 23.5 36 28 49 17.5" fill="none" stroke="#55ddb0" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /><path d="M44 17.5H49v5" fill="none" stroke="#55ddb0" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="text-center"><div className="text-2xl font-black tracking-tight">Finzaro</div><div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Personal Finance</div></div>
      <div className="finzaro-splash-loader"><span /></div>
    </div>
  );
}
