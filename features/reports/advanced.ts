import type { TransactionView } from "@/features/transactions/data";
import { transactionEntry } from "@/features/transactions/data";
import type { MonthlyCashflowRow } from "@/features/reports/data";

export type PeriodTotals = {
  income: number; expense: number; net: number; savingsRate: number | null;
  averageExpense: number; expenseCount: number; transactionCount: number;
};
export type PeriodComparison = { current: PeriodTotals; previous: PeriodTotals; incomeChange: number | null; expenseChange: number | null; netChange: number | null; retainedChange: number | null };
export type DailyCashflow = { date: string; income: number; expense: number; net: number };
export type SpendingMovement = { id: string; label: string; current: number; previous: number; change: number | null; delta: number };
export type FinancialInsight = { tone: "positive" | "warning" | "neutral"; headline: string; explanation: string };

export function flowValue(tx: TransactionView, currency: string, type: "income" | "expense") {
  if (tx.transaction_type !== type || tx.transaction_purpose !== "standard") return 0;
  const entry = transactionEntry(tx, type);
  return entry?.currency_code === currency ? Math.abs(Number(entry.amount_minor) || 0) : 0;
}

export function calculateFinancialTotals(transactions: TransactionView[], currency: string): PeriodTotals {
  let income = 0; let expense = 0; let expenseCount = 0; let transactionCount = 0;
  for (const tx of transactions) {
    const inc = flowValue(tx, currency, "income");
    const exp = flowValue(tx, currency, "expense");
    income += inc; expense += exp;
    if (inc > 0 || exp > 0) transactionCount++;
    if (exp > 0) expenseCount++;
  }
  return {
    income, expense, net: income - expense,
    // Do not imply a 0% savings rate when there is no income to divide by.
    savingsRate: income > 0 ? Math.round((income - expense) / income * 1000) / 10 : null,
    averageExpense: expenseCount > 0 ? Math.round(expense / expenseCount) : 0,
    expenseCount, transactionCount
  };
}

export function percentChange(current: number, previous: number): number | null {
  // Undefined for a zero base: displaying '+100%' would mislead users.
  return previous === 0 ? null : Math.round((current - previous) / Math.abs(previous) * 1000) / 10;
}

export function compareFinancialPeriods(currentRows: TransactionView[], previousRows: TransactionView[], currency: string): PeriodComparison {
  const current = calculateFinancialTotals(currentRows, currency);
  const previous = calculateFinancialTotals(previousRows, currency);
  return {
    current, previous,
    incomeChange: percentChange(current.income, previous.income),
    expenseChange: percentChange(current.expense, previous.expense),
    netChange: percentChange(current.net, previous.net),
    retainedChange: current.savingsRate === null || previous.savingsRate === null ? null : Math.round((current.savingsRate - previous.savingsRate) * 10) / 10
  };
}

export function dailyCashflow(transactions: TransactionView[], currency: string, from: string, to: string): DailyCashflow[] {
  const bucket = new Map<string, DailyCashflow>();
  for (const tx of transactions) {
    if (tx.transaction_date < from || tx.transaction_date > to) continue;
    const income = flowValue(tx, currency, "income");
    const expense = flowValue(tx, currency, "expense");
    if (!income && !expense) continue;
    const value = bucket.get(tx.transaction_date) ?? { date: tx.transaction_date, income: 0, expense: 0, net: 0 };
    value.income += income; value.expense += expense; value.net += income - expense;
    bucket.set(tx.transaction_date, value);
  }
  return Array.from(bucket.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function categoryMovement(current: TransactionView[], previous: TransactionView[], currency: string): SpendingMovement[] {
  const group = (rows: TransactionView[]) => {
    const values = new Map<string, { label: string; amount: number }>();
    for (const tx of rows) {
      const amount = flowValue(tx, currency, "expense");
      if (!amount) continue;
      const id = tx.category_id ?? "uncategorized";
      const value = values.get(id) ?? { label: tx.category?.name ?? tx.category_label ?? "Chưa phân loại", amount: 0 };
      value.amount += amount; values.set(id, value);
    }
    return values;
  };
  const now = group(current); const before = group(previous);
  return Array.from(new Set([...now.keys(), ...before.keys()])).map((id) => {
    const currentAmount = now.get(id)?.amount ?? 0;
    const previousAmount = before.get(id)?.amount ?? 0;
    return { id, label: now.get(id)?.label ?? before.get(id)?.label ?? "Chưa phân loại", current: currentAmount, previous: previousAmount, change: percentChange(currentAmount, previousAmount), delta: currentAmount - previousAmount };
  }).sort((a, b) => b.current - a.current || b.previous - a.previous);
}

export function financialInsights(comparison: PeriodComparison, spending: SpendingMovement[]): FinancialInsight[] {
  const items: FinancialInsight[] = [];
  if (comparison.current.income === 0) {
    items.push({ tone: "neutral", headline: "Chưa ghi nhận thu nhập", explanation: "Chưa thể tính tỷ lệ giữ lại trong kỳ được chọn." });
  } else if (comparison.current.net < 0) {
    items.push({ tone: "warning", headline: "Chi tiêu vượt thu nhập", explanation: "Dòng tiền ròng kỳ này đang âm. Hãy kiểm tra các khoản chi lớn." });
  } else {
    items.push({ tone: "positive", headline: `Giữ lại ${comparison.current.savingsRate?.toLocaleString("vi-VN") ?? "—"}% thu nhập`, explanation: "Tỷ lệ dựa trên khoản thu và chi thông thường, không gồm chuyển tiền." });
  }
  const rising = spending.filter((row) => row.delta > 0 && row.previous > 0).sort((a, b) => b.delta - a.delta)[0];
  if (rising) items.push({ tone: "warning", headline: `${rising.label} tăng mạnh nhất`, explanation: `Tăng ${rising.change?.toLocaleString("vi-VN") ?? "—"}% so với kỳ trước (trên cùng phạm vi bộ lọc).` });
  if (comparison.expenseChange !== null && comparison.expenseChange < 0) items.push({ tone: "positive", headline: "Chi tiêu giảm so với kỳ trước", explanation: `Giảm ${Math.abs(comparison.expenseChange).toLocaleString("vi-VN")}% so với kỳ đối chiếu cùng độ dài.` });
  if (items.length === 1) items.push({ tone: "neutral", headline: "Theo dõi xu hướng", explanation: "Chọn khoảng thời gian dài hơn để nhận diện biến động thu chi." });
  return items.slice(0, 3);
}

export function sumMonthly(rows: MonthlyCashflowRow[]) {
  return rows.reduce((total, row) => ({ income: total.income + row.income, expense: total.expense + row.expense, net: total.net + row.net }), { income: 0, expense: 0, net: 0 });
}

/** Ratios based on one transaction type alone are undefined, not 100%. */
export function maskIncompleteCashflowRatio(comparison: PeriodComparison, type: string): PeriodComparison {
  if (type === "all") return comparison;
  return { ...comparison, current: { ...comparison.current, savingsRate: null }, previous: { ...comparison.previous, savingsRate: null }, retainedChange: null };
}
