import Link from "next/link";
import { CircleDollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ReportDataStatus } from "@/components/report-data-status";
import { ReportNavigation } from "@/components/report-navigation";
import { ReportPeriodControls } from "@/components/report-period-controls";
import { iconColorValue } from "@/features/categories/icons";
import { InstantReportBreakdown, type ReportFlowSnapshot } from "@/components/instant-report-breakdown";
import {
  currentYearMonth,
  monthBounds,
  periodFlowTotals,
  periodTransactions,
  reportCategoryBreakdown,
  flowAmount,
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
  // Both tabs are built in one server request: changing Thu/Chi never fetches new RSC data.
  const flows = Object.fromEntries((["income", "expense"] as const).map((flowType) => {
    const categories = reportCategoryBreakdown(transactions, currency, flowType);
    const slices = categories.map((item) => ({
      ...item,
      color: iconColorValue(item.icon_color),
      href: item.id.startsWith("uncategorized-") ? null : `/reports/category/${item.id}?${new URLSearchParams({ mode, type: flowType, ...(mode === "month" ? { period } : { year: String(year) }) }).toString()}`
    }));
    const previews = transactions.filter((item) => flowAmount(item, currency, flowType) > 0).slice(0, 8).map((item) => ({
      id: item.id, title: item.title, transactionDate: item.transaction_date,
      categoryName: item.category?.name ?? item.category_label ?? item.title,
      iconName: item.category?.icon_name ?? null, iconColor: item.category?.icon_color ?? null,
      amount: flowAmount(item, currency, flowType)
    }));
    return [flowType, { amount: flowType === "income" ? totals.income : totals.expense, slices, transactions: previews }];
  })) as Record<ReportFlowType, ReportFlowSnapshot>;
  const kpiValue = (amount: number) => compactCalendarAmount(Math.abs(amount), digits) || "0";
  const periodLinks = Object.fromEntries((["income", "expense"] as const).map((flowType) => [flowType, {
    month: reportUrl({ mode: "month", period, type: flowType }),
    year: reportUrl({ mode: "year", year, type: flowType }),
    previous: mode === "month" ? reportUrl({ mode, period: shiftMonthKey(period, -1), type: flowType }) : reportUrl({ mode, year: year - 1, type: flowType }),
    next: mode === "month" ? reportUrl({ mode, period: shiftMonthKey(period, 1), type: flowType }) : reportUrl({ mode, year: year + 1, type: flowType })
  }])) as Record<ReportFlowType, { month: string; year: string; previous: string; next: string }>;
  const periodLabel = mode === "month" ? `Tháng ${Number(period.slice(5, 7))}/${period.slice(0, 4)}` : `Năm ${year}`;

  return (
    <div className="fin-page-shell mx-auto max-w-[1180px] px-3 py-4 sm:px-4 md:px-6 lg:px-8 lg:py-7">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Báo cáo</h1>
        <p className="mt-1 hidden text-xs text-[var(--muted-foreground)] sm:block">Thống kê Thu · Chi thông thường; các nghiệp vụ tài chính cũ không tính vào báo cáo mới.</p>
      </div>

      <div className="mx-auto mt-3 max-w-3xl"><ReportNavigation active="overview" /></div>
      <ReportDataStatus diagnostics={ledger.diagnostics} />

      <Card className="mx-auto mt-3 max-w-3xl">
        <CardContent className="p-2">
          <ReportPeriodControls mode={mode} initialType={type} periodLabel={periodLabel}
            from={bounds.from} to={bounds.to} periodKey={`${mode}-${mode === "month" ? period : year}`} links={periodLinks} />
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

      <Card className="mt-3"><CardContent className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4">
        <div><p className="text-[11px] font-bold text-[var(--muted-foreground)]">Tỷ lệ giữ lại trong kỳ</p><p className="mt-1 text-xl font-black text-[var(--primary)]">{totals.income > 0 ? `${((totals.net / totals.income) * 100).toFixed(1).replace(".", ",")}%` : "Chưa xác định"}</p><p className="text-[11px] text-[var(--muted-foreground)]">{totals.income > 0 ? "Dòng tiền ròng / Tổng thu thông thường" : "Chưa có thu nhập để xác định tỷ lệ"}</p></div>
        <div className="text-right"><p className="text-[11px] text-[var(--muted-foreground)]">{transactions.length} giao dịch trong kỳ</p><Link className="mt-2 inline-flex min-h-9 items-center rounded-xl bg-[var(--sidebar-accent)] px-3 text-xs font-black text-[var(--primary)]" href={`/reports/analysis?range=custom&from=${bounds.from}&to=${bounds.to}`}>Phân tích & so sánh kỳ →</Link></div>
      </CardContent></Card>

      <InstantReportBreakdown
        initialType={type} periodLabel={periodLabel}
        periodKey={`${mode}-${mode === "month" ? period : year}`}
        from={bounds.from} to={bounds.to} currency={currency} digits={digits} flows={flows}
      />
    </div>
  );
}
