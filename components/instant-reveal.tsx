"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { cn } from "@/lib/utils";

export function InstantReveal({ children, label, initialOpen = false, icon = true, className }: { children: ReactNode; label: string; initialOpen?: boolean; className?: string; icon?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    // The viewport-fixed action slot is a sibling of the scroller; keep it in
    // the same keyboard focus loop rather than trapping Tab inside content.
    const surface = dialog?.closest<HTMLElement>(".fin-sheet-panel") ?? dialog;
    const first = surface?.querySelector<HTMLElement>('input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])');
    (first ?? dialog)?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); return; }
      if (event.key !== "Tab" || !surface) return;
      const focusable = Array.from(surface.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter((node) => node.getClientRects().length > 0);
      if (!focusable.length) { event.preventDefault(); surface.focus(); return; }
      const firstNode = focusable[0];
      const lastNode = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === firstNode || !surface.contains(document.activeElement))) { event.preventDefault(); lastNode.focus(); }
      else if (!event.shiftKey && (document.activeElement === lastNode || !surface.contains(document.activeElement))) { event.preventDefault(); firstNode.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); triggerRef.current?.focus(); };
  }, [open]);

  return <>
    <button ref={triggerRef} type="button" onClick={() => setOpen(true)} className={cn("inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white transition active:scale-[0.98]", className)}>{icon && <Plus className="size-4" />}{label}</button>
    <BottomSheet open={open} onClose={() => setOpen(false)} label={label} zIndex="z-[90]" overlayClassName="sm:items-center sm:p-6" panelClassName="modal-scroll-area mx-auto max-w-4xl sm:max-h-[calc(100dvh-48px)] sm:rounded-[24px]">
      <div ref={dialogRef} tabIndex={-1} onClickCapture={(event) => { const target = event.target as Element; if (target.closest("[data-instant-close]")) { event.preventDefault(); setOpen(false); } }}>{children}</div>
    </BottomSheet>
  </>;
}
