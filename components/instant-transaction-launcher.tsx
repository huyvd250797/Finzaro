"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

type TxType = "expense" | "income" | "transfer";

export function InstantTransactionLauncher({ expense, income, transfer, initialType = null }: { expense: ReactNode; income: ReactNode; transfer: ReactNode; initialType?: TxType | null }) {
  const [type, setType] = useState<TxType | null>(initialType);
  const panels = { expense, income, transfer };
  const buttons: Array<{ type: TxType; label: string; icon: typeof ArrowUpRight; tone: string }> = [
    { type: "expense", label: "Chi tiêu", icon: ArrowUpRight, tone: "text-rose-500" },
    { type: "income", label: "Thu nhập", icon: ArrowDownLeft, tone: "text-emerald-600" },
    { type: "transfer", label: "Chuyển tiền", icon: ArrowLeftRight, tone: "text-white" }
  ];

  useEffect(() => {
    if (!type) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setType(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [type]);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {buttons.map((item) => {
          const Icon = item.icon;
          const selected = type === item.type;
          return <button key={item.type} type="button" onClick={() => setType(item.type)} className={cn("inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-bold transition active:scale-[0.98]", item.type === "transfer" || selected ? "bg-[var(--primary)] text-white" : "border border-[var(--border)] bg-[var(--card)]")}><Icon className={cn("size-4", selected || item.type === "transfer" ? "text-white" : item.tone)} />{item.label}</button>;
        })}
      </div>
      {type && (
        <div className="fixed inset-0 z-[90] overflow-y-auto bg-black/40 p-3 pt-[max(env(safe-area-inset-top),12px)] backdrop-blur-[2px] sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setType(null); }} onClickCapture={(event) => { const target = event.target as Element; if (target.closest("[data-instant-close]")) { event.preventDefault(); setType(null); } }}>
          <div className="mx-auto w-full max-w-4xl">
            <div className="mb-2 flex flex-wrap gap-2 rounded-2xl bg-[var(--card)] p-2 shadow-xl">{buttons.map((item) => { const Icon = item.icon; return <button key={item.type} type="button" onClick={() => setType(item.type)} className={cn("inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-bold", type === item.type ? "bg-[var(--primary)] text-white" : "bg-[var(--muted)] text-[var(--muted-foreground)]")}><Icon className="size-3.5" />{item.label}</button>; })}</div>
            {panels[type]}
          </div>
        </div>
      )}
    </>
  );
}
