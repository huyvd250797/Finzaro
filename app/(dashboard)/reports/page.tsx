import Link from "next/link";
import { ChevronLeft, ChevronRight, CircleDollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ReportDonut } from "@/components/report-donut";
import { ReportVisualBoundary } from "@/components/report-visual-boundary";
import { ReportNavigation } from "@/components/report-navigation";
import { CategoryIcon, iconColorValue } from "@/features/categories/icons";
import {
  currentYearMonth,
  flowAmount,
  monthBounds,
  periodFlowTotals,
  periodTransactions,
  reportCategoryBreakdown,
  shiftMonthKey,
  validMonthKey,
  validYear,
  yearBounds,
  type ReportFlowType
} from "@/features/reports/experience";
import { loadReportLedger } from "@/features/reports/data";
import { currencyDigits } from "@/features/transactions/data";
import { requireUser } from "@/lib/auth";
import { cn, formatMinorMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Báo cáo" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function reportUrl(args: { mode: "month" | "year"; period?: string; year?: number; type: ReportFlowType }) {
  const query = new URLSearchParams({ mode: args.mode, type: args.type });
  if (args.mode === "month" && args.period) query.set("period", args.period);
  if (args.mode === "year" && args.year) query.set("year", String(args.year));
  return `/reports?${query.toString()}`;
}

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const params = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, one(value)])) as Record<string, string | undefined>;
  const { supabase, userId } = await requireUser();
  const { data: preferences } = await supabase.from("user_preferences").select("currency_code, timezone").eq("id", userId).maybeSingle();
  const currency = (preferences?.currency_code ?? "VND").toUpperCase();
  const timeZone = preferences?.timezone ?? "Asia/Ho_Chi_Minh";
  const now = currentYearMonth(timeZone);
  const currentMonth = `${now.year}-${String(now.month).padStart(2, "0")}`;
  const mode: "month" | "year" = params.mode === "year" ? "year" : "month";
  const type: ReportFlowType = params.type === "income" ? "income" : "expense";
  const period = validMonthKey(params.period, currentMonth);
  const year = validYear(params.year, now.year);
  const bounds = mode === "month" ? monthBounds(period) : yearBounds(year);

  const ledger = await loadReportLedger(supabase, userId, { fromDate: bounds.from, toDate: bounds.to });
  const digits = currencyDigits(ledger.currencies, currency);
  const transactions = periodTransactions(ledger.transactions, bounds.from, bounds.to);
  const totals = periodFlowTotals(transactions, currency);
  const categories = reportCategoryBreakdown(transactions, currency, type);
  const chartSlices = categories.map((item) => ({ ...item, color: iconColorValue(item.icon_color) }));
  const selectedTotal = type === "expense" ? totals.expense : totals.income;
  const visibleTransactions = transactions.filter((item) => flowAmount(item, currency, type) > 0).slice(0, 8);

  const previousHref = mode === "month"
    ? reportUrl({ mode, period: shiftMonthKey(period, -1), type })
    : reportUrl({ mode, year: year - 1, type });
  const nextHref = mode === "month"
    ? reportUrl({ mode, period: shiftMonthKey(period, 1), type })
    : reportUrl({ mode, year: year + 1, type });
  const periodLabel = mode === "month" ? `Tháng ${Number(period.slice(5, 7))}/${period.slice(0, 4)}` : `Năm ${year}`;

  return (
    <div className="mx-auto max-w-[1180px] px-3 py-4 sm:px-4 md:px-6 lg:px-8 lg:py-7">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Báo cáo</h1>
        <p className="mt-1 hidden text-xs text-[var(--muted-foreground)] sm:block">Tổng quan thu · chi từ Transaction Ledger; tiền vay/ứng thẻ không tính là thu nhập thực.</p>
      </div>

      <div className="mx-auto mt-3 max-w-3xl"><ReportNavigation active="overview" /></div>

      <Card className="mx-auto mt-3 max-w-3xl">
        <CardContent className="p-2">
          <div className="grid grid-cols-[112px_1fr] items-center gap-2 sm:grid-cols-[150px_1fr]">
            <div className="grid grid-cols-2 rounded-lg bg-[var(--muted)]/70 p-0.5">
              <Link href={reportUrl({ mode: "month", period, type })} className={cn("grid min-h-8 place-items-center rounded-md text-[10px] font-black sm:text-xs", mode === "month" ? "bg-[var(--card)] shadow-sm" : "text-[var(--muted-foreground)]")}>Tháng</Link>
              <Link href={reportUrl({ mode: "year", year, type })} className={cn("grid min-h-8 place-items-center rounded-md text-[10px] font-black sm:text-xs", mode === "year" ? "bg-[var(--card)] shadow-sm" : "text-[var(--muted-foreground)]")}>Năm</Link>
            </div>
            <div className="flex min-w-0 items-center gap-1">
              <Link href={previousHref} aria-label="Kỳ trước" className="grid size-8 shrink-0 place-items-center rounded-lg hover:bg-[var(--muted)]"><ChevronLeft className="size-4" /></Link>
              <div className="min-w-0 flex-1 text-center">
                <p className="truncate text-sm font-black sm:text-base">{periodLabel}</p>
                <p className="hidden text-[9px] font-bold text-[var(--muted-foreground)] sm:block">{bounds.from} → {bounds.to}</p>
              </div>
              <Link href={nextHref} aria-label="Kỳ sau" className="grid size-8 shrink-0 place-items-center rounded-lg hover:bg-[var(--muted)]"><ChevronRight className="size-4" /></Link>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Card className="min-w-0 border-rose-500/20 bg-rose-500/[.035]"><CardContent className="p-2.5 sm:p-3.5"><div className="flex items-center gap-1"><TrendingDown className="size-3.5 shrink-0 text-rose-500 sm:size-4" /><p className="truncate text-[9px] font-black text-[var(--muted-foreground)] sm:text-xs">Chi tiêu</p></div><p className="mt-1.5 whitespace-nowrap text-[10.5px] font-black tracking-[-.02em] tabular-nums text-rose-500 sm:text-base md:text-lg">{formatMinorMoney(totals.expense, currency, digits)}</p></CardContent></Card>
        <Card className="min-w-0 border-emerald-500/20 bg-emerald-500/[.035]"><CardContent className="p-2.5 sm:p-3.5"><div className="flex items-center gap-1"><TrendingUp className="size-3.5 shrink-0 text-emerald-500 sm:size-4" /><p className="truncate text-[9px] font-black text-[var(--muted-foreground)] sm:text-xs">Thu nhập</p></div><p className="mt-1.5 whitespace-nowrap text-[10.5px] font-black tracking-[-.02em] tabular-nums text-emerald-500 sm:text-base md:text-lg">{formatMinorMoney(totals.income, currency, digits)}</p></CardContent></Card>
        <Card className="min-w-0 border-sky-500/20 bg-sky-500/[.035]"><CardContent className="p-2.5 sm:p-3.5"><div className="flex items-center gap-1"><CircleDollarSign className="size-3.5 shrink-0 text-sky-500 sm:size-4" /><p className="truncate text-[9px] font-black text-[var(--muted-foreground)] sm:text-xs">Ròng</p></div><p className={cn("mt-1.5 whitespace-nowrap text-[10.5px] font-black tracking-[-.02em] tabular-nums sm:text-base md:text-lg", totals.net < 0 ? "text-rose-500" : "text-sky-500")}>{formatMinorMoney(totals.net, currency, digits)}</p></CardContent></Card>
      </div>

      <Card className="mt-3">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-black">{type === "expense" ? "Chi tiêu" : "Thu nhập"} theo danh mục</h2>
              <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">{periodLabel} · {currency}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-black">{formatMinorMoney(selectedTotal, currency, digits)}</p>
              <div className="mt-1.5 grid grid-cols-2 rounded-lg bg-[var(--muted)]/70 p-0.5">
                <Link href={reportUrl({ mode, period, year, type: "expense" })} className={cn("rounded-md px-2.5 py-1 text-[10px] font-black", type === "expense" ? "bg-[var(--card)] text-rose-500 shadow-sm" : "text-[var(--muted-foreground)]")}>Chi</Link>
                <Link href={reportUrl({ mode, period, year, type: "income" })} className={cn("rounded-md px-2.5 py-1 text-[10px] font-black", type === "income" ? "bg-[var(--card)] text-emerald-500 shadow-sm" : "text-[var(--muted-foreground)]")}>Thu</Link>
              </div>
            </div>
          </div>

          {categories.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-[var(--border)] p-7 text-center text-sm text-[var(--muted-foreground)]">Chưa có dữ liệu trong kỳ này.</div>
          ) : (
            <div className="mt-4 grid items-start gap-4 md:grid-cols-[280px_1fr]">
              <ReportVisualBoundary>
                <ReportDonut slices={chartSlices} total={selectedTotal} currency={currency} decimalDigits={digits} centerLabel={type === "expense" ? "Tổng chi" : "Tổng thu"} />
              </ReportVisualBoundary>

              <div className="max-h-[310px] overflow-y-auto pr-1 [scrollbar-width:thin]">
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((item) => {
                    const color = iconColorValue(item.icon_color);
                    const detailHref = item.id.startsWith("uncategorized-") ? null : `/reports/category/${item.id}?${new URLSearchParams({ mode, type, ...(mode === "month" ? { period } : { year: String(year) }) }).toString()}`;
                    const content = (
                      <>
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--muted)]" style={{ color }}><CategoryIcon name={item.icon_name} className="size-4" /></span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[11px] font-black sm:text-xs">{item.label}</span>
                            <span className="mt-0.5 block text-[10px] font-bold text-[var(--muted-foreground)]">{item.percent}%</span>
                          </span>
                        </div>
                        <div className="mt-2 flex items-end justify-between gap-2">
                          <span className="h-1.5 min-w-8 flex-1 overflow-hidden rounded-full bg-[var(--muted)]"><span className="block h-full rounded-full" style={{ width: `${Math.max(4, item.percent)}%`, backgroundColor: color }} /></span>
                          <span className="shrink-0 text-[10px] font-black tabular-nums sm:text-[11px]">{formatMinorMoney(item.amount, currency, digits)}</span>
                        </div>
                      </>
                    );
                    return detailHref ? <Link key={item.id} href={detailHref} className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--background)] p-2.5 active:opacity-70">{content}</Link> : <div key={item.id} className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--background)] p-2.5">{content}</div>;
                  })}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-3">
        <CardContent className="p-0">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] p-3.5 sm:p-4"><div><h2 className="font-black">Chi tiết giao dịch</h2><p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">{type === "expense" ? "Chi tiêu" : "Thu nhập"} gần nhất trong kỳ</p></div><Link href={`/transactions?type=${type}&from=${bounds.from}&to=${bounds.to}`} className="text-xs font-black text-[var(--primary)]">Xem tất cả</Link></div>
          {visibleTransactions.length === 0 ? <p className="p-6 text-sm text-[var(--muted-foreground)]">Chưa có giao dịch phù hợp.</p> : <div className="divide-y divide-[var(--border)]">{visibleTransactions.map((transaction) => {
            const amount = flowAmount(transaction, currency, type);
            return <Link key={transaction.id} href={`/transactions?q=${encodeURIComponent(transaction.title)}`} className="flex min-w-0 items-center gap-3 p-3.5 active:bg-[var(--muted)]"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--muted)]" style={{ color: iconColorValue(transaction.category?.icon_color) }}><CategoryIcon name={transaction.category?.icon_name} className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-black">{transaction.category?.name ?? transaction.category_label ?? transaction.title}</span><span className="mt-0.5 block truncate text-[11px] text-[var(--muted-foreground)]">{transaction.title} · {transaction.transaction_date}</span></span><span className={cn("shrink-0 text-xs font-black", type === "income" ? "text-emerald-500" : "text-rose-500")}>{type === "income" ? "+" : "-"}{formatMinorMoney(amount, currency, digits).replace(/^[-+]/, "")}</span><ChevronRight className="size-4 shrink-0 text-[var(--muted-foreground)]" /></Link>;
          })}</div>}
        </CardContent>
      </Card>
    </div>
  );
}
