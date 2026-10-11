import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CategoryRow } from "@/features/categories/data";
import { categoryScopeIds } from "@/features/budgets/data";
import { loadLedger, transactionEntry, type LedgerAccount, type LedgerCurrency, type LedgerEntry, type TransactionCategory, type TransactionView } from "@/features/transactions/data";

export type ReportRangeKey = "this_month" | "last_month" | "3m" | "6m" | "12m" | "ytd" | "custom";
export type ReportFilters = {
  range: ReportRangeKey;
  from: string;
  to: string;
  currency: string;
  account: string;
  category: string;
  type: string;
};

export type ReportRange = { key: ReportRangeKey; from: string; to: string; label: string };
export type MonthlyCashflowRow = { key: string; month: string; income: number; expense: number; net: number };
export type CategorySpendRow = { id: string; label: string; icon_name: string; icon_color: string | null; amount: number; percent: number };
export type AccountSpendRow = { id: string; label: string; amount: number; percent: number };
export type Insight = { tone: "positive" | "warning" | "negative" | "neutral"; title: string; description: string };

export type ReportLedgerDiagnostics = {
  strategy: "direct" | "canonical" | "legacy-core" | "empty";
  warnings: string[];
};

export type ReportLedgerResult = {
  transactions: TransactionView[];
  currencies: LedgerCurrency[];
  accounts: LedgerAccount[];
  categories: CategoryRow[];
  diagnostics: ReportLedgerDiagnostics;
};

type RawReportTransaction = {
  id: string;
  transaction_type: string;
  transaction_purpose?: string | null;
  title: string;
  category_id?: string | null;
  category_label: string | null;
  notes: string | null;
  transaction_date: string;
  created_at: string;
};

type RawReportEntry = Omit<LedgerEntry, "account">;

const REPORT_TRANSACTION_PROJECTIONS = [
  "id, transaction_type, transaction_purpose, title, category_id, category_label, notes, transaction_date, created_at",
  "id, transaction_type, title, category_id, category_label, notes, transaction_date, created_at",
  "id, transaction_type, title, category_label, notes, transaction_date, created_at"
] as const;

function errorSummary(error: unknown) {
  const value = error as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown } | null;
  const pieces = [value?.code, value?.message, value?.details, value?.hint]
    .map((part) => typeof part === "string" ? part.trim() : "")
    .filter(Boolean);
  return pieces.join(" · ").slice(0, 500) || (error instanceof Error ? error.message : "Unknown report data error");
}

function reportLog(strategy: string, error: unknown) {
  console.error(`[Finzaro Reports] ${strategy} failed`, error);
}

function schemaCompatibilityError(error: any) {
  const code = String(error?.code ?? "");
  const message = String(error?.message ?? "").toLowerCase();
  return code === "42703" || code === "PGRST204" || code === "PGRST200" || message.includes("column") || message.includes("schema cache");
}

async function findWorkingTransactionProjection(
  supabase: SupabaseClient<Database>,
  userId: string,
  fromDate: string,
  toDate: string
) {
  let lastError: unknown = null;
  for (const projection of REPORT_TRANSACTION_PROJECTIONS) {
    const { error } = await (supabase as any)
      .from("transactions")
      .select(projection)
      .eq("user_id", userId)
      .gte("transaction_date", fromDate)
      .lte("transaction_date", toDate)
      .limit(1);
    if (!error) return projection;
    lastError = error;
    if (!schemaCompatibilityError(error)) throw error;
  }
  throw lastError ?? new Error("Không thể đọc lịch sử giao dịch cho Báo cáo.");
}

async function loadReportTransactionsDirect(
  supabase: SupabaseClient<Database>,
  userId: string,
  fromDate: string,
  toDate: string
) {
  const projection = await findWorkingTransactionProjection(supabase, userId, fromDate, toDate);
  const rows: RawReportTransaction[] = [];
  const pageSize = 750;
  let offset = 0;

  while (rows.length <= 100000) {
    const { data, error } = await (supabase as any)
      .from("transactions")
      .select(projection)
      .eq("user_id", userId)
      .gte("transaction_date", fromDate)
      .lte("transaction_date", toDate)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    const page = (data ?? []) as RawReportTransaction[];
    rows.push(...page);
    if (page.length < pageSize) break;
    offset += page.length;
  }

  if (rows.length > 100000) {
    throw new Error("Khoảng báo cáo vượt quá 100.000 giao dịch. Hãy thu hẹp khoảng thời gian.");
  }
  return rows;
}

async function loadReportEntriesDirect(
  supabase: SupabaseClient<Database>,
  userId: string,
  transactionIds: string[]
) {
  if (transactionIds.length === 0) return [] as RawReportEntry[];
  const entries: RawReportEntry[] = [];
  const chunkSize = 60;
  for (let index = 0; index < transactionIds.length; index += chunkSize) {
    const chunk = transactionIds.slice(index, index + chunkSize);
    const { data, error } = await (supabase as any)
      .from("transaction_entries")
      .select("id, transaction_id, account_id, currency_code, amount_minor, entry_role")
      .eq("user_id", userId)
      .in("transaction_id", chunk);
    if (error) throw error;
    entries.push(...((data ?? []) as RawReportEntry[]));
  }
  return entries;
}

async function loadReportEntriesLegacyCore(
  supabase: SupabaseClient<Database>,
  userId: string,
  transactionIds: Set<string>
) {
  if (transactionIds.size === 0) return [] as RawReportEntry[];
  const entries: RawReportEntry[] = [];
  const pageSize = 1000;
  let offset = 0;
  while (offset <= 200000) {
    const { data, error } = await (supabase as any)
      .from("transaction_entries")
      .select("id, transaction_id, account_id, currency_code, amount_minor, entry_role")
      .eq("user_id", userId)
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    const page = (data ?? []) as RawReportEntry[];
    for (const entry of page) if (transactionIds.has(entry.transaction_id)) entries.push(entry);
    if (page.length < pageSize) break;
    offset += page.length;
  }
  return entries;
}

function fallbackCurrency(code: string): LedgerCurrency {
  const upper = code.toUpperCase();
  const zeroDigits = new Set(["VND", "JPY", "KRW"]);
  return { code: upper, decimal_digits: zeroDigits.has(upper) ? 0 : 2, symbol: upper === "VND" ? "₫" : upper };
}

async function loadReportCurrenciesBestEffort(
  supabase: SupabaseClient<Database>,
  entryCurrencies: string[]
) {
  const result = await (supabase as any)
    .from("supported_currencies")
    .select("code, decimal_digits, symbol")
    .eq("is_active", true);
  const rows = result.error ? [] : ((result.data ?? []) as LedgerCurrency[]);
  const map = new Map(rows.map((row) => [row.code, row]));
  for (const code of entryCurrencies) {
    if (code && !map.has(code)) map.set(code, fallbackCurrency(code));
  }
  if (map.size === 0) map.set("VND", fallbackCurrency("VND"));
  return Array.from(map.values());
}

async function loadReportCategoriesBestEffort(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  const modern = await (supabase as any)
    .from("categories")
    .select("id, user_id, name, category_type, parent_id, icon_name, icon_color, system_key, is_system, is_archived, sort_order, created_at, updated_at")
    .eq("user_id", userId)
    .order("sort_order");
  if (!modern.error) return (modern.data ?? []) as CategoryRow[];
  if (!schemaCompatibilityError(modern.error)) return [] as CategoryRow[];

  const legacy = await (supabase as any)
    .from("categories")
    .select("id, user_id, name, category_type, parent_id, icon_name, is_system, is_archived, sort_order, created_at, updated_at")
    .eq("user_id", userId)
    .order("sort_order");
  if (legacy.error) return [] as CategoryRow[];
  return ((legacy.data ?? []) as any[]).map((row) => ({ ...row, icon_color: "#0d8b66", system_key: row.system_key ?? null })) as CategoryRow[];
}

async function loadReportAccountsBestEffort(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  const modern = await (supabase as any)
    .from("accounts")
    .select("id, name, account_type, currency_code, institution_name, is_archived, current_balance_minor")
    .eq("user_id", userId);
  if (!modern.error) return (modern.data ?? []) as LedgerAccount[];
  if (!schemaCompatibilityError(modern.error)) return [] as LedgerAccount[];

  const legacy = await (supabase as any)
    .from("accounts")
    .select("id, name, account_type, currency_code, institution_name, is_archived")
    .eq("user_id", userId);
  if (legacy.error) return [] as LedgerAccount[];
  return ((legacy.data ?? []) as any[]).map((row) => ({ ...row, current_balance_minor: 0 })) as LedgerAccount[];
}

function hydrateReportRows(
  rawTransactions: RawReportTransaction[],
  entries: RawReportEntry[],
  categories: CategoryRow[],
  accounts: LedgerAccount[]
) {
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const accountMap = new Map(accounts.map((account) => [account.id, account]));
  const entriesByTransaction = new Map<string, LedgerEntry[]>();
  for (const entry of entries) {
    const hydrated: LedgerEntry = {
      ...entry,
      amount_minor: Number(entry.amount_minor),
      account: accountMap.get(entry.account_id) ?? null
    };
    const list = entriesByTransaction.get(entry.transaction_id) ?? [];
    list.push(hydrated);
    entriesByTransaction.set(entry.transaction_id, list);
  }

  return rawTransactions.map((transaction): TransactionView => {
    const categoryId = transaction.category_id ?? null;
    const category = categoryId ? categoryMap.get(categoryId) ?? null : null;
    const transactionPurpose = transaction.transaction_purpose
      ?? (transaction.transaction_type === "transfer" ? "transfer" : "standard");
    return {
      id: transaction.id,
      transaction_type: transaction.transaction_type,
      transaction_purpose: transactionPurpose,
      title: transaction.title,
      category_id: categoryId,
      category_label: transaction.category_label,
      category: category ? {
        id: category.id,
        name: category.name,
        icon_name: category.icon_name,
        icon_color: category.icon_color,
        category_type: category.category_type,
        parent_id: category.parent_id,
        is_archived: category.is_archived
      } : null,
      notes: transaction.notes,
      transaction_date: transaction.transaction_date,
      created_at: transaction.created_at,
      entries: (entriesByTransaction.get(transaction.id) ?? []).sort((a, b) => a.entry_role.localeCompare(b.entry_role))
    };
  });
}

async function directReportLedger(
  supabase: SupabaseClient<Database>,
  userId: string,
  options: { fromDate: string; toDate: string; includeAccounts?: boolean; includeCategories?: boolean }
): Promise<ReportLedgerResult> {
  const rawTransactions = await loadReportTransactionsDirect(supabase, userId, options.fromDate, options.toDate);
  const entries = await loadReportEntriesDirect(supabase, userId, rawTransactions.map((transaction) => transaction.id));
  const entryCurrencies = Array.from(new Set(entries.map((entry) => entry.currency_code).filter(Boolean)));
  const [currencies, categories, accounts] = await Promise.all([
    loadReportCurrenciesBestEffort(supabase, entryCurrencies),
    loadReportCategoriesBestEffort(supabase, userId),
    options.includeAccounts ? loadReportAccountsBestEffort(supabase, userId) : Promise.resolve([] as LedgerAccount[])
  ]);
  return {
    transactions: hydrateReportRows(rawTransactions, entries, categories, accounts),
    currencies,
    accounts: options.includeAccounts ? accounts : [],
    categories: options.includeCategories ? categories : [],
    diagnostics: { strategy: "direct", warnings: [] }
  };
}

async function canonicalReportLedger(
  supabase: SupabaseClient<Database>,
  userId: string,
  options: { fromDate: string; toDate: string; includeAccounts?: boolean; includeCategories?: boolean },
  warnings: string[]
): Promise<ReportLedgerResult> {
  const ledger = await loadLedger(supabase, userId, { fromDate: options.fromDate, toDate: options.toDate, fetchAll: true });
  return {
    transactions: ledger.transactions,
    currencies: ledger.currencies.length ? ledger.currencies : [fallbackCurrency("VND")],
    accounts: options.includeAccounts ? ledger.accounts : [],
    categories: options.includeCategories ? ledger.categories : [],
    diagnostics: { strategy: "canonical", warnings }
  };
}

async function legacyCoreReportLedger(
  supabase: SupabaseClient<Database>,
  userId: string,
  options: { fromDate: string; toDate: string; includeAccounts?: boolean; includeCategories?: boolean },
  warnings: string[]
): Promise<ReportLedgerResult> {
  const rows: RawReportTransaction[] = [];
  const pageSize = 750;
  let offset = 0;
  while (rows.length <= 100000) {
    const { data, error } = await (supabase as any)
      .from("transactions")
      .select("id, transaction_type, title, category_label, notes, transaction_date, created_at")
      .eq("user_id", userId)
      .gte("transaction_date", options.fromDate)
      .lte("transaction_date", options.toDate)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    const page = (data ?? []) as RawReportTransaction[];
    rows.push(...page);
    if (page.length < pageSize) break;
    offset += page.length;
  }
  const ids = new Set(rows.map((row) => row.id));
  const entries = await loadReportEntriesLegacyCore(supabase, userId, ids);
  const entryCurrencies = Array.from(new Set(entries.map((entry) => entry.currency_code).filter(Boolean)));
  const [currencies, categories, accounts] = await Promise.all([
    loadReportCurrenciesBestEffort(supabase, entryCurrencies),
    loadReportCategoriesBestEffort(supabase, userId),
    options.includeAccounts ? loadReportAccountsBestEffort(supabase, userId) : Promise.resolve([] as LedgerAccount[])
  ]);
  return {
    transactions: hydrateReportRows(rows, entries, categories, accounts),
    currencies,
    accounts: options.includeAccounts ? accounts : [],
    categories: options.includeCategories ? categories : [],
    diagnostics: { strategy: "legacy-core", warnings }
  };
}

export async function loadReportLedger(
  supabase: SupabaseClient<Database>,
  userId: string,
  options: { fromDate: string; toDate: string; includeAccounts?: boolean; includeCategories?: boolean }
): Promise<ReportLedgerResult> {
  const warnings: string[] = [];

  try {
    return await directReportLedger(supabase, userId, options);
  } catch (error) {
    reportLog("direct ledger", error);
    warnings.push(`direct: ${errorSummary(error)}`);
  }

  try {
    return await canonicalReportLedger(supabase, userId, options, warnings);
  } catch (error) {
    reportLog("canonical transaction loader", error);
    warnings.push(`canonical: ${errorSummary(error)}`);
  }

  try {
    return await legacyCoreReportLedger(supabase, userId, options, warnings);
  } catch (error) {
    reportLog("legacy core ledger", error);
    warnings.push(`legacy: ${errorSummary(error)}`);
  }

  // Reports must never crash the entire authenticated shell. Returning an empty
  // result keeps navigation usable while Runtime Logs retain the exact database
  // error. This path is only reached if even the V0.0.4 core ledger cannot be read.
  return {
    transactions: [],
    currencies: [fallbackCurrency("VND")],
    accounts: [],
    categories: [],
    diagnostics: { strategy: "empty", warnings }
  };
}

function parseIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function iso(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function monthEnd(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0));
}

function zonedToday(timeZone: string) {
  const now = new Date();
  try {
    const safeTimeZone = typeof timeZone === "string" && timeZone.trim() ? timeZone.trim() : "Asia/Ho_Chi_Minh";
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: safeTimeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
    const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
    const result = `${value("year")}-${value("month")}-${value("day")}`;
    return /^\d{4}-\d{2}-\d{2}$/.test(result) ? result : now.toISOString().slice(0, 10);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

export function resolveReportRange(range: string | undefined, customFrom: string | undefined, customTo: string | undefined, timeZone: string): ReportRange {
  const today = parseIsoDate(zonedToday(timeZone)) ?? new Date();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const key: ReportRangeKey = ["this_month", "last_month", "3m", "6m", "12m", "ytd", "custom"].includes(range ?? "") ? range as ReportRangeKey : "this_month";

  if (key === "custom") {
    const from = parseIsoDate(customFrom ?? "");
    const to = parseIsoDate(customTo ?? "");
    if (from && to && from <= to) return { key, from: iso(from), to: iso(to), label: `${iso(from)} → ${iso(to)}` };
  }

  if (key === "last_month") {
    const first = new Date(Date.UTC(year, month - 1, 1));
    const last = monthEnd(first.getUTCFullYear(), first.getUTCMonth());
    return { key, from: iso(first), to: iso(last), label: "Tháng trước" };
  }
  if (key === "3m" || key === "6m" || key === "12m") {
    const count = Number(key.replace("m", ""));
    const first = new Date(Date.UTC(year, month - (count - 1), 1));
    return { key, from: iso(first), to: iso(today), label: `${count} tháng gần nhất` };
  }
  if (key === "ytd") return { key, from: `${year}-01-01`, to: iso(today), label: "Từ đầu năm" };
  return { key: "this_month", from: `${year}-${String(month + 1).padStart(2, "0")}-01`, to: iso(today), label: "Tháng này" };
}

export function previousComparableRange(range: ReportRange) {
  const from = parseIsoDate(range.from)!;
  const to = parseIsoDate(range.to)!;
  const duration = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1);
  const previousTo = new Date(from.getTime() - 86400000);
  const previousFrom = new Date(previousTo.getTime() - (duration - 1) * 86400000);
  return { from: iso(previousFrom), to: iso(previousTo) };
}

export function normalizeReportFilters(params: Record<string, string | undefined>, range: ReportRange, defaultCurrency: string): ReportFilters {
  return {
    range: range.key,
    from: range.from,
    to: range.to,
    currency: params.currency?.trim().toUpperCase() || defaultCurrency,
    account: params.account?.trim() || "all",
    category: params.category?.trim() || "all",
    type: params.type?.trim() || "all"
  };
}

export function filterReportTransactions(transactions: TransactionView[], filters: ReportFilters, categories: CategoryRow[]) {
  const categorySet = filters.category !== "all" ? new Set(categoryScopeIds(filters.category, categories)) : null;
  return transactions.filter((transaction) => {
    if (transaction.transaction_date < filters.from || transaction.transaction_date > filters.to) return false;
    if (filters.type !== "all" && transaction.transaction_type !== filters.type) return false;
    if (filters.account !== "all" && !transaction.entries.some((entry) => entry.account_id === filters.account)) return false;
    if (categorySet && (!transaction.category_id || !categorySet.has(transaction.category_id))) return false;
    if (!transaction.entries.some((entry) => entry.currency_code === filters.currency)) return false;
    return true;
  });
}

export function reportTotals(transactions: TransactionView[], currency: string) {
  let income = 0;
  let expense = 0;
  let transferOut = 0;
  let transferIn = 0;
  for (const transaction of transactions) {
    if (transaction.transaction_type === "income" && transaction.transaction_purpose === "standard") {
      const entry = transactionEntry(transaction, "income");
      if (entry?.currency_code === currency) income += Math.abs(entry.amount_minor);
    } else if (transaction.transaction_type === "expense") {
      const entry = transactionEntry(transaction, "expense");
      if (entry?.currency_code === currency) expense += Math.abs(entry.amount_minor);
    } else if (transaction.transaction_type === "transfer") {
      const out = transactionEntry(transaction, "transfer_out");
      const incoming = transactionEntry(transaction, "transfer_in");
      if (out?.currency_code === currency) transferOut += Math.abs(out.amount_minor);
      if (incoming?.currency_code === currency) transferIn += Math.abs(incoming.amount_minor);
    }
  }
  const expenseCount = transactions.filter((item) => item.transaction_type === "expense" && transactionEntry(item, "expense")?.currency_code === currency).length;
  return { income, expense, net: income - expense, transferOut, transferIn, count: transactions.length, expenseCount, avgExpense: expenseCount > 0 ? Math.round(expense / expenseCount) : 0 };
}

export function monthlyCashflow(transactions: TransactionView[], currency: string, from: string, to: string) {
  const start = parseIsoDate(from)!;
  const end = parseIsoDate(to)!;
  const rows: MonthlyCashflowRow[] = [];
  let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  let guard = 0;
  while (cursor <= end && guard < 24) {
    const key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`;
    const label = new Intl.DateTimeFormat("vi-VN", { month: "short", year: "2-digit", timeZone: "UTC" }).format(cursor);
    let income = 0;
    let expense = 0;
    for (const transaction of transactions) {
      if (!transaction.transaction_date.startsWith(key)) continue;
      if (transaction.transaction_type === "income" && transaction.transaction_purpose === "standard") {
        const entry = transactionEntry(transaction, "income");
        if (entry?.currency_code === currency) income += Math.abs(entry.amount_minor);
      } else if (transaction.transaction_type === "expense") {
        const entry = transactionEntry(transaction, "expense");
        if (entry?.currency_code === currency) expense += Math.abs(entry.amount_minor);
      }
    }
    rows.push({ key, month: label, income, expense, net: income - expense });
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    guard += 1;
  }
  return rows;
}

export function categorySpending(transactions: TransactionView[], currency: string) {
  const totals = new Map<string, { id: string; label: string; icon_name: string; icon_color: string | null; amount: number }>();
  for (const transaction of transactions) {
    if (transaction.transaction_type !== "expense") continue;
    const entry = transactionEntry(transaction, "expense");
    if (!entry || entry.currency_code !== currency) continue;
    const id = transaction.category_id ?? "uncategorized";
    const row = totals.get(id) ?? { id, label: transaction.category?.name ?? transaction.category_label ?? "Chưa phân loại", icon_name: transaction.category?.icon_name ?? "Shapes", icon_color: transaction.category?.icon_color ?? "#0d8b66", amount: 0 };
    row.amount += Math.abs(entry.amount_minor);
    totals.set(id, row);
  }
  const rows = Array.from(totals.values()).sort((a, b) => b.amount - a.amount);
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  return rows.map((row) => ({ ...row, percent: total > 0 ? Math.round((row.amount / total) * 1000) / 10 : 0 }));
}

export function accountSpending(transactions: TransactionView[], currency: string, accounts: LedgerAccount[]) {
  const names = new Map(accounts.map((account) => [account.id, account.name]));
  const totals = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.transaction_type !== "expense") continue;
    const entry = transactionEntry(transaction, "expense");
    if (!entry || entry.currency_code !== currency) continue;
    totals.set(entry.account_id, (totals.get(entry.account_id) ?? 0) + Math.abs(entry.amount_minor));
  }
  const rows = Array.from(totals.entries()).map(([id, amount]) => ({ id, label: names.get(id) ?? "Tài khoản", amount })).sort((a, b) => b.amount - a.amount);
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  return rows.map((row) => ({ ...row, percent: total > 0 ? Math.round((row.amount / total) * 1000) / 10 : 0 }));
}

export async function loadReportBudgets(supabase: SupabaseClient<Database>, userId: string, from: string, to: string) {
  const firstMonth = `${from.slice(0, 7)}-01`;
  const lastMonth = `${to.slice(0, 7)}-01`;
  const { data, error } = await supabase.from("budgets").select("*").eq("user_id", userId).eq("is_archived", false).gte("month_start", firstMonth).lte("month_start", lastMonth).order("month_start");
  if (error) throw error;
  return data ?? [];
}

export function buildInsights(args: {
  totals: ReturnType<typeof reportTotals>;
  previous: ReturnType<typeof reportTotals>;
  categories: CategorySpendRow[];
  budgetAllocated: number;
  budgetActual: number;
  recurringExpense: number;
  currency: string;
}) {
  const insights: Insight[] = [];
  const { totals, previous, categories, budgetAllocated, budgetActual, recurringExpense } = args;
  const expenseDelta = previous.expense > 0 ? ((totals.expense - previous.expense) / previous.expense) * 100 : null;
  if (expenseDelta !== null && Math.abs(expenseDelta) >= 10) {
    insights.push({
      tone: expenseDelta > 0 ? "warning" : "positive",
      title: expenseDelta > 0 ? `Chi tiêu tăng ${Math.round(expenseDelta)}%` : `Chi tiêu giảm ${Math.abs(Math.round(expenseDelta))}%`,
      description: "So với khoảng thời gian liền trước có độ dài tương đương."
    });
  }
  if (totals.income > 0) {
    const rate = Math.round((totals.net / totals.income) * 1000) / 10;
    insights.push({ tone: rate >= 20 ? "positive" : rate < 0 ? "negative" : "neutral", title: `Savings rate ${rate}%`, description: rate >= 20 ? "Dòng tiền ròng đang ở mức tích cực trong kỳ báo cáo." : "Có thể theo dõi thêm chi tiêu để cải thiện dòng tiền ròng." });
  }
  if (categories[0]?.percent >= 35) {
    insights.push({ tone: "neutral", title: `${categories[0].label} chiếm ${categories[0].percent}% chi tiêu`, description: "Đây là nhóm chi tiêu lớn nhất trong kỳ đang xem." });
  }
  if (budgetAllocated > 0) {
    const ratio = (budgetActual / budgetAllocated) * 100;
    if (ratio >= 100) insights.push({ tone: "negative", title: `Ngân sách đã dùng ${Math.round(ratio)}%`, description: "Tổng chi tiêu ở các budget trong kỳ đã vượt tổng hạn mức phân bổ." });
    else if (ratio >= 80) insights.push({ tone: "warning", title: `Ngân sách đã dùng ${Math.round(ratio)}%`, description: "Một phần lớn hạn mức đã được sử dụng; nên kiểm tra các category gần chạm ngưỡng." });
  }
  if (recurringExpense > 0) insights.push({ tone: "neutral", title: "Có nghĩa vụ định kỳ sắp tới", description: "Finzaro đã tổng hợp các recurring expense trong 30 ngày tới để hỗ trợ kế hoạch dòng tiền." });
  if (insights.length === 0) insights.push({ tone: "neutral", title: "Chưa có tín hiệu nổi bật", description: "Tiếp tục ghi nhận giao dịch để Financial Insights có đủ dữ liệu so sánh." });
  return insights.slice(0, 5);
}
