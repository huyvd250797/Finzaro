import Link from "next/link";
import { ArrowRight, CircleDollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { FinanceMetricCard } from "@/components/finance-metric-card";
import { ReportDataStatus } from "@/components/report-data-status";
import { ReportNavigation } from "@/components/report-navigation";
import { ReportPeriodControls } from "@/components/report-period-controls";
import { iconColorValue } from "@/features/categories/icons";
import { InstantReportBreakdown, type ReportFlowSnapshot } from "@/components/instant-report-breakdown";
import { buildCategoryPeriodGroups } from "@/features/reports/category-drilldown";
import { buildInstantCategoryDetails } from "@/features/reports/category-detail-preview";
import {
  currentYearMonth,
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
  const buildFlowSnapshot = (flowType: ReportFlowType): ReportFlowSnapshot => {
    const categories = reportCategoryBreakdown(transactions, currency, flowType);
    const slices = categories.map((item) => ({
      ...item,
      color: iconColorValue(item.icon_color),
      href: item.id.startsWith("uncategorized-") ? null : `/reports/category/${item.id}?${new URLSearchParams({ mode, type: flowType, ...(mode === "month" ? { period } : { year: String(year) }) }).toString()}`
    }));
    const categoriesByPeriod = buildCategoryPeriodGroups(transactions, currency, flowType, mode, period, year);
    return { amount: flowType === "income" ? totals.income : totals.expense, slices, categories: categoriesByPeriod };
  };
  // Explicit keys prove to TypeScript that both report types are always present.
  const flows: Record<ReportFlowType, ReportFlowSnapshot> = {
    income: buildFlowSnapshot("income"),
    expense: buildFlowSnapshot("expense")
  };
  type PeriodLinks = { month: string; year: string; previous: string; next: string };
  const buildPeriodLinks = (flowType: ReportFlowType): PeriodLinks => ({
    month: reportUrl({ mode: "month", period, type: flowType }),
    year: reportUrl({ mode: "year", year, type: flowType }),
    previous: mode === "month" ? reportUrl({ mode, period: shiftMonthKey(period, -1), type: flowType }) : reportUrl({ mode, year: year - 1, type: flowType }),
    next: mode === "month" ? reportUrl({ mode, period: shiftMonthKey(period, 1), type: flowType }) : reportUrl({ mode, year: year + 1, type: flowType })
  });
  // Bounded complete bucket previews reuse the ledger already loaded for the
  // overview. Most small day/month buckets can open without ANY new request.
  const prefetchedDetails = {
    ...buildInstantCategoryDetails(transactions, currency, "expense", mode, flows.expense.categories, 300),
    ...buildInstantCategoryDetails(transactions, currency, "income", mode, flows.income.categories, 180)
  };
  const periodLinks: Record<ReportFlowType, PeriodLinks> = {
    income: buildPeriodLinks("income"),
    expense: buildPeriodLinks("expense")
  };
  const periodLabel = mode === "month" ? `Tháng ${Number(period.slice(5, 7))}/${period.slice(0, 4)}` : `Năm ${year}`;

  return (
    <div className="fin-page-shell mx-auto max-w-[1180px] px-3 py-4 sm:px-4 md:px-6 lg:px-8 lg:py-7">
      <header className="fin-report-header flex flex-wrap items-center justify-between gap-3">
        <div><p className="fin-section-eyebrow">FINZARO / FINANCIAL REPORT</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Báo cáo tài chính</h1><p className="mt-1 text-xs text-[var(--muted-foreground)]">Tổng quan Thu / Chi và cơ cấu danh mục trong kỳ.</p></div>
        <Link href="/reports/analysis" className="fin-secondary-btn !min-h-10 !px-3 !text-xs">Phân tích nâng cao <ArrowRight className="size-4"/></Link>
      </header>
      <div className="mt-3"><ReportNavigation active="overview" /></div>
      <ReportDataStatus diagnostics={ledger.diagnostics} />

      <Card className="fin-report-period-card mt-3"><CardContent className="p-2.5 sm:p-3.5">
        <ReportPeriodControls mode={mode} initialType={type} periodLabel={periodLabel}
          from={bounds.from} to={bounds.to} periodKey={`${mode}-${mode === "month" ? period : year}`} links={periodLinks} />
      </CardContent></Card>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        <FinanceMetricCard className="fin-report-kpi" label="Tổng thu" tone="income" value={formatMinorMoney(totals.income, currency, digits)} icon={TrendingUp} detail={`Trong ${periodLabel.toLowerCase()}`} />
        <FinanceMetricCard className="fin-report-kpi" label="Tổng chi" tone="expense" value={formatMinorMoney(totals.expense, currency, digits)} icon={TrendingDown} detail={`Trong ${periodLabel.toLowerCase()}`} />
        <FinanceMetricCard className="fin-report-kpi col-span-2 sm:col-span-1" label="Dòng tiền ròng" tone="net" value={formatMinorMoney(totals.net, currency, digits)} icon={CircleDollarSign} detail="Thu nhập trừ chi tiêu" />
      </div>
      <Card className="fin-retention-card mt-3"><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
        <div><p className="fin-section-eyebrow">HIỆU QUẢ DÒNG TIỀN</p><h2 className="mt-1 text-sm font-extrabold">Tỷ lệ giữ lại trong kỳ</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Dòng tiền ròng / Tổng thu thông thường</p></div>
        <div className="min-w-0 text-left sm:text-right"><p className="text-2xl font-black tracking-tight text-[var(--primary)] tabular-nums">{totals.income > 0 ? `${((totals.net / totals.income) * 100).toFixed(1).replace(".", ",")}%` : "—"}</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">{totals.income > 0 ? `${transactions.length} giao dịch trong kỳ` : "Chưa có thu nhập để xác định tỷ lệ"}</p></div>
        <Link className="fin-text-action w-full justify-center border-t border-[var(--border)] pt-3 sm:w-auto sm:border-0 sm:pt-0" href={`/reports/analysis?range=custom&from=${bounds.from}&to=${bounds.to}`}>Phân tích & so sánh kỳ <ArrowRight className="size-4"/></Link>
      </CardContent></Card>

      <InstantReportBreakdown
        initialType={type} periodLabel={periodLabel} mode={mode}
        periodKey={`${mode}-${mode === "month" ? period : year}`}
        from={bounds.from} to={bounds.to} currency={currency} digits={digits} flows={flows} prefetchedDetails={prefetchedDetails}
      />
    </div>
  );
}
