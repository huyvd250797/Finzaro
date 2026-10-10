import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const migration = read("supabase/migrations/20261008183000_financial_goals_planner.sql");
const editor = read("supabase/sql-editor/V0.5.0_financial_goals_planner.sql");
const page = read("app/(dashboard)/goal-planner/page.tsx");
const planner = read("components/financial-goals-planner.tsx");
const actions = read("features/goals/planner-actions.ts");
const sidebar = read("components/app-sidebar.tsx");
const mobile = read("components/mobile-nav.tsx");
const version = read("lib/app-version.ts");

test("V0.5.0 creates goal planning tables with RLS and atomic save RPC", () => {
  assert.equal(migration, editor);
  assert.match(migration, /create table if not exists public\.financial_goal_plans/i);
  assert.match(migration, /create table if not exists public\.financial_goal_allocations/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /save_financial_goal_plan_v050/i);
  assert.match(actions, /save_financial_goal_plan_v050/);
});

test("Financial Goals Planner allocates across multiple savings goals", () => {
  assert.match(page, /Financial Goals Planner/);
  assert.match(planner, /Nguồn tiền phân bổ mỗi tháng/);
  assert.match(planner, /Theo ưu tiên/);
  assert.match(planner, /Cân bằng/);
  assert.match(planner, /Phân bổ tự động/);
  assert.match(planner, /Ước tính hoàn thành/);
});

test("Planner integrates Savings Goals and Smart Cash Flow", () => {
  assert.match(page, /loadSavingsGoals/);
  assert.match(page, /loadCashFlowPlannerData/);
  assert.match(page, /savings_reserve_minor/);
});

test("Planner is discoverable from desktop and mobile navigation", () => {
  assert.match(sidebar, /href: "\/goal-planner"/);
  assert.match(mobile, /href: "\/goal-planner"/);
});

test("current app version is V0.8.0 Release Candidate", () => {
  assert.match(version, /APP_VERSION = "0\.8\.0"/);
  assert.match(version, /Release Candidate/);
});
