import type { TransactionView } from "@/features/transactions/data";

export type StandardFlowType = "income" | "expense";

/** Canonical minor-unit flow: only normal Thu/Chi in the requested currency.
 * A transfer (including FX) or nonstandard debt/legacy entry is never income
 * or spending. No currency conversion is performed implicitly.
 */
export function standardFlowValue(tx: TransactionView, currency: string, type: StandardFlowType): number {
  if (tx.transaction_purpose !== "standard" || tx.transaction_type !== type) return 0;
  const entry = tx.entries?.find((item) => item.entry_role === type);
  if (!entry || entry.currency_code !== currency) return 0;
  const amount = Number(entry.amount_minor);
  return Number.isFinite(amount) ? Math.abs(amount) : 0;
}
