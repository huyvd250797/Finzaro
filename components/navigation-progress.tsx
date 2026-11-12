"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { measureClientPaint } from "@/lib/client-performance";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const navigationStartedAt = useRef<number | null>(null);
  const delayed = useRef<ReturnType<typeof setTimeout> | null>(null);
  const guard = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stop = () => {
    if (delayed.current) clearTimeout(delayed.current);
    if (guard.current) clearTimeout(guard.current);
    delayed.current = null;
    guard.current = null;
    setActive(false);
    navigationStartedAt.current = null;
  };
  const stopRef = useRef(stop);
  useEffect(() => { stopRef.current = stop; });
  useEffect(() => {
    if (navigationStartedAt.current !== null) {
      measureClientPaint("navigation.route", navigationStartedAt.current);
    }
    stopRef.current();
  }, [pathname, searchParams]);
  useEffect(() => {
    const start = () => {
      navigationStartedAt.current = performance.now();
      if (delayed.current) clearTimeout(delayed.current);
      if (guard.current) clearTimeout(guard.current);
      // Most prefetched navigations complete before this: no progress flash.
      delayed.current = setTimeout(() => setActive(true), 180);
      // A blocked or cancelled navigation must never leave the loader stuck.
      guard.current = setTimeout(() => stopRef.current(), 12000);
    };
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download") || anchor.hasAttribute("data-fin-copy-id")) return;
      try {
        const next = new URL(anchor.href, window.location.href);
        if (next.origin !== window.location.origin) return;
        if (next.pathname === window.location.pathname && next.search === window.location.search) return;
        start();
      } catch { /* Ignore invalid or external links. */ }
    };
    const onPageShow = () => stopRef.current();
    document.addEventListener("click", onClick, true);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("pageshow", onPageShow);
      if (delayed.current) clearTimeout(delayed.current);
      if (guard.current) clearTimeout(guard.current);
    };
  }, []);
  if (!active) return null;
  return <div className="fin-navigation-progress pointer-events-none fixed inset-x-0 top-0 z-[120] h-0.5 overflow-hidden bg-emerald-500/15" role="progressbar" aria-label="Đang tải nội dung">
    <div className="h-full w-1/2 animate-[finzaro-progress_0.8s_ease-in-out_infinite] bg-[var(--primary)] shadow-[0_0_12px_var(--primary)]" />
  </div>;
}
