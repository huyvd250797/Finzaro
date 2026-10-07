import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const migration = read("supabase/migrations/20261007110000_savings_goals.sql");
const sqlEditor = read("supabase/sql-editor/V0.0.9_savings_goals.sql");
const actions = read("features/goals/actions.ts");
const data = read("features/goals/data.ts");
const page = read("app/(dashboard)/goals/page.tsx");
const overview = read("app/(dashboard)/overview/page.tsx");
const sidebar = read("components/app-sidebar.tsx");
const pwa = read("components/pwa-register.tsx");
const version = read("lib/app-version.ts");

test("V0.0.9 creates savings goals and immutable progress entries with RLS", () => {
  assert.match(migration, /create table if not exists public\.savings_goals/i);
  assert.match(migration, /create table if not exists public\.savings_goal_entries/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /users can read own savings goals/i);
  assert.match(migration, /users can insert own savings goal entries/i);
  assert.equal(migration, sqlEditor);
});

test("Savings Goals validates linked accounts and ledger transaction traceability", () => {
  assert.match(migration, /validate_savings_goal_v009/);
  assert.match(migration, /Savings goal currency must match the linked account currency/);
  assert.match(migration, /validate_savings_goal_entry_v009/);
  assert.match(migration, /Linked transaction does not match this goal currency\/account\/direction/);
  assert.match(migration, /savings_goal_entries_transaction_unique_idx/);
  assert.match(migration, /Savings goal progress cannot become negative/);
  assert.match(migration, /guard_savings_goal_entry_delete_v009/);
});

test("goal progress derives saved, remaining, monthly need and completion forecast", () => {
  assert.match(data, /savingsGoalProgress/);
  assert.match(data, /monthly_needed_minor/);
  assert.match(data, /estimated_completion_date/);
  assert.match(data, /status = "overdue"/);
  assert.match(data, /status = saved .* "on_track" : "behind"/s);
});

test("Savings Goals UI supports create edit archive contribution withdrawal adjustment and history", () => {
  assert.match(actions, /createSavingsGoalAction/);
  assert.match(actions, /updateSavingsGoalAction/);
  assert.match(actions, /setSavingsGoalArchivedAction/);
  assert.match(actions, /addSavingsGoalEntryAction/);
  assert.match(actions, /deleteSavingsGoalEntryAction/);
  assert.match(page, /Mục tiêu tiết kiệm/);
  assert.match(page, /Đóng góp/);
  assert.match(page, /Rút khỏi mục tiêu/);
  assert.match(page, /Điều chỉnh thủ công/);
  assert.match(page, /Liên kết Transaction/);
});

test("dashboard and navigation surface Savings Goals", () => {
  assert.match(overview, /loadSavingsGoals/);
  assert.match(overview, /Mục tiêu tiết kiệm/);
  assert.match(sidebar, /\/goals/);
  assert.match(sidebar, /\/net-worth/);
});

test("V0.0.9 preserves proactive PWA updates", () => {
  assert.match(pwa, /\/api\/version/);
  assert.match(pwa, /Cập nhật ngay/);
  assert.match(pwa, /SKIP_WAITING/);
});

test("current app version is V0.1.0 Net Worth & Financial Position", () => {
  assert.match(version, /APP_VERSION = "0\.1\.0"/);
  assert.match(version, /Net Worth & Financial Position/);
});
