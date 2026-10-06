import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type LedgerAccount = {
  id: string;
  name: string;
  account_type: string;
  currency_code: string;
  institution_name: string | null;
  is_archived: boolean;
  current_balance_minor: number;
};

export type LedgerCurrency = {
  code: string;
  decimal_digits: number;
  symbol: string;
};

export type LedgerEntry = {
  id: string;
  transaction_id: string;
  account_id: string;
  currency_code: string;
  amount_minor: number;
  entry_role: string;
  account: LedgerAccount | null;
};

export type TransactionView = {
  id: string;
  transaction_type: string;
  title: string;
  category_label: string | null;
  notes: string | null;
  transaction_date: string;
  created_at: string;
  entries: LedgerEntry[];
};

export async function loadLedger(
  supabase: SupabaseClient<Database>,
  userId: string,
  options: { fromDate?: string; limit?: number } = {}
) {
  let transactionQuery = supabase
    .from("transactions")
    .select("id, transaction_type, title, category_label, notes, transaction_date, created_at, transaction_entries(id, transaction_id, account_id, currency_code, amount_minor, entry_role)")
    .eq("user_id", userId)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 500);

  if (options.fromDate) transactionQuery = transactionQuery.gte("transaction_date", options.fromDate);

  const [{ data: transactionRows, error: transactionError }, { data: accountRows, error: accountError }, { data: currencyRows, error: currencyError }] = await Promise.all([
    transactionQuery,
    supabase
      .from("accounts")
      .select("id, name, account_type, currency_code, institution_name, is_archived, current_balance_minor")
      .eq("user_id", userId),
    supabase.from("supported_currencies").select("code, decimal_digits, symbol").eq("is_active", true)
  ]);

  if (transactionError) throw transactionError;
  if (accountError) throw accountError;
  if (currencyError) throw currencyError;

  const accounts = (accountRows ?? []) as LedgerAccount[];
  const currencies = (currencyRows ?? []) as LedgerCurrency[];
  const accountMap = new Map(accounts.map((account) => [account.id, account]));
  type RawEntry = Omit<LedgerEntry, "account">;
  type RawTransaction = Omit<TransactionView, "entries"> & { transaction_entries: RawEntry[] | null };
  const rows = (transactionRows ?? []) as unknown as RawTransaction[];

  const views: TransactionView[] = rows.map((transaction) => ({
    id: transaction.id,
    transaction_type: transaction.transaction_type,
    title: transaction.title,
    category_label: transaction.category_label,
    notes: transaction.notes,
    transaction_date: transaction.transaction_date,
    created_at: transaction.created_at,
    entries: (transaction.transaction_entries ?? [])
      .map((entry) => ({ ...entry, account: accountMap.get(entry.account_id) ?? null }))
      .sort((a, b) => a.entry_role.localeCompare(b.entry_role))
  }));

  return { transactions: views, accounts, currencies };
}

export function currencyDigits(currencies: LedgerCurrency[], code: string) {
  return currencies.find((currency) => currency.code === code)?.decimal_digits ?? 0;
}

export function transactionEntry(transaction: TransactionView, role: string) {
  return transaction.entries.find((entry) => entry.entry_role === role) ?? null;
}

export function filterTransactions(
  transactions: TransactionView[],
  filters: { q?: string; type?: string; account?: string; from?: string; to?: string }
) {
  const q = filters.q?.trim().toLocaleLowerCase("vi") ?? "";
  return transactions.filter((transaction) => {
    if (filters.type && filters.type !== "all" && transaction.transaction_type !== filters.type) return false;
    if (filters.account && filters.account !== "all" && !transaction.entries.some((entry) => entry.account_id === filters.account)) return false;
    if (filters.from && transaction.transaction_date < filters.from) return false;
    if (filters.to && transaction.transaction_date > filters.to) return false;
    if (q) {
      const haystack = [
        transaction.title,
        transaction.category_label ?? "",
        transaction.notes ?? "",
        ...transaction.entries.map((entry) => entry.account?.name ?? ""),
        ...transaction.entries.map((entry) => entry.account?.institution_name ?? "")
      ].join(" ").toLocaleLowerCase("vi");
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

function zonedYearMonth(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit"
  }).formatToParts(new Date());
  return {
    year: Number(parts.find((part) => part.type === "year")?.value ?? new Date().getUTCFullYear()),
    month: Number(parts.find((part) => part.type === "month")?.value ?? new Date().getUTCMonth() + 1)
  };
}

export function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function currentMonthKey(timeZone: string) {
  const { year, month } = zonedYearMonth(timeZone);
  return monthKey(year, month);
}

export function sixMonthWindow(timeZone: string) {
  const { year, month } = zonedYearMonth(timeZone);
  const result: Array<{ key: string; label: string }> = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    const d = new Date(Date.UTC(year, month - 1 - offset, 1));
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    result.push({ key: monthKey(y, m), label: `T${m}` });
  }
  return result;
}

export function monthTotals(transactions: TransactionView[], defaultCurrency: string, targetMonth: string) {
  let income = 0;
  let expense = 0;
  for (const transaction of transactions) {
    if (!transaction.transaction_date.startsWith(targetMonth)) continue;
    if (transaction.transaction_type === "income") {
      const entry = transactionEntry(transaction, "income");
      if (entry?.currency_code === defaultCurrency) income += entry.amount_minor;
    } else if (transaction.transaction_type === "expense") {
      const entry = transactionEntry(transaction, "expense");
      if (entry?.currency_code === defaultCurrency) expense += Math.abs(entry.amount_minor);
    }
  }
  return { income, expense, net: income - expense };
}

export function cashflowSeries(transactions: TransactionView[], defaultCurrency: string, timeZone: string) {
  return sixMonthWindow(timeZone).map((month) => {
    const totals = monthTotals(transactions, defaultCurrency, month.key);
    return { month: month.label, income: totals.income, expense: totals.expense };
  });
}

export function expenseCategories(transactions: TransactionView[], defaultCurrency: string, targetMonth: string) {
  const totals = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.transaction_type !== "expense" || !transaction.transaction_date.startsWith(targetMonth)) continue;
    const entry = transactionEntry(transaction, "expense");
    if (!entry || entry.currency_code !== defaultCurrency) continue;
    const label = transaction.category_label || "Chi tiêu khác";
    totals.set(label, (totals.get(label) ?? 0) + Math.abs(entry.amount_minor));
  }
  const rows = Array.from(totals, ([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  const sum = rows.reduce((total, row) => total + row.value, 0);
  return rows.slice(0, 5).map((row) => ({ ...row, percent: sum > 0 ? Math.max(4, Math.round((row.value / sum) * 100)) : 0 }));
}
