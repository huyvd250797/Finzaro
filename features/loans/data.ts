import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type LoanInterestMethod = "annuity" | "equal_principal" | "interest_only";
export type LoanPaymentFrequency = "monthly" | "biweekly" | "weekly";

export type Loan = {
  id: string;
  user_id: string;
  name: string;
  lender_name: string | null;
  currency_code: string;
  original_principal_minor: number;
  annual_rate_percent: number;
  term_months: number;
  start_date: string;
  first_payment_date: string;
  interest_method: LoanInterestMethod;
  payment_frequency: LoanPaymentFrequency;
  upfront_fee_minor: number;
  linked_account_id: string | null;
  icon_name: string;
  icon_color: string | null;
  notes: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type LoanPayment = {
  id: string;
  user_id: string;
  loan_id: string;
  payment_date: string;
  principal_minor: number;
  interest_minor: number;
  fee_minor: number;
  transaction_id: string | null;
  notes: string | null;
  created_at: string;
};

export type LoanAccount = {
  id: string;
  name: string;
  currency_code: string;
  account_type: string;
  institution_name: string | null;
  is_archived: boolean;
};

export type LoanCurrency = { code: string; name: string; symbol: string; decimal_digits: number };

export type AmortizationRow = {
  installment: number;
  due_date: string;
  payment_minor: number;
  principal_minor: number;
  interest_minor: number;
  remaining_minor: number;
};

export type LoanProjection = Loan & {
  principal_paid_minor: number;
  interest_paid_minor: number;
  fees_paid_minor: number;
  total_paid_minor: number;
  remaining_principal_minor: number;
  payoff_percent: number;
  scheduled_payment_minor: number;
  projected_total_interest_minor: number;
  projected_total_cost_minor: number;
  next_due_date: string | null;
  next_scheduled_payment_minor: number;
  days_to_next_due: number | null;
  status: "archived" | "paid_off" | "overdue" | "due_soon" | "active";
  linked_account: LoanAccount | null;
  payments: LoanPayment[];
  schedule: AmortizationRow[];
};

function utcDate(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00Z`);
}

export function addMonthsClamped(value: string, months: number) {
  const [year, month, day] = value.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

export function addDays(value: string, days: number) {
  const date = utcDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string) {
  return Math.ceil((utcDate(to).getTime() - utcDate(from).getTime()) / 86400000);
}

export function amortizationSchedule(
  principalMinor: number,
  annualRatePercent: number,
  termMonths: number,
  firstPaymentDate: string,
  method: LoanInterestMethod,
  frequency: LoanPaymentFrequency = "monthly"
): AmortizationRow[] {
  const principal = Math.max(0, principalMinor);
  const periodsPerYear = frequency === "weekly" ? 52 : frequency === "biweekly" ? 26 : 12;
  const n = frequency === "monthly" ? Math.max(1, Math.trunc(termMonths)) : Math.max(1, Math.round((termMonths / 12) * periodsPerYear));
  const periodicRate = Math.max(0, annualRatePercent) / 100 / periodsPerYear;
  const rows: AmortizationRow[] = [];
  let remaining = principal;

  const annuityPayment = periodicRate === 0
    ? principal / n
    : principal * (periodicRate / (1 - (1 + periodicRate) ** -n));
  const equalPrincipal = principal / n;

  for (let index = 0; index < n; index += 1) {
    const interest = Math.round(remaining * periodicRate);
    let principalPart = 0;
    let payment = 0;

    if (method === "interest_only") {
      principalPart = index === n - 1 ? remaining : 0;
      payment = interest + principalPart;
    } else if (method === "equal_principal") {
      principalPart = index === n - 1 ? remaining : Math.min(remaining, Math.round(equalPrincipal));
      payment = principalPart + interest;
    } else {
      payment = index === n - 1 ? remaining + interest : Math.round(annuityPayment);
      principalPart = Math.min(remaining, Math.max(0, payment - interest));
      if (index === n - 1) principalPart = remaining;
    }

    remaining = Math.max(0, remaining - principalPart);
    rows.push({
      installment: index + 1,
      due_date: frequency === "monthly" ? addMonthsClamped(firstPaymentDate, index) : addDays(firstPaymentDate, index * (frequency === "weekly" ? 7 : 14)),
      payment_minor: principalPart + interest,
      principal_minor: principalPart,
      interest_minor: interest,
      remaining_minor: remaining
    });
  }

  return rows;
}

export function projectLoan(loan: Loan, payments: LoanPayment[], accounts: LoanAccount[], today: string): LoanProjection {
  const loanPayments = payments
    .filter((payment) => payment.loan_id === loan.id)
    .sort((a, b) => b.payment_date.localeCompare(a.payment_date) || b.created_at.localeCompare(a.created_at));
  const principalPaid = loanPayments.reduce((sum, payment) => sum + payment.principal_minor, 0);
  const interestPaid = loanPayments.reduce((sum, payment) => sum + payment.interest_minor, 0);
  const feesPaid = loanPayments.reduce((sum, payment) => sum + payment.fee_minor, 0);
  const remaining = Math.max(0, loan.original_principal_minor - principalPaid);
  const schedule = amortizationSchedule(loan.original_principal_minor, Number(loan.annual_rate_percent), loan.term_months, loan.first_payment_date, loan.interest_method, loan.payment_frequency);
  const projectedInterest = schedule.reduce((sum, row) => sum + row.interest_minor, 0);
  const paidInstallmentEquivalent = Math.min(schedule.length, loanPayments.length);
  const nextRow = remaining > 0 ? schedule[paidInstallmentEquivalent] ?? schedule.at(-1) ?? null : null;
  const daysToNext = nextRow ? daysBetween(today, nextRow.due_date) : null;
  const status: LoanProjection["status"] = loan.is_archived
    ? "archived"
    : remaining === 0
      ? "paid_off"
      : daysToNext !== null && daysToNext < 0
        ? "overdue"
        : daysToNext !== null && daysToNext <= 7
          ? "due_soon"
          : "active";

  return {
    ...loan,
    principal_paid_minor: principalPaid,
    interest_paid_minor: interestPaid,
    fees_paid_minor: feesPaid,
    total_paid_minor: principalPaid + interestPaid + feesPaid,
    remaining_principal_minor: remaining,
    payoff_percent: loan.original_principal_minor > 0 ? Math.min(100, Math.round((principalPaid / loan.original_principal_minor) * 1000) / 10) : 0,
    scheduled_payment_minor: schedule[0]?.payment_minor ?? 0,
    projected_total_interest_minor: projectedInterest,
    projected_total_cost_minor: loan.original_principal_minor + projectedInterest + loan.upfront_fee_minor,
    next_due_date: nextRow?.due_date ?? null,
    next_scheduled_payment_minor: nextRow?.payment_minor ?? 0,
    days_to_next_due: daysToNext,
    status,
    linked_account: loan.linked_account_id ? accounts.find((account) => account.id === loan.linked_account_id) ?? null : null,
    payments: loanPayments,
    schedule
  };
}

export function loanProjections(loans: Loan[], payments: LoanPayment[], accounts: LoanAccount[], today: string) {
  return loans.map((loan) => projectLoan(loan, payments, accounts, today)).sort((a, b) => {
    if (a.is_archived !== b.is_archived) return a.is_archived ? 1 : -1;
    if (a.status === "paid_off" && b.status !== "paid_off") return 1;
    if (b.status === "paid_off" && a.status !== "paid_off") return -1;
    return (a.next_due_date ?? "9999-12-31").localeCompare(b.next_due_date ?? "9999-12-31") || a.name.localeCompare(b.name, "vi");
  });
}

export async function loadLoans(supabase: SupabaseClient<Database>, userId: string, includeArchived = false) {
  let loansQuery = (supabase as any).from("loans").select("*").eq("user_id", userId).order("is_archived").order("created_at", { ascending: false });
  if (!includeArchived) loansQuery = loansQuery.eq("is_archived", false);

  const [{ data: loans, error: loansError }, { data: payments, error: paymentsError }, { data: accounts, error: accountsError }, { data: currencies, error: currenciesError }] = await Promise.all([
    loansQuery,
    (supabase as any).from("loan_payments").select("*").eq("user_id", userId).order("payment_date", { ascending: false }).order("created_at", { ascending: false }).limit(5000),
    supabase.from("accounts").select("id, name, currency_code, account_type, institution_name, is_archived").eq("user_id", userId),
    supabase.from("supported_currencies").select("code, name, symbol, decimal_digits").eq("is_active", true).order("code")
  ]);

  if (loansError) throw loansError;
  if (paymentsError) throw paymentsError;
  if (accountsError) throw accountsError;
  if (currenciesError) throw currenciesError;

  return {
    loans: (loans ?? []) as Loan[],
    payments: (payments ?? []) as LoanPayment[],
    accounts: (accounts ?? []) as LoanAccount[],
    currencies: (currencies ?? []) as LoanCurrency[]
  };
}

export function loanSummary(rows: LoanProjection[], currencyCode: string) {
  const active = rows.filter((row) => !row.is_archived && row.currency_code === currencyCode);
  return {
    count: active.length,
    original: active.reduce((sum, row) => sum + row.original_principal_minor, 0),
    remaining: active.reduce((sum, row) => sum + row.remaining_principal_minor, 0),
    paidPrincipal: active.reduce((sum, row) => sum + row.principal_paid_minor, 0),
    paidInterest: active.reduce((sum, row) => sum + row.interest_paid_minor, 0),
    dueSoon: active.filter((row) => row.status === "due_soon" || row.status === "overdue").length,
    next: active.filter((row) => row.next_due_date).sort((a, b) => (a.next_due_date ?? "").localeCompare(b.next_due_date ?? ""))[0] ?? null
  };
}

export function simulateExtraMonthlyPayment(loan: Pick<Loan, "original_principal_minor" | "annual_rate_percent" | "term_months" | "interest_method" | "payment_frequency">, extraMonthlyMinor: number) {
  const base = amortizationSchedule(loan.original_principal_minor, Number(loan.annual_rate_percent), loan.term_months, "2026-01-01", loan.interest_method, loan.payment_frequency);
  const baseInterest = base.reduce((sum, row) => sum + row.interest_minor, 0);
  if (extraMonthlyMinor <= 0 || loan.interest_method === "interest_only") {
    return { months: loan.term_months, totalInterestMinor: baseInterest, monthsSaved: 0, interestSavedMinor: 0 };
  }

  const periodsPerYear = loan.payment_frequency === "weekly" ? 52 : loan.payment_frequency === "biweekly" ? 26 : 12;
  const periodicRate = Number(loan.annual_rate_percent) / 100 / periodsPerYear;
  const extraPerPeriod = Math.round(extraMonthlyMinor * 12 / periodsPerYear);
  const basePayment = base[0]?.payment_minor ?? Math.ceil(loan.original_principal_minor / Math.max(1, base.length));
  let remaining = loan.original_principal_minor;
  let months = 0;
  let interestTotal = 0;
  while (remaining > 0 && months < 5000) {
    const interest = Math.round(remaining * periodicRate);
    const planned = Math.max(1, basePayment + extraPerPeriod);
    const principal = Math.min(remaining, Math.max(1, planned - interest));
    interestTotal += interest;
    remaining -= principal;
    months += 1;
  }
  return {
    months: Math.max(1, Math.ceil(months * 12 / periodsPerYear)),
    totalInterestMinor: interestTotal,
    monthsSaved: Math.max(0, loan.term_months - Math.ceil(months * 12 / periodsPerYear)),
    interestSavedMinor: Math.max(0, baseInterest - interestTotal)
  };
}
