import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("V1.1.6 release metadata is consistent", async () => {
  const pkg = JSON.parse(await read("package.json"));
  const version = await read("lib/app-version.ts");
  assert.equal(pkg.version, "1.1.6");
  assert.match(version, /APP_VERSION = "1\.1\.6"/);
  assert.match(version, /APP_RELEASE_NAME = "Reports RSC Boundary Root Cause Fix"/);
});

test("Savings transfer can optionally advance a compatible Goal atomically", async () => {
  const form = await read("components/transaction-entry-form.tsx");
  const action = await read("features/transactions/actions.ts");
  const migration = await read("supabase/migrations/20261011150000_ui_design_system_visual_polish_v110.sql");
  const sqlEditor = await read("supabase/sql-editor/V1.1.0_ui_design_system_visual_polish.sql");

  assert.equal(migration, sqlEditor);
  assert.match(form, /Thêm vào mục tiêu/);
  assert.match(form, /name="savings_goal_id"/);
  assert.match(form, /toAccount\?\.account_type === "savings"/);
  assert.match(action, /create_transfer_with_goal_v110/);
  assert.match(action, /savingsGoalId/);
  assert.match(migration, /create_transfer_with_goal_v110/);
  assert.match(migration, /create_financial_transaction_v071/);
  assert.match(migration, /savings_goal_entries/);
  assert.match(migration, /not exists/i);
  assert.match(migration, /grant execute on function public\.create_transfer_with_goal_v110/);
});

test("Reports calendar favors readable daily amounts on narrow screens", async () => {
  const page = await read("app/(dashboard)/reports/calendar/page.tsx");
  assert.match(page, /min-w-\[700px\]/);
  assert.match(page, /min-h-\[102px\]/);
  assert.match(page, /whitespace-nowrap/);
  assert.match(page, /text-emerald-500/);
  assert.match(page, /text-rose-500/);
  assert.doesNotMatch(page, /values\.(income|expense)[^\n]*truncate/);
});

test("Reports category composition uses an interactive full pie", async () => {
  const pie = await read("components/report-donut.tsx");
  assert.match(pie, /^"use client"/);
  assert.match(pie, /setSelectedIndex/);
  assert.match(pie, /onClick/);
  assert.match(pie, /slice\.percent < 14/);
  assert.match(pie, /formatMinorMoney/);
  assert.doesNotMatch(pie, /<circle[^>]+fill=.*background/i);
});

test("Reports overview keeps three KPI blocks on one row", async () => {
  const page = await read("app/(dashboard)/reports/page.tsx");
  assert.match(page, /grid-cols-3/);
  assert.match(page, /Chi tiêu/);
  assert.match(page, /Thu nhập/);
  assert.match(page, /Ròng/);
});

test("Reports keep the shared loader API with V1.1.6 direct ledger reads", async () => {
  const data = await read("features/reports/data.ts");
  assert.match(data, /export async function loadReportLedger/);
  assert.match(data, /includeAccounts\?: boolean/);
  assert.match(data, /includeCategories\?: boolean/);
  assert.match(data, /loadReportTransactionsDirect/);
  assert.match(data, /loadReportEntriesDirect/);
  assert.match(data, /transaction_entries/);
  assert.doesNotMatch(data, /\.rpc\("report_flow_rows_v112"/);
  for (const path of [
    "app/(dashboard)/reports/page.tsx",
    "app/(dashboard)/reports/calendar/page.tsx",
    "app/(dashboard)/reports/analysis/page.tsx",
    "app/(dashboard)/reports/category/[categoryId]/page.tsx"
  ]) {
    assert.match(await read(path), /loadReportLedger/);
  }
});

test("shared visual tokens and primitives are centralized", async () => {
  const css = await read("app/globals.css");
  const card = await read("components/ui/card.tsx");
  const button = await read("components/ui/button.tsx");
  assert.match(css, /--surface-raised/);
  assert.match(css, /--radius-card/);
  assert.match(css, /--shadow-card/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(card, /fin-card/);
  assert.match(button, /--radius-control/);
});
