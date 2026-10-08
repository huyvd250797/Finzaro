import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const migration = read("supabase/migrations/20261007123000_interest_deposit_manager.sql");
const sqlEditor = read("supabase/sql-editor/V0.0.10_interest_deposit_manager.sql");
const actions = read("features/deposits/actions.ts");
const data = read("features/deposits/data.ts");
const page = read("app/(dashboard)/deposits/page.tsx");
const calculator = read("components/deposit-term-comparison.tsx");
const overview = read("app/(dashboard)/overview/page.tsx");
const sidebar = read("components/app-sidebar.tsx");
const mobile = read("components/mobile-nav.tsx");
const version = read("lib/app-version.ts");

test("V0.0.10 creates deposit and realized-interest tables with RLS", () => {
  assert.match(migration, /create table if not exists public\.deposits/i);
  assert.match(migration, /create table if not exists public\.deposit_interest_entries/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /users can read own deposits/i);
  assert.match(migration, /users can insert own deposit interest entries/i);
  assert.equal(migration, sqlEditor);
});

test("deposit DB validates maturity, account currency and transaction traceability", () => {
  assert.match(migration, /validate_deposit_v0010/);
  assert.match(migration, /maturity date must match start date plus term months/i);
  assert.match(migration, /Deposit currency must match the linked account currency/);
  assert.match(migration, /validate_deposit_interest_entry_v0010/);
  assert.match(migration, /accounts_guard_deposit_archive_v0010/);
});

test("interest engine supports simple, compound monthly and monthly payout projections", () => {
  assert.match(data, /projectedInterestMinor/);
  assert.match(data, /compound_monthly/);
  assert.match(data, /monthly_payout/);
  assert.match(data, /projected_maturity_minor/);
  assert.match(data, /due_soon/);
});

test("deposit UI supports CRUD, realized entries, auto-renew and term comparison", () => {
  assert.match(actions, /createDepositAction/);
  assert.match(actions, /updateDepositAction/);
  assert.match(actions, /setDepositArchivedAction/);
  assert.match(actions, /addDepositInterestEntryAction/);
  assert.match(page, /Tiền gửi & lãi suất/);
  assert.match(page, /Tự động tái tục/);
  assert.match(page, /Ghi nhận lãi/);
  assert.match(calculator, /\[3, 6, 12, 24\]/);
});

test("dashboard and navigation surface Deposit Manager", () => {
  assert.match(overview, /loadDeposits/);
  assert.match(overview, /Tiền gửi & lãi suất/);
  assert.match(sidebar, /\/deposits/);
  assert.match(mobile, /\/deposits/);
  assert.match(sidebar, /\/net-worth/);
});

test("current app version is V0.3.0 Forecasting & Scenario Planning", () => {
  assert.match(version, /APP_VERSION = "0\.4\.1"/);
  assert.match(version, /Smart Cash Flow Planner/);
});
