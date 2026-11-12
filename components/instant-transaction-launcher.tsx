"use client";

import type { KeyboardEvent, ReactNode } from "react";
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

/** Lazily mounts each transaction form on first visit. Switching tabs does not throw away drafts. */
export function InstantTransactionLauncher({ expense, income, transfer, initialType = null }: { expense: ReactNode; income: ReactNode; transfer: ReactNode; initialType?: TxType | null }) {
  const [type, setType] = useState<TxType | null>(initialType);
  const [visited, setVisited] = useState<TxType[]>(initialType ? [initialType] : []);

  useEffect(() => {
    setType(initialType);
    if (initialType) setVisited((current) => current.includes(initialType) ? current : [...current, initialType]);
  }, [initialType]);

  // On type change, show the new form from the beginning while preserving
  // the entered values in the previously visited form.
  useEffect(() => {
    if (type) document.querySelector<HTMLElement>(".fin-transaction-sheet [data-fin-sheet-scroll]")?.scrollTo({ top: 0, behavior: "auto" });
  }, [type]);

  const saving = () => Boolean(document.querySelector('.fin-transaction-sheet [aria-busy="true"]'));

  function openType(next: TxType) {
    if (saving()) return;
    setVisited((current) => current.includes(next) ? current : [...current, next]);
    setType(next);
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, current: TxType) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const index = buttons.findIndex((item) => item.type === current);
    const next = buttons[(index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length].type;
    openType(next);
    document.getElementById(`fin-transaction-tab-${next}`)?.focus();
  }

  const panels: Record<TxType, ReactNode> = { expense, income, transfer };
  return <>
    <div className="flex flex-wrap gap-2" aria-label="Thao tác giao dịch nhanh">
      {buttons.map(({ type: kind, icon: Icon, label, style }) => <button key={kind} type="button" onClick={() => openType(kind)} className={cn("fin-quick-action inline-flex min-h-11 items-center gap-2 rounded-xl border px-3.5 text-sm font-bold active:scale-[.98]", style)}><Icon className="size-4" />{label}</button>)}
    </div>
    <BottomSheet open={type !== null} onClose={() => { if (!saving()) setType(null); }} label="Ghi nhận giao dịch" zIndex="z-[90]" overlayClassName="sm:items-center sm:p-6" panelClassName="fin-transaction-sheet mx-auto max-w-2xl sm:max-h-[calc(100dvh-48px)] sm:rounded-[24px]">
      <div role="tablist" aria-label="Loại giao dịch" className="fin-transaction-tabs mx-2 mb-2 grid grid-cols-3 gap-1 rounded-2xl bg-[var(--muted)]/60 p-1.5">
        {buttons.map(({ type: kind, label, icon: Icon, style }) => <button
          id={`fin-transaction-tab-${kind}`}
          key={kind}
          type="button"
          role="tab"
          aria-selected={type === kind}
          aria-controls={`fin-transaction-panel-${kind}`}
          tabIndex={type === kind ? 0 : -1}
          onClick={() => openType(kind)}
          onKeyDown={(event) => onTabKeyDown(event, kind)}
          className={cn("fin-transaction-tab flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-1.5 text-xs font-bold", style, type === kind && "is-selected")}
        ><Icon className="size-4 shrink-0" />{label}</button>)}
      </div>
      <div onClickCapture={(event) => { const target = event.target as Element; if (target.closest("[data-instant-close]")) { event.preventDefault(); if (!saving()) setType(null); } }}>
        {visited.map((kind) => <div key={kind} id={`fin-transaction-panel-${kind}`} role="tabpanel" aria-labelledby={`fin-transaction-tab-${kind}`} className="fin-transaction-panel" hidden={type !== kind}>{panels[kind]}</div>)}
      </div>
    </BottomSheet>
  </>;
}
