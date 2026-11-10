import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const migration = read("supabase/migrations/20261009153000_mobile_money_debt_funding_v071.sql");
const editor = read("supabase/sql-editor/V0.7.1_mobile_money_debt_funding.sql");
const txActions = read("features/transactions/actions.ts");
const txForm = read("components/transaction-entry-form.tsx");
const money = read("components/money-calculator-input.tsx");
const decimal = read("components/decimal-input.tsx");
const scrollLock = read("components/use-overlay-scroll-lock.ts");
const reports = read("features/reports/data.ts");
const txData = read("features/transactions/data.ts");

test("V0.7.1 migration matches SQL Editor script", () => assert.equal(migration, editor));

test("debt-funded income is atomic and rollback-aware", () => {
  assert.match(migration, /credit_card_borrow/);
  assert.match(migration, /loan_borrow/);
  assert.match(migration, /liability_funding_events/);
  assert.match(migration, /create_financial_transaction_v071/);
  assert.match(migration, /delete_financial_transaction_v071/);
  assert.match(txActions, /create_financial_transaction_v071/);
  assert.match(txActions, /delete_financial_transaction_v071/);
});

test("income entry UI supports credit card and new-loan funding", () => {
  assert.match(txForm, /IncomePurpose/);
  assert.match(txForm, /credit_card_borrow/);
  assert.match(txForm, /loan_borrow/);
  assert.match(txForm, /new_loan_annual_rate_percent/);
  assert.match(txForm, /new_loan_upfront_fee/);
});

test("money and decimal inputs are mobile hardened", () => {
  assert.match(money, /createPortal/);
  assert.match(money, /Xong/);
  assert.match(money, /bottom-0/);
  assert.match(decimal, /replace\(\/\,\/g, "\."\)/);
  assert.doesNotMatch(scrollLock, /position\s*=\s*"fixed"/);
});

test("borrowed funds do not inflate real income reports", () => {
  assert.match(txData, /transaction_purpose === "standard"/);
  assert.match(reports, /transaction_purpose === "standard"/);
});
