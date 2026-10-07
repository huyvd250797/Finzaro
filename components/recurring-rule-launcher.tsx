"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CalendarPlus } from "lucide-react";
import { useOverlayScrollLock } from "@/components/use-overlay-scroll-lock";
import { cn } from "@/lib/utils";

type RuleType = "expense" | "income" | "transfer";

export function RecurringRuleLauncher({ expense, income, transfer }: { expense: ReactNode; income: ReactNode; transfer: ReactNode }) {
  const [type, setType] = useState<RuleType | null>(null);
  useOverlayScrollLock(Boolean(type));
  const panels = { expense, income, transfer };
  const items: Array<{ type: RuleType; label: string; icon: typeof ArrowUpRight }> = [
    { type: "expense", label: "Khoản chi định kỳ", icon: ArrowUpRight },
    { type: "income", label: "Thu nhập định kỳ", icon: ArrowDownLeft },
    { type: "transfer", label: "Chuyển tiền định kỳ", icon: ArrowLeftRight }
  ];

  useEffect(() => {
    if (!type) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setType(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [type]);

  return (
    <>
      <button type="button" onClick={() => setType("expense")} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white transition active:scale-[0.98]"><CalendarPlus className="size-4" /> Thêm lịch định kỳ</button>
      {type && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-hidden bg-black/40 p-3 pt-[max(env(safe-area-inset-top),12px)] backdrop-blur-[2px] sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setType(null); }} onClickCapture={(event) => { const target = event.target as Element; if (target.closest("[data-instant-close]")) { event.preventDefault(); setType(null); } }}>
          <div className="modal-scroll-area mx-auto max-h-[calc(100dvh-24px-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-full max-w-4xl overflow-y-auto overscroll-contain rounded-[24px] [touch-action:pan-y] sm:max-h-[calc(100dvh-48px)]">
            <div className="mb-2 flex flex-wrap gap-2 rounded-2xl bg-[var(--card)] p-2 shadow-xl">
              {items.map((item) => { const Icon = item.icon; const active = type === item.type; return <button key={item.type} type="button" onClick={() => setType(item.type)} className={cn("inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-bold", active ? "bg-[var(--primary)] text-white" : "bg-[var(--muted)] text-[var(--muted-foreground)]")}><Icon className="size-3.5" />{item.label}</button>; })}
            </div>
            {panels[type]}
          </div>
        </div>
      )}
    </>
  );
}
