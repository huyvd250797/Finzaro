import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CategoryRow } from "@/features/categories/data";
import type { LedgerCurrency, TransactionView } from "@/features/transactions/data";
import { transactionEntry } from "@/features/transactions/data";

export type BudgetRow = {
  id: string;
  user_id: string;
  category_id: string;
  month_start: string;
  currency_code: string;
  amount_minor: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type BudgetProgress = BudgetRow & {
  category: CategoryRow;
  actual_minor: number;
  remaining_minor: number;
  percent: number;
  status: "normal" | "near" | "over";
  scope_category_ids: string[];
};

export async function loadBudgets(
  supabase: SupabaseClient<Database>,
  userId: string,
  monthStart: string,
  includeArchived = false
) {
  let query = supabase
    .from("budgets")
    .select("id, user_id, category_id, month_start, currency_code, amount_minor, is_archived, created_at, updated_at")
    .eq("user_id", userId)
    .eq("month_start", monthStart)
    .order("currency_code", { ascending: true })
    .order("created_at", { ascending: true });

  if (!includeArchived) query = query.eq("is_archived", false);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as BudgetRow[];
}

function childrenMap(categories: CategoryRow[]) {
  const map = new Map<string, string[]>();
  for (const category of categories) {
    if (!category.parent_id) continue;
    const list = map.get(category.parent_id) ?? [];
    list.push(category.id);
    map.set(category.parent_id, list);
  }
  return map;
}

export function categoryScopeIds(rootId: string, categories: CategoryRow[]) {
  const children = childrenMap(categories);
  const result = new Set<string>([rootId]);
  const queue = [rootId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const childId of children.get(id) ?? []) {
      if (result.has(childId)) continue;
      result.add(childId);
      queue.push(childId);
    }
  }
  return Array.from(result);
}

export function budgetProgress(
  budgets: BudgetRow[],
  transactions: TransactionView[],
  categories: CategoryRow[]
): BudgetProgress[] {
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  return budgets.flatMap((budget) => {
    const category = categoryById.get(budget.category_id);
    if (!category) return [];
    const scope = categoryScopeIds(category.id, categories);
    const scopeSet = new Set(scope);
    let actual = 0;

    for (const transaction of transactions) {
      if (transaction.transaction_type !== "expense") continue;
      if (!transaction.transaction_date.startsWith(budget.month_start.slice(0, 7))) continue;
      if (!transaction.category_id || !scopeSet.has(transaction.category_id)) continue;
      const entry = transactionEntry(transaction, "expense");
      if (!entry || entry.currency_code !== budget.currency_code) continue;
      actual += Math.abs(entry.amount_minor);
    }

    const remaining = budget.amount_minor - actual;
    const percent = budget.amount_minor > 0 ? Math.round((actual / budget.amount_minor) * 1000) / 10 : 0;
    const status: BudgetProgress["status"] = actual > budget.amount_minor ? "over" : percent >= 80 ? "near" : "normal";
    return [{ ...budget, category, actual_minor: actual, remaining_minor: remaining, percent, status, scope_category_ids: scope }];
  });
}

export function budgetSummary(progress: BudgetProgress[], currencyCode: string) {
  const rows = progress.filter((item) => item.currency_code === currencyCode && !item.is_archived);
  return {
    count: rows.length,
    allocated: rows.reduce((sum, item) => sum + item.amount_minor, 0),
    actual: rows.reduce((sum, item) => sum + item.actual_minor, 0),
    remaining: rows.reduce((sum, item) => sum + Math.max(0, item.remaining_minor), 0),
    overCount: rows.filter((item) => item.status === "over").length,
    nearCount: rows.filter((item) => item.status === "near").length
  };
}

export function currencyDecimalDigits(currencies: LedgerCurrency[], code: string) {
  return currencies.find((currency) => currency.code === code)?.decimal_digits ?? 0;
}

export function monthStartFromKey(key: string) {
  return `${key}-01`;
}

export function monthKeyFromDate(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonthKey(key: string, offset: number) {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return key;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1 + offset, 1));
  return monthKeyFromDate(date);
}

export function normalizeMonthKey(value: string | undefined, fallback: string) {
  if (!value || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return fallback;
  return value;
}

export function monthEndFromKey(key: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return `${key}-31`;
  const end = new Date(Date.UTC(Number(match[1]), Number(match[2]), 0));
  return `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, "0")}-${String(end.getUTCDate()).padStart(2, "0")}`;
}

export function monthLabel(key: string, locale = "vi-VN") {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
}
