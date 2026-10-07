import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync("supabase/migrations/20261006180000_recurring_calendar.sql", "utf8");
const sqlEditor = fs.readFileSync("supabase/sql-editor/V0.0.7_recurring_calendar.sql", "utf8");
const actions = fs.readFileSync("features/recurring/actions.ts", "utf8");
const data = fs.readFileSync("features/recurring/data.ts", "utf8");
const page = fs.readFileSync("app/(dashboard)/recurring/page.tsx", "utf8");
const overview = fs.readFileSync("app/(dashboard)/overview/page.tsx", "utf8");

test("V0.0.7 creates recurring rules and occurrence history with RLS", () => {
  assert.match(migration, /create table if not exists public\.recurring_rules/i);
  assert.match(migration, /create table if not exists public\.recurring_occurrences/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /users can read own recurring rules/i);
  assert.equal(migration, sqlEditor);
});

test("posting a recurring occurrence creates a real atomic ledger transaction", () => {
  assert.match(migration, /post_recurring_occurrence_v007/);
  assert.match(migration, /create_financial_transaction_v005/);
  assert.match(migration, /unique \(recurring_rule_id, due_date\)/i);
  assert.match(migration, /is_recurring_due_date_v007/);
  assert.match(migration, /Recurring rule is paused/);
  assert.match(migration, /guard_account_recurring_archive_v007/);
  assert.match(migration, /guard_category_recurring_archive_v007/);
  assert.match(actions, /post_recurring_occurrence_v007/);
  assert.match(actions, /revalidatePath\("\/transactions"\)/);
});

test("Financial Calendar projects weekly monthly and yearly schedules", () => {
  assert.match(data, /projectRecurringOccurrences/);
  assert.match(data, /frequency === "weekly"/);
  assert.match(data, /frequency === "monthly"/);
  assert.match(data, /addYearsClamped/);
  assert.match(page, /Financial Calendar/);
  assert.match(page, /Đã thanh toán/);
  assert.match(page, /Đã nhận/);
});

test("dashboard surfaces upcoming recurring obligations", () => {
  assert.match(overview, /Lịch tài chính · 14 ngày tới/);
  assert.match(overview, /loadRecurringData/);
});
