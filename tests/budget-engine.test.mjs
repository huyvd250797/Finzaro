import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const migration = read("supabase/migrations/20261006170000_budget_engine.sql");
const actions = read("features/budgets/actions.ts");
const data = read("features/budgets/data.ts");
const page = read("app/(dashboard)/budgets/page.tsx");
const overview = read("app/(dashboard)/overview/page.tsx");
const version = read("lib/app-version.ts");
const pwa = read("components/pwa-register.tsx");

test("Budget Engine creates monthly category budgets with RLS", () => {
  assert.match(migration, /create table if not exists public\.budgets/i);
  assert.match(migration, /month_start date not null/i);
  assert.match(migration, /currency_code text not null references public\.supported_currencies/i);
  assert.match(migration, /amount_minor bigint not null/i);
  assert.match(migration, /alter table public\.budgets enable row level security/i);
  assert.match(migration, /users can read own budgets/i);
  assert.match(migration, /grant insert \(user_id, category_id, month_start, currency_code, amount_minor\)/i);
});

test("Budget scopes prevent parent-child double counting", () => {
  assert.match(migration, /validate_budget_v006/);
  assert.match(migration, /ancestor or descendant category already has an active budget/i);
  assert.match(migration, /validate_category_budget_hierarchy_v006/);
  assert.match(migration, /Category move would create overlapping active budgets/i);
  assert.match(data, /categoryScopeIds/);
});

test("budget progress derives actual spending from expense ledger", () => {
  assert.match(data, /transaction\.transaction_type !== "expense"/);
  assert.match(data, /transactionEntry\(transaction, "expense"\)/);
  assert.match(data, /entry\.currency_code !== budget\.currency_code/);
  assert.match(data, /actual \+= Math\.abs\(entry\.amount_minor\)/);
  assert.match(data, /percent >= 80/);
});

test("Budget UI supports create, edit, archive and copy previous month", () => {
  assert.match(actions, /createBudgetAction/);
  assert.match(actions, /updateBudgetAction/);
  assert.match(actions, /setBudgetArchivedAction/);
  assert.match(actions, /copyPreviousMonthBudgetsAction/);
  assert.match(page, /Sao chép tháng trước/);
  assert.match(page, /Ngân sách mới/);
  assert.match(page, /Gần giới hạn/);
  assert.match(page, /Vượt ngân sách/);
});

test("dashboard includes Budget Engine summary", () => {
  assert.match(overview, /loadBudgets/);
  assert.match(overview, /budgetSummary/);
  assert.match(overview, /Ngân sách tháng/);
  assert.match(overview, /Quản lý ngân sách/);
});

test("V0.0.6 keeps proactive PWA update prompt", () => {
  assert.match(pwa, /\/api\/version/);
  assert.match(pwa, /Cập nhật ngay/);
  assert.match(pwa, /registration\.update\(\)/);
});

test("current app version is V0.7.1 Mobile Money UX + Debt Funding", () => {
  assert.match(version, /APP_VERSION = "0\.7\.1"/);
  assert.match(version, /Mobile Money UX \+ Debt Funding/);
});
