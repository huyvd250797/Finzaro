import type { MonthlyCashflowRow } from "@/features/reports/data";

export type TrendBucket = MonthlyCashflowRow & { from: string; to: string; span: number };

function lastDayOfMonth(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  const day = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  return `${month}-${String(day).padStart(2, "0")}`;
}

/** Visual-only aggregation. Source rows and exported numbers stay untouched.
 * At most ~32 clickable bars even for a long custom reporting range. */
export function trendChartBuckets(rows: MonthlyCashflowRow[]): TrendBucket[] {
  const count = rows.length;
  if (!count) return [];
  const step = count <= 24 ? 1 : count <= 96 ? 3 : Math.max(12, Math.ceil(count / 24 / 12) * 12);
  const buckets: TrendBucket[] = [];
  for (let index = 0; index < count; index += step) {
    const slice = rows.slice(index, index + step);
    const first = slice[0];
    const last = slice[slice.length - 1];
    let income = 0; let expense = 0; let net = 0;
    for (const month of slice) { income += month.income; expense += month.expense; net += month.net; }
    const label = slice.length === 1 ? first.month : `${first.month} – ${last.month}`;
    buckets.push({ key: first.key, month: label, income, expense, net, from: `${first.key}-01`, to: lastDayOfMonth(last.key), span: slice.length });
  }
  return buckets;
}
