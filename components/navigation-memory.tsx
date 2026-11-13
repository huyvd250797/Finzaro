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
    const main = document.getElementById("fin-main-content");
    const useMainScroller = Boolean(main && window.matchMedia("(max-width: 1023px)").matches);
    const scrollRoot: HTMLElement | Window = useMainScroller && main ? main : window;
    const saved = scrollOffsets.get(key) ?? 0;
    let frame = 0;
    let throttle = 0;
    let restoring = saved > 0;
    const position = () => scrollRoot === window ? window.scrollY : (scrollRoot as HTMLElement).scrollTop;
    const store = () => { if (!restoring) scrollOffsets.set(key, position()); };
    const onScroll = () => {
      if (throttle) return;
      throttle = window.requestAnimationFrame(() => { throttle = 0; store(); });
    };
    scrollRoot.addEventListener("scroll", onScroll, { passive: true });
    const restore = () => {
      if (!restoring) return;
      scrollRoot.scrollTo({ top: saved, behavior: "auto" });
    };
    // Reset the previous page's scroll when opening a new section, rather
    // than letting a long scrolled report appear halfway down a new page.
    if (!saved) scrollRoot.scrollTo({ top: 0, behavior: "auto" });
    frame = window.requestAnimationFrame(() => window.requestAnimationFrame(restore));
    const content = main?.firstElementChild;
    const observer = typeof ResizeObserver !== "undefined" && content && saved > 0
      ? new ResizeObserver(restore) : null;
    if (observer && content) observer.observe(content);
    const stopRestoring = () => { restoring = false; observer?.disconnect(); };
    scrollRoot.addEventListener("wheel", stopRestoring, { passive: true });
    scrollRoot.addEventListener("touchstart", stopRestoring, { passive: true });
    const finish = window.setTimeout(stopRestoring, saved > 0 ? 1100 : 0);
    return () => {
      window.clearTimeout(finish);
      observer?.disconnect();
      scrollRoot.removeEventListener("wheel", stopRestoring);
      scrollRoot.removeEventListener("touchstart", stopRestoring);
      window.cancelAnimationFrame(frame);
      if (throttle) window.cancelAnimationFrame(throttle);
      scrollRoot.removeEventListener("scroll", onScroll);
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
