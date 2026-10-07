"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useOverlayScrollLock } from "@/components/use-overlay-scroll-lock";
import { cn } from "@/lib/utils";

export function InstantReveal({ children, label, initialOpen = false, icon = true, className }: { children: ReactNode; label: string; initialOpen?: boolean; className?: string; icon?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  useOverlayScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return <>
    <button type="button" onClick={() => setOpen(true)} className={cn("inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white transition active:scale-[0.98]", className)}>{icon && <Plus className="size-4" />}{label}</button>
    {open && <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-hidden bg-black/40 p-3 pt-[max(env(safe-area-inset-top),12px)] backdrop-blur-[2px] sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }} onClickCapture={(event) => { const target = event.target as Element; if (target.closest("[data-instant-close]")) { event.preventDefault(); setOpen(false); } }}>
      <div className="modal-scroll-area mx-auto max-h-[calc(100dvh-24px-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-full max-w-4xl overflow-y-auto overscroll-contain rounded-[24px] [touch-action:pan-y] sm:max-h-[calc(100dvh-48px)]">{children}</div>
    </div>}
  </>;
}
