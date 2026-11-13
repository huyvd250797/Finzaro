"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useOverlayScrollLock } from "@/components/use-overlay-scroll-lock";
import { BarChart3, ChevronRight, LoaderCircle, RotateCcw, X } from "lucide-react";
import { CategoryIcon, iconColorValue } from "@/features/categories/icons";
import { ReportDonut, type DonutSlice } from "@/components/report-donut";
import { ReportVisualBoundary } from "@/components/report-visual-boundary";
import { Card, CardContent } from "@/components/ui/card";
import type { CategoryPeriodBucket, CategoryPeriodGroup, CategoryDrilldownMode } from "@/features/reports/category-drilldown";
import type { CategoryDetailPayload, CategoryDetailRow } from "@/features/reports/category-detail-preview";
import type { ReportFlowType } from "@/features/reports/experience";
import { cn, formatMinorMoney } from "@/lib/utils";
import { measureClientPaint } from "@/lib/client-performance";

export type ReportPreviewRow = CategoryDetailRow;

export type ReportFlowSnapshot = {
  amount: number;
  slices: DonutSlice[];
  categories: CategoryPeriodGroup[];
};

function eventMonotonicNow() { return performance.now(); }

type ReportDetailPayload = CategoryDetailPayload;
type DetailState = { key: string; status: "idle" | "loading" | "ready" | "error"; payload: ReportDetailPayload | null; error?: string };

/** Month mode: every calendar day. Year mode: all 12 months. */
function BucketExplorer({ buckets, activeKey, onSelect, currency, digits, mode, color }: {
  buckets: CategoryPeriodBucket[];
  activeKey: string | null;
  onSelect: (bucket: CategoryPeriodBucket) => void;
  currency: string;
  digits: number;
  mode: CategoryDrilldownMode;
  color: string;
}) {
  const peak = Math.max(1, ...buckets.map((item) => item.amount));
  const barTone = iconColorValue(color);
  return <div className="fin-category-bucket-explorer min-w-0">
    <p className="mb-3 text-xs font-medium text-[var(--muted-foreground)]">{mode === "month" ? "Mỗi cột là một ngày trong tháng. Chọn cột để xem các giao dịch của ngày đó." : "Mỗi cột là một tháng trong năm. Chọn cột để xem các giao dịch của tháng đó."}</p>
    <div className="overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:thin]" role="region" tabIndex={0} aria-label={mode === "month" ? "Biểu đồ chi tiết theo ngày" : "Biểu đồ chi tiết theo tháng"}>
      <div className="flex min-w-full items-end gap-1.5" style={{ width: `max(100%, ${buckets.length * (mode === "month" ? 44 : 54)}px)` }} role="group" aria-label="Chọn cột để tải giao dịch">
        {buckets.map((item) => {
          const isSelected = activeKey === item.key;
          return <button type="button" key={item.key} onClick={() => onSelect(item)} aria-pressed={isSelected}
            aria-label={`${mode === "month" ? `Ngày ${Number(item.key.slice(8))}` : `Tháng ${Number(item.key.slice(5))}`}: ${formatMinorMoney(item.amount, currency, digits)}. ${item.count} giao dịch`}
            title={`${item.key} · ${formatMinorMoney(item.amount, currency, digits)} · ${item.count} giao dịch`}
            className={cn("group flex min-w-0 flex-1 flex-col items-center justify-end rounded-xl px-0.5 pt-2 pb-1 outline-offset-2 transition-colors focus-visible:outline-2 focus-visible:outline-[var(--primary)]", isSelected ? "bg-[var(--muted)]" : "hover:bg-[var(--muted)]/60")}>
            <span className="flex h-32 w-full items-end justify-center border-b border-[var(--border)]">
              <span className="fin-category-bucket-bar block w-[min(75%,34px)] rounded-t-md" style={{
                height: item.amount > 0 ? `${Math.max(6, Math.round(item.amount / peak * 118))}px` : "3px",
                backgroundColor: item.amount > 0 ? barTone : "var(--border)",
                opacity: isSelected ? 1 : 0.7
              }}/>
            </span>
            <span className={cn("mt-2 text-[11px] font-bold tabular-nums", isSelected ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]")}>{item.label}</span>
          </button>;
        })}
      </div>
    </div>
  </div>;
}

/** Both flows and all chart buckets are pre-aggregated on the server. Only a selected bucket fetches transaction rows. */
export function InstantReportBreakdown({
  initialType, periodLabel, periodKey, mode, currency, digits, from, to, flows, prefetchedDetails
}: {
  initialType: ReportFlowType;
  periodLabel: string;
  periodKey: string;
  mode: CategoryDrilldownMode;
  currency: string;
  digits: number;
  from: string;
  to: string;
  flows: Record<ReportFlowType, ReportFlowSnapshot>;
  prefetchedDetails: Record<string, ReportDetailPayload>;
}) {
  const [type, setType] = useState<ReportFlowType>(initialType);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [activeBucket, setActiveBucket] = useState<CategoryPeriodBucket | null>(null);
  const [detail, setDetail] = useState<DetailState>({ key: "", status: "idle", payload: null });
  const [visibleRows, setVisibleRows] = useState(40);
  const detailsCache = useRef(new Map<string, ReportDetailPayload>(
    Object.entries(prefetchedDetails).map(([key, value]) => [`${periodKey}|${key}`, value])
  ));
  const [portalReady, setPortalReady] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  useOverlayScrollLock(Boolean(activeCategoryId) && portalReady);
  useEffect(() => setPortalReady(true), []);
  const money = useMemo(() => (value: number) => formatMinorMoney(value, currency, digits), [currency, digits]);

  useEffect(() => { setType(initialType); setActiveCategoryId(null); setActiveBucket(null); }, [initialType, periodKey]);
  useEffect(() => {
    detailsCache.current = new Map(Object.entries(prefetchedDetails).map(([key, value]) => [`${periodKey}|${key}`, value]));
  }, [prefetchedDetails, periodKey]);
  useEffect(() => {
    const onHistory = () => {
      const next = new URLSearchParams(window.location.search).get("type");
      setType(next === "income" ? "income" : "expense");
      setActiveCategoryId(null); setActiveBucket(null);
    };
    window.addEventListener("popstate", onHistory);
    return () => window.removeEventListener("popstate", onHistory);
  }, []);
  // Full-screen dialog is portaled outside route transitions and the mobile tabbar.
  // Focus stays in the modal; closing returns focus to the selected category.
  useEffect(() => {
    if (!activeCategoryId || !portalReady) return;
    const prior = triggerRef.current;
    const focusFrame = requestAnimationFrame(() => closeRef.current?.focus({ preventScroll: true }));
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setActiveCategoryId(null); return; }
      if (event.key !== "Tab") return;
      const nodes = Array.from(modalRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ) ?? []).filter((node) => node.getClientRects().length > 0);
      if (!nodes.length) return;
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => { cancelAnimationFrame(focusFrame); window.removeEventListener("keydown", onKeyDown); if (prior?.isConnected) prior.focus({ preventScroll: true }); };
  }, [activeCategoryId, portalReady]);
  const selected = flows[type];
  const activeCategory = selected.categories.find((item) => item.id === activeCategoryId) ?? null;
  const detailKey = activeCategory && activeBucket ? `${periodKey}|${type}|${activeCategory.id}|${activeBucket.key}` : null;

  useEffect(() => {
    if (!detailKey || !activeCategory || !activeBucket) return;
    // Zero-value buckets are already known from the server summary: avoid an unnecessary request.
    if (activeBucket.count === 0) {
      setDetail({ key: detailKey, status: "ready", payload: { transactions: [], total: 0, count: 0 } });
      return;
    }
    const cached = detailsCache.current.get(detailKey);
    if (cached) { setDetail({ key: detailKey, status: "ready", payload: cached }); return; }
    const controller = new AbortController();
    setDetail({ key: detailKey, status: "loading", payload: null });
    const params = new URLSearchParams({ type, mode, category: activeCategory.id, key: activeBucket.key });
    fetch(`/api/reports/category-entries?${params}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const result: unknown = await response.json();
        if (!response.ok) throw new Error((result as { error?: string })?.error ?? "Không thể tải dữ liệu.");
        const value = result as Partial<ReportDetailPayload>;
        if (!Array.isArray(value.transactions) || !Number.isFinite(value.total) || !Number.isInteger(value.count)) throw new Error("Dữ liệu chi tiết không hợp lệ.");
        return value as ReportDetailPayload;
      })
      .then((payload) => { if (!controller.signal.aborted) { detailsCache.current.set(detailKey, payload); setDetail({ key: detailKey, status: "ready", payload }); } })
      .catch((error: unknown) => { if (!controller.signal.aborted) setDetail({ key: detailKey, status: "error", payload: null, error: error instanceof Error ? error.message : "Không thể tải dữ liệu." }); });
    return () => controller.abort();
  }, [detailKey, type, mode, activeCategory, activeBucket]);

  function changeType(next: ReportFlowType) {
    if (next === type) return;
    const startedAt = eventMonotonicNow();
    const url = new URL(window.location.href);
    url.searchParams.set("type", next);
    window.history.pushState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    setType(next); setActiveCategoryId(null); setActiveBucket(null);
    window.dispatchEvent(new CustomEvent("finzaro:report-flow-change", { detail: { type: next } }));
    measureClientPaint("reports.flow.toggle", startedAt);
  }

  function chooseCategory(id: string) {
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setActiveCategoryId(id);
    setActiveBucket(null); setVisibleRows(40);
    setDetail({ key: "", status: "idle", payload: null });
  }

  // Render fully cached bucket rows in the SAME paint as the selected column;
  // do not wait for useEffect to run before showing already available data.
  const cachedDetail = detailKey ? detailsCache.current.get(detailKey) : null;
  const selectedDetail: DetailState = cachedDetail && detailKey
    ? { key: detailKey, status: "ready", payload: cachedDetail }
    : detail.key === detailKey ? detail
    : { key: detailKey ?? "", status: activeBucket && activeBucket.count > 0 ? "loading" : "idle", payload: null };
  return <>
    <Card className="fin-report-breakdown-card mt-3"><CardContent className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><h2 className="font-black">{type === "expense" ? "Chi tiêu" : "Thu nhập"} theo danh mục</h2><p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">{periodLabel} · {currency}</p></div>
        <div className="text-right"><p className="text-sm font-black">{money(selected.amount)}</p>
          <div className="fin-flow-switch mt-1.5 grid grid-cols-2 rounded-xl bg-[var(--muted)]/70 p-1" role="group" aria-label="Loại báo cáo">
            {(["expense", "income"] as const).map((next) => <button key={next} type="button" onClick={() => changeType(next)} aria-pressed={type === next} className={cn("min-h-10 rounded-lg px-3 text-xs font-bold transition-colors", type === next ? `bg-[var(--card)] shadow-sm ${next === "expense" ? "text-rose-500" : "text-emerald-500"}` : "text-[var(--muted-foreground)]")}>{next === "expense" ? "Chi" : "Thu"}</button>)}
          </div>
        </div>
      </div>
      {selected.slices.length === 0 ? <div className="mt-3 rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--muted-foreground)]">Chưa có giao dịch trong kỳ.</div> : <div className="mt-3"><ReportVisualBoundary><ReportDonut key={`${periodKey}-${type}`} slices={selected.slices} total={selected.amount} currency={currency} decimalDigits={digits} centerLabel={type === "expense" ? "Tổng chi" : "Tổng thu"} onCategoryOpen={chooseCategory}/></ReportVisualBoundary></div>}
    </CardContent></Card>

    <Card className="fin-report-transactions-card mt-3"><CardContent className="p-0">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] p-3.5 sm:p-4">
        <div><h2 className="font-black">Tổng hợp theo danh mục</h2><p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">{type === "expense" ? "Chi" : "Thu"} trong {periodLabel.toLowerCase()} · Chọn danh mục để xem biểu đồ {mode === "month" ? "theo ngày" : "theo tháng"}.</p></div>
        <Link href={`/transactions?${new URLSearchParams({ type, from, to })}`} className="fin-text-action shrink-0 text-xs">Tất cả giao dịch</Link>
      </div>
      {selected.categories.length === 0 ? <p className="p-6 text-sm text-[var(--muted-foreground)]">Không có dữ liệu theo danh mục trong kỳ.</p> : <div className="max-h-[540px] divide-y divide-[var(--border)] overflow-y-auto overscroll-contain [scrollbar-width:thin]" role="list" aria-label="Tổng tiền theo danh mục">
        {selected.categories.map((category) => <div key={category.id} role="listitem">
          <button type="button" onClick={() => chooseCategory(category.id)} aria-haspopup="dialog" className="flex w-full min-w-0 items-center gap-3 px-3.5 py-3.5 text-left transition-colors hover:bg-[var(--muted)]/60 sm:px-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--muted)]" style={{ color: iconColorValue(category.iconColor) }}><CategoryIcon name={category.iconName} className="size-[18px]"/></span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-extrabold">{category.label}</span><span className="mt-0.5 block text-[11px] text-[var(--muted-foreground)]">{category.count} giao dịch · {category.percent.toFixed(1).replace(".", ",")}% tổng {type === "expense" ? "chi" : "thu"}</span></span>
            <span className="shrink-0 text-right"><span className={cn("block text-sm font-black tabular-nums", type === "income" ? "text-[var(--fin-income)]" : "text-[var(--fin-expense)]")}>{money(category.amount)}</span></span>
            <ChevronRight className="size-4 shrink-0 text-[var(--muted-foreground)]"/>
          </button>
        </div>)}
      </div>}
    </CardContent></Card>
    {portalReady && activeCategory && createPortal(
      <div className="fin-report-drilldown-modal" role="dialog" aria-modal="true" aria-labelledby="fin-drilldown-dialog-title" ref={modalRef}>
        <div className="fin-report-drilldown-header">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--muted)]" style={{ color: iconColorValue(activeCategory.iconColor) }}><CategoryIcon name={activeCategory.iconName} className="size-5" /></span>
            <div className="min-w-0"><p className="text-[11px] font-semibold text-[var(--muted-foreground)]">{type === "expense" ? "Chi tiêu" : "Thu nhập"} · {periodLabel}</p><h2 className="truncate text-lg font-black sm:text-xl" id="fin-drilldown-dialog-title">{activeCategory.label}</h2></div>
          </div>
          <button ref={closeRef} type="button" onClick={() => setActiveCategoryId(null)} aria-label="Đóng chi tiết danh mục" className="fin-report-drilldown-close"><X className="size-5"/></button>
        </div>
        <div className="fin-report-drilldown-scroll" id="fin-category-explorer">
          <div className="mx-auto w-full max-w-[1160px] p-3 pb-10 sm:p-6">
            <div className="border-b border-[var(--border)] pb-4 sm:pb-5">
              <div className="flex flex-wrap items-center justify-between gap-2"><div><div className="flex items-center gap-2"><BarChart3 className="size-4 text-[var(--primary)]"/><h3 className="font-extrabold">{mode === "month" ? "Chi tiết theo ngày" : "Chi tiết theo tháng"}</h3></div><p className="mt-1 text-xs text-[var(--muted-foreground)]">{activeCategory.count} giao dịch · Chạm vào cột để xem chi tiết</p></div><p className="text-lg font-black tabular-nums">{money(activeCategory.amount)}</p></div>
            </div>
            <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 sm:p-5">
              <BucketExplorer buckets={activeCategory.buckets} activeKey={activeBucket?.key ?? null} onSelect={(bucket) => { setActiveBucket(bucket); setVisibleRows(40); }} currency={currency} digits={digits} mode={mode} color={activeCategory.iconColor ?? ""}/>
            </div>
        <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--card)]" aria-live="polite">
          {!activeBucket ? <p className="p-4 text-xs text-[var(--muted-foreground)]">Chọn một cột {mode === "month" ? "ngày" : "tháng"} để tải các giao dịch tương ứng.</p> : <>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] p-3.5"><div><h4 className="text-sm font-extrabold">{mode === "month" ? `Ngày ${activeBucket.key.slice(8, 10)}/${activeBucket.key.slice(5, 7)}/${activeBucket.key.slice(0, 4)}` : `Tháng ${Number(activeBucket.key.slice(5))}/${activeBucket.key.slice(0, 4)}`}</h4><p className="text-[11px] text-[var(--muted-foreground)]">{activeBucket.count} giao dịch · {money(activeBucket.amount)}</p></div>
              <Link href={`/transactions?${new URLSearchParams({ type, category: activeCategory.id.startsWith("uncategorized-") ? "uncategorized" : activeCategory.id, from: mode === "month" ? activeBucket.key : `${activeBucket.key}-01`, to: mode === "month" ? activeBucket.key : `${activeBucket.key}-${String(new Date(Date.UTC(Number(activeBucket.key.slice(0,4)), Number(activeBucket.key.slice(5)), 0)).getUTCDate()).padStart(2, "0")}` })}`} className="fin-text-action text-xs">Xem toàn bộ <ChevronRight className="size-3.5"/></Link>
            </div>
            {selectedDetail.status === "loading" && <div className="flex items-center gap-2 p-4 text-xs text-[var(--muted-foreground)]" role="status"><LoaderCircle className="size-4 animate-spin"/>Đang tải giao dịch...</div>}
            {selectedDetail.status === "error" && <div className="flex flex-wrap items-center gap-2 p-4 text-xs text-rose-500" role="alert">{selectedDetail.error}<button type="button" onClick={() => { setDetail({ key: "", status: "idle", payload: null }); setActiveBucket({ ...activeBucket }); }} className="inline-flex items-center gap-1 font-bold underline"><RotateCcw className="size-3"/> Thử lại</button></div>}
            {selectedDetail.status === "ready" && (selectedDetail.payload?.transactions.length ? <div className="divide-y divide-[var(--border)]">
              {selectedDetail.payload.transactions.slice(0, visibleRows).map((item) => <Link key={item.id} href={`/transactions?${new URLSearchParams({ type, from: item.transactionDate, to: item.transactionDate, q: item.title })}`} className="flex min-w-0 items-center gap-3 p-3.5 hover:bg-[var(--muted)]/50">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--muted)]" style={{ color: iconColorValue(item.iconColor) }}><CategoryIcon name={item.iconName} className="size-4"/></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{item.title}</span><span className="mt-0.5 block text-[11px] text-[var(--muted-foreground)]">{item.transactionDate} · {item.categoryName}</span></span>
                <span className={cn("shrink-0 text-xs font-extrabold tabular-nums", type === "income" ? "text-[var(--fin-income)]" : "text-[var(--fin-expense)]")}>{type === "income" ? "+" : "−"}{money(item.amount).replace(/^[-+]/, "")}</span><ChevronRight className="size-4 shrink-0 text-[var(--muted-foreground)]"/>
              </Link>)}
              {selectedDetail.payload.transactions.length > visibleRows && <button type="button" onClick={() => setVisibleRows((value) => value + 40)} className="w-full border-t border-[var(--border)] px-3 py-3 text-center text-xs font-bold text-[var(--primary)]">Xem thêm {Math.min(40, selectedDetail.payload.transactions.length - visibleRows)} giao dịch</button>}
            </div> : <p className="p-4 text-xs text-[var(--muted-foreground)]">Không có giao dịch trong kỳ được chọn.</p>)}
          </>}
        </div>
          </div>
        </div>
      </div>, document.body
    )}
  </>;
}
