"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, CircleDollarSign, RotateCcw, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { FinanceMetricCard } from "@/components/finance-metric-card";
import { InstantReportBreakdown } from "@/components/instant-report-breakdown";
import type { FastPeriodSnapshot } from "@/features/reports/period-snapshot";
import type { ReportFlowType } from "@/features/reports/experience";
import { reconcilePeriodSnapshot } from "@/features/reports/reconcile-snapshot";
import { shiftMonthKey } from "@/features/reports/experience";
import { cn, formatMinorMoney } from "@/lib/utils";
import { measureClientPaint } from "@/lib/client-performance";

const ttlMs = 90_000;
const maxPeriods = 12;
// The seed gets a real timestamp in the mount synchronization effect.
// Do not call Date.now() in a ref initializer during React render.
type PeriodPick = Pick<FastPeriodSnapshot, "mode" | "period" | "year">;
const periodId = (value: PeriodPick) => value.mode === "year" ? `year:${value.year}` : `month:${value.period}`;
const buildRequestUrl = (value: PeriodPick) => `/api/reports/period-snapshot?${new URLSearchParams({
  mode: value.mode, ...(value.mode === "month" ? { period: value.period } : { year: String(value.year) })
})}`;
function parseBrowserPeriod(current: FastPeriodSnapshot): PeriodPick {
  const query = new URLSearchParams(window.location.search);
  const mode = query.get("mode") === "year" ? "year" : "month";
  const period = query.get("period");
  const year = Number(query.get("year"));
  return { mode, period: period && /^\d{4}-(0[1-9]|1[0-2])$/.test(period) ? period : current.period,
    year: Number.isInteger(year) && year >= 2000 && year <= 2200 ? year : current.year };
}
function periodText(pick: PeriodPick) {
  return pick.mode === "year" ? `Năm ${pick.year}` : `Tháng ${Number(pick.period.slice(5))}/${pick.period.slice(0, 4)}`;
}
function isSnapshot(value: unknown): value is FastPeriodSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<FastPeriodSnapshot>;
  return !!snapshot.flows?.income && !!snapshot.flows?.expense &&
    Array.isArray(snapshot.flows.income.categories) && Array.isArray(snapshot.flows.expense.categories) &&
    typeof snapshot.totals?.income === "number" && typeof snapshot.totals?.expense === "number" &&
    typeof snapshot.from === "string" && typeof snapshot.to === "string" && reconcilePeriodSnapshot(snapshot as FastPeriodSnapshot);
}

/** Fast period navigation: changes month/year locally rather than re-rendering
 * a heavy Next.js Server Component on every arrow click.
 * Only authenticated, no-store summaries are fetched; cache is per mounted tab
 * with a short TTL and is discarded by a fresh RSC render after mutations.
 */
export function FastReportOverview({ initialSnapshot, initialType }: {
  initialSnapshot: FastPeriodSnapshot; initialType: ReportFlowType;
}) {
  const [visible, setVisible] = useState(initialSnapshot);
  const [requested, setRequested] = useState<PeriodPick>(initialSnapshot);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [type, setType] = useState<ReportFlowType>(initialType);
  const cacheRef = useRef(new Map<string, { snapshot: FastPeriodSnapshot; at: number }>([
    [periodId(initialSnapshot), { snapshot: initialSnapshot, at: 0 }]
  ]));
  const inFlightRef = useRef(new Map<string, Promise<FastPeriodSnapshot>>());
  const requestSequence = useRef(0);
  const lastMonthRef = useRef(initialSnapshot.period);

  const fetchPeriod = useCallback((pick: PeriodPick) => {
    const key = periodId(pick);
    const cached = cacheRef.current.get(key);
    if (cached && Date.now() - cached.at < ttlMs) return Promise.resolve(cached.snapshot);
    const running = inFlightRef.current.get(key);
    if (running) return running;
    const task = fetch(buildRequestUrl(pick), { cache: "no-store", credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Không tải được kỳ báo cáo. Vui lòng thử lại.");
        const result: unknown = await response.json();
        if (!isSnapshot(result)) throw new Error("Dữ liệu kỳ báo cáo không hợp lệ.");
        const snapshot = result;
        cacheRef.current.delete(key);
        cacheRef.current.set(key, { snapshot, at: Date.now() });
        while (cacheRef.current.size > maxPeriods) cacheRef.current.delete(cacheRef.current.keys().next().value!);
        return snapshot;
      }).finally(() => inFlightRef.current.delete(key));
    inFlightRef.current.set(key, task);
    return task;
  }, []);

  const navigate = useCallback((next: PeriodPick, updateUrl = true) => {
    const startedAt = performance.now();
    const key = periodId(next);
    if (next.year < 2000 || next.year > 2200 || key === periodId(requested)) return;
    requestSequence.current += 1;
    const sequence = requestSequence.current;
    setRequested(next);
    if (next.mode === "month") lastMonthRef.current = next.period;
    setError("");
    if (updateUrl) {
      const url = new URL(window.location.href);
      url.searchParams.set("mode", next.mode);
      url.searchParams.set("type", type);
      if (next.mode === "month") { url.searchParams.set("period", next.period); url.searchParams.delete("year"); }
      else { url.searchParams.set("year", String(next.year)); url.searchParams.delete("period"); }
      window.history.pushState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }
    const cached = cacheRef.current.get(key);
    if (cached && Date.now() - cached.at < ttlMs) { setVisible(cached.snapshot); setLoading(false); measureClientPaint("reports.period.cached", startedAt); return; }
    setLoading(true);
    void fetchPeriod(next).then((snapshot) => {
      if (sequence !== requestSequence.current) return;
      setVisible(snapshot); setLoading(false);
      measureClientPaint("reports.period.network", startedAt);
    }).catch((cause: unknown) => {
      if (sequence !== requestSequence.current) return;
      setError(cause instanceof Error ? cause.message : "Không tải được báo cáo.");
      setLoading(false);
    });
  }, [fetchPeriod, requested, type]);

  // React Server Component refresh after a successful save/delete must reset
  // this short-lived cache so old financial numbers can never remain pinned.
  useEffect(() => {
    requestSequence.current += 1;
    cacheRef.current.clear();
    cacheRef.current.set(periodId(initialSnapshot), { snapshot: initialSnapshot, at: Date.now() });
    inFlightRef.current.clear();
    setVisible(initialSnapshot);
    setRequested(initialSnapshot);
    setLoading(false);
    setError("");
  }, [initialSnapshot]);

  useEffect(() => {
    const onPopState = () => navigate(parseBrowserPeriod(initialSnapshot), false);
    const onFlow = (event: Event) => {
      const next = (event as CustomEvent<{ type?: ReportFlowType }>).detail?.type;
      if (next === "income" || next === "expense") setType(next);
    };
    window.addEventListener("popstate", onPopState);
    window.addEventListener("finzaro:report-flow-change", onFlow);
    return () => { window.removeEventListener("popstate", onPopState); window.removeEventListener("finzaro:report-flow-change", onFlow); };
  }, [navigate, initialSnapshot]);

  const changeMode = (mode: "month" | "year") => {
    if (requested.mode === mode) return;
    if (mode === "year") navigate({ mode, period: requested.period, year: Number(requested.period.slice(0, 4)) });
    else {
      const month = lastMonthRef.current.slice(5);
      navigate({ mode, period: `${requested.year}-${month}`, year: requested.year });
    }
  };
  const shiftPeriod = (offset: number) => {
    if (requested.mode === "year") navigate({ ...requested, year: requested.year + offset });
    else {
      const period = shiftMonthKey(requested.period, offset);
      navigate({ ...requested, period, year: Number(period.slice(0, 4)) });
    }
  };
  // Hover/focus preloads a single likely destination. No heavy 4-page RSC
  // prefetch, no network traffic on every mount, and saves data on mobile.
  const warm = (pick: PeriodPick) => {
    if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;
    if (pick.year < 2000 || pick.year > 2200) return;
    void fetchPeriod(pick).catch(() => {});
  };
  const step = (offset: number): PeriodPick => requested.mode === "year"
    ? { ...requested, year: requested.year + offset }
    : { ...requested, period: shiftMonthKey(requested.period, offset), year: Number(shiftMonthKey(requested.period, offset).slice(0, 4)) };

  return <>
    <Card className="fin-report-period-card mt-3"><CardContent className="p-2.5 sm:p-3.5">
      <div className="fin-period-controls grid grid-cols-[112px_1fr] items-center gap-2 sm:grid-cols-[150px_1fr]">
        <div className="grid grid-cols-2 rounded-lg bg-[var(--muted)]/70 p-0.5" aria-label="Chế độ báo cáo">
          {(["month", "year"] as const).map((mode) => <button key={mode} type="button"
            aria-pressed={requested.mode === mode} onClick={() => changeMode(mode)}
            onMouseEnter={() => { if (mode !== requested.mode) warm(mode === "year" ? { ...requested, mode, year: Number(requested.period.slice(0, 4)) } : { ...requested, mode, period: `${requested.year}-${lastMonthRef.current.slice(5)}` }); }}
            className={cn("grid min-h-10 place-items-center rounded-lg text-[11px] font-bold sm:text-xs", requested.mode === mode ? "bg-[var(--card)] shadow-sm" : "text-[var(--muted-foreground)]")}>{mode === "month" ? "Tháng" : "Năm"}</button>)}
        </div>
        <div className="flex min-w-0 items-center gap-1">
          <button type="button" onClick={() => shiftPeriod(-1)} onMouseEnter={() => warm(step(-1))} onFocus={() => warm(step(-1))} aria-label="Kỳ trước" className="grid size-11 shrink-0 place-items-center rounded-xl hover:bg-[var(--muted)]"><ChevronLeft className="size-4"/></button>
          <div className="min-w-0 flex-1 text-center" aria-live="polite"><p className="truncate text-sm font-black sm:text-base">{periodText(requested)}</p>
            <p className="hidden text-[9px] font-bold text-[var(--muted-foreground)] sm:block">{!loading && !error ? `${visible.from} → ${visible.to}` : "Đang cập nhật kỳ"}</p>
          </div>
          <button type="button" onClick={() => shiftPeriod(1)} onMouseEnter={() => warm(step(1))} onFocus={() => warm(step(1))} aria-label="Kỳ sau" className="grid size-11 shrink-0 place-items-center rounded-xl hover:bg-[var(--muted)]"><ChevronRight className="size-4"/></button>
        </div>
      </div>
    </CardContent></Card>
    {error ? <div role="alert" className="mt-3 rounded-xl border border-rose-500/35 p-4 text-sm text-rose-500">{error}
      <button className="ml-3 inline-flex items-center gap-1 font-bold underline" type="button" onClick={() => {
        setError(""); setLoading(true); const seq = ++requestSequence.current;
        void fetchPeriod(requested).then((data) => { if (seq === requestSequence.current) { setVisible(data); setLoading(false); } })
          .catch(() => { if (seq === requestSequence.current) { setError("Không tải được kỳ báo cáo."); setLoading(false); } });
      }}><RotateCcw className="size-3"/>Thử lại</button>
    </div> : null}
    {loading || (error && periodId(visible) !== periodId(requested)) ?
      <div role="status" aria-live="polite" aria-busy="true" className="mt-3 space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{[0,1,2].map((index) => <div key={index} className={cn("rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4", index === 2 && "col-span-2 sm:col-span-1")}><div className="fin-skeleton h-3 w-20 rounded"/><div className="fin-skeleton mt-4 h-7 w-3/4 rounded"/></div>)}</div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"><div className="fin-skeleton h-4 w-40 rounded"/><div className="fin-skeleton mt-5 h-44 rounded-lg"/></div>
      </div> : <>
        <div className="fin-compact-report-kpis mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          <FinanceMetricCard label="Tổng thu" tone="income" value={formatMinorMoney(visible.totals.income, visible.currency, visible.digits)} icon={TrendingUp} detail={`Trong ${visible.periodLabel.toLowerCase()}`} />
          <FinanceMetricCard label="Tổng chi" tone="expense" value={formatMinorMoney(visible.totals.expense, visible.currency, visible.digits)} icon={TrendingDown} detail={`Trong ${visible.periodLabel.toLowerCase()}`} />
          <FinanceMetricCard className="col-span-2 sm:col-span-1" label="Dòng tiền ròng" tone="net" value={formatMinorMoney(visible.totals.net, visible.currency, visible.digits)} icon={CircleDollarSign} detail="Thu nhập trừ chi tiêu" />
        </div>
        <InstantReportBreakdown key={periodId(visible)} initialType={type} periodLabel={visible.periodLabel}
          mode={visible.mode} periodKey={periodId(visible)} from={visible.from} to={visible.to}
          currency={visible.currency} digits={visible.digits} flows={visible.flows} prefetchedDetails={visible.prefetchedDetails}/>
      </>}
  </>;
}
