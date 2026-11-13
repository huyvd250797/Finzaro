import type { DailyFinancialRow } from "@/features/dashboard/snapshot";

export type TrendRange = "7d" | "1m" | "3m" | "6m" | "1y";
export type TrendPoint = { key: string; label: string; income: number; expense: number; netWorth: number; from: string; to: string };
export const TREND_RANGES: Array<{ key: TrendRange; label: string }> = [
  { key: "7d", label: "7 ngày" }, { key: "1m", label: "1 tháng" }, { key: "3m", label: "3 tháng" },
  { key: "6m", label: "6 tháng" }, { key: "1y", label: "1 năm" }
];

function startForRange(today: string, range: TrendRange): string {
  const at = new Date(`${today}T00:00:00Z`);
  if (range === "7d" || range === "1m") at.setUTCDate(at.getUTCDate() - (range === "7d" ? 6 : 29));
  else at.setUTCMonth(at.getUTCMonth() - (range === "3m" ? 2 : range === "6m" ? 5 : 11), 1);
  return at.toISOString().slice(0, 10);
}

/** One 366-day payload feeds all five filters, without subsequent network calls. */
export function buildTrendPoints(daily: DailyFinancialRow[], closingBalance: number, today: string, range: TrendRange): TrendPoint[] {
  const first = startForRange(today, range);
  const positions = new Map<string, number>();
  let laterChanges = 0;
  for (let i = daily.length - 1; i >= 0; i--) {
    const row = daily[i];
    positions.set(row.date, closingBalance - laterChanges);
    laterChanges += row.delta;
  }
  const result = new Map<string, TrendPoint>();
  for (const row of daily) {
    if (row.date < first || row.date > today) continue;
    const at = new Date(`${row.date}T00:00:00Z`);
    let bucket: string;
    let label: string;
    if (range === "7d" || range === "1m") {
      bucket = row.date; label = `${row.date.slice(8,10)}/${row.date.slice(5,7)}`;
    } else if (range === "3m") {
      const monday = new Date(at);
      const weekday = (monday.getUTCDay() + 6) % 7;
      monday.setUTCDate(monday.getUTCDate() - weekday);
      bucket = monday.toISOString().slice(0, 10); label = `${bucket.slice(8,10)}/${bucket.slice(5,7)}`;
    } else {
      bucket = row.date.slice(0,7); label = `T${Number(bucket.slice(5))}/${bucket.slice(2,4)}`;
    }
    const existing = result.get(bucket) ?? { key: bucket, label, income: 0, expense: 0,
      netWorth: positions.get(row.date) ?? closingBalance, from: row.date, to: row.date };
    existing.income += row.income;
    existing.expense += row.expense;
    existing.netWorth = positions.get(row.date) ?? closingBalance;
    existing.to = row.date;
    result.set(bucket, existing);
  }
  return [...result.values()];
}
