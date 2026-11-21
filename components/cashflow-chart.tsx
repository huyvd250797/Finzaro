"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, Maximize2, X, BarChart3, TrendingUp, TrendingDown, Minus } from "lucide-react";
import Link from "next/link";
import { useOverlayScrollLock } from "@/components/use-overlay-scroll-lock";
import { DashboardMoney, useDashboardMoneyHidden } from "@/components/dashboard-money";
import { TREND_RANGES, buildTrendPoints, type TrendPoint, type TrendRange } from "@/features/dashboard/trends";
import type { DailyFinancialRow } from "@/features/dashboard/snapshot";
import { formatMinorMoney } from "@/lib/utils";

const colors = { income: "#10b981", expense: "#f43f5e", netWorth: "#3b82f6" } as const;
const readySubscribe = () => () => {};
type PlotProps = { rows: TrendPoint[]; index: number; onPick: (index: number) => void; currency: string; digits: number; expanded?: boolean; hidden: boolean };

function TrendPlot({ rows, index, onPick, currency, digits, expanded = false, hidden }: PlotProps) {
  const width = 1000, height = expanded ? 470 : 300;
  const padLeft = 86, padRight = 85, padTop = 32, padBottom = 43;
  const chartHeight = height-padTop-padBottom;
  const plotWidth = width-padLeft-padRight;
  const flowValues = rows.flatMap((row) => [row.income, row.expense]);
  const flowMax = Math.max(1, ...flowValues, 0) * 1.12;
  const flowMin = Math.min(0, ...flowValues) * 1.12;
  const positions = rows.map((row) => row.netWorth);
  const positionMax = Math.max(1, ...positions);
  const positionMin = positions.length ? Math.min(...positions) : 0;
  const margin = Math.max(1, (positionMax-positionMin)*.18, Math.abs(positionMax)*.016);
  const positionTop = positionMax+margin;
  const positionBottom = positionMin-margin;
  const yFlow = (value:number) => padTop+(flowMax-value)/Math.max(1,flowMax-flowMin)*chartHeight;
  const yPosition = (value:number) => padTop+(positionTop-value)/Math.max(1,positionTop-positionBottom)*chartHeight;
  const x = (i:number) => padLeft + (rows.length===1 ? plotWidth/2 : (i+.5)*plotWidth/rows.length);
  const band = plotWidth/Math.max(1,rows.length);
  const barWidth = Math.min(expanded?21:18, Math.max(5,band*.22));
  const linePath = rows.map((row,i)=>`${i?"L":"M"}${x(i).toFixed(1)},${yPosition(row.netWorth).toFixed(1)}`).join(" ");
  const compact = (amount:number) => hidden ? "******" : new Intl.NumberFormat("vi-VN",{notation:"compact",maximumFractionDigits:1}).format(amount/(10**digits));
  const money = (amount:number) => hidden ? "******" : formatMinorMoney(amount,currency,digits);
  const ticks = Array.from({length:5},(_,i)=>flowMax-(flowMax-flowMin)*i/4);
  const positionTicks = Array.from({length:5},(_,i)=>positionTop-(positionTop-positionBottom)*i/4);
  const active = rows[Math.max(0,Math.min(index,rows.length-1))];
  const lastIndex = Math.max(0,rows.length-1);
  const stride = Math.max(1,Math.ceil(rows.length/(expanded?14:7)));
  const baseline = yFlow(0);
  return <div className="min-w-0 space-y-3">
    {active && <div className="grid grid-cols-3 gap-2" aria-live="polite">
      {([
        {label:"Thu nhập",value:active.income,tone:colors.income},
        {label:"Chi tiêu",value:active.expense,tone:colors.expense},
        {label:"Số dư tiền*",value:active.netWorth,tone:colors.netWorth}
      ]).map(item=><div key={item.label} className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--card)] p-2.5 sm:p-3" style={{borderTopColor:item.tone,borderTopWidth:2}}>
        <p className="truncate text-[10px] font-bold tracking-wide text-[var(--muted-foreground)] sm:text-xs">{item.label}</p>
        <p className="mt-1.5 overflow-x-auto whitespace-nowrap text-[clamp(.65rem,2.6vw,1rem)] font-black tabular-nums" style={{color:item.tone}}><DashboardMoney amount={formatMinorMoney(item.value,currency,digits)}/></p>
      </div>)}
    </div>}
    <div className="fin-trend-frame overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2 sm:p-3">
      <div className="flex items-center justify-between gap-2 px-2 pb-2 text-[11px] font-semibold text-[var(--muted-foreground)]">
        <span>{active?.label ?? "Chưa có dữ liệu"}</span><span>Chạm vào cột để xem số liệu</span>
      </div>
      <div className="overflow-x-auto overscroll-x-contain" aria-label="Biểu đồ xu hướng tài chính tương tác">
        <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full min-w-[550px]" role="group" aria-label="Thu nhập và chi tiêu thể hiện bằng cột, số dư tiền bằng đường màu xanh dương">
          <defs>
            <linearGradient id={expanded?"fin-position-fill-expanded":"fin-position-fill"} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={colors.netWorth} stopOpacity=".18"/><stop offset="100%" stopColor={colors.netWorth} stopOpacity="0"/></linearGradient>
            <linearGradient id={expanded?"fin-income-fill-expanded":"fin-income-fill"} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor={colors.income}/></linearGradient>
          </defs>
          <text x={padLeft-7} y="15" fill="currentColor" opacity=".65" fontSize="11" textAnchor="end">Dòng tiền</text>
          <text x={width-padRight+8} y="15" fill={colors.netWorth} opacity=".85" fontSize="11" textAnchor="start">Số dư</text>
          {ticks.map((value,i)=><g key={i}><line x1={padLeft} y1={yFlow(value)} x2={width-padRight} y2={yFlow(value)} stroke="currentColor" strokeOpacity={i===ticks.length-1?".20":".10"} strokeDasharray={i===ticks.length-1?"0":"4 6"}/>
            <text data-fin-money data-fin-masked={hidden?"true":undefined} x={padLeft-10} y={yFlow(value)+4} fill="currentColor" opacity=".6" fontSize="11" textAnchor="end">{compact(value)}</text>
            <text data-fin-money data-fin-masked={hidden?"true":undefined} x={width-padRight+10} y={yFlow(value)+4} fill={colors.netWorth} opacity=".82" fontSize="11" textAnchor="start">{compact(positionTicks[i])}</text></g>)}
          {rows.length>1 && <path d={`${linePath} L${x(lastIndex)},${height-padBottom} L${x(0)},${height-padBottom} Z`} fill={`url(#${expanded?"fin-position-fill-expanded":"fin-position-fill"})`}/>}
          {rows.map((row,i)=>{
            const xPosition = x(i);
            const incHeight = Math.abs(baseline-yFlow(row.income));
            const expHeight = Math.abs(baseline-yFlow(row.expense));
            return <g key={row.key} className="fin-trend-group" opacity={i===index?1:.75}>
              {row.income!==0 && <rect x={xPosition-barWidth-2} y={Math.min(baseline,yFlow(row.income))} width={barWidth} height={Math.max(2,incHeight)} rx="3" fill={`url(#${expanded?"fin-income-fill-expanded":"fin-income-fill"})`}/>}
              {row.expense!==0 && <rect x={xPosition+2} y={Math.min(baseline,yFlow(row.expense))} width={barWidth} height={Math.max(2,expHeight)} rx="3" fill={colors.expense} />}
            </g>;
          })}
          <path d={linePath} fill="none" stroke={colors.netWorth} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
          {active && <g><line x1={x(index)} y1={padTop} x2={x(index)} y2={height-padBottom} stroke={colors.netWorth} strokeOpacity=".4" strokeDasharray="4 6"/>
            <circle cx={x(index)} cy={yPosition(active.netWorth)} r="7" fill={colors.netWorth} fillOpacity=".2"/><circle cx={x(index)} cy={yPosition(active.netWorth)} r="4" fill={colors.netWorth} stroke="var(--card)" strokeWidth="1.5"/></g>}
          {rows.map((row,i)=>(i%stride===0||i===lastIndex)?<text key={row.key} x={x(i)} y={height-16} fontSize="12" fill="currentColor" opacity={i===index?1:.65} fontWeight={i===index?700:500} textAnchor="middle">{row.label}</text>:null)}
          {rows.map((row,i)=><rect key={`${row.key}-hit`} x={x(i)-band/2} y={padTop} width={band} height={chartHeight} fill="transparent" role="button" tabIndex={0} aria-label={`${row.label}: Thu ${money(row.income)}, Chi ${money(row.expense)}, Số dư ${money(row.netWorth)}`} onClick={()=>onPick(i)} onKeyDown={(event)=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();onPick(i);}}}/>)}
        </svg>
      </div>
    </div>
  </div>;
}

/** Five periods reuse the same 366 daily rows without additional network calls. */
export function CashflowChart({daily,closingBalance,today,decimalDigits=0,currency="VND"}:{daily:DailyFinancialRow[];closingBalance:number;today:string;decimalDigits?:number;currency?:string}) {
  const [range,setRange]=useState<TrendRange>("6m");
  const [selectedKey,setSelectedKey]=useState<string|null>(null);
  const [expanded,setExpanded]=useState(false);
  const closeRef=useRef<HTMLButtonElement>(null);
  const expandRef=useRef<HTMLButtonElement>(null);
  const mounted=useSyncExternalStore(readySubscribe,()=>true,()=>false);
  const hidden=useDashboardMoneyHidden();
  useOverlayScrollLock(expanded);
  const points=useMemo(()=>buildTrendPoints(daily,closingBalance,today,range),[daily,closingBalance,today,range]);
  const selectedIndex=Math.max(0,selectedKey?points.findIndex(row=>row.key===selectedKey):points.length-1);
  const changeRange=(value:TrendRange)=>{setRange(value);setSelectedKey(null);};
  useEffect(()=>{
    if(!expanded)return;
    const returnFocusTarget = expandRef.current;
    const frame=window.requestAnimationFrame(()=>closeRef.current?.focus({preventScroll:true}));
    const onKey=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){event.preventDefault();setExpanded(false);return;}
      if(event.key!=="Tab")return;
      const modal=document.querySelector<HTMLElement>(".fin-trend-modal");
      const tabbables=Array.from(modal?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')??[]).filter(node=>node.getClientRects().length>0);
      if(!tabbables.length)return;
      if(event.shiftKey&&document.activeElement===tabbables[0]){event.preventDefault();tabbables[tabbables.length-1].focus();}
      else if(!event.shiftKey&&document.activeElement===tabbables[tabbables.length-1]){event.preventDefault();tabbables[0].focus();}
    };
    window.addEventListener("keydown",onKey);
    return ()=>{window.cancelAnimationFrame(frame);window.removeEventListener("keydown",onKey);returnFocusTarget?.focus({preventScroll:true});};
  },[expanded]);
  const controls=(isModal:boolean)=><div className="flex flex-wrap items-center gap-2" role="group" aria-label="Chọn khoảng thời gian xu hướng">
    <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--muted)]/65 p-1">
      {TREND_RANGES.map(item=><button key={item.key} type="button" aria-pressed={range===item.key} onClick={()=>changeRange(item.key)} className={`min-h-9 rounded-lg px-2.5 text-[11px] font-bold transition-colors sm:px-3 ${range===item.key?"bg-[var(--card)] text-[var(--foreground)] shadow-sm ring-1 ring-[var(--border)]":"text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}>{item.label}</button>)}
    </div>
    {!isModal&&<button type="button" ref={expandRef} onClick={()=>setExpanded(true)} className="fin-secondary-btn !ml-auto !min-h-10 !px-3 !text-xs" aria-label="Mở biểu đồ xu hướng toàn màn hình"><Maximize2 className="size-4"/> Phóng to</button>}
  </div>;
  const legend=<div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-bold text-[var(--muted-foreground)]">
    <span className="inline-flex items-center gap-1.5"><span className="h-3 w-2.5 rounded-sm" style={{background:colors.income}}/>Thu nhập</span>
    <span className="inline-flex items-center gap-1.5"><span className="h-3 w-2.5 rounded-sm" style={{background:colors.expense}}/>Chi tiêu</span>
    <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-5 rounded-full" style={{background:colors.netWorth}}/>Số dư tiền*</span>
  </div>;
  const selected=points[selectedIndex];
  const preceding=points[selectedIndex-1];
  const delta=selected&&preceding?selected.netWorth-preceding.netWorth:null;
  const DeltaIcon=delta===null||delta===0?Minus:delta>0?TrendingUp:TrendingDown;
  return <>
    <div className="space-y-3">
      {controls(false)}
      <div className="flex flex-wrap items-center justify-between gap-2">{legend}<span className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--muted-foreground)]"><BarChart3 className="size-3.5"/>Hai trục giá trị</span></div>
      <TrendPlot rows={points} index={selectedIndex} onPick={i=>setSelectedKey(points[i].key)} currency={currency} digits={decimalDigits} hidden={hidden}/>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--muted)]/50 px-3 py-2.5 text-xs">
        <p className="text-[var(--muted-foreground)]">*Số dư tiền mặt/ngân hàng/ví theo thời điểm; không bao gồm quỹ, đầu tư và công nợ.</p>
        {delta!==null&&<span className={`inline-flex shrink-0 items-center gap-1 font-extrabold ${delta>0?"text-[var(--fin-income)]":delta<0?"text-[var(--fin-expense)]":"text-[var(--muted-foreground)]"}`}><DeltaIcon className="size-3.5"/><DashboardMoney amount={`${delta>0?"+":""}${formatMinorMoney(delta,currency,decimalDigits)}`}/> so với kỳ trước</span>}
      </div>
    </div>
    {expanded&&mounted&&createPortal(<div className="fin-trend-modal fixed inset-0 z-[10000] flex flex-col bg-[var(--background)]" role="dialog" aria-modal="true" aria-labelledby="fin-trend-modal-heading">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3" style={{paddingTop:"max(12px, env(safe-area-inset-top))"}}>
        <div className="min-w-0"><p className="fin-section-eyebrow">FINZARO / PHÂN TÍCH</p><h2 id="fin-trend-modal-heading" className="truncate text-lg font-extrabold">Xu hướng tài chính</h2></div>
        <button type="button" ref={closeRef} onClick={()=>setExpanded(false)} aria-label="Đóng biểu đồ toàn màn hình" className="grid size-11 shrink-0 place-items-center rounded-xl border border-[var(--border)] hover:bg-[var(--muted)]"><X className="size-5"/></button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6" style={{paddingBottom:"max(18px, env(safe-area-inset-bottom))"}}>
        <div className="mx-auto max-w-[1600px] space-y-4">{controls(true)}{legend}
          <TrendPlot rows={points} index={selectedIndex} onPick={i=>setSelectedKey(points[i].key)} currency={currency} digits={decimalDigits} expanded hidden={hidden}/>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--muted-foreground)]"><p>*Số dư tiền ước tính từ tiền mặt/ngân hàng/ví; không bao gồm quỹ, đầu tư và công nợ.</p><Link href="/reports" className="inline-flex items-center gap-1.5 font-bold text-[var(--primary)]">Xem Báo cáo <ArrowUpRight className="size-3.5"/></Link></div>
        </div>
      </div>
    </div>,document.body)}
  </>;
}
