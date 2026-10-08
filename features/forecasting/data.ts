import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { loadLedger, monthTotals, sixMonthWindow } from "@/features/transactions/data";
import { loadRecurringData, projectRecurringOccurrences, todayInTimeZone } from "@/features/recurring/data";
import { loadNetWorthData, positionForCurrency } from "@/features/net-worth/data";

export type ForecastScenario = {
  id: string;
  user_id: string;
  name: string;
  currency_code: string;
  horizon_days: 30 | 90 | 180 | 365;
  income_adjust_percent: number;
  expense_adjust_percent: number;
  extra_income_minor: number;
  extra_expense_minor: number;
  extra_debt_payment_minor: number;
  monthly_savings_reserve_minor: number;
  created_at: string;
  updated_at: string;
};

export type ForecastMonthPoint = {
  key: string;
  label: string;
  variable_income_minor: number;
  variable_expense_minor: number;
  recurring_income_minor: number;
  recurring_expense_minor: number;
  loan_payment_minor: number;
  credit_card_due_minor: number;
  deposit_maturity_minor: number;
  income_minor: number;
  expense_minor: number;
  net_minor: number;
  closing_balance_minor: number;
};

export type ForecastResult = {
  currency_code: string;
  decimal_digits: number;
  today: string;
  current_liquid_balance_minor: number;
  current_net_worth_minor: number;
  historical_average_income_minor: number;
  historical_average_expense_minor: number;
  variable_monthly_income_minor: number;
  variable_monthly_expense_minor: number;
  next_30_known_income_minor: number;
  next_30_known_expense_minor: number;
  projected_balance_30_minor: number;
  projected_balance_90_minor: number;
  projected_balance_180_minor: number;
  projected_balance_365_minor: number;
  first_shortfall_month: string | null;
  points: ForecastMonthPoint[];
  saved_scenarios: ForecastScenario[];
  data_notes: string[];
};

function utc(value: string) { return new Date(`${value.slice(0, 10)}T00:00:00Z`); }
function iso(date: Date) { return date.toISOString().slice(0, 10); }
function addDays(value: string, days: number) { const d = utc(value); d.setUTCDate(d.getUTCDate() + days); return iso(d); }
function monthKey(value: string) { return value.slice(0, 7); }
function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("vi-VN", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
}
function futureMonthKeys(today: string, count = 12) {
  const d = utc(today);
  const result: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + i, 1));
    result.push(`${m.getUTCFullYear()}-${String(m.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return result;
}
function average(values: number[]) { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0; }

export async function loadForecastData(supabase: SupabaseClient<Database>, userId: string): Promise<ForecastResult> {
  const { data: preferences } = await supabase.from("user_preferences").select("currency_code, timezone").eq("id", userId).maybeSingle();
  const currencyCode = preferences?.currency_code ?? "VND";
  const timeZone = preferences?.timezone ?? "Asia/Ho_Chi_Minh";
  const today = todayInTimeZone(timeZone);
  const historyMonths = sixMonthWindow(timeZone);
  const historyFrom = `${historyMonths[0]?.key ?? today.slice(0, 7)}-01`;

  const [ledger, recurring, positionData, savedScenarioResult] = await Promise.all([
    loadLedger(supabase, userId, { fromDate: historyFrom, limit: 6000 }),
    loadRecurringData(supabase, userId),
    loadNetWorthData(supabase, userId, today),
    (supabase as any).from("forecast_scenarios").select("*").eq("user_id", userId).eq("currency_code", currencyCode).order("updated_at", { ascending: false }).limit(20)
  ]);

  if (savedScenarioResult.error && !String(savedScenarioResult.error.message ?? "").includes("forecast_scenarios")) throw savedScenarioResult.error;

  const currency = ledger.currencies.find((item) => item.code === currencyCode);
  const decimalDigits = currency?.decimal_digits ?? 0;
  const position = positionForCurrency(positionData.summaries, currencyCode);

  const completeHistoryMonths = historyMonths.slice(0, -1);
  const historyRows = completeHistoryMonths.map((month) => ({ month: month.key, ...monthTotals(ledger.transactions, currencyCode, month.key) }));
  const activeHistory = historyRows.filter((row) => row.income > 0 || row.expense > 0);
  const fallbackCurrent = monthTotals(ledger.transactions, currencyCode, today.slice(0, 7));
  const historyBase = activeHistory.length > 0 ? activeHistory : [{ month: today.slice(0, 7), ...fallbackCurrent }];
  const avgIncome = Math.round(average(historyBase.map((row) => row.income)));
  const avgExpense = Math.round(average(historyBase.map((row) => row.expense)));

  const range365End = addDays(today, 365);
  const activeRules = recurring.rules.filter((rule) => rule.is_active);
  const recurringProjected = projectRecurringOccurrences(activeRules, recurring.occurrences, today, range365End, today)
    .filter((row) => row.status !== "paid" && row.status !== "skipped");

  const accountById = new Map(ledger.accounts.map((account) => [account.id, account]));
  const recurringEvents = recurringProjected.flatMap((row) => {
    const rule = row.rule;
    if (rule.transaction_type === "income" && rule.to_account_id && rule.to_amount_minor) {
      const account = accountById.get(rule.to_account_id);
      return account?.currency_code === currencyCode ? [{ date: row.dueDate, income: Math.abs(rule.to_amount_minor), expense: 0 }] : [];
    }
    if (rule.transaction_type === "expense" && rule.from_account_id && rule.from_amount_minor) {
      const account = accountById.get(rule.from_account_id);
      return account?.currency_code === currencyCode ? [{ date: row.dueDate, income: 0, expense: Math.abs(rule.from_amount_minor) }] : [];
    }
    return [];
  });

  const loanEvents = positionData.loans.flatMap((loan) => {
    if (loan.is_archived || loan.currency_code !== currencyCode || loan.remaining_principal_minor <= 0) return [];
    const remainingSchedule = loan.schedule.slice(Math.min(loan.schedule.length, loan.payments.length));
    return remainingSchedule
      .filter((row) => row.due_date >= today && row.due_date <= range365End)
      .map((row) => ({ date: row.due_date, expense: row.payment_minor }));
  });

  const cardEvents = positionData.cards.flatMap((card) => {
    if (card.is_archived || card.currency_code !== currencyCode) return [];
    return card.statements
      .filter((statement) => statement.remaining_minor > 0 && statement.due_date <= range365End)
      .map((statement) => ({ date: statement.due_date < today ? today : statement.due_date, expense: statement.remaining_minor }));
  });

  const depositEvents = positionData.deposits.flatMap((deposit) => {
    if (deposit.is_archived || deposit.currency_code !== currencyCode || deposit.auto_renew) return [];
    if (deposit.maturity_date < today || deposit.maturity_date > range365End) return [];
    return [{ date: deposit.maturity_date, income: deposit.projected_maturity_minor }];
  });

  const within = (date: string, days: number) => date >= today && date <= addDays(today, days);
  const recurring90Income = recurringEvents.filter((event) => within(event.date, 90)).reduce((sum, event) => sum + event.income, 0);
  const recurring90Expense = recurringEvents.filter((event) => within(event.date, 90)).reduce((sum, event) => sum + event.expense, 0);
  const loans90 = loanEvents.filter((event) => within(event.date, 90)).reduce((sum, event) => sum + event.expense, 0);
  const cards90 = cardEvents.filter((event) => within(event.date, 90)).reduce((sum, event) => sum + event.expense, 0);

  const recurringIncomeMonthly = Math.round(recurring90Income / 3);
  const knownExpenseMonthly = Math.round((recurring90Expense + loans90 + cards90) / 3);
  const variableIncomeMonthly = Math.max(0, avgIncome - recurringIncomeMonthly);
  const variableExpenseMonthly = Math.max(0, avgExpense - knownExpenseMonthly);

  const keys = futureMonthKeys(today, 12);
  let runningBalance = position.liquid_assets_minor;
  const points: ForecastMonthPoint[] = keys.map((key) => {
    const recurringIncome = recurringEvents.filter((event) => monthKey(event.date) === key).reduce((sum, event) => sum + event.income, 0);
    const recurringExpense = recurringEvents.filter((event) => monthKey(event.date) === key).reduce((sum, event) => sum + event.expense, 0);
    const loanPayment = loanEvents.filter((event) => monthKey(event.date) === key).reduce((sum, event) => sum + event.expense, 0);
    const creditCardDue = cardEvents.filter((event) => monthKey(event.date) === key).reduce((sum, event) => sum + event.expense, 0);
    const depositMaturity = depositEvents.filter((event) => monthKey(event.date) === key).reduce((sum, event) => sum + event.income, 0);
    const income = variableIncomeMonthly + recurringIncome + depositMaturity;
    const expense = variableExpenseMonthly + recurringExpense + loanPayment + creditCardDue;
    const net = income - expense;
    runningBalance += net;
    return {
      key,
      label: monthLabel(key),
      variable_income_minor: variableIncomeMonthly,
      variable_expense_minor: variableExpenseMonthly,
      recurring_income_minor: recurringIncome,
      recurring_expense_minor: recurringExpense,
      loan_payment_minor: loanPayment,
      credit_card_due_minor: creditCardDue,
      deposit_maturity_minor: depositMaturity,
      income_minor: income,
      expense_minor: expense,
      net_minor: net,
      closing_balance_minor: runningBalance
    };
  });

  const knownIncome30 = recurringEvents.filter((event) => within(event.date, 30)).reduce((sum, event) => sum + event.income, 0) + depositEvents.filter((event) => within(event.date, 30)).reduce((sum, event) => sum + event.income, 0);
  const knownExpense30 = recurringEvents.filter((event) => within(event.date, 30)).reduce((sum, event) => sum + event.expense, 0) + loanEvents.filter((event) => within(event.date, 30)).reduce((sum, event) => sum + event.expense, 0) + cardEvents.filter((event) => within(event.date, 30)).reduce((sum, event) => sum + event.expense, 0);
  const pointAt = (index: number) => points[Math.min(points.length - 1, Math.max(0, index))]?.closing_balance_minor ?? position.liquid_assets_minor;

  const notes = [
    "Forecast dùng lịch định kỳ, khoản vay, sao kê thẻ, đáo hạn tiền gửi và trung bình giao dịch lịch sử.",
    "Transfer giữa các tài khoản không làm thay đổi tổng cash position và được loại khỏi dự báo thu/chi.",
    "Finzaro không tự quy đổi ngoại tệ; forecast chạy riêng theo currency mặc định.",
    "Dự báo là công cụ planning, không phải cam kết số dư tương lai."
  ];

  return {
    currency_code: currencyCode,
    decimal_digits: decimalDigits,
    today,
    current_liquid_balance_minor: position.liquid_assets_minor,
    current_net_worth_minor: position.net_worth_minor,
    historical_average_income_minor: avgIncome,
    historical_average_expense_minor: avgExpense,
    variable_monthly_income_minor: variableIncomeMonthly,
    variable_monthly_expense_minor: variableExpenseMonthly,
    next_30_known_income_minor: knownIncome30,
    next_30_known_expense_minor: knownExpense30,
    projected_balance_30_minor: pointAt(0),
    projected_balance_90_minor: pointAt(2),
    projected_balance_180_minor: pointAt(5),
    projected_balance_365_minor: pointAt(11),
    first_shortfall_month: points.find((point) => point.closing_balance_minor < 0)?.key ?? null,
    points,
    saved_scenarios: (savedScenarioResult.data ?? []) as ForecastScenario[],
    data_notes: notes
  };
}
