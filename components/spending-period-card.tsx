"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, ChevronRight, Minus, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryIcon, iconColorValue } from "@/features/categories/icons";
import type { DashboardFlow, SpendingPeriod, SpendingSummary } from "@/features/dashboard/snapshot";
import { formatMinorMoney } from "@/lib/utils";
import { comparePeriodTotals, comparisonRanges, type DashboardPrevious } from "@/features/dashboard/period-comparison";

const percentFormatter = new Intl.NumberFormat("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

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

export function SpendingPeriodCard({ period, summary, incomeSummary, previous, today, currency, digits }: {
  period: SpendingPeriod; summary: SpendingSummary; incomeSummary: SpendingSummary; previous: DashboardPrevious;
  today: string; currency: string; digits: number;
}) {
  const [flow, setFlow] = useState<DashboardFlow>("expense");
  const current = flow === "expense" ? summary : incomeSummary;
  const info = labels[flow][period];
  const from = period === "today" ? today : period === "month" ? `${today.slice(0,7)}-01` : `${today.slice(0,4)}-01-01`;
  // Current periods are partial until today, even if later-dated transactions exist.
  const to = today;
  const expenseLink = `/transactions?${new URLSearchParams({ type: "expense", from, to })}`;
  const incomeLink = `/transactions?${new URLSearchParams({ type: "income", from, to })}`;
  const link = flow === "expense" ? expenseLink : incomeLink;
  const isIncome = flow === "income";
  const money = (amount: number) => formatMinorMoney(amount, currency, digits);
  const previousAmount = previous[flow][period];
  const change = comparePeriodTotals(current.amount, previousAmount, flow);
  const ranges = comparisonRanges(today);
  const previousLink = `/transactions?${new URLSearchParams({ type: flow, from: ranges[period].from, to: ranges[period].to })}`;
  const compareLabel = period === "today" ? "So với toàn bộ hôm qua" : period === "month" ? "So với toàn bộ tháng trước" : "So với toàn bộ năm trước";
  const priorLabel = period === "today" ? (isIncome ? "Tổng thu nhập hôm qua" : "Tổng chi tiêu hôm qua")
    : period === "month" ? (isIncome ? "Tổng thu nhập tháng trước" : "Tổng chi tiêu tháng trước")
    : (isIncome ? "Tổng thu nhập năm trước" : "Tổng chi tiêu năm trước");
  // Month/year are ongoing periods versus a COMPLETED baseline: "Thấp hơn/Vượt"
  // avoids claiming that spending or income has definitively fallen for the full period.
  const changePrefix = change.difference > 0
    ? period === "today" ? `Tăng ${isIncome ? "thu" : "chi"}` : `${isIncome ? "Thu" : "Chi"} vượt`
    : change.difference < 0
      ? period === "today" ? `Giảm ${isIncome ? "thu" : "chi"}` : `${isIncome ? "Thu" : "Chi"} thấp hơn`
      : previousAmount === 0 ? "Không phát sinh ở cả hai kỳ" : "Không đổi";
  const amountDelta = change.difference !== 0
    ? `${changePrefix} ${money(Math.abs(change.difference))}` : changePrefix;
  const percentDelta = change.percent === null ? "Mới phát sinh"
    : `${change.percent > 0 ? "+" : change.percent < 0 ? "−" : ""}${percentFormatter.format(Math.abs(change.percent))}%`;
  const changeTone = change.direction === "positive" ? "text-[var(--fin-income)]" : change.direction === "negative" ? "text-[var(--fin-expense)]" : "text-[var(--muted-foreground)]";
  // Match the zigzag arrows in the visual reference. Direction is mathematical;
  // color is determined separately by financial impact (income up / expense down = green).
  const ChangeIcon = change.difference > 0 ? TrendingUp : change.difference < 0 ? TrendingDown : Minus;

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
    <div className="mb-4 flex min-w-0 items-end justify-between gap-2" aria-live="polite">
      <p className={`min-w-0 flex-1 break-words text-[clamp(1.35rem,4.8vw,2rem)] font-extrabold tracking-tight tabular-nums ${isIncome ? "text-[var(--fin-income)]" : "text-[var(--fin-expense)]"}`}>{money(current.amount)}</p>
      <div className="min-w-0 max-w-[49%] shrink-0 text-right" aria-label={`${compareLabel}: ${amountDelta}, ${percentDelta}`}>
        <p className="text-[10px] font-medium leading-tight text-[var(--muted-foreground)] sm:text-xs">{compareLabel}</p>
        {/* Keep the icon in the SAME inline phrase as the direction label.
            A flex row here separates the icon when the amount wraps on narrow iPhones. */}
        <p className={`mt-0.5 break-words text-right text-[clamp(.625rem,2.3vw,.75rem)] font-semibold leading-snug tabular-nums ${changeTone}`}>
          {change.difference !== 0 ? <>
            <span className="inline-flex items-center gap-[2px] whitespace-nowrap align-middle">
              <ChangeIcon className="size-[1em] shrink-0" strokeWidth={2.25} aria-hidden="true"/>
              <span>{changePrefix}</span>
            </span>{" "}<span className="whitespace-nowrap">{money(Math.abs(change.difference))}</span>
          </> : <>
            <ChangeIcon className="mr-[2px] inline-block size-[1em] align-[-0.125em]" strokeWidth={2.25} aria-hidden="true"/>
            {amountDelta}
          </>}{" "}{change.percent === null ? `· ${percentDelta}` : `(${percentDelta})`}
        </p>
      </div>
    </div>
    <Link href={previousLink} title={`Xem giao dịch ${ranges[period].from} đến ${ranges[period].to}`}
      className="mb-4 flex min-h-8 items-center justify-between gap-2 rounded-lg border-t border-[var(--border)] pt-2 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
      <span>{priorLabel}</span>
      <span className="inline-flex shrink-0 items-center gap-1 font-bold tabular-nums text-[var(--foreground)]">{money(previousAmount)}<ChevronRight className="size-3.5" aria-hidden="true"/></span>
    </Link>
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
