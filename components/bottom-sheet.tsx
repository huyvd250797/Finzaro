"use client";

import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
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
  const [closing, setClosing] = useState(false);
  const contentRef = useRef(children);
  const dragging = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  if (open) contentRef.current = children;
  useOverlayScrollLock(open);

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
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); onClose(); } };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  function onDragStart(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!open) return;
    dragging.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function onDragMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (dragging.current === null || !panelRef.current) return;
    const delta = Math.max(0, event.clientY - dragging.current);
    panelRef.current.style.transform = `translateY(${Math.min(delta, 260)}px)`;
    panelRef.current.style.transition = "none";
  }
  function onDragEnd(event: ReactPointerEvent<HTMLButtonElement>) {
    if (dragging.current === null) return;
    const distance = event.clientY - dragging.current;
    dragging.current = null;
    if (panelRef.current) {
      panelRef.current.style.transform = "";
      panelRef.current.style.transition = "";
    }
    if (distance >= 75) onClose();
  }

  if (!present && !open) return null;
  return <div className={cn("fin-sheet-backdrop fixed inset-0 flex items-end justify-center overflow-hidden", zIndex, mobileOnly && "lg:hidden", overlayClassName)} data-closing={closing || !open ? "true" : "false"}>
    <button type="button" tabIndex={-1} aria-label="Đóng bảng" onClick={onClose} className={cn("absolute inset-0 w-full bg-black/45 backdrop-blur-[2px]", backdropClassName)} />
    <div ref={panelRef} role="dialog" aria-modal="true" aria-label={label} className={cn("fin-sheet-panel relative w-full max-h-[94dvh] overflow-x-hidden overflow-y-auto overscroll-contain rounded-t-[26px] bg-[var(--card)] shadow-2xl pb-[max(env(safe-area-inset-bottom),12px)]", panelClassName)}>
      <button type="button" aria-label="Kéo xuống để đóng" title="Kéo xuống để đóng" className="fin-sheet-handle sticky top-0 z-20 flex h-6 w-full cursor-grab touch-none items-start justify-center bg-[var(--card)] pt-2 active:cursor-grabbing" onPointerDown={onDragStart} onPointerMove={onDragMove} onPointerUp={onDragEnd} onPointerCancel={onDragEnd}>
        <span className="h-1.5 w-12 rounded-full bg-[var(--border)]" />
      </button>
      {contentRef.current}
    </div>
  </div>;
}
