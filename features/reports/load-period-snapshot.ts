import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { currencyDigits } from "@/features/transactions/data";
import { monthBounds, yearBounds } from "@/features/reports/experience";
import { loadReportLedger } from "@/features/reports/data";
import { snapshotFromSummaryRows, snapshotFromTransactions, type FastPeriodSnapshot, type ReportSummaryRow } from "@/features/reports/period-snapshot";
import { reconcilePeriodSnapshot } from "@/features/reports/reconcile-snapshot";
import { measureServerOperation } from "@/lib/performance";

export type ReportPeriodRequest = { mode: "month" | "year"; period: string; year: number; currency: string };
export type PeriodSnapshotLoad = { snapshot: FastPeriodSnapshot; source: "rpc" | "compatibility"; warnings: string[] };

/** Identical report path for initial navigation and client period switches.
 * No duplicate financial definitions or full-ledger hydration on first paint.
 */
export async function loadPeriodSnapshot(supabase: SupabaseClient<Database>, userId: string, pick: ReportPeriodRequest): Promise<PeriodSnapshotLoad> {
  const { mode, period, year, currency } = pick;
  const bounds = mode === "month" ? monthBounds(period) : yearBounds(year);
  const periodLabel = mode === "month" ? `Tháng ${Number(period.slice(5))}/${period.slice(0,4)}` : `Năm ${year}`;
  const [currencyResult, summaryResult] = await Promise.all([
    supabase.from("supported_currencies").select("code, decimal_digits, symbol").eq("code", currency).maybeSingle(),
    measureServerOperation("reports.v420.aggregate", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic RPC adapter until local generated types are refreshed after migration.
      return (supabase as any).rpc("report_period_summary_v412", {
        p_from_date: bounds.from, p_to_date: bounds.to, p_currency: currency, p_mode: mode
      });
    })
  ]);
  if (currencyResult.error) throw currencyResult.error;
  const digits = currencyDigits(currencyResult.data ? [currencyResult.data] : [], currency);
  const args = { mode, period, year, from: bounds.from, to: bounds.to, periodLabel, currency, digits } satisfies Parameters<typeof snapshotFromSummaryRows>[1];
  let snapshot: FastPeriodSnapshot;
  let source: PeriodSnapshotLoad["source"] = "rpc";
  const warnings: string[] = [];
  if (!summaryResult.error && summaryResult.data && typeof summaryResult.data === "object" && Array.isArray((summaryResult.data as { rows?: unknown }).rows)) {
    snapshot = snapshotFromSummaryRows((summaryResult.data as { rows: ReportSummaryRow[] }).rows, args);
  } else {
    const error = summaryResult.error as { code?: string; message?: string } | null;
    // Do not replace database errors with fake zero totals.
    if (!error || !["42883", "PGRST202"].includes(error.code ?? "")) throw error ?? new Error("Phản hồi RPC báo cáo không hợp lệ.");
    const ledger = await measureServerOperation("reports.v420.compatibility", () => loadReportLedger(supabase, userId, {
      fromDate: bounds.from, toDate: bounds.to
    }));
    if (ledger.diagnostics.strategy === "empty") throw new Error("Không thể tải kỳ báo cáo.");
    snapshot = snapshotFromTransactions(ledger.transactions, { ...args, digits: currencyDigits(ledger.currencies, currency) });
    source = "compatibility";
    warnings.push(...ledger.diagnostics.warnings);
  }
  if (!reconcilePeriodSnapshot(snapshot)) throw new Error("Báo cáo không khớp KPI, danh mục và cột dữ liệu.");
  return { snapshot, source, warnings };
}
