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

/** Supabase RPC types are generated from the deployed database. This optional
 * RPC may not yet be present in the generated Database type, so the generic
 * performance wrapper returns `unknown`. Narrow the wire envelope at runtime
 * before reading any fields; do not suppress TS18046 with `any` assertions.
 */
type ReportSummaryRpcResult = {
  data: unknown;
  error: { code?: string; message?: string } | null;
};

function isReportSummaryRpcResult(value: unknown): value is ReportSummaryRpcResult {
  if (value === null || typeof value !== "object" || !("data" in value) || !("error" in value)) return false;
  const error = value.error;
  if (error === null) return true;
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; message?: unknown };
  return (candidate.code === undefined || typeof candidate.code === "string") &&
    (candidate.message === undefined || typeof candidate.message === "string");
}

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
  if (!isReportSummaryRpcResult(summaryResult)) throw new Error("Phản hồi RPC báo cáo không hợp lệ.");
  const payload = summaryResult.data;
  if (!summaryResult.error && payload !== null && typeof payload === "object" &&
      "rows" in payload && Array.isArray(payload.rows)) {
    snapshot = snapshotFromSummaryRows(payload.rows as ReportSummaryRow[], args);
  } else {
    const error = summaryResult.error;
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
