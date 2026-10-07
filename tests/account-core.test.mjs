import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const migration = read("supabase/migrations/20261006134500_account_core.sql");
const actions = read("features/accounts/actions.ts");
const accountsPage = read("app/(dashboard)/accounts/page.tsx");
const overview = read("app/(dashboard)/overview/page.tsx");
const version = read("lib/app-version.ts");

 test("Account Core migration creates user-owned accounts with RLS", () => {
  assert.match(migration, /create table if not exists public\.accounts/i);
  assert.match(migration, /user_id uuid not null references auth\.users\(id\)/i);
  assert.match(migration, /alter table public\.accounts enable row level security/i);
  assert.match(migration, /auth\.uid\(\).*user_id/is);
  assert.match(migration, /opening_balance_minor bigint/i);
  assert.match(migration, /current_balance_minor bigint/i);
});

test("Account actions are authenticated and user scoped", () => {
  assert.match(actions, /requireUser/);
  assert.match(actions, /from\("accounts"\)\.insert/);
  assert.match(actions, /from\("accounts"\)\.update/);
  assert.match(actions, /eq\("user_id", userId\)/);
  assert.doesNotMatch(actions, /service_role/i);
});

test("Accounts page reads real Supabase rows and supports archive lifecycle", () => {
  assert.match(accountsPage, /from\("accounts"\)/);
  assert.match(accountsPage, /createAccountAction/);
  assert.match(accountsPage, /updateAccountAction/);
  assert.match(accountsPage, /setAccountArchivedAction/);
  assert.doesNotMatch(accountsPage, /from "@\/lib\/demo-data"/);
});

test("Dashboard total balance is sourced from Account Core through ledger loader", () => {
  assert.match(overview, /loadLedger/);
  assert.match(overview, /current_balance_minor/);
  assert.match(overview, /formatMinorMoney/);
});

test("current app version remains centralized after Reports & Insights", () => {
  assert.match(version, /APP_VERSION = "0\.0\.9"/);
  assert.match(version, /Savings Goals/);
});
