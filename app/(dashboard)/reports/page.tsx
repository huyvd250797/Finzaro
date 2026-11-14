import { ReportNavigation } from "@/components/report-navigation";
import { FastReportOverview } from "@/components/fast-report-overview";
import { currentYearMonth, validMonthKey, validYear, type ReportFlowType } from "@/features/reports/experience";
import { loadPeriodSnapshot } from "@/features/reports/load-period-snapshot";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Báo cáo" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const params = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, one(value)])) as Record<string, string | undefined>;
  const { supabase, userId } = await requireUser();
  const { data: preference, error } = await supabase.from("user_preferences")
    .select("currency_code, timezone").eq("id", userId).maybeSingle();
  if (error) throw error;
  const currency = (preference?.currency_code ?? "VND").toUpperCase();
  const now = currentYearMonth(preference?.timezone ?? "Asia/Ho_Chi_Minh");
  const currentMonth = `${now.year}-${String(now.month).padStart(2, "0")}`;
  const mode: "month" | "year" = params.mode === "year" ? "year" : "month";
  const type: ReportFlowType = params.type === "income" ? "income" : "expense";
  const period = validMonthKey(params.period, currentMonth);
  const year = validYear(params.year, now.year);
  // Separate data errors from rendering. JSX created inside try/catch is
  // not protected against React render failures and breaks the lint gate.
  let snapshot: Awaited<ReturnType<typeof loadPeriodSnapshot>>["snapshot"] | undefined;
  try {
    const result = await loadPeriodSnapshot(supabase, userId, { mode, period, year, currency });
    snapshot = result.snapshot;
  } catch (cause) {
    console.error("[Finzaro Reports] first period failed", cause);
  }
  const content = snapshot
    ? <FastReportOverview initialType={type} initialSnapshot={snapshot}/>
    : <div role="alert" className="mt-3 rounded-xl border border-rose-500/35 p-4 text-sm text-rose-600">Không tải được dữ liệu báo cáo chính xác. Vui lòng thử tải lại trang.</div>;
  return <div className="fin-page-shell mx-auto max-w-[1180px] px-3 py-4 sm:px-4 md:px-6 lg:px-8 lg:py-7">
    <header className="fin-report-header flex items-center justify-between gap-3"><div><p className="fin-section-eyebrow">FINZARO / FINANCIAL REPORT</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Báo cáo tài chính</h1><p className="mt-1 text-xs text-[var(--muted-foreground)]">Tổng quan Thu / Chi theo danh mục.</p></div></header>
    <div className="mt-3"><ReportNavigation active="overview"/></div>{content}
  </div>;
}
