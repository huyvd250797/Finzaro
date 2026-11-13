import type { TransactionView } from "@/features/transactions/data";
import { flowAmount, monthBounds, reportCategoryBreakdown, type ReportFlowType } from "@/features/reports/experience";

/** Server-generated, bounded chart summaries. Full transaction rows are NOT sent to the browser. */
export type CategoryPeriodBucket = { key: string; label: string; amount: number; count: number };
export type CategoryPeriodGroup = {
  id: string;
  label: string;
  iconName: string;
  iconColor: string | null;
  amount: number;
  percent: number;
  count: number;
  buckets: CategoryPeriodBucket[];
};
export type CategoryDrilldownMode = "month" | "year";

export function reportBucketTemplates(mode: CategoryDrilldownMode, period: string, year: number): CategoryPeriodBucket[] {
  if (mode === "month") {
    const { days } = monthBounds(period);
    return Array.from({ length: days }, (_, index) => ({
      key: `${period}-${String(index + 1).padStart(2, "0")}`,
      label: String(index + 1), amount: 0, count: 0
    }));
  }
  return Array.from({ length: 12 }, (_, index) => ({
    key: `${year}-${String(index + 1).padStart(2, "0")}`,
    label: `T${index + 1}`, amount: 0, count: 0
  }));
}

/**
 * O(number of transactions + number of categories × 12/31).
 * Uses flowAmount, the same standard Thu/Chi rule as the overall report:
 * no transfers, non-standard entries or other currencies.
 */
export function buildCategoryPeriodGroups(
  transactions: TransactionView[], currency: string, type: ReportFlowType,
  mode: CategoryDrilldownMode, period: string, year: number
): CategoryPeriodGroup[] {
  const templates = reportBucketTemplates(mode, period, year);
  const summaries = reportCategoryBreakdown(transactions, currency, type);
  const byId = new Map<string, CategoryPeriodGroup>();
  for (const category of summaries) {
    byId.set(category.id, {
      id: category.id, label: category.label, iconName: category.icon_name,
      iconColor: category.icon_color, amount: category.amount, percent: category.percent,
      count: 0, buckets: templates.map((item) => ({ ...item }))
    });
  }
  const bucketIndex = new Map(templates.map((item, index) => [item.key, index]));
  for (const transaction of transactions) {
    const amount = flowAmount(transaction, currency, type);
    if (!(amount > 0)) continue;
    const categoryId = transaction.category_id ?? `uncategorized-${type}`;
    const group = byId.get(categoryId);
    const bucketKey = mode === "month" ? transaction.transaction_date : transaction.transaction_date.slice(0, 7);
    const index = bucketIndex.get(bucketKey);
    if (!group || index === undefined) continue;
    group.count += 1;
    group.buckets[index].amount += amount;
    group.buckets[index].count += 1;
  }
  return summaries.map((item) => byId.get(item.id)!).filter(Boolean);
}
