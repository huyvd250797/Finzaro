import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CategoryRow } from "@/features/categories/data";
import { minorToMajorInput } from "@/features/accounts/money";
import { formatMinorMoney } from "@/lib/utils";

export type LedgerAccount = {
  id: string;
  name: string;
  account_type: string;
  currency_code: string;
  institution_name: string | null;
  is_archived: boolean;
  current_balance_minor: number;
};

export type LedgerCurrency = { code: string; decimal_digits: number; symbol: string };

export type LedgerEntry = {
  id: string;
  transaction_id: string;
  account_id: string;
  currency_code: string;
  amount_minor: number;
  entry_role: string;
  account: LedgerAccount | null;
};

export type TransactionCategory = Pick<CategoryRow, "id" | "name" | "icon_name" | "icon_color" | "category_type" | "parent_id" | "is_archived">;

export type TransactionView = {
  id: string;
  transaction_type: string;
  transaction_purpose: string;
  title: string;
  category_id: string | null;
  category_label: string | null;
  category: TransactionCategory | null;
  notes: string | null;
  transaction_date: string;
  created_at: string;
  entries: LedgerEntry[];
};

export async function loadLedger(
  supabase: SupabaseClient<Database>,
  userId: string,
  options: { fromDate?: string; toDate?: string; limit?: number } = {}
) {
  const requestedLimit = Math.max(1, Math.min(options.limit ?? 500, 10000));
  const transactionPromise = (async () => {
    const rows: unknown[] = [];
    const batchSize = Math.min(1000, requestedLimit);
    let offset = 0;

    while (rows.length < requestedLimit) {
      const pageSize = Math.min(batchSize, requestedLimit - rows.length);
      let query = supabase
        .from("transactions")
        .select("id, transaction_type, transaction_purpose, title, category_id, category_label, notes, transaction_date, created_at, categories(id, name, icon_name, icon_color, category_type, parent_id, is_archived), transaction_entries(id, transaction_id, account_id, currency_code, amount_minor, entry_role)")
        .eq("user_id", userId)
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (options.fromDate) query = query.gte("transaction_date", options.fromDate);
      if (options.toDate) query = query.lte("transaction_date", options.toDate);
      const { data, error } = await query;
      if (error) throw error;
      const page = data ?? [];
      rows.push(...page);
      if (page.length < pageSize) break;
      offset += page.length;
    }
    return rows;
  })();

  const [
    transactionRows,
    { data: accountRows, error: accountError },
    { data: currencyRows, error: currencyError },
    { data: categoryRows, error: categoryError }
  ] = await Promise.all([
    transactionPromise,
    supabase.from("accounts").select("id, name, account_type, currency_code, institution_name, is_archived, current_balance_minor").eq("user_id", userId),
    supabase.from("supported_currencies").select("code, decimal_digits, symbol").eq("is_active", true),
    supabase.from("categories").select("id, user_id, name, category_type, parent_id, icon_name, icon_color, system_key, is_system, is_archived, sort_order, created_at, updated_at").eq("user_id", userId).order("sort_order")
  ]);

  if (accountError) throw accountError;
  if (currencyError) throw currencyError;
  if (categoryError) throw categoryError;

  const accounts = (accountRows ?? []) as LedgerAccount[];
  const currencies = (currencyRows ?? []) as LedgerCurrency[];
  const categories = (categoryRows ?? []) as CategoryRow[];
  const accountMap = new Map(accounts.map((account) => [account.id, account]));
  type RawEntry = Omit<LedgerEntry, "account">;
  type RawTransaction = Omit<TransactionView, "entries" | "category"> & {
    categories: TransactionCategory | TransactionCategory[] | null;
    transaction_entries: RawEntry[] | null;
  };
  const rows = (transactionRows ?? []) as unknown as RawTransaction[];

  const views: TransactionView[] = rows.map((transaction) => {
    const nestedCategory = Array.isArray(transaction.categories) ? transaction.categories[0] ?? null : transaction.categories;
    return {
      id: transaction.id,
      transaction_type: transaction.transaction_type,
      transaction_purpose: transaction.transaction_purpose ?? "standard",
      title: transaction.title,
      category_id: transaction.category_id,
      category_label: transaction.category_label,
      category: nestedCategory ?? null,
      notes: transaction.notes,
      transaction_date: transaction.transaction_date,
      created_at: transaction.created_at,
      entries: (transaction.transaction_entries ?? [])
        .map((entry) => ({ ...entry, account: accountMap.get(entry.account_id) ?? null }))
        .sort((a, b) => a.entry_role.localeCompare(b.entry_role))
    };
  });

  return { transactions: views, accounts, currencies, categories };
}

export function currencyDigits(currencies: LedgerCurrency[], code: string) {
  return currencies.find((currency) => currency.code === code)?.decimal_digits ?? 0;
}

export function transactionEntry(transaction: TransactionView, role: string) {
  return transaction.entries.find((entry) => entry.entry_role === role) ?? null;
}

export function filterTransactions(
  transactions: TransactionView[],
  filters: { q?: string; type?: string; account?: string; category?: string; from?: string; to?: string }
) {
  const q = filters.q?.trim().toLocaleLowerCase("vi") ?? "";
  return transactions.filter((transaction) => {
    if (filters.type && filters.type !== "all" && transaction.transaction_type !== filters.type) return false;
    if (filters.account && filters.account !== "all" && !transaction.entries.some((entry) => entry.account_id === filters.account)) return false;
    if (filters.category && filters.category !== "all" && transaction.category_id !== filters.category) return false;
    if (filters.from && transaction.transaction_date < filters.from) return false;
    if (filters.to && transaction.transaction_date > filters.to) return false;
    if (q) {
      const haystack = [
        transaction.title,
        transaction.category?.name ?? transaction.category_label ?? "",
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
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit" }).formatToParts(new Date());
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
    } else if (transaction.transaction_type === "expense" && transaction.transaction_purpose === "standard") {
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
  const totals = new Map<string, { label: string; icon_name: string; icon_color: string | null; value: number }>();
  for (const transaction of transactions) {
    if (transaction.transaction_type !== "expense" || transaction.transaction_purpose !== "standard" || !transaction.transaction_date.startsWith(targetMonth)) continue;
    const entry = transactionEntry(transaction, "expense");
    if (!entry || entry.currency_code !== defaultCurrency) continue;
    const key = transaction.category_id ?? transaction.category_label ?? "uncategorized";
    const label = transaction.category?.name ?? transaction.category_label ?? "Chưa phân loại";
    const icon_name = transaction.category?.icon_name ?? "Shapes";
    const icon_color = transaction.category?.icon_color ?? "#0d8b66";
    const current = totals.get(key) ?? { label, icon_name, icon_color, value: 0 };
    current.value += Math.abs(entry.amount_minor);
    totals.set(key, current);
  }
  const rows = Array.from(totals.values()).sort((a, b) => b.value - a.value);
  const sum = rows.reduce((total, row) => total + row.value, 0);
  return rows.slice(0, 5).map((row) => ({ ...row, percent: sum > 0 ? Math.max(4, Math.round((row.value / sum) * 100)) : 0 }));
}

export type QuickTransactionSuggestion = {
  id: string;
  kind: "frequent" | "recent";
  transaction_type: "income" | "expense" | "transfer";
  title: string;
  category_id: string | null;
  category_name: string | null;
  category_icon_name: string | null;
  category_icon_color: string | null;
  from_account_id: string | null;
  to_account_id: string | null;
  from_amount: string;
  to_amount: string;
  amount_label: string;
  notes: string;
  usage_count: number;
  last_used_date: string;
};

export function quickTransactionSuggestions(
  transactions: TransactionView[],
  currencies: LedgerCurrency[],
  type: "income" | "expense" | "transfer",
  limit = 10
): QuickTransactionSuggestion[] {
  const candidates = transactions.filter((transaction) => transaction.transaction_type === type && (type === "transfer" || transaction.transaction_purpose === "standard")).slice(0, 160);
  const groups = new Map<string, { transaction: TransactionView; count: number }>();

  for (const transaction of candidates) {
    const fromEntry = transaction.entries.find((entry) => entry.entry_role === "expense" || entry.entry_role === "transfer_out") ?? null;
    const toEntry = transaction.entries.find((entry) => entry.entry_role === "income" || entry.entry_role === "transfer_in") ?? null;
    const signature = [
      type,
      transaction.title.trim().toLocaleLowerCase("vi"),
      transaction.category_id ?? "",
      fromEntry?.account_id ?? "",
      toEntry?.account_id ?? "",
      Math.abs(fromEntry?.amount_minor ?? 0),
      Math.abs(toEntry?.amount_minor ?? 0),
      fromEntry?.currency_code ?? "",
      toEntry?.currency_code ?? ""
    ].join("|");
    const existing = groups.get(signature);
    if (existing) existing.count += 1;
    else groups.set(signature, { transaction, count: 1 });
  }

  const toSuggestion = (item: { transaction: TransactionView; count: number }, kind: "frequent" | "recent"): QuickTransactionSuggestion => {
    const transaction = item.transaction;
    const fromEntry = transaction.entries.find((entry) => entry.entry_role === "expense" || entry.entry_role === "transfer_out") ?? null;
    const toEntry = transaction.entries.find((entry) => entry.entry_role === "income" || entry.entry_role === "transfer_in") ?? null;
    const amountEntry = type === "income" ? toEntry : fromEntry;
    const amountCurrency = amountEntry?.currency_code ?? toEntry?.currency_code ?? fromEntry?.currency_code ?? "VND";
    const digits = currencyDigits(currencies, amountCurrency);
    const major = (entry: LedgerEntry | null) => entry ? minorToMajorInput(Math.abs(entry.amount_minor), currencyDigits(currencies, entry.currency_code)) : "";
    return {
      id: `${kind}:${transaction.id}`,
      kind,
      transaction_type: type,
      title: transaction.title,
      category_id: transaction.category_id,
      category_name: transaction.category?.name ?? transaction.category_label,
      category_icon_name: transaction.category?.icon_name ?? null,
      category_icon_color: transaction.category?.icon_color ?? null,
      from_account_id: fromEntry?.account_id ?? null,
      to_account_id: toEntry?.account_id ?? null,
      from_amount: major(fromEntry),
      to_amount: major(toEntry),
      amount_label: amountEntry ? formatMinorMoney(Math.abs(amountEntry.amount_minor), amountCurrency, digits) : "—",
      notes: transaction.notes ?? "",
      usage_count: item.count,
      last_used_date: transaction.transaction_date
    };
  };

  const grouped = Array.from(groups.values());
  const frequent = grouped.filter((item) => item.count > 1).sort((a, b) => b.count - a.count || b.transaction.transaction_date.localeCompare(a.transaction.transaction_date)).slice(0, Math.min(4, limit));
  const usedTransactions = new Set(frequent.map((item) => item.transaction.id));
  const recent = grouped.filter((item) => !usedTransactions.has(item.transaction.id)).sort((a, b) => b.transaction.transaction_date.localeCompare(a.transaction.transaction_date) || b.transaction.created_at.localeCompare(a.transaction.created_at)).slice(0, Math.max(0, limit - frequent.length));
  return [...frequent.map((item) => toSuggestion(item, "frequent")), ...recent.map((item) => toSuggestion(item, "recent"))];
}
