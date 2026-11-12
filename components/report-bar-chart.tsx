"use client";

import { useState } from "react";
import { formatCompactMoney } from "@/lib/utils";

export type ReportBarPoint = { label: string; value: number };

/** A keyboard/touch-friendly bar chart with a persistent value readout. */
export function ReportBarChart({ data, decimalDigits = 0, ariaLabel = "Biểu đồ theo thời gian" }: { data: ReportBarPoint[]; decimalDigits?: number; ariaLabel?: string }) {
  const [index, setIndex] = useState<number | null>(null);
  const scale = 10 ** decimalDigits;
  const major = data.map((item) => ({ ...item, major: Math.max(0, item.value / scale) }));
  const max = Math.max(1, ...major.map((item) => item.major));
  const active = Math.min(index ?? Math.max(0, major.length - 1), Math.max(0, major.length - 1));
  return <div className="fin-bar-explorer min-w-0">
    {major[active] && <p aria-live="polite" className="fin-chart-selection mb-3 rounded-xl px-3 py-2 text-xs font-semibold">{major[active].label} <span className="ml-2 font-extrabold text-[var(--foreground)] tabular-nums">{formatCompactMoney(major[active].major)}</span></p>}
    <div aria-label={ariaLabel} className="overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:thin]">
      <div className="flex min-w-[440px] items-end gap-1.5 sm:gap-3" style={{ height: 195 }} role="group" aria-label="Chọn kỳ để xem giá trị">
        {major.map((item, i) => {
          const barHeight = item.value > 0 ? Math.max(6, (item.major / max) * 132) : 2;
          return <button type="button" key={`${item.label}-${i}`} aria-label={`${item.label}: ${formatCompactMoney(item.major)}`} title={`${item.label}: ${formatCompactMoney(item.major)}`} aria-pressed={i === active} onClick={() => setIndex(i)} className="fin-bar-column group flex min-w-0 flex-1 flex-col items-center justify-end self-stretch rounded-t-lg outline-offset-2 focus-visible:outline-2 focus-visible:outline-[var(--primary)]">
            <span className={`mb-1 text-[9px] font-bold tabular-nums ${i === active ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}>{item.value > 0 ? formatCompactMoney(item.major) : ""}</span>
            <span className="flex h-[138px] w-full items-end justify-center border-b border-[var(--border)]"><span className="fin-bar-fill block w-[min(70%,36px)] rounded-t-lg" style={{ height: barHeight, opacity: i === active ? 1 : .72 }} /></span>
            <span className={`mt-2 truncate text-[10px] font-bold ${i === active ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}>{item.label}</span>
          </button>;
        })}
      </div>
    </div>
    {!major.length && <p className="py-6 text-center text-sm text-[var(--muted-foreground)]">Chưa có dữ liệu để vẽ biểu đồ.</p>}
  </div>;
}
