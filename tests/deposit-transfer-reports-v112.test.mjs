import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("V1.1.2 Transfer loads real Deposit-module records instead of only Savings accounts", async () => {
  const page = await read("app/(dashboard)/transactions/page.tsx");
  const form = await read("components/transaction-entry-form.tsx");
  assert.match(page, /from\("deposits"\)/);
  assert.match(page, /deposits=\{depositOptions\}/);
  assert.match(form, /DepositTransferOption/);
  assert.match(form, /name="deposit_id"/);
  assert.match(form, /Tiền gửi · module Tiền gửi & lãi suất/);
  assert.match(form, /Tiền gửi đang hoạt động/);
});

test("V1.1.2 Deposit transfer can advance an existing Goal and is routed atomically", async () => {
  const form = await read("components/transaction-entry-form.tsx");
  const action = await read("features/transactions/actions.ts");
  assert.match(form, /selectedDeposit/);
  assert.match(form, /Thêm vào mục tiêu/);
  assert.match(form, /name="savings_goal_id"/);
  assert.match(action, /const depositId = text\(formData, "deposit_id"\)/);
  assert.match(action, /create_deposit_transfer_v112/);
  assert.match(action, /p_savings_goal_id: savingsGoalId/);
  assert.match(action, /delete_financial_transaction_v112/);
  assert.match(action, /"\/deposits"/);
});

test("V1.1.2 migration atomically mutates Account, Deposit and optional Goal with rollback metadata", async () => {
  const migration = await read("supabase/migrations/20261011170000_transfer_deposit_reports_v112.sql");
  const sqlEditor = await read("supabase/sql-editor/V1.1.2_transfer_deposit_reports_reliability.sql");
  assert.equal(migration, sqlEditor);
  assert.match(migration, /create table if not exists public\.deposit_funding_events/);
  assert.match(migration, /create_deposit_transfer_v112/);
  assert.match(migration, /update public\.accounts[\s\S]*current_balance_minor = current_balance_minor - p_amount_minor/);
  assert.match(migration, /update public\.deposits[\s\S]*principal_minor = principal_minor \+ p_amount_minor/);
  assert.match(migration, /insert into public\.savings_goal_entries/);
  assert.match(migration, /delete_financial_transaction_v112/);
});

test("V1.1.2 Reports use paginated flattened RPC with a relation-free fallback", async () => {
  const data = await read("features/reports/data.ts");
  const migration = await read("supabase/migrations/20261011170000_transfer_deposit_reports_v112.sql");
  assert.match(data, /report_flow_rows_v112/);
  assert.match(data, /\.range\(offset, offset \+ pageSize - 1\)/);
  assert.match(data, /loadReportRowsFallback/);
  assert.match(data, /from\("transaction_entries"\)/);
  assert.doesNotMatch(data, /categories\(id, name/);
  assert.match(migration, /create or replace function public\.report_flow_rows_v112/);
  assert.match(migration, /t\.transaction_date between p_from_date and p_to_date/);
});

test("Reports has a dedicated recoverable error boundary", async () => {
  const boundary = await read("app/(dashboard)/reports/error.tsx");
  assert.match(boundary, /Không thể tải dữ liệu Báo cáo/);
  assert.match(boundary, /V1\.1\.2/);
  assert.match(boundary, /reset/);
});

test("V1.1.2 release metadata and SQL verification are present", async () => {
  const pkg = JSON.parse(await read("package.json"));
  const version = await read("lib/app-version.ts");
  const verify = await read("supabase/sql-editor/V1.1.2_transfer_deposit_reports_reliability_verify.sql");
  assert.equal(pkg.version, "1.1.2");
  assert.match(version, /APP_VERSION = "1\.1\.2"/);
  assert.match(version, /Deposit Transfer & Reports Reliability Fix/);
  assert.match(verify, /create_deposit_transfer_v112/);
  assert.match(verify, /report_flow_rows_v112/);
});
