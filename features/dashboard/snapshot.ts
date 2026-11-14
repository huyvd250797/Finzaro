import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { loadReportLedger } from "@/features/reports/data";
import { currentDateKey, currencyDigits, type TransactionView } from "@/features/transactions/data";
import { standardFlowValue } from "@/features/transactions/financial-flow";
import { measureServerOperation } from "@/lib/performance";

export type SpendingPeriod = "today" | "month" | "year";
export type DashboardFlow = "income" | "expense";
export type SpendCategory = { id: string; label: string; iconName: string; iconColor: string | null; amount: number; count: number };
export type SpendRecent = { id: string; title: string; date: string; category: string; amount: number };
export type SpendingSummary = { amount: number; count: number; categories: SpendCategory[]; recent: SpendRecent[] };
export type DailyFinancialRow = { date: string; income: number; expense: number; delta: number };
export type DashboardSnapshot = {
  today: string; currency: string; digits: number; balance: number; closingBalance: number;
  monthTotals: { income: number; expense: number; net: number };
  spending: Record<SpendingPeriod, SpendingSummary>;
  incoming: Record<SpendingPeriod, SpendingSummary>;
  daily: DailyFinancialRow[];
  /** Only cash, bank and e-wallet account positions are included; not a complete balance sheet. */
  positionScope: "liquid_accounts";
};

const allowedPeriod = ["today", "month", "year"] as const;
const emptySpend = (): SpendingSummary => ({ amount: 0, count: 0, categories: [], recent: [] });
const validMoney = (value: unknown): number => {
  const num = typeof value === "string" || typeof value === "number" ? Number(value) : NaN;
  if (!Number.isSafeInteger(num)) throw new Error("Số liệu tài chính không thuộc miền số nguyên an toàn.");
  return num;
};
const isoDay = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Định dạng Dashboard không hợp lệ.");
  return value as Record<string, unknown>;
};

/** Strict boundary: never render incomplete or silently truncated aggregate values. */
export function parseDashboardSummary(raw: unknown, today: string, currency: string, digits: number): DashboardSnapshot {
  const data = object(raw);
  const rows = Array.isArray(data.daily) ? data.daily : null;
  const categories = Array.isArray(data.categories) ? data.categories : null;
  const recent = Array.isArray(data.recent) ? data.recent : null;
  const movements = Array.isArray(data.movements) ? data.movements : null;
  if (!rows || !categories || !recent || !movements || data.today !== today) throw new Error("Snapshot Dashboard bị thiếu dữ liệu.");
  const dailyByDate = new Map<string, DailyFinancialRow>();
  for (const item of rows) {
    const row = object(item);
    if (!isoDay(row.date)) throw new Error("Ngày tổng hợp không hợp lệ.");
    dailyByDate.set(row.date, { date: row.date, income: validMoney(row.income), expense: validMoney(row.expense), delta: 0 });
  }
  const deltaByDate = new Map<string, number>();
  for (const item of movements) {
    const row = object(item);
    if (!isoDay(row.date)) throw new Error("Ngày biến động không hợp lệ.");
    deltaByDate.set(row.date, validMoney(row.delta));
  }
  const start = new Date(`${today}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 365);
  const daily: DailyFinancialRow[] = [];
  for (let day = new Date(start); day <= new Date(`${today}T00:00:00Z`); day.setUTCDate(day.getUTCDate() + 1)) {
    const key = day.toISOString().slice(0, 10);
    const flow = dailyByDate.get(key);
    daily.push({ date: key, income: flow?.income ?? 0, expense: flow?.expense ?? 0, delta: deltaByDate.get(key) ?? 0 });
  }
  const spending: DashboardSnapshot["spending"] = { today: emptySpend(), month: emptySpend(), year: emptySpend() };
  const incoming: DashboardSnapshot["incoming"] = { today: emptySpend(), month: emptySpend(), year: emptySpend() };
  const v450 = data.snapshotVersion === "v450";
  for (const item of categories) {
    const row = object(item);
    if (!allowedPeriod.includes(row.period as SpendingPeriod)) throw new Error("Kỳ chi tiêu không hợp lệ.");
    const period = row.period as SpendingPeriod;
    const flow = row.flowType === "income" ? "income" : "expense";
    if (v450 && row.flowType !== flow) throw new Error("Loại dòng tiền Dashboard không hợp lệ.");
    const group = flow === "income" ? incoming : spending;
    group[period].categories.push({
      id: String(row.id ?? "uncategorized"), label: String(row.label ?? "Chưa phân loại"),
      iconName: String(row.iconName ?? "Shapes"), iconColor: typeof row.iconColor === "string" ? row.iconColor : null,
      amount: validMoney(row.amount), count: validMoney(row.count)
    });
  }
  for (const item of recent) {
    const row = object(item);
    if (!allowedPeriod.includes(row.period as SpendingPeriod) || !isoDay(row.date)) throw new Error("Giao dịch gần đây không hợp lệ.");
    const flow = row.flowType === "income" ? "income" : "expense";
    if (v450 && row.flowType !== flow) throw new Error("Loại giao dịch Dashboard không hợp lệ.");
    const group = flow === "income" ? incoming : spending;
    group[row.period as SpendingPeriod].recent.push({
      id: String(row.id), title: String(row.title), date: row.date,
      category: String(row.category ?? "Chưa phân loại"), amount: validMoney(row.amount)
    });
  }
  for (const group of [spending, incoming]) {
    for (const period of allowedPeriod) {
      group[period].categories.sort((a, b) => b.amount - a.amount);
      group[period].amount = group[period].categories.reduce((sum, row) => sum + row.amount, 0);
      group[period].count = group[period].categories.reduce((sum, row) => sum + row.count, 0);
      if (!Number.isSafeInteger(group[period].amount) || !Number.isSafeInteger(group[period].count))
        throw new Error("Dòng tiền Dashboard vượt giới hạn số nguyên an toàn.");
      group[period].recent.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
      group[period].recent = group[period].recent.slice(0, 5);
    }
  }
  const monthTotals = object(data.monthTotals);
  const income = validMoney(monthTotals.income), expense = validMoney(monthTotals.expense);
  if (spending.month.amount !== expense) throw new Error("Đối soát tổng chi Dashboard không khớp.");
  if (v450 && incoming.month.amount !== income) throw new Error("Đối soát tổng thu Dashboard không khớp.");
  return { today, currency, digits, balance: validMoney(data.balance), closingBalance: validMoney(data.closingBalance),
    monthTotals: { income, expense, net: income - expense }, spending, incoming, daily, positionScope: "liquid_accounts" };
}

function standardExpense(tx: TransactionView, currency: string) {
  return standardFlowValue(tx, currency, "expense");
}

export function dashboardFromLedger(transactions: TransactionView[], accounts: Array<{ id: string; account_type: string; currency_code: string; is_archived: boolean; current_balance_minor: number }>, today: string, currency: string, digits: number): DashboardSnapshot {
  const periodFirst = { today, month: `${today.slice(0, 7)}-01`, year: `${today.slice(0, 4)}-01-01` };
  const endMonth = new Date(Date.UTC(Number(today.slice(0,4)), Number(today.slice(5,7)), 0)).toISOString().slice(0,10);
  const periodLast = { today, month: endMonth, year: `${today.slice(0,4)}-12-31` };
  const spending: DashboardSnapshot["spending"] = { today: emptySpend(), month: emptySpend(), year: emptySpend() };
  const incoming: DashboardSnapshot["incoming"] = { today: emptySpend(), month: emptySpend(), year: emptySpend() };
  const summaries: Record<DashboardFlow, Record<SpendingPeriod, SpendingSummary>> = { expense: spending, income: incoming };
  const categoriesByFlow: Record<DashboardFlow, Record<SpendingPeriod, Map<string, SpendCategory>>> = {
    expense: { today: new Map(), month: new Map(), year: new Map() },
    income: { today: new Map(), month: new Map(), year: new Map() }
  };
  const dates = new Map<string, DailyFinancialRow>();
  const liquidAccounts = accounts.filter((account) => !account.is_archived && account.currency_code === currency && ["bank", "cash", "ewallet"].includes(account.account_type));
  const activeIds = new Set(liquidAccounts.map((account) => account.id));
  const balance = liquidAccounts.reduce((sum, account) => sum + account.current_balance_minor, 0);
  let futureDelta = 0;
  let monthIncome = 0, monthExpense = 0;
  const start = new Date(`${today}T00:00:00Z`); start.setUTCDate(start.getUTCDate() - 365);
  const firstDate = start.toISOString().slice(0, 10);
  for (const tx of transactions) {
    const income = standardFlowValue(tx, currency, "income");
    const expense = standardExpense(tx, currency);
    const delta = tx.entries.filter((entry) => activeIds.has(entry.account_id) && entry.currency_code === currency).reduce((sum, entry) => sum + entry.amount_minor, 0);
    if (tx.transaction_date.startsWith(today.slice(0,7))) { monthIncome += income; monthExpense += expense; }
    if (tx.transaction_date > today) futureDelta += delta;
    if (tx.transaction_date >= firstDate && tx.transaction_date <= today) {
      const row = dates.get(tx.transaction_date) ?? { date: tx.transaction_date, income: 0, expense: 0, delta: 0 };
      row.income += income; row.expense += expense; row.delta += delta; dates.set(tx.transaction_date, row);
    }
    for (const [flow, amount] of [["expense", expense], ["income", income]] as const) {
      if (amount <= 0) continue;
      for (const period of allowedPeriod) {
        if (tx.transaction_date < periodFirst[period] || tx.transaction_date > periodLast[period]) continue;
        const summary = summaries[flow][period];
        summary.amount += amount; summary.count += 1;
        const id = tx.category_id ?? "uncategorized";
        const periodCategories = categoriesByFlow[flow][period];
        const existing = periodCategories.get(id) ?? { id, label: tx.category?.name ?? tx.category_label ?? "Chưa phân loại",
          iconName: tx.category?.icon_name ?? "Shapes", iconColor: tx.category?.icon_color ?? null, amount: 0, count: 0 };
        existing.amount += amount; existing.count += 1; periodCategories.set(id, existing);
        summary.recent.push({ id: tx.id, title: tx.title, date: tx.transaction_date, category: existing.label, amount });
      }
    }
  }
  for (const flow of ["expense", "income"] as const) {
    for (const period of allowedPeriod) {
      const summary = summaries[flow][period];
      summary.categories = [...categoriesByFlow[flow][period].values()].sort((a,b) => b.amount - a.amount);
      summary.recent.sort((a,b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
      summary.recent = summary.recent.slice(0, 5);
      if (!Number.isSafeInteger(summary.amount)) throw new Error("Dòng tiền Dashboard vượt giới hạn số nguyên an toàn.");
    }
  }
  const daily: DailyFinancialRow[] = [];
  for (let day = start; day <= new Date(`${today}T00:00:00Z`); day.setUTCDate(day.getUTCDate() + 1)) {
    const key = day.toISOString().slice(0,10);
    daily.push(dates.get(key) ?? { date: key, income: 0, expense: 0, delta: 0 });
  }
  return { today, currency, digits, balance, closingBalance: balance - futureDelta,
    monthTotals: { income: monthIncome, expense: monthExpense, net: monthIncome - monthExpense }, spending, incoming, daily, positionScope: "liquid_accounts" };
}

export async function loadDashboardSnapshot(supabase: SupabaseClient<Database>, userId: string, currency: string, timeZone: string) {
  const today = currentDateKey(timeZone);
  // Currency precision and authenticated database aggregates run in parallel.
  const [currencyResult, aggregate] = await Promise.all([
    supabase.from("supported_currencies").select("code, decimal_digits, symbol").eq("code", currency).maybeSingle(),
    measureServerOperation("dashboard.v450.summary", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC is new; generated Supabase types will include it after the migration is deployed.
      return (supabase as any).rpc("dashboard_snapshot_v450", { p_currency: currency, p_today: today });
    })
  ]);
  if (currencyResult.error) throw currencyResult.error;
  const digits = currencyDigits(currencyResult.data ? [currencyResult.data] : [], currency);
  if (!aggregate.error) return parseDashboardSummary(aggregate.data, today, currency, digits);
  if (!["42883", "PGRST202"].includes(aggregate.error.code ?? "")) throw aggregate.error;
  // Migration not installed: full ledger fallback never silently returns fake zeros.
  const date = new Date(`${today}T00:00:00Z`); date.setUTCDate(date.getUTCDate() - 365);
  const from = date.toISOString().slice(0, 10) < `${today.slice(0,4)}-01-01` ? date.toISOString().slice(0,10) : `${today.slice(0,4)}-01-01`;
  const ledger = await measureServerOperation("dashboard.v450.compatibility", () => loadReportLedger(supabase, userId, {
    fromDate: from, toDate: `${today.slice(0,4)}-12-31`, includeAccounts: true
  }));
  if (ledger.diagnostics.strategy === "empty") throw new Error("Không thể tải dữ liệu Dashboard.");
  return dashboardFromLedger(ledger.transactions, ledger.accounts, today, currency, digits);
}
