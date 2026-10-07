import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type Deposit = {
  id: string;
  user_id: string;
  name: string;
  institution_name: string | null;
  currency_code: string;
  principal_minor: number;
  annual_rate_percent: number;
  term_months: number;
  start_date: string;
  maturity_date: string;
  interest_method: "simple_maturity" | "compound_monthly" | "monthly_payout";
  auto_renew: boolean;
  linked_account_id: string | null;
  icon_name: string;
  icon_color: string | null;
  notes: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type DepositInterestEntry = {
  id: string;
  user_id: string;
  deposit_id: string;
  entry_type: "interest" | "tax" | "fee" | "adjustment";
  amount_minor: number;
  entry_date: string;
  transaction_id: string | null;
  notes: string | null;
  created_at: string;
};

export type DepositAccount = {
  id: string;
  name: string;
  currency_code: string;
  account_type: string;
  institution_name: string | null;
  is_archived: boolean;
};

export type DepositCurrency = { code: string; name: string; symbol: string; decimal_digits: number };

export type DepositProjection = Deposit & {
  projected_interest_minor: number;
  projected_maturity_minor: number;
  projected_total_return_minor: number;
  realized_net_interest_minor: number;
  days_to_maturity: number;
  status: "archived" | "matured" | "due_soon" | "active";
  linked_account: DepositAccount | null;
  entries: DepositInterestEntry[];
};

function utcDate(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00Z`);
}

export function daysBetween(from: string, to: string) {
  return Math.ceil((utcDate(to).getTime() - utcDate(from).getTime()) / 86400000);
}

export function projectedInterestMinor(principalMinor: number, annualRatePercent: number, termMonths: number, method: Deposit["interest_method"]) {
  const rate = annualRatePercent / 100;
  if (method === "compound_monthly") {
    return Math.max(0, Math.round(principalMinor * ((1 + rate / 12) ** termMonths - 1)));
  }
  return Math.max(0, Math.round(principalMinor * rate * (termMonths / 12)));
}

export function projectDeposit(deposit: Deposit, entries: DepositInterestEntry[], accounts: DepositAccount[], today: string): DepositProjection {
  const interest = projectedInterestMinor(deposit.principal_minor, Number(deposit.annual_rate_percent), deposit.term_months, deposit.interest_method);
  const depositEntries = entries
    .filter((entry) => entry.deposit_id === deposit.id)
    .sort((a, b) => b.entry_date.localeCompare(a.entry_date) || b.created_at.localeCompare(a.created_at));
  const realized = depositEntries.reduce((sum, entry) => sum + entry.amount_minor, 0);
  const days = daysBetween(today, deposit.maturity_date);
  const status: DepositProjection["status"] = deposit.is_archived ? "archived" : days < 0 ? "matured" : days <= 30 ? "due_soon" : "active";
  return {
    ...deposit,
    projected_interest_minor: interest,
    projected_maturity_minor: deposit.interest_method === "monthly_payout" ? deposit.principal_minor : deposit.principal_minor + interest,
    projected_total_return_minor: deposit.principal_minor + interest,
    realized_net_interest_minor: realized,
    days_to_maturity: days,
    status,
    linked_account: deposit.linked_account_id ? accounts.find((account) => account.id === deposit.linked_account_id) ?? null : null,
    entries: depositEntries
  };
}

export function depositProjections(deposits: Deposit[], entries: DepositInterestEntry[], accounts: DepositAccount[], today: string) {
  return deposits.map((deposit) => projectDeposit(deposit, entries, accounts, today)).sort((a, b) => {
    if (a.is_archived !== b.is_archived) return a.is_archived ? 1 : -1;
    return a.maturity_date.localeCompare(b.maturity_date) || a.name.localeCompare(b.name, "vi");
  });
}

export async function loadDeposits(supabase: SupabaseClient<Database>, userId: string, includeArchived = false) {
  let depositsQuery = supabase.from("deposits").select("*").eq("user_id", userId).order("is_archived").order("maturity_date");
  if (!includeArchived) depositsQuery = depositsQuery.eq("is_archived", false);

  const [{ data: deposits, error: depositsError }, { data: entries, error: entriesError }, { data: accounts, error: accountsError }, { data: currencies, error: currenciesError }] = await Promise.all([
    depositsQuery,
    supabase.from("deposit_interest_entries").select("*").eq("user_id", userId).order("entry_date", { ascending: false }).order("created_at", { ascending: false }).limit(5000),
    supabase.from("accounts").select("id, name, currency_code, account_type, institution_name, is_archived").eq("user_id", userId),
    supabase.from("supported_currencies").select("code, name, symbol, decimal_digits").eq("is_active", true).order("code")
  ]);

  if (depositsError) throw depositsError;
  if (entriesError) throw entriesError;
  if (accountsError) throw accountsError;
  if (currenciesError) throw currenciesError;

  return {
    deposits: (deposits ?? []) as Deposit[],
    entries: (entries ?? []) as DepositInterestEntry[],
    accounts: (accounts ?? []) as DepositAccount[],
    currencies: (currencies ?? []) as DepositCurrency[]
  };
}

export function depositSummary(rows: DepositProjection[], currencyCode: string) {
  const active = rows.filter((row) => !row.is_archived && row.currency_code === currencyCode);
  return {
    count: active.length,
    principal: active.reduce((sum, row) => sum + row.principal_minor, 0),
    projectedInterest: active.reduce((sum, row) => sum + row.projected_interest_minor, 0),
    realizedInterest: active.reduce((sum, row) => sum + row.realized_net_interest_minor, 0),
    dueSoon: active.filter((row) => row.status === "due_soon" || row.status === "matured").length,
    next: active.filter((row) => row.days_to_maturity >= 0).sort((a, b) => a.maturity_date.localeCompare(b.maturity_date))[0] ?? null
  };
}
