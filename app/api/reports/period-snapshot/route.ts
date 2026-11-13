import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { loadReportLedger } from "@/features/reports/data";
import { currencyDigits } from "@/features/transactions/data";
import { currentYearMonth, monthBounds, validMonthKey, validYear, yearBounds } from "@/features/reports/experience";
import { snapshotFromSummaryRows, snapshotFromTransactions, type ReportSummaryRow } from "@/features/reports/period-snapshot";
import { reconcilePeriodSnapshot } from "@/features/reports/reconcile-snapshot";
import type { CategoryDrilldownMode } from "@/features/reports/category-drilldown";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const PRIVATE_HEADERS = { "Cache-Control": "private, no-store, max-age=0", "Vary": "Cookie" };

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { supabase, userId } = await requireUser();
    const { data: preferences, error: prefError } = await supabase.from("user_preferences")
      .select("currency_code, timezone").eq("id", userId).maybeSingle();
    if (prefError) throw prefError;
    const currency = (preferences?.currency_code ?? "VND").toUpperCase();
    const timeZone = preferences?.timezone ?? "Asia/Ho_Chi_Minh";
    const today = currentYearMonth(timeZone);
    const currentMonth = `${today.year}-${String(today.month).padStart(2, "0")}`;
    const mode: CategoryDrilldownMode = url.searchParams.get("mode") === "year" ? "year" : "month";
    const period = validMonthKey(url.searchParams.get("period") ?? undefined, currentMonth);
    const year = validYear(url.searchParams.get("year") ?? undefined, today.year);
    // Prevent malformed search inputs from returning misleading period totals.
    if ((url.searchParams.has("mode") && !["month", "year"].includes(url.searchParams.get("mode") ?? "")) ||
      (url.searchParams.has("period") && period !== url.searchParams.get("period")) ||
      (url.searchParams.has("year") && String(year) !== url.searchParams.get("year"))) {
      return NextResponse.json({ error: "Kỳ báo cáo không hợp lệ." }, { status: 400, headers: PRIVATE_HEADERS });
    }
    const bounds = mode === "month" ? monthBounds(period) : yearBounds(year);
    const periodLabel = mode === "month" ? `Tháng ${Number(period.slice(5, 7))}/${period.slice(0, 4)}` : `Năm ${year}`;
    // Fetch the currency precision and database aggregate concurrently after
    // resolving the user's server-owned preferences. This avoids another
    // serial Supabase round trip on every uncached period switch.
    const [currencyResult, summaryResult] = await Promise.all([
      supabase.from("supported_currencies").select("code, decimal_digits, symbol").eq("code", currency).maybeSingle(),
      (supabase as any).rpc("report_period_summary_v412", {
        p_from_date: bounds.from, p_to_date: bounds.to, p_currency: currency, p_mode: mode
      })
    ]);
    if (currencyResult.error) throw currencyResult.error;
    const digits = currencyDigits(currencyResult.data ? [currencyResult.data] : [], currency);
    const args = { mode, period, year, from: bounds.from, to: bounds.to, periodLabel, currency, digits } satisfies Parameters<typeof snapshotFromSummaryRows>[1];
    const { data, error } = summaryResult as { data: unknown; error: { code?: string; message?: string } | null };
    // Fast path: PostgreSQL aggregates income/expense category buckets without
    // transferring the complete ledger to the Next.js server.
    if (!error && data && typeof data === "object" && Array.isArray((data as { rows?: unknown }).rows)) {
      const snapshot = snapshotFromSummaryRows((data as { rows: ReportSummaryRow[] }).rows, args);
      if (!reconcilePeriodSnapshot(snapshot)) throw new Error("Báo cáo không khớp KPI, danh mục và chi tiết kỳ.");
      return NextResponse.json(snapshot, { headers: PRIVATE_HEADERS });
    }
    // Fallback is ONLY for a missing SQL function, not for an arbitrary DB
    // failure; the latter must be surfaced rather than showing fake zeros.
    if (error && !["42883", "PGRST202"].includes(error.code ?? "")) throw error;
    const ledger = await loadReportLedger(supabase, userId, { fromDate: bounds.from, toDate: bounds.to });
    if (ledger.diagnostics.strategy === "empty") throw new Error("Không thể tải dữ liệu giao dịch của kỳ báo cáo.");
    const snapshot = snapshotFromTransactions(ledger.transactions, { ...args,
      digits: currencyDigits(ledger.currencies, currency) });
    if (!reconcilePeriodSnapshot(snapshot)) throw new Error("Báo cáo không khớp KPI, danh mục và chi tiết kỳ.");
    return NextResponse.json(snapshot, { headers: PRIVATE_HEADERS });
  } catch (error) {
    console.error("[Finzaro Reports] period snapshot failed", error);
    return NextResponse.json({ error: "Không tải được kỳ báo cáo. Vui lòng thử lại." }, { status: 500, headers: PRIVATE_HEADERS });
  }
}
