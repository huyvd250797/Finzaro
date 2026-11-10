import Link from "next/link";
import { ChevronLeft, ChevronRight, CircleDollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ReportDataStatus } from "@/components/report-data-status";
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
import { compactCalendarAmount } from "@/features/reports/compact-money";
import { currencyDigits } from "@/features/transactions/data";
import { requireUser } from "@/lib/auth";
import { measureServerOperation } from "@/lib/performance";
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

  const ledger = await measureServerOperation("reports.overview.load", () => loadReportLedger(supabase, userId, { fromDate: bounds.from, toDate: bounds.to }));
  const digits = currencyDigits(ledger.currencies, currency);
  const transactions = periodTransactions(ledger.transactions, bounds.from, bounds.to);
  const totals = periodFlowTotals(transactions, currency);
  const categories = reportCategoryBreakdown(transactions, currency, type);
  const chartSlices = categories.map((item) => ({
    ...item,
    color: iconColorValue(item.icon_color),
    href: item.id.startsWith("uncategorized-") ? null : `/reports/category/${item.id}?${new URLSearchParams({ mode, type, ...(mode === "month" ? { period } : { year: String(year) }) }).toString()}`
  }));
  const selectedTotal = type === "expense" ? totals.expense : totals.income;
  const kpiValue = (amount: number) => compactCalendarAmount(Math.abs(amount), digits) || "0";
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
        <p className="mt-1 hidden text-xs text-[var(--muted-foreground)] sm:block">Thống kê Thu · Chi thông thường; các nghiệp vụ tài chính cũ không tính vào báo cáo mới.</p>
      </div>

      <div className="mx-auto mt-3 max-w-3xl"><ReportNavigation active="overview" /></div>
      <ReportDataStatus diagnostics={ledger.diagnostics} />

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

      <div className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-2">
        {([
          { label: "Thu nhập", value: totals.income, icon: TrendingUp, color: "text-emerald-500", border: "border-emerald-500/20" },
          { label: "Chi tiêu", value: totals.expense, icon: TrendingDown, color: "text-rose-500", border: "border-rose-500/20" },
          { label: "Ròng", value: totals.net, icon: CircleDollarSign, color: totals.net < 0 ? "text-rose-500" : "text-sky-500", border: "border-sky-500/20" }
        ]).map((item) => { const Icon = item.icon; return <Card key={item.label} className={`min-w-0 ${item.border}`} title={`${item.label}: ${formatMinorMoney(item.value, currency, digits)}`}><CardContent className="p-2 sm:p-3">
          <div className="flex items-center gap-1"><Icon className={`size-3 shrink-0 sm:size-4 ${item.color}`} /><span className="truncate text-[10px] font-bold text-[var(--muted-foreground)] sm:text-xs">{item.label}</span></div>
          <div className={`mt-1 whitespace-nowrap text-[clamp(11px,3vw,18px)] font-extrabold tabular-nums ${item.color}`}><span className="sm:hidden">{item.value < 0 ? "−" : ""}{kpiValue(item.value)}</span><span className="hidden sm:inline">{formatMinorMoney(item.value, currency, digits)}</span></div>
        </CardContent></Card>; })}
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
            <div className="mt-3 rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--muted-foreground)]">Chưa có giao dịch trong kỳ.</div>
          ) : (
            <div className="mt-3">
              <ReportVisualBoundary>
                <ReportDonut slices={chartSlices} total={selectedTotal} currency={currency} decimalDigits={digits} centerLabel={type === "expense" ? "Tổng chi" : "Tổng thu"} />
              </ReportVisualBoundary>
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
