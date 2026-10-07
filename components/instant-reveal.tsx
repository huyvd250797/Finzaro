"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

export function InstantReveal({
  children,
  label,
  initialOpen = false,
  icon = true
}: {
  children: ReactNode;
  label: string;
  initialOpen?: boolean;
  className?: string;
  icon?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white transition active:scale-[0.98]">
        {icon && <Plus className="size-4" />}{label}
      </button>
      {open && (
        <div className="fixed inset-0 z-[90] overflow-y-auto bg-black/40 p-3 pt-[max(env(safe-area-inset-top),12px)] backdrop-blur-[2px] sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }} onClickCapture={(event) => { const target = event.target as Element; if (target.closest("[data-instant-close]")) { event.preventDefault(); setOpen(false); } }}>
          <div className="mx-auto w-full max-w-4xl">{children}</div>
        </div>
      )}
    </>
  );
}
