import type { TransactionView } from "@/features/transactions/data";
import { transactionEntry } from "@/features/transactions/data";

export type ReportFlowType = "expense" | "income";
export type ReportCategoryRow = {
  id: string;
  label: string;
  icon_name: string;
  icon_color: string | null;
  amount: number;
  percent: number;
};

export function currentYearMonth(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { year: Number(get("year")), month: Number(get("month")), day: Number(get("day")) };
}

export function validMonthKey(value: string | undefined, fallback: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value ?? "") ? value! : fallback;
}

export function validYear(value: string | undefined, fallback: number) {
  const year = Number(value);
  return Number.isInteger(year) && year >= 2000 && year <= 2200 ? year : fallback;
}

export function monthBounds(key: string) {
  const [year, month] = key.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${key}-01`, to: `${key}-${String(last).padStart(2, "0")}`, year, month, days: last };
}

export function yearBounds(year: number) {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

export function shiftMonthKey(key: string, offset: number) {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function flowAmount(transaction: TransactionView, currency: string, type: ReportFlowType) {
  if (transaction.transaction_type !== type) return 0;
  if (type === "income" && transaction.transaction_purpose !== "standard") return 0;
  const entry = transactionEntry(transaction, type);
  if (!entry || entry.currency_code !== currency) return 0;
  return Math.abs(entry.amount_minor);
}

export function periodTransactions(transactions: TransactionView[], from: string, to: string) {
  return transactions.filter((item) => item.transaction_date >= from && item.transaction_date <= to);
}

export function periodFlowTotals(transactions: TransactionView[], currency: string) {
  let income = 0;
  let expense = 0;
  for (const transaction of transactions) {
    income += flowAmount(transaction, currency, "income");
    expense += flowAmount(transaction, currency, "expense");
  }
  return { income, expense, net: income - expense };
}

export function dailyFlowTotals(transactions: TransactionView[], currency: string, monthKey: string) {
  const totals = new Map<string, { income: number; expense: number }>();
  for (const transaction of transactions) {
    if (!transaction.transaction_date.startsWith(monthKey)) continue;
    const row = totals.get(transaction.transaction_date) ?? { income: 0, expense: 0 };
    row.income += flowAmount(transaction, currency, "income");
    row.expense += flowAmount(transaction, currency, "expense");
    totals.set(transaction.transaction_date, row);
  }
  return totals;
}

export function reportCategoryBreakdown(transactions: TransactionView[], currency: string, type: ReportFlowType) {
  const totals = new Map<string, Omit<ReportCategoryRow, "percent">>();
  for (const transaction of transactions) {
    const amount = flowAmount(transaction, currency, type);
    if (amount <= 0) continue;
    const id = transaction.category_id ?? `uncategorized-${type}`;
    const existing = totals.get(id) ?? {
      id,
      label: transaction.category?.name ?? transaction.category_label ?? "Chưa phân loại",
      icon_name: transaction.category?.icon_name ?? (type === "income" ? "CircleDollarSign" : "Shapes"),
      icon_color: transaction.category?.icon_color ?? "#0d8b66",
      amount: 0
    };
    existing.amount += amount;
    totals.set(id, existing);
  }
  const rows = Array.from(totals.values()).sort((a, b) => b.amount - a.amount);
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  return rows.map((row) => ({ ...row, percent: total > 0 ? Math.round((row.amount / total) * 1000) / 10 : 0 }));
}

export function monthlyFlowSeries(transactions: TransactionView[], currency: string, type: ReportFlowType, monthKeys: string[]) {
  return monthKeys.map((key) => {
    let value = 0;
    for (const transaction of transactions) {
      if (!transaction.transaction_date.startsWith(key)) continue;
      value += flowAmount(transaction, currency, type);
    }
    return { key, label: `T${Number(key.slice(5, 7))}`, value };
  });
}

export function categoryMonthlySeries(transactions: TransactionView[], currency: string, type: ReportFlowType, categoryIds: Set<string>, monthKeys: string[]) {
  return monthKeys.map((key) => {
    let value = 0;
    for (const transaction of transactions) {
      if (!transaction.transaction_date.startsWith(key)) continue;
      if (!transaction.category_id || !categoryIds.has(transaction.category_id)) continue;
      value += flowAmount(transaction, currency, type);
    }
    return { key, label: `T${Number(key.slice(5, 7))}`, value };
  });
}
