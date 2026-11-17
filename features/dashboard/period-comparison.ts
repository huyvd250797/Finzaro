import type { TransactionView } from "@/features/transactions/data";
import { standardFlowValue } from "@/features/transactions/financial-flow";

export type ComparePeriod = "today" | "month" | "year";
export type CompareFlow = "income" | "expense";
export type DashboardPrevious = Record<CompareFlow, Record<ComparePeriod, number>>;
export type DashboardComparison = { previous: DashboardPrevious; current: DashboardPrevious };

export function emptyPrevious(): DashboardPrevious {
  return { income: { today: 0, month: 0, year: 0 }, expense: { today: 0, month: 0, year: 0 } };
}

function isoUTC(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Calendar-date comparison: full previous DAY (not same hour, option B),
 * prior MONTH to the equivalent date, prior YEAR to the equivalent date.
 * Leap days and short months clamp to the last available calendar day.
 * Date-only values are independent of server timezone; today is computed
 * from the signed-in user's configured timezone by currentDateKey().
 */
export function comparisonRanges(today: string): Record<ComparePeriod, { from: string; to: string }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new Error("Invalid comparison date");
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const day = Number(today.slice(8, 10));
  if (year < 2000 || year > 2200 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month))
    throw new Error("Invalid comparison date");
  const previousDay = isoUTC(year, month - 1, day - 1);
  const priorMonthStart = isoUTC(year, month - 2, 1);
  const priorMonthYear = Number(priorMonthStart.slice(0, 4));
  const priorMonth = Number(priorMonthStart.slice(5, 7));
  return {
    today: { from: previousDay, to: previousDay },
    month: { from: priorMonthStart, to: isoUTC(priorMonthYear, priorMonth - 1, Math.min(day, daysInMonth(priorMonthYear, priorMonth))) },
    year: { from: `${year - 1}-01-01`, to: isoUTC(year - 1, month - 1, Math.min(day, daysInMonth(year - 1, month))) }
  };
}

/** Same canonical flow/currency policy as dashboard snapshot v450/v455. */
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
  if (!Number.isSafeInteger(number) || number < 0) throw new Error("Invalid comparison financial amount");
  return number;
}

function parseFlowTotals(raw: unknown): DashboardPrevious {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Missing comparison totals");
  const data = raw as Record<string, unknown>;
  const parsed = emptyPrevious();
  for (const flow of ["income", "expense"] as const) {
    const rawFlow = data[flow];
    if (rawFlow === null || typeof rawFlow !== "object" || Array.isArray(rawFlow)) throw new Error("Missing comparison flow");
    const totals = rawFlow as Record<string, unknown>;
    for (const period of ["today", "month", "year"] as const) parsed[flow][period] = financialAmount(totals[period]);
  }
  return parsed;
}

/** Validate v455 RPC, including date/currency/range contract; do not accept stale v451 totals. */
export function parseDashboardComparison(raw: unknown, today: string, currency: string): DashboardComparison {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid dashboard comparison response");
  const response = raw as Record<string, unknown>;
  if (response.snapshotVersion !== "v455" || response.today !== today || response.currency !== currency)
    throw new Error("Dashboard comparison period/currency mismatch");
  const ranges = comparisonRanges(today);
  const rawRanges = response.ranges;
  if (rawRanges === null || typeof rawRanges !== "object" || Array.isArray(rawRanges)) throw new Error("Missing comparison ranges");
  const suppliedRanges = rawRanges as Record<string, unknown>;
  for (const period of ["today", "month", "year"] as const) {
    const range = suppliedRanges[period];
    if (range === null || typeof range !== "object" || Array.isArray(range)) throw new Error("Invalid comparison date range");
    const dates = range as Record<string, unknown>;
    if (dates.from !== ranges[period].from || dates.to !== ranges[period].to)
      throw new Error(`Dashboard comparison ${period} range mismatch`);
  }
  return { previous: parseFlowTotals(response.previous), current: parseFlowTotals(response.current) };
}

/**
 * The sign belongs to the actual mathematical change, regardless of impact.
 * Financial direction controls color only: reduce expenses = green; increase income = green.
 * Zero baseline makes percentage mathematically undefined; percent is null ("Mới phát sinh").
 */
export function comparePeriodTotals(current: number, previous: number, flow: CompareFlow) {
  if (![current, previous].every((value) => Number.isSafeInteger(value) && value >= 0))
    throw new Error("Invalid financial period totals");
  if (flow !== "income" && flow !== "expense") throw new Error("Invalid financial comparison flow");
  const difference = current - previous;
  if (!Number.isSafeInteger(difference)) throw new Error("Financial difference exceeds safe integer range");
  const percent = previous === 0 ? (current === 0 ? 0 : null) : (difference / previous) * 100;
  const beneficialChange = difference * (flow === "expense" ? -1 : 1);
  return { difference, percent, direction: beneficialChange > 0 ? "positive" : beneficialChange < 0 ? "negative" : "neutral" } as const;
}
