"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { useOverlayScrollLock } from "@/components/use-overlay-scroll-lock";
import { cn } from "@/lib/utils";

export function InstantReveal({ children, label, initialOpen = false, icon = true, className }: { children: ReactNode; label: string; initialOpen?: boolean; className?: string; icon?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useOverlayScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const first = dialog?.querySelector<HTMLElement>('input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])');
    (first ?? dialog)?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); return; }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter((node) => node.getClientRects().length > 0);
      if (!focusable.length) { event.preventDefault(); dialog.focus(); return; }
      const firstNode = focusable[0];
      const lastNode = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === firstNode || !dialog.contains(document.activeElement))) { event.preventDefault(); lastNode.focus(); }
      else if (!event.shiftKey && (document.activeElement === lastNode || !dialog.contains(document.activeElement))) { event.preventDefault(); firstNode.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); triggerRef.current?.focus(); };
  }, [open]);

  return <>
    <button ref={triggerRef} type="button" onClick={() => setOpen(true)} className={cn("inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white transition active:scale-[0.98]", className)}>{icon && <Plus className="size-4" />}{label}</button>
    {open && <div className="fixed inset-0 z-[90] flex items-end justify-center overflow-hidden bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }} onClickCapture={(event) => { const target = event.target as Element; if (target.closest("[data-instant-close]")) { event.preventDefault(); setOpen(false); } }}>
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={label} className="modal-scroll-area mx-auto max-h-[88dvh] w-full max-w-4xl overflow-x-hidden overflow-y-auto overscroll-contain rounded-t-[28px] pb-[max(env(safe-area-inset-bottom),8px)] [touch-action:pan-y] sm:max-h-[calc(100dvh-48px)] sm:rounded-[24px] sm:pb-0">{children}</div>
    </div>}
  </>;
}
