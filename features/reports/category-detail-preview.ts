import type { TransactionView } from "@/features/transactions/data";
import { flowAmount, type ReportFlowType } from "@/features/reports/experience";
import type { CategoryDrilldownMode, CategoryPeriodGroup } from "@/features/reports/category-drilldown";

export type CategoryDetailRow = {
  id: string;
  title: string;
  transactionDate: string;
  categoryName: string;
  iconName: string | null;
  iconColor: string | null;
  amount: number;
};
export type CategoryDetailPayload = { transactions: CategoryDetailRow[]; total: number; count: number };

/**
 * Reuse the already authenticated report ledger for small buckets. This is a
 * bounded, COMPLETE preview: a group is only sent if every one of its rows fits.
 * We never ship partial bucket contents and pretend they are the whole detail.
 */
export function buildInstantCategoryDetails(
  transactions: TransactionView[], currency: string, type: ReportFlowType,
  mode: CategoryDrilldownMode, groups: CategoryPeriodGroup[], maxRows = 480
): Record<string, CategoryDetailPayload> {
  const candidates = new Map<string, { expected: number; total: number; rows: CategoryDetailRow[] }>();
  for (const group of groups) {
    for (const bucket of group.buckets) {
      if (bucket.count > 0 && bucket.count <= 60) {
        candidates.set(`${type}|${group.id}|${bucket.key}`, { expected: bucket.count, total: bucket.amount, rows: [] });
      }
    }
  }
  for (const item of transactions) {
    const amount = flowAmount(item, currency, type);
    if (!(amount > 0)) continue;
    const categoryId = item.category_id ?? `uncategorized-${type}`;
    const bucketKey = mode === "month" ? item.transaction_date : item.transaction_date.slice(0, 7);
    const candidate = candidates.get(`${type}|${categoryId}|${bucketKey}`);
    if (!candidate) continue;
    candidate.rows.push({ id: item.id, title: item.title, transactionDate: item.transaction_date,
      categoryName: item.category?.name ?? item.category_label ?? "Chưa phân loại",
      iconName: item.category?.icon_name ?? null, iconColor: item.category?.icon_color ?? null, amount });
  }
  const result: Record<string, CategoryDetailPayload> = {};
  let used = 0;
  // Stable ordering by the report's ranked categories improves first-click latency.
  for (const group of groups) {
    for (const bucket of group.buckets) {
      const key = `${type}|${group.id}|${bucket.key}`;
      const candidate = candidates.get(key);
      if (!candidate || candidate.rows.length !== candidate.expected || used + candidate.rows.length > maxRows) continue;
      candidate.rows.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate) || b.id.localeCompare(a.id));
      result[key] = { transactions: candidate.rows, total: candidate.total, count: candidate.expected };
      used += candidate.rows.length;
    }
  }
  return result;
}
