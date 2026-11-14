"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, Maximize2, X } from "lucide-react";
import Link from "next/link";
import { useOverlayScrollLock } from "@/components/use-overlay-scroll-lock";
import { TREND_RANGES, buildTrendPoints, type TrendPoint, type TrendRange } from "@/features/dashboard/trends";
import type { DailyFinancialRow } from "@/features/dashboard/snapshot";
import { formatMinorMoney } from "@/lib/utils";

const colors = { income: "#10b981", expense: "#f43f5e", netWorth: "#3b82f6" } as const;
const readySubscribe = () => () => {};

type PlotProps = { rows: TrendPoint[]; index: number; onPick: (index: number) => void; currency: string; digits: number; expanded?: boolean };

function TrendPlot({ rows, index, onPick, currency, digits, expanded = false }: PlotProps) {
  const width = 1000, height = expanded ? 470 : 260;
  const padLeft = 91, padRight = 91, padTop = 30, padBottom = 40;
  // Dual y-axes: monthly cashflow and total liquid position can differ by
  // orders of magnitude. A single axis would make Thu/Chi appear flat.
  const flowValues = rows.flatMap((r) => [r.income, r.expense]);
  const positionValues = rows.map((r) => r.netWorth);
  const flowMax = Math.max(1, ...flowValues) * 1.1;
  const flowMin = Math.min(0, ...flowValues) * 1.1;
  const positionPeak = Math.max(1, ...positionValues);
  const positionLow = positionValues.length ? Math.min(...positionValues) : 0;
  const positionMargin = Math.max(1, (positionPeak - positionLow) * .12, Math.abs(positionPeak) * .015);
  const positionTop = positionPeak + positionMargin, positionBottom = positionLow - positionMargin;
  const chartHeight = height - padTop - padBottom;
  const yFlow = (v: number) => padTop + (flowMax - v) / Math.max(1, flowMax-flowMin) * chartHeight;
  const yPosition = (v: number) => padTop + (positionTop - v) / Math.max(1, positionTop-positionBottom) * chartHeight;
  const y = (field: keyof Pick<TrendPoint, "income" | "expense" | "netWorth">, value: number) => field === "netWorth" ? yPosition(value) : yFlow(value);
  const x = (i: number) => padLeft + (rows.length === 1 ? (width - padLeft - padRight) / 2 : i * (width - padLeft - padRight) / Math.max(1, rows.length - 1));
  const path = (field: keyof Pick<TrendPoint, "income" | "expense" | "netWorth">) => rows.map((r,i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(field, r[field]).toFixed(1)}`).join(" ");
  const compact = (amount: number) => new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 1 }).format(amount / (10 ** digits));
  const marks = Array.from({ length: 5 }, (_, i) => flowMax - (flowMax - flowMin) * i / 4);
  const positionMarks = Array.from({ length: 5 }, (_, i) => positionTop - (positionTop-positionBottom) * i / 4);
  const active = rows[Math.max(0, Math.min(index, rows.length - 1))];
  const money = (amount: number) => formatMinorMoney(amount, currency, digits);
  const stride = Math.max(1, Math.ceil(rows.length / (expanded ? 12 : 6)));
  return <div className="min-w-0">
    {active && <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl bg-[var(--muted)]/65 p-3 text-xs" aria-live="polite">
      <span className="font-extrabold">{active.label}</span>
      <div className="flex flex-wrap gap-x-4 gap-y-1 font-bold tabular-nums">
        <span style={{ color: colors.income }}>Thu {money(active.income)}</span>
        <span style={{ color: colors.expense }}>Chi {money(active.expense)}</span>
        <span style={{ color: colors.netWorth }}>Tài sản ròng* {money(active.netWorth)}</span>
      </div>
    </div>}
    <div className="min-w-0 overflow-x-auto overscroll-x-contain" aria-label="Biểu đồ xu hướng tài chính tương tác">
      <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full min-w-[420px]" role="group" aria-label="Xu hướng Thu, Chi và Tài sản ròng; chọn điểm dữ liệu để xem giá trị">
        <defs><linearGradient id={expanded ? "fin-net-area-full" : "fin-net-area-inline"} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={colors.netWorth} stopOpacity=".22"/><stop offset="100%" stopColor={colors.netWorth} stopOpacity="0"/></linearGradient></defs>
        <text x={padLeft-8} y="14" fill="currentColor" opacity=".6" fontSize="11" textAnchor="end">Thu / Chi</text>
        <text x={width-padRight+9} y="14" fill={colors.netWorth} opacity=".9" fontSize="11" textAnchor="start">Tài sản</text>
        {marks.map((v,i) => <g key={i}><line x1={padLeft} y1={yFlow(v)} x2={width-padRight} y2={yFlow(v)} stroke="currentColor" strokeOpacity=".13" strokeDasharray="4 5"/>
          <text x={padLeft - 9} y={yFlow(v)+4} fill="currentColor" opacity=".62" fontSize="12" textAnchor="end">{compact(v)}</text>
          <text x={width-padRight+8} y={yFlow(v)+4} fill={colors.netWorth} opacity=".82" fontSize="12" textAnchor="start">{compact(positionMarks[i])}</text></g>)}
        {rows.map((r,i) => i % stride === 0 || i === rows.length - 1 ? <text key={r.key} x={x(i)} y={height-13} fontSize="12" fill="currentColor" opacity=".65" textAnchor="middle">{r.label}</text> : null)}
        {rows.length > 1 && <path d={`${path("netWorth")} L${x(rows.length-1)},${height-padBottom} L${x(0)},${height-padBottom} Z`} fill={`url(#${expanded ? "fin-net-area-full" : "fin-net-area-inline"})`}/>}
        {(["income", "expense", "netWorth"] as const).map((field) => <path key={field} d={path(field)} fill="none" stroke={colors[field]} strokeWidth={expanded ? 3.3 : 3} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>)}
        {active && <g><line x1={x(index)} x2={x(index)} y1={padTop} y2={height-padBottom} stroke="currentColor" strokeOpacity=".35" strokeDasharray="5 6"/>
          {(["income","expense","netWorth"] as const).map((field) => <circle key={field} cx={x(index)} cy={y(field, active[field])} r="5" fill={colors[field]} stroke="var(--card)" strokeWidth="2"/>)}</g>}
        {rows.map((row,i) => <rect key={row.key} x={i === 0 ? padLeft : (x(i-1)+x(i))/2} y={padTop} width={i===rows.length-1 ? width-padRight-(i===0?padLeft:(x(i-1)+x(i))/2) : (x(i)+x(i+1))/2-(i===0?padLeft:(x(i-1)+x(i))/2)} height={height-padTop-padBottom} fill="transparent" role="button" tabIndex={0} aria-label={`${row.label}: Thu ${money(row.income)}, Chi ${money(row.expense)}, Tài sản ròng ước tính ${money(row.netWorth)}`} onClick={() => onPick(i)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onPick(i); } }}/>) }
      </svg>
    </div>
  </div>;
}

/** All five intervals are derived client-side from the same 366 daily rows. */
export function CashflowChart({ daily, closingBalance, today, decimalDigits = 0, currency = "VND" }: {
  daily: DailyFinancialRow[]; closingBalance: number; today: string; decimalDigits?: number; currency?: string;
}) {
  const [range, setRange] = useState<TrendRange>("6m");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const expandRef = useRef<HTMLButtonElement>(null);
  const mounted = useSyncExternalStore(readySubscribe, () => true, () => false);
  useOverlayScrollLock(expanded);
  const points = useMemo(() => buildTrendPoints(daily, closingBalance, today, range), [daily, closingBalance, today, range]);
  const selectedIndex = Math.max(0, selectedKey ? points.findIndex((row) => row.key === selectedKey) : points.length - 1);
  const changeRange = (value: TrendRange) => { setRange(value); setSelectedKey(null); };
  useEffect(() => {
    if (!expanded) return;
    const returnFocusTarget = expandRef.current;
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus({ preventScroll: true }));
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setExpanded(false); return; }
      if (event.key !== "Tab") return;
      const modal = document.querySelector<HTMLElement>(".fin-trend-modal");
      const tabbables = Array.from(modal?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])') ?? [])
        .filter((node) => node.getClientRects().length > 0);
      if (tabbables.length === 0) return;
      if (event.shiftKey && document.activeElement === tabbables[0]) { event.preventDefault(); tabbables[tabbables.length-1].focus(); }
      else if (!event.shiftKey && document.activeElement === tabbables[tabbables.length-1]) { event.preventDefault(); tabbables[0].focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener("keydown", onKey); returnFocusTarget?.focus({ preventScroll: true }); };
  }, [expanded]);
  const controls = (isModal: boolean) => <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Chọn khoảng thời gian xu hướng">
    {TREND_RANGES.map((item) => <button key={item.key} type="button" aria-pressed={range===item.key} onClick={() => changeRange(item.key)}
      className={`min-h-10 rounded-lg px-2.5 text-[11px] font-bold sm:px-3 ${range===item.key ? "bg-[var(--primary)] text-white" : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}>
      {item.label}</button>)}
    {!isModal && <button type="button" ref={expandRef} onClick={() => setExpanded(true)} className="fin-secondary-btn !ml-auto !min-h-10 !px-3 !text-xs" aria-label="Mở biểu đồ xu hướng toàn màn hình"><Maximize2 className="size-4"/> Toàn màn hình</button>}
  </div>;
  const legend = <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-[var(--muted-foreground)]">
    <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full" style={{backgroundColor:colors.income}}/>Thu nhập</span>
    <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full" style={{backgroundColor:colors.expense}}/>Chi tiêu</span>
    <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full" style={{backgroundColor:colors.netWorth}}/>Tài sản ròng*</span>
  </div>;
  return <>
    <div className="space-y-3">{controls(false)}{legend}<TrendPlot rows={points} index={selectedIndex} onPick={(i)=>setSelectedKey(points[i].key)} currency={currency} digits={decimalDigits}/>
      <p className="text-[10px] leading-relaxed text-[var(--muted-foreground)]">*Tài sản ròng ước tính từ số dư tiền mặt, ngân hàng và ví cùng loại tiền; chưa bao gồm đầu tư và công nợ.</p>
    </div>
    {expanded && mounted && createPortal(<div className="fin-trend-modal fixed inset-0 z-[10000] flex flex-col bg-[var(--background)]" role="dialog" aria-modal="true" aria-labelledby="fin-trend-modal-heading">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3" style={{paddingTop:"max(12px, env(safe-area-inset-top))"}}>
        <div className="min-w-0"><p className="fin-section-eyebrow">FINZARO · CHART VIEW</p><h2 id="fin-trend-modal-heading" className="truncate text-lg font-extrabold">Xu hướng tài chính</h2></div>
        <button type="button" ref={closeRef} onClick={() => setExpanded(false)} aria-label="Đóng biểu đồ toàn màn hình" className="grid size-11 shrink-0 place-items-center rounded-xl border border-[var(--border)] hover:bg-[var(--muted)]"><X className="size-5"/></button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6" style={{paddingBottom:"max(18px, env(safe-area-inset-bottom))"}}>
        <div className="mx-auto max-w-[1600px] space-y-4">
          {controls(true)}{legend}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 sm:p-5">
            <TrendPlot rows={points} index={selectedIndex} onPick={(i)=>setSelectedKey(points[i].key)} currency={currency} digits={decimalDigits} expanded/>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--muted-foreground)]"><p>*Tài sản ròng ước tính từ tiền mặt, tài khoản ngân hàng và ví; chưa bao gồm đầu tư, nợ và ngoại tệ khác.</p>
            <Link href="/reports" className="inline-flex items-center gap-1.5 font-bold text-[var(--primary)]">Xem Báo cáo <ArrowUpRight className="size-3.5"/></Link></div>
        </div>
      </div>
    </div>, document.body)}
  </>;
}
