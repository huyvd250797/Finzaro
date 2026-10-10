import Link from "next/link";
import { ChevronLeft, ChevronRight, CircleDollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ReportDonut, reportSliceColor } from "@/components/report-donut";
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
import { currencyDigits, loadLedger } from "@/features/transactions/data";
import { requireUser } from "@/lib/auth";
import { cn, formatMinorMoney } from "@/lib/utils";

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
  const currency = preferences?.currency_code ?? "VND";
  const timeZone = preferences?.timezone ?? "Asia/Ho_Chi_Minh";
  const now = currentYearMonth(timeZone);
  const currentMonth = `${now.year}-${String(now.month).padStart(2, "0")}`;
  const mode: "month" | "year" = params.mode === "year" ? "year" : "month";
  const type: ReportFlowType = params.type === "income" ? "income" : "expense";
  const period = validMonthKey(params.period, currentMonth);
  const year = validYear(params.year, now.year);
  const bounds = mode === "month" ? monthBounds(period) : yearBounds(year);

  const ledger = await loadLedger(supabase, userId, { fromDate: bounds.from, toDate: bounds.to, limit: 10000 });
  const digits = currencyDigits(ledger.currencies, currency);
  const transactions = periodTransactions(ledger.transactions, bounds.from, bounds.to);
  const totals = periodFlowTotals(transactions, currency);
  const categories = reportCategoryBreakdown(transactions, currency, type);
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
    <div className="mx-auto max-w-[1180px] px-3 py-5 sm:px-4 md:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Báo cáo</h1>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">Tổng quan thu · chi từ Transaction Ledger; tiền vay/ứng thẻ không được tính là thu nhập thực.</p>
      </div>

      <div className="mx-auto mt-5 max-w-3xl"><ReportNavigation active="overview" /></div>

      <div className="mx-auto mt-4 grid max-w-xl grid-cols-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-1">
        <Link href={reportUrl({ mode: "month", period, type })} className={cn("grid min-h-11 place-items-center rounded-xl text-sm font-black", mode === "month" ? "bg-[var(--muted)] shadow-sm" : "text-[var(--muted-foreground)]")}>Hàng tháng</Link>
        <Link href={reportUrl({ mode: "year", year, type })} className={cn("grid min-h-11 place-items-center rounded-xl text-sm font-black", mode === "year" ? "bg-[var(--muted)] shadow-sm" : "text-[var(--muted-foreground)]")}>Hàng năm</Link>
      </div>

      <Card className="mx-auto mt-4 max-w-3xl">
        <CardContent className="flex items-center gap-3 p-2 sm:p-3">
          <Link href={previousHref} aria-label="Kỳ trước" className="grid size-11 shrink-0 place-items-center rounded-xl hover:bg-[var(--muted)]"><ChevronLeft className="size-5" /></Link>
          <div className="min-w-0 flex-1 text-center"><p className="truncate text-base font-black sm:text-lg">{periodLabel}</p><p className="mt-0.5 text-[10px] font-bold text-[var(--muted-foreground)]">{bounds.from} → {bounds.to}</p></div>
          <Link href={nextHref} aria-label="Kỳ sau" className="grid size-11 shrink-0 place-items-center rounded-xl hover:bg-[var(--muted)]"><ChevronRight className="size-5" /></Link>
        </CardContent>
      </Card>

      <div className="mx-auto mt-4 grid max-w-3xl grid-cols-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-1">
        <Link href={reportUrl({ mode, period, year, type: "expense" })} className={cn("grid min-h-11 place-items-center rounded-xl text-sm font-black", type === "expense" ? "bg-rose-500/12 text-rose-500 shadow-sm" : "text-[var(--muted-foreground)]")}>Chi tiêu</Link>
        <Link href={reportUrl({ mode, period, year, type: "income" })} className={cn("grid min-h-11 place-items-center rounded-xl text-sm font-black", type === "income" ? "bg-emerald-500/12 text-emerald-500 shadow-sm" : "text-[var(--muted-foreground)]")}>Thu nhập</Link>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Card className="border-rose-500/20 bg-rose-500/[.035]"><CardContent className="p-4"><TrendingDown className="size-5 text-rose-500" /><p className="mt-3 text-xs font-bold text-[var(--muted-foreground)]">Chi tiêu</p><p className="mt-1 break-words text-xl font-black text-rose-500">{formatMinorMoney(totals.expense, currency, digits)}</p></CardContent></Card>
        <Card className="border-emerald-500/20 bg-emerald-500/[.035]"><CardContent className="p-4"><TrendingUp className="size-5 text-emerald-500" /><p className="mt-3 text-xs font-bold text-[var(--muted-foreground)]">Thu nhập</p><p className="mt-1 break-words text-xl font-black text-emerald-500">{formatMinorMoney(totals.income, currency, digits)}</p></CardContent></Card>
        <Card className="border-sky-500/20 bg-sky-500/[.035]"><CardContent className="p-4"><CircleDollarSign className="size-5 text-sky-500" /><p className="mt-3 text-xs font-bold text-[var(--muted-foreground)]">Ròng</p><p className={cn("mt-1 break-words text-xl font-black", totals.net < 0 ? "text-rose-500" : "text-sky-500")}>{formatMinorMoney(totals.net, currency, digits)}</p></CardContent></Card>
      </div>

      <Card className="mt-4">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3"><div><h2 className="font-black">{type === "expense" ? "Chi tiêu" : "Thu nhập"} theo danh mục</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">{periodLabel} · {currency}</p></div><span className="text-sm font-black">{formatMinorMoney(selectedTotal, currency, digits)}</span></div>
          {categories.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted-foreground)]">Chưa có dữ liệu trong kỳ này.</div> : <div className="mt-5 grid items-center gap-6 lg:grid-cols-[320px_1fr]">
            <ReportDonut slices={categories} total={selectedTotal} currency={currency} decimalDigits={digits} centerLabel={type === "expense" ? "Tổng chi" : "Tổng thu"} />
            <div className="divide-y divide-[var(--border)]">
              {categories.slice(0, 10).map((item, index) => {
                const detailHref = item.id.startsWith("uncategorized-") ? null : `/reports/category/${item.id}?${new URLSearchParams({ mode, type, ...(mode === "month" ? { period } : { year: String(year) }) }).toString()}`;
                const row = <><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--muted)]" style={{ color: iconColorValue(item.icon_color) }}><CategoryIcon name={item.icon_name} className="size-[18px]" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-black">{item.label}</span><span className="mt-0.5 block text-[11px] font-bold text-[var(--muted-foreground)]">{item.percent}%</span></span><span className="text-right"><span className="block text-sm font-black">{formatMinorMoney(item.amount, currency, digits)}</span><span className="mt-1 block h-1.5 w-14 overflow-hidden rounded-full bg-[var(--muted)]"><span className="block h-full rounded-full" style={{ width: `${Math.max(4, item.percent)}%`, backgroundColor: reportSliceColor(index) }} /></span></span>{detailHref && <ChevronRight className="size-4 shrink-0 text-[var(--muted-foreground)]" />}</>;
                return detailHref ? <Link key={item.id} href={detailHref} className="flex min-w-0 items-center gap-3 py-3 active:opacity-70">{row}</Link> : <div key={item.id} className="flex min-w-0 items-center gap-3 py-3">{row}</div>;
              })}
            </div>
          </div>}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="p-0">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] p-4"><div><h2 className="font-black">Chi tiết giao dịch</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">{type === "expense" ? "Chi tiêu" : "Thu nhập"} gần nhất trong kỳ</p></div><Link href={`/transactions?type=${type}&from=${bounds.from}&to=${bounds.to}`} className="text-xs font-black text-[var(--primary)]">Xem tất cả</Link></div>
          {visibleTransactions.length === 0 ? <p className="p-6 text-sm text-[var(--muted-foreground)]">Chưa có giao dịch phù hợp.</p> : <div className="divide-y divide-[var(--border)]">{visibleTransactions.map((transaction) => {
            const amount = flowAmount(transaction, currency, type);
            return <Link key={transaction.id} href={`/transactions?q=${encodeURIComponent(transaction.title)}`} className="flex min-w-0 items-center gap-3 p-4 active:bg-[var(--muted)]"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--muted)]" style={{ color: iconColorValue(transaction.category?.icon_color) }}><CategoryIcon name={transaction.category?.icon_name} className="size-[18px]" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-black">{transaction.category?.name ?? transaction.category_label ?? transaction.title}</span><span className="mt-0.5 block truncate text-xs text-[var(--muted-foreground)]">{transaction.title} · {transaction.transaction_date}</span></span><span className={cn("shrink-0 text-sm font-black", type === "income" ? "text-emerald-500" : "text-rose-500")}>{type === "income" ? "+" : "-"}{formatMinorMoney(amount, currency, digits).replace(/^[-+]/, "")}</span><ChevronRight className="size-4 shrink-0 text-[var(--muted-foreground)]" /></Link>;
          })}</div>}
        </CardContent>
      </Card>
    </div>
  );
}
