"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { CategoryIcon, iconColorValue } from "@/features/categories/icons";
import { ReportDonut, type DonutSlice } from "@/components/report-donut";
import { ReportVisualBoundary } from "@/components/report-visual-boundary";
import { Card, CardContent } from "@/components/ui/card";
import type { ReportFlowType } from "@/features/reports/experience";
import { cn, formatMinorMoney } from "@/lib/utils";
import { measureClientPaint } from "@/lib/client-performance";

export type ReportPreviewRow = {
  id: string;
  title: string;
  transactionDate: string;
  categoryName: string;
  iconName: string | null;
  iconColor: string | null;
  amount: number;
};

export type ReportFlowSnapshot = {
  amount: number;
  slices: DonutSlice[];
  transactions: ReportPreviewRow[];
};

/** The server computes BOTH flows once. Switching tabs is only a React state update. */
export function InstantReportBreakdown({
  initialType,
  periodLabel,
  periodKey,
  currency,
  digits,
  from,
  to,
  flows
}: {
  initialType: ReportFlowType;
  periodLabel: string;
  periodKey: string;
  currency: string;
  digits: number;
  from: string;
  to: string;
  flows: Record<ReportFlowType, ReportFlowSnapshot>;
}) {
  const [type, setType] = useState<ReportFlowType>(initialType);
  // A real period navigation supplies fresh server data; do not keep the previous tab by accident.
  useEffect(() => { setType(initialType); }, [initialType, periodKey]);
  useEffect(() => {
    const onHistory = () => {
      const next = new URLSearchParams(window.location.search).get("type");
      setType(next === "income" ? "income" : "expense");
    };
    window.addEventListener("popstate", onHistory);
    return () => window.removeEventListener("popstate", onHistory);
  }, []);
  const selected = flows[type];
  const total = selected.amount;
  const money = useMemo(() => (value: number) => formatMinorMoney(value, currency, digits), [currency, digits]);

  function changeType(next: ReportFlowType) {
    if (next === type) return;
    // Next App Router supports native history updates: no RSC request and browser Back still works.
    const startedAt = performance.now();
    const url = new URL(window.location.href);
    url.searchParams.set("type", next);
    window.history.pushState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    setType(next);
    window.dispatchEvent(new CustomEvent("finzaro:report-flow-change", { detail: { type: next } }));
    measureClientPaint("reports.flow.toggle", startedAt);
  }

  return <>
    <Card className="mt-3">
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div><h2 className="font-black">{type === "expense" ? "Chi tiêu" : "Thu nhập"} theo danh mục</h2><p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">{periodLabel} · {currency}</p></div>
          <div className="text-right">
            <p className="text-sm font-black">{money(total)}</p>
            <div className="mt-1.5 grid grid-cols-2 rounded-lg bg-[var(--muted)]/70 p-0.5" role="group" aria-label="Loại báo cáo">
              {(["expense", "income"] as const).map((next) => <button key={next} type="button" onClick={() => changeType(next)} aria-pressed={type === next} className={cn("min-h-8 rounded-md px-3 text-[11px] font-black transition-colors", type === next ? `bg-[var(--card)] shadow-sm ${next === "expense" ? "text-rose-500" : "text-emerald-500"}` : "text-[var(--muted-foreground)]")}>{next === "expense" ? "Chi" : "Thu"}</button>)}
            </div>
          </div>
        </div>
        {selected.slices.length === 0 ? <div className="mt-3 rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--muted-foreground)]">Chưa có giao dịch trong kỳ.</div> : <div className="mt-3"><ReportVisualBoundary><ReportDonut key={`${periodKey}-${type}`} slices={selected.slices} total={total} currency={currency} decimalDigits={digits} centerLabel={type === "expense" ? "Tổng chi" : "Tổng thu"}/></ReportVisualBoundary></div>}
      </CardContent>
    </Card>
    <Card className="mt-3"><CardContent className="p-0">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] p-3.5 sm:p-4"><div><h2 className="font-black">Chi tiết giao dịch</h2><p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">{type === "expense" ? "Chi tiêu" : "Thu nhập"} gần nhất trong kỳ</p></div><Link href={`/transactions?${new URLSearchParams({ type, from, to })}`} className="text-xs font-black text-[var(--primary)]">Xem tất cả</Link></div>
      {selected.transactions.length === 0 ? <p className="p-6 text-sm text-[var(--muted-foreground)]">Chưa có giao dịch phù hợp.</p> : <div className="divide-y divide-[var(--border)]">{selected.transactions.map((transaction) => <Link key={transaction.id} href={`/transactions?q=${encodeURIComponent(transaction.title)}`} className="flex min-w-0 items-center gap-3 p-3.5 active:bg-[var(--muted)]">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--muted)]" style={{ color: iconColorValue(transaction.iconColor) }}><CategoryIcon name={transaction.iconName} className="size-4" /></span>
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-black">{transaction.categoryName}</span><span className="mt-0.5 block truncate text-[11px] text-[var(--muted-foreground)]">{transaction.title} · {transaction.transactionDate}</span></span>
        <span className={cn("shrink-0 text-xs font-black", type === "income" ? "text-emerald-500" : "text-rose-500")}>{type === "income" ? "+" : "−"}{money(transaction.amount).replace(/^[-+]/, "")}</span><ChevronRight className="size-4 shrink-0 text-[var(--muted-foreground)]" />
      </Link>)}</div>}
    </CardContent></Card>
  </>;
}
