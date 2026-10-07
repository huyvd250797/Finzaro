import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const migration = read("supabase/migrations/20261007160000_credit_card_manager.sql");
const editor = read("supabase/sql-editor/V0.0.12_credit_card_manager.sql");
const actions = read("features/credit-cards/actions.ts");
const data = read("features/credit-cards/data.ts");
const page = read("app/(dashboard)/credit-cards/page.tsx");
const txActions = read("features/transactions/actions.ts");
const txPage = read("app/(dashboard)/transactions/page.tsx");
const txList = read("components/transaction-list.tsx");
const categories = read("app/(dashboard)/categories/page.tsx");
const mobile = read("components/mobile-nav.tsx");
const splash = read("components/app-splash.tsx");
const css = read("app/globals.css");
const version = read("lib/app-version.ts");

test("V0.0.12 creates credit cards, statements and payments with RLS", () => {
  assert.match(migration, /create table if not exists public\.credit_cards/i);
  assert.match(migration, /create table if not exists public\.credit_card_statements/i);
  assert.match(migration, /create table if not exists public\.credit_card_payments/i);
  assert.match(migration, /enable row level security/i);
  assert.equal(migration, editor);
});

test("credit-card DB validates payment account and linked ledger outflow", () => {
  assert.match(migration, /validate_credit_card_v0012/);
  assert.match(migration, /validate_credit_card_payment_v0012/);
  assert.match(migration, /apply_credit_card_payment_v0012/);
  assert.match(migration, /guard_account_credit_card_archive_v0012/);
});

test("credit card UI manages utilization statements minimum due and payments", () => {
  assert.match(data, /utilization_percent/);
  assert.match(data, /minimumPaymentMinor/);
  assert.match(actions, /createCreditCardAction/);
  assert.match(actions, /createCreditCardStatementAction/);
  assert.match(actions, /addCreditCardPaymentAction/);
  assert.match(page, /Thẻ tín dụng/);
  assert.match(page, /Minimum due/);
  assert.match(page, /utilization/i);
});

test("income and expense can be edited atomically while preserving transaction id", () => {
  assert.match(migration, /update_financial_transaction_v012/);
  assert.match(migration, /Only income and expense can be edited/);
  assert.match(txActions, /updateTransactionAction/);
  assert.match(txPage, /Cập nhật giao dịch/);
  assert.match(txList, /transactions\?edit=/);
});

test("category editing is available directly from category cards", () => {
  assert.match(categories, /updateCategoryAction/);
  assert.match(categories, /InstantReveal label="Sửa"/);
});

test("mobile taskbar has uniform labels and More sheet includes credit cards", () => {
  assert.match(mobile, /mobile-tabbar-label/);
  assert.match(mobile, /Thẻ tín dụng/);
  assert.match(mobile, /Ellipsis/);
  assert.doesNotMatch(mobile, /-mt-7 size-12/);
});

test("app provides launch splash and finance visual system", () => {
  assert.match(splash, /Đang mở Finzaro/);
  assert.match(css, /finzaro-splash/);
  assert.match(css, /fin-primary-btn/);
  assert.match(css, /SF Pro Display/);
});

test("current app version is V0.1.0 Net Worth & Financial Position", () => {
  assert.match(version, /APP_VERSION = "0\.1\.0"/);
  assert.match(version, /Net Worth & Financial Position/);
});
