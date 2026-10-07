import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { depositProjections, loadDeposits } from "@/features/deposits/data";
import { loanProjections, loadLoans } from "@/features/loans/data";
import { loadCreditCards, projectCreditCards } from "@/features/credit-cards/data";

export type NetWorthSnapshot = {
  id: string;
  user_id: string;
  snapshot_date: string;
  currency_code: string;
  account_assets_minor: number;
  deposit_assets_minor: number;
  loan_liabilities_minor: number;
  credit_card_liabilities_minor: number;
  total_assets_minor: number;
  total_liabilities_minor: number;
  net_worth_minor: number;
  created_at: string;
  updated_at: string;
};

export type PositionSummary = {
  currency_code: string;
  account_assets_minor: number;
  cash_minor: number;
  bank_minor: number;
  ewallet_minor: number;
  savings_minor: number;
  deposit_assets_minor: number;
  projected_deposit_interest_minor: number;
  loan_liabilities_minor: number;
  credit_card_liabilities_minor: number;
  total_assets_minor: number;
  total_liabilities_minor: number;
  liquid_assets_minor: number;
  net_worth_minor: number;
  debt_to_asset_percent: number;
  liquidity_coverage_percent: number;
  active_accounts: number;
  active_deposits: number;
  active_loans: number;
  active_credit_cards: number;
};

export type PositionCurrency = { code: string; name: string; symbol: string; decimal_digits: number };

export async function loadNetWorthData(supabase: SupabaseClient<Database>, userId: string, today: string) {
  const [depositData, loanData, creditData, accountResult, currencyResult, snapshotResult] = await Promise.all([
    loadDeposits(supabase, userId, false),
    loadLoans(supabase, userId, false),
    loadCreditCards(supabase, userId, false),
    supabase.from("accounts").select("id, account_type, currency_code, current_balance_minor, is_archived").eq("user_id", userId).eq("is_archived", false),
    supabase.from("supported_currencies").select("code, name, symbol, decimal_digits").eq("is_active", true).order("code"),
    (supabase as any).from("net_worth_snapshots").select("*").eq("user_id", userId).order("snapshot_date", { ascending: true }).limit(240)
  ]);

  if (accountResult.error) throw accountResult.error;
  if (currencyResult.error) throw currencyResult.error;
  if (snapshotResult.error) throw snapshotResult.error;

  const accounts = accountResult.data ?? [];
  const currencies = (currencyResult.data ?? []) as PositionCurrency[];
  const deposits = depositProjections(depositData.deposits, depositData.entries, depositData.accounts, today);
  const loans = loanProjections(loanData.loans, loanData.payments, loanData.accounts, today);
  const cards = projectCreditCards(creditData.cards, creditData.statements, creditData.payments, creditData.accounts, today);

  const usedCodes = new Set<string>();
  for (const account of accounts) usedCodes.add(account.currency_code);
  for (const row of deposits) if (!row.is_archived) usedCodes.add(row.currency_code);
  for (const row of loans) if (!row.is_archived && row.remaining_principal_minor > 0) usedCodes.add(row.currency_code);
  for (const row of cards) if (!row.is_archived && row.current_balance_minor > 0) usedCodes.add(row.currency_code);

  const summaries = currencies.filter((currency) => usedCodes.has(currency.code)).map((currency): PositionSummary => {
    const accountRows = accounts.filter((account) => account.currency_code === currency.code);
    const accountAssets = accountRows.reduce((sum, account) => sum + Number(account.current_balance_minor), 0);
    const byType = (type: string) => accountRows.filter((account) => account.account_type === type).reduce((sum, account) => sum + Number(account.current_balance_minor), 0);
    const depositRows = deposits.filter((row) => !row.is_archived && row.currency_code === currency.code);
    const loanRows = loans.filter((row) => !row.is_archived && row.currency_code === currency.code);
    const cardRows = cards.filter((row) => !row.is_archived && row.currency_code === currency.code);
    const depositAssets = depositRows.reduce((sum, row) => sum + row.principal_minor, 0);
    const projectedDepositInterest = depositRows.reduce((sum, row) => sum + row.projected_interest_minor, 0);
    const loanLiabilities = loanRows.reduce((sum, row) => sum + row.remaining_principal_minor, 0);
    const cardLiabilities = cardRows.reduce((sum, row) => sum + row.current_balance_minor, 0);
    const totalAssets = accountAssets + depositAssets;
    const totalLiabilities = loanLiabilities + cardLiabilities;
    const liquidAssets = accountAssets;
    const netWorth = totalAssets - totalLiabilities;
    return {
      currency_code: currency.code,
      account_assets_minor: accountAssets,
      cash_minor: byType("cash"),
      bank_minor: byType("bank"),
      ewallet_minor: byType("ewallet"),
      savings_minor: byType("savings"),
      deposit_assets_minor: depositAssets,
      projected_deposit_interest_minor: projectedDepositInterest,
      loan_liabilities_minor: loanLiabilities,
      credit_card_liabilities_minor: cardLiabilities,
      total_assets_minor: totalAssets,
      total_liabilities_minor: totalLiabilities,
      liquid_assets_minor: liquidAssets,
      net_worth_minor: netWorth,
      debt_to_asset_percent: totalAssets > 0 ? Math.round((totalLiabilities / totalAssets) * 1000) / 10 : totalLiabilities > 0 ? 100 : 0,
      liquidity_coverage_percent: totalLiabilities > 0 ? Math.round((liquidAssets / totalLiabilities) * 1000) / 10 : liquidAssets > 0 ? 999 : 0,
      active_accounts: accountRows.length,
      active_deposits: depositRows.length,
      active_loans: loanRows.filter((row) => row.remaining_principal_minor > 0).length,
      active_credit_cards: cardRows.filter((row) => row.current_balance_minor > 0).length
    };
  });

  return {
    summaries,
    currencies,
    snapshots: (snapshotResult.data ?? []) as NetWorthSnapshot[],
    deposits,
    loans,
    cards
  };
}

export function positionForCurrency(summaries: PositionSummary[], currencyCode: string) {
  return summaries.find((row) => row.currency_code === currencyCode) ?? {
    currency_code: currencyCode,
    account_assets_minor: 0,
    cash_minor: 0,
    bank_minor: 0,
    ewallet_minor: 0,
    savings_minor: 0,
    deposit_assets_minor: 0,
    projected_deposit_interest_minor: 0,
    loan_liabilities_minor: 0,
    credit_card_liabilities_minor: 0,
    total_assets_minor: 0,
    total_liabilities_minor: 0,
    liquid_assets_minor: 0,
    net_worth_minor: 0,
    debt_to_asset_percent: 0,
    liquidity_coverage_percent: 0,
    active_accounts: 0,
    active_deposits: 0,
    active_loans: 0,
    active_credit_cards: 0
  } satisfies PositionSummary;
}
