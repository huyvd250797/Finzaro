"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { cn } from "@/lib/utils";

type TxType = "expense" | "income" | "transfer";
const buttons: Array<{ type: TxType; label: string; icon: typeof ArrowUpRight; style: string }> = [
  { type: "expense", label: "Chi tiền", icon: ArrowUpRight, style: "border-rose-500/35 bg-rose-500/10 text-rose-600 dark:text-rose-400" },
  { type: "income", label: "Thu tiền", icon: ArrowDownLeft, style: "border-emerald-500/35 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  { type: "transfer", label: "Chuyển tiền", icon: ArrowLeftRight, style: "border-sky-500/35 bg-sky-500/10 text-sky-600 dark:text-sky-400" }
];

export function InstantTransactionLauncher({ expense, income, transfer, initialType = null }: { expense: ReactNode; income: ReactNode; transfer: ReactNode; initialType?: TxType | null }) {
  const [type, setType] = useState<TxType | null>(initialType);
  useEffect(() => { setType(initialType); }, [initialType]);
  const panels = { expense, income, transfer };
  return <>
    <div className="flex flex-wrap gap-2">
      {buttons.map(({ type: kind, icon: Icon, label, style }) => <button key={kind} type="button" onClick={() => setType(kind)} className={cn("inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-bold transition active:scale-[.98]", style)}><Icon className="size-4" />{label}</button>)}
    </div>
    <BottomSheet open={type !== null} onClose={() => setType(null)} label="Ghi nhận giao dịch" zIndex="z-[90]" overlayClassName="sm:items-center sm:p-6" panelClassName="mx-auto max-w-2xl sm:max-h-[calc(100dvh-48px)] sm:rounded-[24px]" >
      <div className="mx-2 mb-2 flex flex-wrap gap-2 rounded-2xl bg-[var(--card)] p-2">
        {buttons.map(({ type: kind, label, icon: Icon, style }) => <button key={kind} type="button" onClick={() => setType(kind)} className={cn("inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold", style, type === kind && "ring-2 ring-current/20")}><Icon className="size-4" />{label}</button>)}
      </div>
      <div onClickCapture={(event) => { const target = event.target as Element; if (target.closest("[data-instant-close]")) { event.preventDefault(); setType(null); } }} key={type}>{type ? panels[type] : null}</div>
    </BottomSheet>
  </>;
}
