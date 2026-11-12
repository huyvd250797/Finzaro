"use client";

import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useOverlayScrollLock } from "@/components/use-overlay-scroll-lock";
import { cn } from "@/lib/utils";

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  label: string;
  panelClassName?: string;
  overlayClassName?: string;
  zIndex?: string;
  backdropClassName?: string;
  mobileOnly?: boolean;
};

/** Shared iOS-safe sheet: animated entry/exit, drag handle, backdrop and Escape close. */
export function BottomSheet({ open, onClose, children, label, panelClassName, overlayClassName, zIndex = "z-[100]", backdropClassName, mobileOnly = false }: BottomSheetProps) {
  const [present, setPresent] = useState(open);
  const [portalReady, setPortalReady] = useState(false);
  const [closing, setClosing] = useState(false);
  const contentRef = useRef(children);
  const dragging = useRef<{ y: number; at: number; pointerId: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  if (open) contentRef.current = children;
  useOverlayScrollLock(open && portalReady);

  // A portal puts sheets above the fixed mobile navigation even when a page
  // creates its own stacking context (transform, isolation, animation, etc.).
  useEffect(() => { setPortalReady(true); }, []);

  // iOS Safari/PWA has a visual viewport smaller than the layout viewport
  // when its software keyboard is visible. Size the overlay to the visible
  // area so form fields and the Save action remain reachable.
  useEffect(() => {
    if (!open || !portalReady) return;
    const overlay = overlayRef.current;
    if (!overlay) return;
    const viewport = window.visualViewport;
    const syncViewport = () => {
      overlay.style.top = `${Math.max(0, viewport?.offsetTop ?? 0)}px`;
      overlay.style.height = `${Math.max(1, viewport?.height ?? window.innerHeight)}px`;
      overlay.style.setProperty("--fin-visual-height", `${Math.max(1, viewport?.height ?? window.innerHeight)}px`);
    };
    syncViewport();
    viewport?.addEventListener("resize", syncViewport);
    viewport?.addEventListener("scroll", syncViewport);
    window.addEventListener("resize", syncViewport);
    return () => {
      viewport?.removeEventListener("resize", syncViewport);
      viewport?.removeEventListener("scroll", syncViewport);
      window.removeEventListener("resize", syncViewport);
    };
  }, [open, portalReady]);

  useEffect(() => {
    if (open) {
      setPresent(true);
      setClosing(false);
      return;
    }
    if (!present) return;
    setClosing(true);
    const timeout = window.setTimeout(() => { setPresent(false); setClosing(false); }, 230);
    return () => window.clearTimeout(timeout);
  }, [open, present]);

  useEffect(() => {
    if (!open || !portalReady) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const focusables = () => Array.from(panel?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) ?? []).filter((element) => element.getClientRects().length && !element.closest('[hidden], [inert]'));
    // Wait until the visible sheet has entered the DOM, without adding an arbitrary delay.
    const frame = window.requestAnimationFrame(() => (panel?.querySelector<HTMLElement>('[data-money-keypad="true"] .fin-money-key') ?? focusables()[0] ?? panel)?.focus({ preventScroll: true }));
    const onKeyDown = (event: KeyboardEvent) => {
      // Only the latest open sheet handles shortcuts when overlays are nested.
      const sheets = document.querySelectorAll('[data-fin-dialog="true"][data-closing="false"]');
      if (sheets[sheets.length - 1] !== panel?.parentElement) return;
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onCloseRef.current(); return; }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (!items.length) { event.preventDefault(); panel?.focus(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel?.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panel?.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus({ preventScroll: true });
    };
  }, [open, portalReady]);

  function onDragStart(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!open) return;
    if (event.button !== 0 && event.pointerType === "mouse") return;
    dragging.current = { y: event.clientY, at: performance.now(), pointerId: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function onDragMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (dragging.current === null || dragging.current.pointerId !== event.pointerId || !panelRef.current) return;
    const delta = Math.max(0, event.clientY - dragging.current.y);
    panelRef.current.style.transform = `translateY(${Math.min(delta, 260)}px)`;
    panelRef.current.style.transition = "none";
  }
  function onDragEnd(event: ReactPointerEvent<HTMLButtonElement>) {
    if (dragging.current === null || dragging.current.pointerId !== event.pointerId) return;
    const distance = event.clientY - dragging.current.y;
    const elapsed = Math.max(1, performance.now() - dragging.current.at);
    dragging.current = null;
    if (panelRef.current) {
      panelRef.current.style.transform = "";
      panelRef.current.style.transition = "";
    }
    if (event.type !== "pointercancel" && (distance >= 75 || (distance > 35 && distance / elapsed > .75))) onCloseRef.current();
  }

  if (!portalReady || (!present && !open)) return null;
  return createPortal(<div ref={overlayRef} className={cn("fin-sheet-backdrop fixed inset-x-0 top-0 flex items-end justify-center overflow-hidden", zIndex, mobileOnly && "lg:hidden", overlayClassName)} data-fin-dialog="true" data-closing={closing || !open ? "true" : "false"}>
    <button type="button" tabIndex={-1} aria-label="Đóng bảng" onClick={onClose} className={cn("absolute inset-0 w-full bg-black/45 backdrop-blur-[2px]", backdropClassName)} />
    <div ref={panelRef} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} className={cn("fin-sheet-panel fin-premium-dialog relative flex w-full min-h-0 max-h-[94dvh] flex-col overflow-hidden rounded-t-[26px] bg-[var(--card)] shadow-2xl", panelClassName)}>
      <button type="button" aria-label="Kéo xuống để đóng" title="Kéo xuống để đóng" className="fin-sheet-handle relative z-20 flex h-6 w-full shrink-0 cursor-grab touch-none items-start justify-center bg-[var(--card)] pt-2 active:cursor-grabbing" onPointerDown={onDragStart} onPointerMove={onDragMove} onPointerUp={onDragEnd} onPointerCancel={onDragEnd}>
        <span className="h-1.5 w-12 rounded-full bg-[var(--border)]" />
      </button>
      <div className="fin-sheet-scroll min-h-0 w-full flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch] pb-[max(env(safe-area-inset-bottom),12px)]" data-fin-sheet-scroll="true">
        {contentRef.current}
      </div>
    </div>
  </div>, document.body);
}
