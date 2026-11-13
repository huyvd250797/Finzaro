import type { TransactionView } from "@/features/transactions/data";
import { iconColorValue } from "@/features/categories/icons";
import { buildCategoryPeriodGroups, reportBucketTemplates, type CategoryPeriodGroup, type CategoryDrilldownMode } from "@/features/reports/category-drilldown";
import { buildInstantCategoryDetails, type CategoryDetailPayload } from "@/features/reports/category-detail-preview";
import { periodFlowTotals, reportCategoryBreakdown, type ReportFlowType } from "@/features/reports/experience";
import type { ReportFlowSnapshot } from "@/components/instant-report-breakdown";

export type ReportSummaryRow = {
  type: ReportFlowType;
  id: string | null;
  label: string;
  iconName: string;
  iconColor: string | null;
  bucket: string;
  amount: number | string;
  count: number | string;
};
export type FastPeriodSnapshot = {
  mode: CategoryDrilldownMode;
  period: string;
  year: number;
  from: string;
  to: string;
  periodLabel: string;
  currency: string;
  digits: number;
  totals: { income: number; expense: number; net: number };
  flows: Record<ReportFlowType, ReportFlowSnapshot>;
  prefetchedDetails: Record<string, CategoryDetailPayload>;
};

type PeriodArgs = Pick<FastPeriodSnapshot, "mode" | "period" | "year" | "from" | "to" | "periodLabel" | "currency" | "digits">;

/** Only aggregated, user-scoped rows travel from Supabase to the app server.
 * Bucket template filling matches the original ledger-based report semantics.
 */
export function snapshotFromSummaryRows(rows: ReportSummaryRow[], args: PeriodArgs): FastPeriodSnapshot {
  const templates = reportBucketTemplates(args.mode, args.period, args.year);
  const validBuckets = new Set(templates.map((item) => item.key));
  const flows = {} as Record<ReportFlowType, ReportFlowSnapshot>;
  for (const type of ["income", "expense"] as const) {
    const grouped = new Map<string, CategoryPeriodGroup>();
    for (const row of rows) {
      if (row.type !== type || !validBuckets.has(row.bucket)) continue;
      const amount = Number(row.amount);
      const count = Number(row.count);
      if (!Number.isSafeInteger(amount) || amount < 0 || !Number.isSafeInteger(count) || count < 0) throw new Error("Report summary contains unsafe values");
      const id = row.id ?? `uncategorized-${type}`;
      let group = grouped.get(id);
      if (!group) {
        group = { id, label: row.label || "Chưa phân loại", iconName: row.iconName || "Shapes",
          iconColor: row.iconColor, amount: 0, percent: 0, count: 0, buckets: templates.map((bucket) => ({ ...bucket })) };
        grouped.set(id, group);
      }
      const bucket = group.buckets.find((item) => item.key === row.bucket);
      if (!bucket) continue;
      group.amount += amount;
      group.count += count;
      bucket.amount += amount;
      bucket.count += count;
    }
    const categories = [...grouped.values()].sort((a, b) => b.amount - a.amount);
    const total = categories.reduce((sum, item) => sum + item.amount, 0);
    for (const category of categories) category.percent = total > 0 ? Math.round(category.amount / total * 1000) / 10 : 0;
    flows[type] = { amount: total, categories, slices: categories.map((item) => ({
      id: item.id, label: item.label, icon_name: item.iconName, icon_color: item.iconColor,
      amount: item.amount, percent: item.percent, color: iconColorValue(item.iconColor), href: null
    })) };
  }
  return { ...args, flows, totals: { income: flows.income.amount, expense: flows.expense.amount,
    net: flows.income.amount - flows.expense.amount }, prefetchedDetails: {} };
}

/** Compatibility fallback for deployments where the optional V4.1.2 SQL migration
 * is not installed. All totals are still computed from the existing audited ledger.
 */
export function snapshotFromTransactions(transactions: TransactionView[], args: PeriodArgs): FastPeriodSnapshot {
  const totals = periodFlowTotals(transactions, args.currency);
  const makeFlow = (type: ReportFlowType): ReportFlowSnapshot => {
    const slices = reportCategoryBreakdown(transactions, args.currency, type).map((item) => ({
      ...item, color: iconColorValue(item.icon_color), href: null
    }));
    return { amount: type === "income" ? totals.income : totals.expense, slices,
      categories: buildCategoryPeriodGroups(transactions, args.currency, type, args.mode, args.period, args.year) };
  };
  const flows = { income: makeFlow("income"), expense: makeFlow("expense") };
  return { ...args, totals, flows,
    prefetchedDetails: {
      ...buildInstantCategoryDetails(transactions, args.currency, "expense", args.mode, flows.expense.categories, 300),
      ...buildInstantCategoryDetails(transactions, args.currency, "income", args.mode, flows.income.categories, 180)
    }
  };
}
