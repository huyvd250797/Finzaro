"use client";

import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useOverlayScrollLock } from "@/components/use-overlay-scroll-lock";
import { revealTransactionFormTarget } from "@/components/transaction-form-visibility";
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
  activeFormKey?: string | null;
};

type SheetFooterSlot = { element: HTMLDivElement | null; activeFormKey?: string | null };
const SheetFooterContext = createContext<SheetFooterSlot | null>(null);

/** Render actions outside the scrolling area while retaining React form context. */
export function useSheetFooterSlot() { return useContext(SheetFooterContext); }

/** Shared iOS-safe sheet: animated entry/exit, drag handle, backdrop and Escape close. */
export function BottomSheet({ open, onClose, children, label, panelClassName, overlayClassName, zIndex = "z-[100]", backdropClassName, mobileOnly = false, activeFormKey }: BottomSheetProps) {
  const [present, setPresent] = useState(open);
  const [portalReady, setPortalReady] = useState(false);
  const [closing, setClosing] = useState(false);
  const contentRef = useRef(children);
  const dragging = useRef<{ y: number; at: number; pointerId: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [footerElement, setFooterElement] = useState<HTMLDivElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  if (open) contentRef.current = children;
  useOverlayScrollLock((open || present) && portalReady);

  // A portal puts sheets above the fixed mobile navigation even when a page
  // creates its own stacking context (transform, isolation, animation, etc.).
  useEffect(() => { setPortalReady(true); }, []);

  // Keep the dialog in CSS's fixed 100dvh viewport during normal scrolling.
  // VisualViewport.scroll may also fire on an elastic overscroll; moving the
  // overlay on those events made the Save bar jump upwards. Only apply viewport
  // positioning when a *real focused keyboard* has reduced the visible area.
  // The scrollport, never the document or action footer, follows text focus.
  useEffect(() => {
    if (!open || !portalReady) return;
    const overlay = overlayRef.current;
    if (!overlay) return;
    const viewport = window.visualViewport;
    let frame = 0;
    let secondFrame = 0;
    let afterKeyboard = 0;
    let keyboardWasVisible = false;
    const isEditable = (node: Element | null): node is HTMLElement => Boolean(node && (
      node.matches('input:not([type="hidden"]):not([readonly]), textarea:not([readonly]), [contenteditable="true"]')
    ));
    const syncViewport = () => {
      const focused = document.activeElement;
      const focusInside = focused instanceof HTMLElement && overlay.contains(focused) && isEditable(focused);
      const viewportHeight = viewport?.height ?? window.innerHeight;
      const keyboardShrink = window.innerHeight - viewportHeight > 160;
      const keyboardVisible = keyboardShrink && (focusInside || keyboardWasVisible);
      keyboardWasVisible = keyboardVisible;
      if (keyboardVisible && viewport) {
        const y = Math.max(0, Math.min(viewport.offsetTop, window.innerHeight - viewportHeight));
        overlay.style.top = `${Math.round(y)}px`;
        overlay.style.height = `${Math.round(viewportHeight)}px`;
        overlay.style.setProperty("--fin-visual-height", `${Math.round(viewportHeight)}px`);
      } else {
        // Do NOT reposition on rubber-band scroll or after save/delete.
        overlay.style.removeProperty("top");
        overlay.style.removeProperty("height");
        overlay.style.removeProperty("--fin-visual-height");
      }
      if (focusInside) {
        window.cancelAnimationFrame(frame);
        frame = window.requestAnimationFrame(() => {
          secondFrame = window.requestAnimationFrame(() => {
            if (focused.isConnected) revealTransactionFormTarget(focused);
          });
        });
      }
    };
    const onFocus = (event: FocusEvent) => {
      if (!(event.target instanceof HTMLElement) || !isEditable(event.target)) return;
      syncViewport();
      // Keyboard animation happens after focusin on Safari. Re-check at the
      // end of the animation even on devices that omit a viewport resize.
      window.clearTimeout(afterKeyboard);
      afterKeyboard = window.setTimeout(syncViewport, 300);
    };
    syncViewport();
    viewport?.addEventListener("resize", syncViewport);
    viewport?.addEventListener("scroll", syncViewport);
    overlay.addEventListener("focusin", onFocus);
    window.addEventListener("resize", syncViewport);
    return () => {
      viewport?.removeEventListener("resize", syncViewport);
      viewport?.removeEventListener("scroll", syncViewport);
      overlay.removeEventListener("focusin", onFocus);
      window.removeEventListener("resize", syncViewport);
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(secondFrame);
      window.clearTimeout(afterKeyboard);
      overlay.style.removeProperty("top");
      overlay.style.removeProperty("height");
      overlay.style.removeProperty("--fin-visual-height");
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
  const onFooterClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!event.target || !(event.target instanceof Element)) return;
    if (!event.target.closest("[data-instant-close]")) return;
    if (panelRef.current?.querySelector('[aria-busy="true"]')) return;
    event.preventDefault();
    onCloseRef.current();
  };

  return createPortal(<div ref={overlayRef} className={cn("fin-sheet-backdrop fixed inset-x-0 top-0 flex items-end justify-center overflow-hidden", zIndex, mobileOnly && "lg:hidden", overlayClassName)} data-fin-dialog="true" data-closing={closing || !open ? "true" : "false"}>
    <button type="button" tabIndex={-1} aria-label="Đóng bảng" onClick={onClose} className={cn("absolute inset-0 w-full bg-black/45 backdrop-blur-[2px]", backdropClassName)} />
    <div ref={panelRef} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} className={cn("fin-sheet-panel fin-premium-dialog relative flex w-full min-h-0 max-h-[94dvh] flex-col overflow-hidden rounded-t-[26px] bg-[var(--card)] shadow-2xl", panelClassName)}>
      <button type="button" aria-label="Kéo xuống để đóng" title="Kéo xuống để đóng" className="fin-sheet-handle relative z-20 flex h-6 w-full shrink-0 cursor-grab touch-none items-start justify-center bg-[var(--card)] pt-2 active:cursor-grabbing" onPointerDown={onDragStart} onPointerMove={onDragMove} onPointerUp={onDragEnd} onPointerCancel={onDragEnd}>
        <span className="h-1.5 w-12 rounded-full bg-[var(--border)]" />
      </button>
      <SheetFooterContext.Provider value={{ element: footerElement, activeFormKey }}>
        <div className="fin-sheet-scroll min-h-0 w-full flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch]" data-fin-sheet-scroll="true">
          {contentRef.current}
        </div>
        <div ref={setFooterElement} onClickCapture={onFooterClickCapture} className="fin-sheet-action-slot" data-fin-sheet-action-slot="true" />
      </SheetFooterContext.Provider>
    </div>
  </div>, document.body);
}
