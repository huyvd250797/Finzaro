"use client";

import { useMemo, useState } from "react";
import { formatMinorMoney } from "@/lib/utils";

export type CashflowPoint = { month: string; income: number; expense: number };

/** Six-month interactive trend: all data is supplied by the server, so hover/touch/selection never fetches again. */
export function CashflowChart({ data, decimalDigits = 0, currency = "VND" }: { data: CashflowPoint[]; decimalDigits?: number; currency?: string }) {
  const [index, setIndex] = useState<number | null>(null);
  const width = 620;
  const height = 210;
  const padX = 25;
  const padTop = 19;
  const padBottom = 30;
  const scale = 10 ** decimalDigits;
  const major = useMemo(() => data.map((row) => ({ ...row, income: Math.max(0, row.income / scale), expense: Math.max(0, row.expense / scale) })), [data, scale]);
  const maxValue = Math.max(1, ...major.flatMap((row) => [row.income, row.expense]));
  const max = maxValue * 1.14;
  const step = major.length > 1 ? (width - padX * 2) / (major.length - 1) : 0;
  const y = (v: number) => height - padBottom - (v / max) * (height - padTop - padBottom);
  const line = (key: "income" | "expense") => major.map((d, i) => `${i === 0 ? "M" : "L"}${(padX + i * step).toFixed(1)},${y(d[key]).toFixed(1)}`).join(" ");
  const selectedIndex = index === null ? Math.max(0, data.length - 1) : Math.min(index, data.length - 1);
  const selected = data[selectedIndex];
  const money = (value: number) => formatMinorMoney(value, currency, decimalDigits);

  return (
    <div className="fin-cashflow-explorer min-w-0" aria-label="Biểu đồ dòng tiền 6 tháng tương tác">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-[var(--muted-foreground)]">
        <div className="flex items-center gap-3"><span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-emerald-500" />Thu</span><span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-rose-500" />Chi</span></div>
        <span>Chọn một tháng để xem số liệu</span>
      </div>
      {selected ? <div className="fin-chart-selection mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2" aria-live="polite">
        <span className="text-xs font-bold text-[var(--muted-foreground)]">{selected.month}</span>
        <span className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-extrabold tabular-nums"><span className="text-emerald-600 dark:text-emerald-400">+{money(selected.income).replace(/^[-+]/, "")}</span><span className="text-rose-600 dark:text-rose-400">−{money(selected.expense).replace(/^[-+]/, "")}</span></span>
      </div> : null}
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 block h-auto w-full overflow-visible" role="img" aria-label={`Xu hướng thu và chi trong ${data.length} tháng; dùng các nút tháng bên dưới để chọn`}>
        {[0, 1, 2, 3].map((i) => {
          const gy = padTop + i * ((height - padTop - padBottom) / 3);
          return <line key={i} x1={padX} y1={gy} x2={width - padX} y2={gy} stroke="currentColor" strokeOpacity=".12" strokeDasharray="4 7" />;
        })}
        {major.length > 0 && <>
          <path d={line("income")} className="fin-chart-reveal" fill="none" stroke="#10b981" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" pathLength={1}/>
          <path d={line("expense")} className="fin-chart-reveal" fill="none" stroke="#f43f5e" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" pathLength={1}/>
        </>}
        {major.map((d, i) => <g key={`${d.month}-${i}`}>
          {i === selectedIndex && <line x1={padX + i * step} x2={padX + i * step} y1={padTop} y2={height - padBottom} stroke="var(--primary)" strokeDasharray="3 5" opacity=".5" />}
          <circle cx={padX + i * step} cy={y(d.income)} r={i === selectedIndex ? 6 : 3.5} fill="#10b981" stroke="var(--card)" strokeWidth="2" />
          <circle cx={padX + i * step} cy={y(d.expense)} r={i === selectedIndex ? 6 : 3.5} fill="#f43f5e" stroke="var(--card)" strokeWidth="2" />
        </g>)}
      </svg>
      <div className="mt-1 grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.max(1, data.length)}, minmax(0, 1fr))` }} role="group" aria-label="Chọn tháng">
        {data.map((row, i) => <button type="button" key={`${row.month}-${i}`} aria-pressed={i === selectedIndex} onClick={() => setIndex(i)} className={`fin-chart-period min-h-11 rounded-lg px-0.5 text-[11px] font-bold transition-colors ${i === selectedIndex ? "is-active" : "text-[var(--muted-foreground)]"}`}>{row.month}</button>)}
      </div>
      {!data.length && <p className="py-5 text-center text-sm text-[var(--muted-foreground)]">Chưa có dữ liệu dòng tiền.</p>}
    </div>
  );
}
