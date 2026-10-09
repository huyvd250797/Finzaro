"use client";

import { useEffect } from "react";

/** Locks page scrolling without fixing <body>; this keeps fixed tab bars pinned to the real viewport on iOS/PWA. */
export function useOverlayScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const body = document.body;
    const html = document.documentElement;
    const previous = {
      bodyOverflow: body.style.overflow,
      bodyOverscroll: body.style.overscrollBehavior,
      htmlOverflow: html.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior
    };
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    return () => {
      body.style.overflow = previous.bodyOverflow;
      body.style.overscrollBehavior = previous.bodyOverscroll;
      html.style.overflow = previous.htmlOverflow;
      html.style.overscrollBehavior = previous.htmlOverscroll;
    };
  }, [active]);
}
