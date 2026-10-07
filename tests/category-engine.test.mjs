import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const migration = read("supabase/migrations/20261006160000_category_engine.sql");
const actions = read("features/categories/actions.ts");
const icons = read("features/categories/icons.tsx");
const page = read("app/(dashboard)/categories/page.tsx");
const txActions = read("features/transactions/actions.ts");
const txData = read("features/transactions/data.ts");
const txPage = read("app/(dashboard)/transactions/page.tsx");
const version = read("lib/app-version.ts");

 test("Category Engine creates structured user-owned categories with RLS", () => {
  assert.match(migration, /create table if not exists public\.categories/i);
  assert.match(migration, /icon_name text not null/i);
  assert.match(migration, /categories_icon_allowed/i);
  assert.match(migration, /parent_id uuid/i);
  assert.match(migration, /alter table public\.categories enable row level security/i);
  assert.match(migration, /auth\.uid\(\).*user_id/is);
  assert.match(migration, /grant insert \(user_id, name, category_type, parent_id, icon_name\)/i);
});

test("default categories are bootstrapped for existing and future users", () => {
  assert.match(migration, /ensure_default_categories_v005/);
  assert.match(migration, /for v_user in select id from auth\.users/i);
  assert.match(migration, /perform public\.ensure_default_categories_v005\(new\.id\)/i);
  assert.match(migration, /'Ăn uống'.*'Utensils'/s);
  assert.match(migration, /'Lương'.*'Briefcase'/s);
});

test("category hierarchy validates owner, type, archived state and cycles", () => {
  assert.match(migration, /categories_parent_owner_fkey/i);
  assert.match(migration, /Parent category must use the same type/i);
  assert.match(migration, /Category hierarchy cannot contain a cycle/i);
  assert.match(migration, /Archive active child categories first/i);
});

test("V0.0.4 labels migrate while category_label remains a history snapshot", () => {
  assert.match(migration, /add column if not exists category_id uuid/i);
  assert.match(migration, /historical display snapshot/i);
  assert.match(migration, /update public\.transactions t\s+set category_id = c\.id/is);
});

test("category management supports icon setup and archive lifecycle", () => {
  assert.match(actions, /createCategoryAction/);
  assert.match(actions, /updateCategoryAction/);
  assert.match(actions, /setCategoryArchivedAction/);
  assert.match(icons, /CATEGORY_ICONS/);
  assert.match(page, /CategoryIconPicker/);
  assert.match(page, /Danh mục cha/);
});

test("Transaction Core is upgraded to structured category IDs", () => {
  assert.match(txActions, /create_financial_transaction_v005/);
  assert.match(txActions, /p_category_id/);
  assert.doesNotMatch(txActions, /p_category_label/);
  assert.match(txData, /categories\(id, name, icon_name, category_type, parent_id, is_archived\)/);
  assert.match(txPage, /TransactionCategorySelect/);
  assert.match(txPage, /name="category"/);
});

test("current app version is V0.0.10 Interest & Deposit Manager", () => {
  assert.match(version, /APP_VERSION = "0\.0\.10"/);
  assert.match(version, /Interest & Deposit Manager/);
});
