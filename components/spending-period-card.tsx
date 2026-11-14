"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, ChevronRight, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryIcon, iconColorValue } from "@/features/categories/icons";
import type { DashboardFlow, SpendingPeriod, SpendingSummary } from "@/features/dashboard/snapshot";
import { formatMinorMoney } from "@/lib/utils";

const labels: Record<DashboardFlow, Record<SpendingPeriod, { eyebrow: string; title: string; empty: string }>> = {
  expense: {
    today: { eyebrow: "CHI TIÊU TRONG NGÀY", title: "Chi tiêu hôm nay", empty: "Hôm nay chưa có khoản chi" },
    month: { eyebrow: "CHI TIÊU THÁNG", title: "Chi tiêu tháng này", empty: "Tháng này chưa có khoản chi" },
    year: { eyebrow: "CHI TIÊU NĂM", title: "Chi tiêu năm nay", empty: "Năm nay chưa có khoản chi" }
  },
  income: {
    today: { eyebrow: "THU NHẬP TRONG NGÀY", title: "Thu nhập hôm nay", empty: "Hôm nay chưa có khoản thu" },
    month: { eyebrow: "THU NHẬP THÁNG", title: "Thu nhập tháng này", empty: "Tháng này chưa có khoản thu" },
    year: { eyebrow: "THU NHẬP NĂM", title: "Thu nhập năm nay", empty: "Năm nay chưa có khoản thu" }
  }
};

export function SpendingPeriodCard({ period, summary, incomeSummary, today, currency, digits }: {
  period: SpendingPeriod; summary: SpendingSummary; incomeSummary: SpendingSummary;
  today: string; currency: string; digits: number;
}) {
  const [flow, setFlow] = useState<DashboardFlow>("expense");
  const current = flow === "expense" ? summary : incomeSummary;
  const info = labels[flow][period];
  const from = period === "today" ? today : period === "month" ? `${today.slice(0,7)}-01` : `${today.slice(0,4)}-01-01`;
  const to = period === "today" ? today : period === "month"
    ? new Date(Date.UTC(Number(today.slice(0,4)), Number(today.slice(5,7)), 0)).toISOString().slice(0,10)
    : `${today.slice(0,4)}-12-31`;
  const expenseLink = `/transactions?${new URLSearchParams({ type: "expense", from, to })}`;
  const incomeLink = `/transactions?${new URLSearchParams({ type: "income", from, to })}`;
  const link = flow === "expense" ? expenseLink : incomeLink;
  const isIncome = flow === "income";
  const money = (amount: number) => formatMinorMoney(amount, currency, digits);

  return <Card className={`fin-overview-spend-${period} fin-dashboard-card`}><CardContent className="p-4 sm:p-5">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0"><p className="fin-section-eyebrow">{info.eyebrow}</p>
        <h2 className="mt-1 text-base font-extrabold">{info.title}</h2></div>
      <div className="inline-flex shrink-0 rounded-xl border border-[var(--border)] bg-[var(--muted)] p-0.5" role="group" aria-label={`Chọn loại dòng tiền ${period}`}>
        <button type="button" onClick={() => setFlow("expense")} aria-pressed={!isIncome}
          className={`inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-[11px] font-bold transition-colors ${!isIncome ? "bg-[var(--card)] text-[var(--fin-expense)] shadow-sm" : "text-[var(--muted-foreground)]"}`}>
          <ArrowUpRight className="size-3.5" aria-hidden="true"/> Chi
        </button>
        <button type="button" onClick={() => setFlow("income")} aria-pressed={isIncome}
          className={`inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-[11px] font-bold transition-colors ${isIncome ? "bg-[var(--card)] text-[var(--fin-income)] shadow-sm" : "text-[var(--muted-foreground)]"}`}>
          <ArrowDownLeft className="size-3.5" aria-hidden="true"/> Thu
        </button>
      </div>
    </div>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-[var(--muted-foreground)]">{period === "today" ? today.split("-").reverse().join("/") : period === "month" ? `Tháng ${Number(today.slice(5,7))}/${today.slice(0,4)}` : `Năm ${today.slice(0,4)}`} · {current.count} {isIncome ? "khoản thu" : "khoản chi"}</p>
      <Link className="fin-text-action shrink-0" href={link}>Xem tất cả <ArrowRight className="size-3.5"/></Link>
    </div>
    <p className={`mb-4 break-words text-[clamp(1.5rem,5.3vw,2rem)] font-extrabold tracking-tight tabular-nums ${isIncome ? "text-[var(--fin-income)]" : "text-[var(--fin-expense)]"}`} aria-live="polite">{money(current.amount)}</p>
    {current.count ? <>
      <p className="mb-3 text-xs font-bold text-[var(--muted-foreground)]">Theo danh mục</p>
      <div className="space-y-3">{current.categories.slice(0, 5).map((item) => <div key={item.id} className="flex min-w-0 items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--muted)]" style={{ color: iconColorValue(item.iconColor) }}><CategoryIcon name={item.iconName} className="size-4.5"/></span>
        <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-bold">{item.label}</span><span className="shrink-0 text-xs font-extrabold tabular-nums">{money(item.amount)}</span></div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--muted)]"><div className="h-full rounded-full" style={{ width: `${current.amount ? Math.max(0, Math.min(100, item.amount / current.amount * 100)) : 0}%`, backgroundColor: iconColorValue(item.iconColor) }}/></div>
        </div>
      </div>)}</div>
      <details key={flow} className="fin-today-expense-details group mt-4 border-t border-[var(--border)] pt-3">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-2 py-2 text-xs font-bold hover:bg-[var(--muted)]/60 focus-visible:outline-2 focus-visible:outline-[var(--primary)] [&::-webkit-details-marker]:hidden">
          <span>{isIncome ? "Các khoản đã thu" : "Các khoản đã chi"} ({current.count})</span><ChevronRight className="size-4 text-[var(--muted-foreground)] transition-transform group-open:rotate-90"/>
        </summary>
        {current.recent.map((tx) => <div key={tx.id} className="fin-today-expense-row flex min-w-0 items-center justify-between gap-3 py-2.5">
          <div className="min-w-0"><p className="truncate text-sm font-semibold" title={tx.title}>{tx.title}</p><p className="truncate text-[11px] text-[var(--muted-foreground)]">{tx.category} · {tx.date.split("-").reverse().join("/")}</p></div>
          <span className={`shrink-0 text-xs font-extrabold tabular-nums ${isIncome ? "text-[var(--fin-income)]" : ""}`}>{isIncome ? "+" : "−"}{money(tx.amount)}</span>
        </div>)}
        {current.count > current.recent.length && <Link href={link} className="fin-text-action mt-2">Xem thêm {current.count - current.recent.length} {isIncome ? "khoản thu" : "khoản chi"} <ArrowRight className="size-3.5"/></Link>}
      </details>
    </> : <div className="fin-empty-card"><Sparkles className="mb-2 size-5 text-[var(--primary)]"/><p className="text-sm font-semibold">{info.empty}</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">Giao dịch phát sinh sẽ được cập nhật tại đây.</p></div>}
  </CardContent></Card>;
}
