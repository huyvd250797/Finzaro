import type { FastPeriodSnapshot } from "@/features/reports/period-snapshot";

/** Reconciles the on-screen monthly/annual KPI, category slices and all day/month
 * buckets in minor units. Reject inconsistent snapshots before displaying them.
 * Independent expected-value fixture tests separately validate the underlying math.
 */
export function reconcilePeriodSnapshot(snapshot: FastPeriodSnapshot): boolean {
  if (!snapshot || !snapshot.totals || !snapshot.flows) return false;
  const amountOk = (n: number) => Number.isSafeInteger(n) && n >= 0;
  const { income, expense, net } = snapshot.totals;
  if (!amountOk(income) || !amountOk(expense) || !Number.isSafeInteger(net) || income - expense !== net) return false;
  for (const type of ["income", "expense"] as const) {
    const flow = snapshot.flows[type];
    if (!flow || !amountOk(flow.amount) || !Array.isArray(flow.slices) || !Array.isArray(flow.categories)) return false;
    if (flow.amount !== snapshot.totals[type]) return false;
    const categories = new Map(flow.categories.map((row) => [row.id, row]));
    if (categories.size !== flow.categories.length || flow.slices.length !== flow.categories.length) return false;
    if (flow.categories.reduce((sum, row) => sum + row.amount, 0) !== flow.amount) return false;
    if (flow.slices.reduce((sum, row) => sum + row.amount, 0) !== flow.amount) return false;
    for (const slice of flow.slices) {
      // DonutSlice.id is optional for generic charts, but a financial snapshot
      // must identify every category to reconcile it with the category group.
      // Guard before Map.get: never coerce a missing ID or claim a match.
      if (typeof slice.id !== "string" || !slice.id || !amountOk(slice.amount) || categories.get(slice.id)?.amount !== slice.amount) return false;
    }
    for (const group of flow.categories) {
      if (!amountOk(group.amount) || !Number.isSafeInteger(group.count) || group.count < 0) return false;
      if (group.buckets.reduce((sum, row) => sum + row.amount, 0) !== group.amount) return false;
      if (group.buckets.reduce((sum, row) => sum + row.count, 0) !== group.count) return false;
      for (const bucket of group.buckets) {
        if (!amountOk(bucket.amount) || !Number.isSafeInteger(bucket.count) || bucket.count < 0) return false;
      }
    }
  }
  return true;
}
