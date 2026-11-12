"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Keep only the URL filters supported by the corresponding screen. Never persist
// transaction text/search, data or account state to localStorage/sessionStorage.
const sectionFilters: Record<string, readonly string[]> = {
  "/overview": [],
  "/transactions": ["type", "account", "category", "from", "to", "q", "page", "legacy"],
  "/reports": ["type", "mode", "period", "year"],
  "/reports/calendar": ["period", "day"],
  "/reports/analysis": ["from", "to", "period", "year", "mode"],
  "/reports/statements": ["from", "to", "account", "category", "type"]
};
const rememberedRoutes = new Map<string, string>();
const scrollOffsets = new Map<string, number>();
const routeEvent = "finzaro:remembered-route";

function rememberSection(pathname: string, search: URLSearchParams) {
  if (!(pathname in sectionFilters)) return;
  const query = new URLSearchParams();
  for (const key of sectionFilters[pathname]) {
    const value = search.get(key);
    if (value && value.length <= 150) query.set(key, value);
  }
  const next = `${pathname}${query.size ? `?${query.toString()}` : ""}`;
  rememberedRoutes.set(pathname, next);
  window.dispatchEvent(new Event(routeEvent));
}

/** Main tab links remember filtered list/report state when users switch sections. */
export function useSmartSectionRoutes() {
  const [routes, setRoutes] = useState<Record<string, string>>({});
  useEffect(() => {
    const update = () => setRoutes(Object.fromEntries(rememberedRoutes));
    update();
    window.addEventListener(routeEvent, update);
    return () => window.removeEventListener(routeEvent, update);
  }, []);
  return routes;
}

/** Mounted once in the persistent dashboard layout, never inside a loading page. */
export function NavigationMemory() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const key = `${pathname}?${search}`;

  useEffect(() => {
    rememberSection(pathname, new URLSearchParams(search));
  }, [pathname, search]);

  useEffect(() => {
    if (!pathname || window.location.hash) return;
    const saved = scrollOffsets.get(key) ?? 0;
    let frame = 0;
    let throttle = 0;
    let restoring = saved > 0;
    const store = () => {
      if (!restoring) scrollOffsets.set(key, window.scrollY);
    };
    const onScroll = () => {
      if (throttle) return;
      throttle = window.requestAnimationFrame(() => { throttle = 0; store(); });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    // Restore after layout commits and again if streamed content changes height.
    const restore = () => {
      if (!restoring) return;
      window.scrollTo({ top: saved, behavior: "auto" });
    };
    frame = window.requestAnimationFrame(() => window.requestAnimationFrame(restore));
    const main = document.getElementById("fin-main-content");
    const observer = typeof ResizeObserver !== "undefined" && main && saved > 0
      ? new ResizeObserver(restore) : null;
    if (observer && main) observer.observe(main);
    // Never fight a user's wheel/touch input while the route is streaming.
    const stopRestoring = () => { restoring = false; observer?.disconnect(); };
    window.addEventListener("wheel", stopRestoring, { passive: true });
    window.addEventListener("touchstart", stopRestoring, { passive: true });
    const finish = window.setTimeout(stopRestoring, saved > 0 ? 1100 : 0);
    return () => {
      window.clearTimeout(finish);
      observer?.disconnect();
      window.removeEventListener("wheel", stopRestoring);
      window.removeEventListener("touchstart", stopRestoring);
      window.cancelAnimationFrame(frame);
      if (throttle) window.cancelAnimationFrame(throttle);
      window.removeEventListener("scroll", onScroll);
      // Do not overwrite stored scroll with an intermediate skeleton position.
      if (!restoring) store();
      if (scrollOffsets.size > 32) scrollOffsets.delete(scrollOffsets.keys().next().value!);
    };
  }, [pathname, key]);

  useEffect(() => () => {
    rememberedRoutes.clear();
    scrollOffsets.clear();
  }, []);
  return null;
}
