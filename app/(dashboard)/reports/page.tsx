import { ReportDataStatus } from "@/components/report-data-status";
import { ReportNavigation } from "@/components/report-navigation";
import { iconColorValue } from "@/features/categories/icons";
import type { ReportFlowSnapshot } from "@/components/instant-report-breakdown";
import { FastReportOverview } from "@/components/fast-report-overview";
import { buildCategoryPeriodGroups } from "@/features/reports/category-drilldown";
import { buildInstantCategoryDetails } from "@/features/reports/category-detail-preview";
import {
  currentYearMonth,
  monthBounds,
  periodFlowTotals,
  periodTransactions,
  reportCategoryBreakdown,
  validMonthKey,
  validYear,
  yearBounds,
  type ReportFlowType
} from "@/features/reports/experience";
import { loadReportLedger } from "@/features/reports/data";
import { currencyDigits } from "@/features/transactions/data";
import { requireUser } from "@/lib/auth";
import { measureServerOperation } from "@/lib/performance";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Báo cáo" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
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
  const prefetchedDetails = {
    ...buildInstantCategoryDetails(transactions, currency, "expense", mode, flows.expense.categories, 300),
    ...buildInstantCategoryDetails(transactions, currency, "income", mode, flows.income.categories, 180)
  };
  const periodLabel = mode === "month" ? `Tháng ${Number(period.slice(5, 7))}/${period.slice(0, 4)}` : `Năm ${year}`;

  return (
    <div className="fin-page-shell mx-auto max-w-[1180px] px-3 py-4 sm:px-4 md:px-6 lg:px-8 lg:py-7">
      <header className="fin-report-header flex items-center justify-between gap-3">
        <div><p className="fin-section-eyebrow">FINZARO / FINANCIAL REPORT</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Báo cáo tài chính</h1><p className="mt-1 text-xs text-[var(--muted-foreground)]">Tổng quan Thu / Chi theo danh mục.</p></div>
      </header>
      <div className="mt-3"><ReportNavigation active="overview" /></div>
      <ReportDataStatus diagnostics={ledger.diagnostics} />

      <FastReportOverview initialType={type} initialSnapshot={{
        mode, period, year, from: bounds.from, to: bounds.to, periodLabel,
        currency, digits, totals, flows, prefetchedDetails
      }} />
    </div>
  );
}
