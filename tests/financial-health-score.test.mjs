import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const migration = read("supabase/migrations/20261007183000_financial_health_score.sql");
const editor = read("supabase/sql-editor/V0.2.0_financial_health_score.sql");
const page = read("app/(dashboard)/health/page.tsx");
const data = read("features/financial-health/data.ts");
const actions = read("features/financial-health/actions.ts");
const txForm = read("components/transaction-entry-form.tsx");
const txData = read("features/transactions/data.ts");
const sidebar = read("components/app-sidebar.tsx");
const mobile = read("components/mobile-nav.tsx");
const overview = read("app/(dashboard)/overview/page.tsx");
const version = read("lib/app-version.ts");

test("V0.2.0 creates Financial Health snapshots with RLS", () => {
  assert.equal(migration, editor);
  assert.match(migration, /create table if not exists public\.financial_health_snapshots/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /financial_health_snapshots_unique unique \(user_id, snapshot_date, currency_code\)/i);
});

test("health engine has weighted explainable subscores", () => {
  assert.match(data, /cashflow.*weight: 20/s);
  assert.match(data, /savings.*weight: 15/s);
  assert.match(data, /budget.*weight: 15/s);
  assert.match(data, /liquidity.*weight: 20/s);
  assert.match(data, /debt.*weight: 15/s);
  assert.match(data, /credit.*weight: 10/s);
  assert.match(data, /net_worth.*weight: 5/s);
  assert.match(data, /insights/);
});

test("Financial Health page exposes score, intelligence and history", () => {
  assert.match(page, /Financial Health Score/);
  assert.match(page, /Financial Intelligence/);
  assert.match(page, /Health Score history/);
  assert.match(actions, /saveFinancialHealthSnapshotAction/);
});

test("new transaction form offers recent and frequent autofill suggestions", () => {
  assert.match(txData, /quickTransactionSuggestions/);
  assert.match(txData, /kind: "frequent" \| "recent"/);
  assert.match(txForm, /Gợi ý chọn nhanh/);
  assert.match(txForm, /applySuggestion/);
  assert.match(txForm, /Đã tự điền/);
});

test("Financial Health is discoverable from dashboard and navigation", () => {
  assert.match(sidebar, /href: "\/health"/);
  assert.match(mobile, /href: "\/health"/);
  assert.match(overview, /href="\/health"/);
});

test("Financial Health remains available after V0.3.0", () => {
  assert.match(version, /APP_VERSION = "0\.4\.1"/);
  assert.match(sidebar, /href: "\/health"/);
});
