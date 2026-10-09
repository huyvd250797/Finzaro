import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const migration = read("supabase/migrations/20261009094000_investment_assets_unified_transactions.sql");
const txAction = read("features/transactions/actions.ts");
const txForm = read("components/transaction-entry-form.tsx");
const goals = read("app/(dashboard)/goals/page.tsx");
const assets = read("app/(dashboard)/assets/page.tsx");
const netWorth = read("features/net-worth/data.ts");

test("V0.6.0 creates investment asset and valuation tables", () => {
  assert.match(migration, /create table if not exists public\.investment_assets/i);
  assert.match(migration, /create table if not exists public\.asset_valuations/i);
});

test("Transaction Core supports credit card and loan payments", () => {
  assert.match(migration, /create_financial_transaction_v060/i);
  assert.match(migration, /credit_card_payment/);
  assert.match(migration, /loan_payment/);
  assert.match(migration, /insert into public\.credit_card_payments/i);
  assert.match(migration, /insert into public\.loan_payments/i);
  assert.match(txAction, /create_financial_transaction_v060/);
});

test("Loan payment preserves principal interest fee split", () => {
  assert.match(txForm, /loan_principal/);
  assert.match(txForm, /loan_interest/);
  assert.match(txForm, /loan_fee/);
  assert.match(migration, /v_principal \+ v_interest \+ v_fee/);
});

test("Savings Goal auto-sync is driven by transfer ledger", () => {
  assert.match(migration, /sync_linked_goal_transfer_v060/);
  assert.match(migration, /Tự động từ chuyển tiền vào tài khoản tiết kiệm liên kết/);
  assert.match(migration, /Tự động từ chuyển tiền ra khỏi tài khoản tiết kiệm liên kết/);
  assert.match(migration, /account_type = 'savings'/);
  assert.match(migration, /already linked to another active goal/);
  assert.match(goals, /Tự đồng bộ qua Chuyển tiền/);
});

test("Investment assets are included in Net Worth", () => {
  assert.match(netWorth, /investment_assets_minor/);
  assert.match(netWorth, /investmentAssetsValue/);
  assert.match(assets, /Đầu tư & tài sản/);
});

test("Liability-linked cash outflow is excluded from lifestyle expense totals", () => {
  const data = read("features/transactions/data.ts");
  assert.match(data, /transaction\.transaction_purpose === "standard"/);
});


test("V0.6.0 backfills existing liability payments and transfers with semantic purpose", () => {
  assert.match(migration, /set transaction_purpose = 'credit_card_payment'/);
  assert.match(migration, /set transaction_purpose = 'loan_payment'/);
  assert.match(migration, /set transaction_purpose = 'transfer'/);
});
