import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { LoanProjection } from "@/features/loans/data";
import type { CreditCardProjection } from "@/features/credit-cards/data";
import { minimumPaymentMinor } from "@/features/credit-cards/data";

export type DebtStrategy = "avalanche" | "snowball";
export type DebtKind = "loan" | "credit_card";

export type DebtStrategyPlan = {
  id: string;
  user_id: string;
  currency_code: string;
  strategy: DebtStrategy;
  extra_monthly_minor: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type StrategyDebt = {
  key: string;
  kind: DebtKind;
  id: string;
  name: string;
  institution: string | null;
  currency_code: string;
  balance_minor: number;
  annual_rate_percent: number;
  minimum_monthly_minor: number;
  minimum_percent: number | null;
  minimum_floor_minor: number | null;
};

export type StrategyPayoff = {
  strategy: DebtStrategy | "minimum_only";
  months: number;
  total_interest_minor: number;
  total_paid_minor: number;
  debt_free: boolean;
  payoff_order: Array<{ key: string; name: string; kind: DebtKind; month: number }>;
};

export type StrategyComparison = {
  baseline: StrategyPayoff;
  avalanche: StrategyPayoff;
  snowball: StrategyPayoff;
};

function loanMonthlyMinimum(loan: LoanProjection) {
  const periodsPerYear = loan.payment_frequency === "weekly" ? 52 : loan.payment_frequency === "biweekly" ? 26 : 12;
  return Math.max(1, Math.round((loan.scheduled_payment_minor * periodsPerYear) / 12));
}

export function buildStrategyDebts(loans: LoanProjection[], cards: CreditCardProjection[], currencyCode: string): StrategyDebt[] {
  const loanDebts = loans
    .filter((loan) => !loan.is_archived && loan.currency_code === currencyCode && loan.remaining_principal_minor > 0)
    .map((loan): StrategyDebt => ({
      key: `loan:${loan.id}`,
      kind: "loan",
      id: loan.id,
      name: loan.name,
      institution: loan.lender_name,
      currency_code: loan.currency_code,
      balance_minor: loan.remaining_principal_minor,
      annual_rate_percent: Number(loan.annual_rate_percent),
      minimum_monthly_minor: Math.min(loan.remaining_principal_minor, loanMonthlyMinimum(loan)),
      minimum_percent: null,
      minimum_floor_minor: null
    }));

  const cardDebts = cards
    .filter((card) => !card.is_archived && card.currency_code === currencyCode && card.current_balance_minor > 0)
    .map((card): StrategyDebt => ({
      key: `credit_card:${card.id}`,
      kind: "credit_card",
      id: card.id,
      name: card.name,
      institution: card.bank_name,
      currency_code: card.currency_code,
      balance_minor: card.current_balance_minor,
      annual_rate_percent: Number(card.annual_rate_percent),
      minimum_monthly_minor: minimumPaymentMinor(card.current_balance_minor, Number(card.minimum_payment_percent), card.minimum_payment_floor_minor),
      minimum_percent: Number(card.minimum_payment_percent),
      minimum_floor_minor: card.minimum_payment_floor_minor
    }));

  return [...loanDebts, ...cardDebts].sort((a, b) => b.balance_minor - a.balance_minor);
}

function currentMinimum(debt: StrategyDebt, balanceMinor: number, accruedInterestMinor: number) {
  if (debt.kind === "credit_card" && debt.minimum_percent !== null && debt.minimum_floor_minor !== null) {
    const calculated = minimumPaymentMinor(balanceMinor, debt.minimum_percent, debt.minimum_floor_minor);
    return Math.min(balanceMinor, Math.max(calculated, accruedInterestMinor + 1));
  }
  return Math.min(balanceMinor, Math.max(debt.minimum_monthly_minor, accruedInterestMinor + 1));
}

function chooseTarget(active: Array<{ debt: StrategyDebt; balance: number }>, strategy: DebtStrategy) {
  return [...active].sort((a, b) => {
    if (strategy === "avalanche") {
      return b.debt.annual_rate_percent - a.debt.annual_rate_percent || a.balance - b.balance || a.debt.name.localeCompare(b.debt.name, "vi");
    }
    return a.balance - b.balance || b.debt.annual_rate_percent - a.debt.annual_rate_percent || a.debt.name.localeCompare(b.debt.name, "vi");
  })[0] ?? null;
}

export function simulateMinimumOnly(debts: StrategyDebt[], maxMonths = 600): StrategyPayoff {
  const state = debts.map((debt) => ({ debt, balance: debt.balance_minor }));
  let month = 0;
  let totalInterest = 0;
  let totalPaid = 0;
  const payoffOrder: StrategyPayoff["payoff_order"] = [];
  const paid = new Set<string>();

  while (state.some((row) => row.balance > 0) && month < maxMonths) {
    month += 1;
    for (const row of state) {
      if (row.balance <= 0) continue;
      const interest = Math.max(0, Math.round(row.balance * (row.debt.annual_rate_percent / 100 / 12)));
      row.balance += interest;
      totalInterest += interest;
      const payment = currentMinimum(row.debt, row.balance, interest);
      row.balance = Math.max(0, row.balance - payment);
      totalPaid += payment;
      if (row.balance === 0 && !paid.has(row.debt.key)) {
        paid.add(row.debt.key);
        payoffOrder.push({ key: row.debt.key, name: row.debt.name, kind: row.debt.kind, month });
      }
    }
  }

  return { strategy: "minimum_only", months: month, total_interest_minor: totalInterest, total_paid_minor: totalPaid, debt_free: state.every((row) => row.balance <= 0), payoff_order: payoffOrder };
}

export function simulateDebtStrategy(debts: StrategyDebt[], extraMonthlyMinor: number, strategy: DebtStrategy, maxMonths = 600): StrategyPayoff {
  const state = debts.map((debt) => ({ debt, balance: debt.balance_minor }));
  const baseMonthlyBudget = debts.reduce((sum, debt) => sum + debt.minimum_monthly_minor, 0) + Math.max(0, extraMonthlyMinor);
  let month = 0;
  let totalInterest = 0;
  let totalPaid = 0;
  const payoffOrder: StrategyPayoff["payoff_order"] = [];
  const paid = new Set<string>();

  while (state.some((row) => row.balance > 0) && month < maxMonths) {
    month += 1;
    const active = state.filter((row) => row.balance > 0);
    const accrued = new Map<string, number>();

    for (const row of active) {
      const interest = Math.max(0, Math.round(row.balance * (row.debt.annual_rate_percent / 100 / 12)));
      row.balance += interest;
      totalInterest += interest;
      accrued.set(row.debt.key, interest);
    }

    let budget = baseMonthlyBudget;
    for (const row of active) {
      if (row.balance <= 0 || budget <= 0) continue;
      const min = currentMinimum(row.debt, row.balance, accrued.get(row.debt.key) ?? 0);
      const payment = Math.min(row.balance, min, budget);
      row.balance -= payment;
      budget -= payment;
      totalPaid += payment;
    }

    while (budget > 0) {
      const target = chooseTarget(state.filter((row) => row.balance > 0), strategy);
      if (!target) break;
      const payment = Math.min(target.balance, budget);
      target.balance -= payment;
      budget -= payment;
      totalPaid += payment;
    }

    for (const row of state) {
      if (row.balance <= 0 && !paid.has(row.debt.key)) {
        paid.add(row.debt.key);
        payoffOrder.push({ key: row.debt.key, name: row.debt.name, kind: row.debt.kind, month });
      }
    }
  }

  return { strategy, months: month, total_interest_minor: totalInterest, total_paid_minor: totalPaid, debt_free: state.every((row) => row.balance <= 0), payoff_order: payoffOrder };
}

export function compareDebtStrategies(debts: StrategyDebt[], extraMonthlyMinor: number): StrategyComparison {
  return {
    baseline: simulateMinimumOnly(debts),
    avalanche: simulateDebtStrategy(debts, extraMonthlyMinor, "avalanche"),
    snowball: simulateDebtStrategy(debts, extraMonthlyMinor, "snowball")
  };
}

export async function loadDebtStrategyPlan(supabase: SupabaseClient<Database>, userId: string, currencyCode: string) {
  const { data, error } = await (supabase as any).from("debt_strategy_plans").select("*").eq("user_id", userId).eq("currency_code", currencyCode).maybeSingle();
  if (error) throw error;
  return (data ?? null) as DebtStrategyPlan | null;
}
