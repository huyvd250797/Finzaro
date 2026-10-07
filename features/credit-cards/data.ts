import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type CreditCard = {
  id: string;
  user_id: string;
  name: string;
  bank_name: string | null;
  last4: string | null;
  currency_code: string;
  credit_limit_minor: number;
  current_balance_minor: number;
  annual_rate_percent: number;
  statement_day: number;
  due_days_after_statement: number;
  minimum_payment_percent: number;
  minimum_payment_floor_minor: number;
  linked_payment_account_id: string | null;
  icon_name: string;
  icon_color: string;
  notes: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type CreditCardStatement = {
  id: string;
  user_id: string;
  credit_card_id: string;
  statement_date: string;
  due_date: string;
  statement_balance_minor: number;
  minimum_payment_minor: number;
  notes: string | null;
  created_at: string;
};

export type CreditCardPayment = {
  id: string;
  user_id: string;
  credit_card_id: string;
  statement_id: string | null;
  payment_date: string;
  amount_minor: number;
  transaction_id: string | null;
  notes: string | null;
  created_at: string;
};

export type CreditCardAccount = {
  id: string;
  name: string;
  currency_code: string;
  is_archived: boolean;
};

export type CreditCardCurrency = { code: string; name: string; symbol: string; decimal_digits: number };

export type CreditCardStatementProjection = CreditCardStatement & {
  paid_minor: number;
  remaining_minor: number;
  status: "paid" | "overdue" | "due_soon" | "open";
};

export type CreditCardProjection = CreditCard & {
  utilization_percent: number;
  available_credit_minor: number;
  latest_statement: CreditCardStatementProjection | null;
  payments: CreditCardPayment[];
  statements: CreditCardStatementProjection[];
  linked_payment_account: CreditCardAccount | null;
  alert_level: "safe" | "attention" | "high";
};

function dateUtc(value: string) { return new Date(`${value}T00:00:00Z`); }
function diffDays(from: string, to: string) { return Math.ceil((dateUtc(to).getTime() - dateUtc(from).getTime()) / 86400000); }

export function minimumPaymentMinor(balanceMinor: number, percent: number, floorMinor: number) {
  if (balanceMinor <= 0) return 0;
  return Math.min(balanceMinor, Math.max(Math.round(balanceMinor * Math.max(0, percent) / 100), Math.max(0, floorMinor)));
}

export function projectCreditCards(cards: CreditCard[], statements: CreditCardStatement[], payments: CreditCardPayment[], accounts: CreditCardAccount[], today: string): CreditCardProjection[] {
  return cards.map((card) => {
    const cardPayments = payments.filter((payment) => payment.credit_card_id === card.id).sort((a, b) => b.payment_date.localeCompare(a.payment_date) || b.created_at.localeCompare(a.created_at));
    const projectedStatements = statements.filter((statement) => statement.credit_card_id === card.id).map((statement) => {
      const paid = cardPayments.filter((payment) => payment.statement_id === statement.id).reduce((sum, payment) => sum + payment.amount_minor, 0);
      const remaining = Math.max(0, statement.statement_balance_minor - paid);
      const days = diffDays(today, statement.due_date);
      const status: CreditCardStatementProjection["status"] = remaining === 0 ? "paid" : days < 0 ? "overdue" : days <= 5 ? "due_soon" : "open";
      return { ...statement, paid_minor: paid, remaining_minor: remaining, status };
    }).sort((a, b) => b.statement_date.localeCompare(a.statement_date));
    const utilization = card.credit_limit_minor > 0 ? Math.round((card.current_balance_minor / card.credit_limit_minor) * 1000) / 10 : 0;
    const alertLevel: CreditCardProjection["alert_level"] = utilization >= 80 ? "high" : utilization >= 50 ? "attention" : "safe";
    return {
      ...card,
      utilization_percent: utilization,
      available_credit_minor: Math.max(0, card.credit_limit_minor - card.current_balance_minor),
      latest_statement: projectedStatements[0] ?? null,
      statements: projectedStatements,
      payments: cardPayments,
      linked_payment_account: card.linked_payment_account_id ? accounts.find((account) => account.id === card.linked_payment_account_id) ?? null : null,
      alert_level: alertLevel
    };
  }).sort((a, b) => Number(a.is_archived) - Number(b.is_archived) || b.current_balance_minor - a.current_balance_minor || a.name.localeCompare(b.name, "vi"));
}

export async function loadCreditCards(supabase: SupabaseClient<Database>, userId: string, includeArchived = false) {
  let cardQuery = (supabase as any).from("credit_cards").select("*").eq("user_id", userId).order("is_archived").order("created_at", { ascending: false });
  if (!includeArchived) cardQuery = cardQuery.eq("is_archived", false);

  const [{ data: cards, error: cardsError }, { data: statements, error: statementError }, { data: payments, error: paymentError }, { data: accounts, error: accountError }, { data: currencies, error: currencyError }] = await Promise.all([
    cardQuery,
    (supabase as any).from("credit_card_statements").select("*").eq("user_id", userId).order("statement_date", { ascending: false }).limit(5000),
    (supabase as any).from("credit_card_payments").select("*").eq("user_id", userId).order("payment_date", { ascending: false }).order("created_at", { ascending: false }).limit(5000),
    supabase.from("accounts").select("id, name, currency_code, is_archived").eq("user_id", userId),
    supabase.from("supported_currencies").select("code, name, symbol, decimal_digits").eq("is_active", true).order("code")
  ]);

  if (cardsError) throw cardsError;
  if (statementError) throw statementError;
  if (paymentError) throw paymentError;
  if (accountError) throw accountError;
  if (currencyError) throw currencyError;

  return {
    cards: (cards ?? []) as CreditCard[],
    statements: (statements ?? []) as CreditCardStatement[],
    payments: (payments ?? []) as CreditCardPayment[],
    accounts: (accounts ?? []) as CreditCardAccount[],
    currencies: (currencies ?? []) as CreditCardCurrency[]
  };
}

export function creditCardSummary(rows: CreditCardProjection[], currencyCode: string) {
  const active = rows.filter((card) => !card.is_archived && card.currency_code === currencyCode);
  return {
    count: active.length,
    totalLimit: active.reduce((sum, card) => sum + card.credit_limit_minor, 0),
    totalBalance: active.reduce((sum, card) => sum + card.current_balance_minor, 0),
    available: active.reduce((sum, card) => sum + card.available_credit_minor, 0),
    highUtilization: active.filter((card) => card.alert_level === "high").length,
    dueAttention: active.filter((card) => card.latest_statement?.status === "overdue" || card.latest_statement?.status === "due_soon").length
  };
}
