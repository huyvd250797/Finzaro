import type { TransactionView } from "@/features/transactions/data";
import { standardFlowValue } from "@/features/transactions/financial-flow";

export type ComparePeriod = "today" | "month" | "year";
export type CompareFlow = "income" | "expense";
export type DashboardPrevious = Record<CompareFlow, Record<ComparePeriod, number>>;

export function emptyPrevious(): DashboardPrevious {
  return { income: { today: 0, month: 0, year: 0 }, expense: { today: 0, month: 0, year: 0 } };
}

function isoUTC(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

/** Previous *complete* day/month/year: date strings stay independent of client/server timezone. */
export function comparisonRanges(today: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new Error("Invalid comparison date");
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const previousDay = isoUTC(year, month - 1, Number(today.slice(8, 10)) - 1);
  return {
    today: { from: previousDay, to: previousDay },
    month: { from: isoUTC(year, month - 2, 1), to: isoUTC(year, month - 1, 0) },
    year: { from: `${year - 1}-01-01`, to: `${year - 1}-12-31` }
  };
}

/** Match the existing Dashboard flow policy: standard income/expense only, in the active currency. */
export function previousFromLedger(transactions: TransactionView[], today: string, currency: string): DashboardPrevious {
  const totals = emptyPrevious();
  const ranges = comparisonRanges(today);
  for (const tx of transactions) {
    for (const flow of ["income", "expense"] as const) {
      const amount = standardFlowValue(tx, currency, flow);
      if (amount <= 0) continue;
      for (const period of ["today", "month", "year"] as const) {
        if (tx.transaction_date >= ranges[period].from && tx.transaction_date <= ranges[period].to) {
          totals[flow][period] += amount;
          if (!Number.isSafeInteger(totals[flow][period])) throw new Error("Previous period exceeds safe financial integer range");
        }
      }
    }
  }
  return totals;
}

function financialAmount(value: unknown): number {
  const number = typeof value === "string" || typeof value === "number" ? Number(value) : NaN;
  if (!Number.isSafeInteger(number) || number < 0) throw new Error("Invalid previous financial amount");
  return number;
}

/** Validate the authenticated RPC response instead of asserting/forcing unknown to a typed object. */
export function parseDashboardPrevious(raw: unknown, today: string, currency: string): DashboardPrevious {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid dashboard comparison response");
  const response = raw as Record<string, unknown>;
  if (response.snapshotVersion !== "v451" || response.today !== today || response.currency !== currency)
    throw new Error("Dashboard comparison period/currency mismatch");
  const previous = response.previous;
  if (previous === null || typeof previous !== "object" || Array.isArray(previous)) throw new Error("Missing previous period totals");
  const data = previous as Record<string, unknown>;
  const parsed = emptyPrevious();
  for (const flow of ["income", "expense"] as const) {
    const rawFlow = data[flow];
    if (rawFlow === null || typeof rawFlow !== "object" || Array.isArray(rawFlow)) throw new Error("Missing comparison flow");
    const totals = rawFlow as Record<string, unknown>;
    for (const period of ["today", "month", "year"] as const) parsed[flow][period] = financialAmount(totals[period]);
  }
  return parsed;
}

/** A zero baseline cannot yield a meaningful percentage increase; never show misleading +100%. */
export function comparePeriodTotals(current: number, previous: number) {
  if (![current, previous].every((value) => Number.isSafeInteger(value) && value >= 0))
    throw new Error("Invalid financial period totals");
  const difference = current - previous;
  if (!Number.isSafeInteger(difference)) throw new Error("Financial difference exceeds safe integer range");
  const percent = previous === 0 ? (current === 0 ? 0 : null) : difference / previous * 100;
  return { difference, percent, direction: difference > 0 ? "positive" : difference < 0 ? "negative" : "neutral" } as const;
}
