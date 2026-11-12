"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, BarChart3 } from "lucide-react";
import type { MonthlyCashflowRow } from "@/features/reports/data";
import { trendChartBuckets } from "@/features/reports/chart-buckets";
import { formatMinorMoney } from "@/lib/utils";

type Display = "income" | "expense" | "net";
const palette: Record<Display, string> = { income: "#10b981", expense: "#fb7185", net: "#38bdf8" };
const legend: Record<Display, string> = { income: "Thu nhập", expense: "Chi tiêu", net: "Dòng tiền ròng" };

export function FinancialTrendExplorer({ rows, currency, decimalDigits, reportFrom, reportTo }: { rows: MonthlyCashflowRow[]; currency: string; decimalDigits: number; reportFrom?: string; reportTo?: string }) {
  const buckets = useMemo(() => trendChartBuckets(rows), [rows]);
  const [metric, setMetric] = useState<Display>("expense");
  const [index, setIndex] = useState(-1);
  const currentIndex = index < 0 ? Math.max(0, buckets.length - 1) : Math.min(index, Math.max(0, buckets.length - 1));
  const selected = buckets[currentIndex];
  const max = useMemo(() => Math.max(1, ...buckets.map((row) => Math.abs(row[metric]))), [buckets, metric]);
  const money = (value: number) => formatMinorMoney(value, currency, decimalDigits);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2"><BarChart3 className="size-4 text-[var(--primary)]"/><h2 className="font-extrabold">Xu hướng dòng tiền</h2></div>
        <div role="tablist" aria-label="Chọn chỉ số biểu đồ" className="fin-flow-switch flex rounded-xl bg-[var(--muted)] p-1 text-xs">
          {(["income", "expense", "net"] as const).map((kind) => <button key={kind} type="button" role="tab" aria-selected={metric === kind} onClick={() => setMetric(kind)} className={`min-h-10 rounded-lg px-2.5 py-1.5 font-bold transition-colors sm:px-3 ${metric === kind ? "bg-[var(--card)] shadow-sm" : "text-[var(--muted-foreground)]"}`}>{kind === "income" ? "Thu" : kind === "expense" ? "Chi" : "Ròng"}</button>)}
        </div>
      </div>
      {rows.length ? <>
        <div className="overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:thin]" role="group" aria-label={`Biểu đồ ${legend[metric]} tương tác; ${buckets.length} cột từ ${rows.length} tháng`}>
          <div className="fin-trend-bars flex h-48 min-w-max items-end gap-2 border-b border-[var(--border)] pt-4 sm:min-w-0 sm:gap-3">
            {buckets.map((row, i) => <button key={row.key} type="button" onClick={() => setIndex(i)} title={`${row.month}: ${money(row[metric])}`} aria-pressed={i === currentIndex} aria-label={`Chọn ${row.month}, ${legend[metric]} ${money(row[metric])}`} className={`group flex h-full w-14 shrink-0 flex-col items-center justify-end gap-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] sm:min-w-0 sm:flex-1 ${i === currentIndex ? "opacity-100" : "opacity-70 hover:opacity-100"}`}>
              <span className="w-full max-w-10 rounded-t-lg transition-[height,opacity] duration-200 motion-reduce:transition-none" style={{ height: `${Math.max(row[metric] ? 6 : 2, Math.abs(row[metric]) / max * 100)}%`, backgroundColor: row[metric] < 0 ? "#fb7185" : palette[metric], boxShadow: i === currentIndex ? `0 0 0 2px var(--card), 0 0 0 4px ${palette[metric]}` : "none" }} />
              <span className={`text-[10px] font-bold ${i === currentIndex ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}>{row.month}</span>
            </button>)}
          </div>
        </div>
        {selected && <div aria-live="polite" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--muted)]/60 p-3">
          <div><p className="text-xs text-[var(--muted-foreground)]">{legend[metric]} · {selected.month}</p><p className="mt-1 text-lg font-black tabular-nums" style={{ color: selected[metric] < 0 ? "#fb7185" : palette[metric] }}>{money(selected[metric])}</p><p className="mt-1 text-[11px] text-[var(--muted-foreground)]">{selected.span > 1 ? `${selected.span} tháng · ` : ""}Thu {money(selected.income)} · Chi {money(selected.expense)}{metric === "net" ? " · Màu hồng = dòng tiền âm" : ""}</p></div>
          <Link className="fin-secondary-btn !text-xs" href={`/transactions?from=${encodeURIComponent(reportFrom && reportFrom > selected.from ? reportFrom : selected.from)}&to=${encodeURIComponent(reportTo && reportTo < selected.to ? reportTo : selected.to)}${metric === "net" ? "" : `&type=${metric}`}`}>Xem giao dịch <ArrowUpRight className="size-3.5" /></Link>
        </div>}
      </> : <p className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted-foreground)]">Chưa có kỳ báo cáo phù hợp.</p>}
    </div>
  );
}
