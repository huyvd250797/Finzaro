"use client";

import { useEffect } from "react";

type LockSnapshot = {
  bodyOverflow: string;
  bodyOverscroll: string;
  htmlOverflow: string;
  htmlOverscroll: string;
};

let lockDepth = 0;
let snapshot: LockSnapshot | null = null;

function acquireLock() {
  const body = document.body;
  const html = document.documentElement;
  if (lockDepth === 0) {
    snapshot = {
      bodyOverflow: body.style.overflow,
      bodyOverscroll: body.style.overscrollBehavior,
      htmlOverflow: html.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior
    };
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
  }
  lockDepth += 1;
}

function releaseLock() {
  lockDepth = Math.max(0, lockDepth - 1);
  if (lockDepth !== 0 || !snapshot) return;

  const body = document.body;
  const html = document.documentElement;
  body.style.overflow = snapshot.bodyOverflow;
  body.style.overscrollBehavior = snapshot.bodyOverscroll;
  html.style.overflow = snapshot.htmlOverflow;
  html.style.overscrollBehavior = snapshot.htmlOverscroll;
  snapshot = null;
}

/** Locks page scrolling without fixing <body>; reference counting keeps nested overlays safe on iOS/PWA. */
export function useOverlayScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    acquireLock();
    return releaseLock;
  }, [active]);
}
