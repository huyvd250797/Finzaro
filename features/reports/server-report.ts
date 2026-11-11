import "server-only";
import { requireUser } from "@/lib/auth";
import { currencyDigits } from "@/features/transactions/data";
import { accountSpending, categorySpending, filterReportTransactions, loadReportLedger, monthlyCashflow, normalizeReportFilters, previousComparableRange, resolveReportRange } from "@/features/reports/data";
import { categoryMovement, compareFinancialPeriods, dailyCashflow, financialInsights, maskIncompleteCashflowRatio } from "@/features/reports/advanced";
import type { FinancialStatement } from "@/features/reports/statement";

export async function loadFinancialReport(params: Record<string, string | undefined>) {
  const { supabase, userId } = await requireUser();
  const { data: pref } = await supabase.from("user_preferences").select("currency_code,timezone").eq("id",userId).maybeSingle();
  const fallbackCurrency = (pref?.currency_code ?? "VND").toUpperCase();
  const range = resolveReportRange(params.range, params.from, params.to, pref?.timezone ?? "Asia/Ho_Chi_Minh");
  const previousRange = previousComparableRange(range);
  const ledger = await loadReportLedger(supabase, userId, { fromDate: previousRange.from, toDate: range.to, includeAccounts: true, includeCategories: true });
  const currency = ledger.currencies.some((row) => row.code === params.currency?.toUpperCase()) ? params.currency!.toUpperCase() : fallbackCurrency;
  const digits = currencyDigits(ledger.currencies, currency);
  const requested = normalizeReportFilters({ ...params, currency }, range, fallbackCurrency);
  const filters = {
    ...requested,
    account: requested.account === "all" || ledger.accounts.some((row) => row.id === requested.account && row.currency_code === currency) ? requested.account : "all",
    category: requested.category === "all" || ledger.categories.some((row) => row.id === requested.category) ? requested.category : "all",
    type: ["all", "income", "expense"].includes(requested.type) ? requested.type : "all"
  };
  const current = filterReportTransactions(ledger.transactions, filters, ledger.categories);
  const previous = filterReportTransactions(ledger.transactions, { ...filters, from: previousRange.from, to: previousRange.to }, ledger.categories);
  const comparison = maskIncompleteCashflowRatio(compareFinancialPeriods(current, previous, currency), filters.type);
  const monthly = monthlyCashflow(current, currency, range.from, range.to);
  const categories = categorySpending(current, currency);
  const accounts = accountSpending(current, currency, ledger.accounts);
  const movements = categoryMovement(current, previous, currency);
  const insights = filters.type === "all" ? financialInsights(comparison, movements) : [
    { tone: "neutral" as const, headline: "Đang xem một loại giao dịch", explanation: "Tỷ lệ giữ lại chỉ được tính khi bộ lọc gồm cả Thu và Chi." }
  ];
  const daily = dailyCashflow(current, currency, range.from, range.to);
  const statement: FinancialStatement = { from: range.from, to: range.to, currency, digits, comparison, monthly, categories, accounts, transactions: current };
  const query = new URLSearchParams({ range: range.key, from: range.from, to: range.to, currency, account: filters.account, category: filters.category, type: filters.type });
  return { range, previousRange, ledger, currency, digits, filters, current, previous, comparison, monthly, categories, accounts, movements, insights, daily, query: query.toString(), statement };
}
