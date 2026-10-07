import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const migration = read("supabase/migrations/20261006150000_transaction_core.sql");
const actions = read("features/transactions/actions.ts");
const data = read("features/transactions/data.ts");
const page = read("app/(dashboard)/transactions/page.tsx");
const entryForm = read("components/transaction-entry-form.tsx");
const overview = read("app/(dashboard)/overview/page.tsx");
const accountActions = read("features/accounts/actions.ts");
const accountPage = read("app/(dashboard)/accounts/page.tsx");
const version = read("lib/app-version.ts");

test("Transaction Core creates immutable ledger tables with RLS", () => {
  assert.match(migration, /create table if not exists public\.transactions/i);
  assert.match(migration, /create table if not exists public\.transaction_entries/i);
  assert.match(migration, /alter table public\.transactions enable row level security/i);
  assert.match(migration, /alter table public\.transaction_entries enable row level security/i);
  assert.match(migration, /grant select on table public\.transactions to authenticated/i);
  assert.doesNotMatch(migration, /grant select, insert, update, delete on table public\.transactions/i);
});

test("ledger writes use authenticated atomic database functions", () => {
  assert.match(migration, /create_financial_transaction_v004/);
  assert.match(migration, /delete_financial_transaction_v004/);
  assert.match(migration, /security definer/i);
  assert.match(migration, /auth\.uid\(\)/i);
  assert.match(migration, /for update/i);
  assert.match(migration, /current_balance_minor = current_balance_minor \+ p_to_amount_minor/i);
  assert.match(migration, /current_balance_minor = current_balance_minor - p_from_amount_minor/i);
});

test("account balances are hardened after ledger activation", () => {
  assert.match(migration, /grant update \(name, account_type, institution_name, is_archived\)/i);
  assert.match(migration, /accounts_enforce_opening_balance_v004/i);
  const updateSection = accountActions.split("export async function updateAccountAction")[1].split("export async function setAccountArchivedAction")[0];
  assert.doesNotMatch(updateSection, /current_balance_minor|opening_balance_minor|currency_code/);
  assert.match(accountPage, /Không sửa số dư trực tiếp/);
});

test("transaction actions validate accounts and call RPCs", () => {
  assert.match(actions, /requireUser/);
  assert.match(actions, /create_financial_transaction_v005/);
  assert.match(actions, /delete_financial_transaction_v005/);
  assert.match(actions, /parseMajorAmountToMinor/);
  assert.doesNotMatch(actions, /service_role/i);
});

test("transaction UI and dashboard read real ledger data", () => {
  assert.match(page, /loadLedger/);
  assert.match(entryForm, /createTransactionAction/);
  assert.match(page, /TransactionList/);
  assert.match(data, /from\("transactions"\)/);
  assert.match(data, /transaction_entries\(id, transaction_id, account_id/);
  assert.match(overview, /cashflowSeries/);
  assert.match(overview, /expenseCategories/);
  assert.doesNotMatch(page, /demo-data/);
  assert.doesNotMatch(overview, /demo-data/);
});

test("current app version is V0.2.0 Financial Health Score & Intelligence", () => {
  assert.match(version, /APP_VERSION = "0\.2\.0"/);
  assert.match(version, /Financial Health Score & Intelligence/);
});
