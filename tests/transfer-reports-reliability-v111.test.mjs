import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("V1.1.1 Savings-account destination behavior remains available", async () => {
  const form = await read("components/transaction-entry-form.tsx");
  assert.match(form, /savingsAccounts/);
  assert.match(form, /<optgroup label="Tài khoản Savings">/);
  assert.match(form, /Thêm vào mục tiêu/);
  assert.match(form, /linkedSavingsGoal/);
});

test("V1.1.9 replaces the failing report runtime path while preserving the shared API", async () => {
  const data = await read("features/reports/data.ts");
  assert.match(data, /export async function loadReportLedger/);
  assert.match(data, /loadReportTransactionsDirect/);
  assert.match(data, /loadReportEntriesDirect/);
  assert.doesNotMatch(data, /\.rpc\("report_flow_rows_v112"/);
  assert.match(data, /canonicalReportLedger/);
  assert.match(data, /loadLedger\(supabase, userId/);
  assert.match(data, /legacyCoreReportLedger/);
});

test("Savings Goal RPC migration errors remain explicit", async () => {
  const action = await read("features/transactions/actions.ts");
  assert.match(action, /create_transfer_with_goal_v110/);
  assert.match(action, /PGRST202/);
  assert.match(action, /V1\.1\.0_ui_design_system_visual_polish\.sql/);
});

test("V1.1.9 metadata is current", async () => {
  const pkg = JSON.parse(await read("package.json"));
  const version = await read("lib/app-version.ts");
  assert.equal(pkg.version, "1.1.9");
  assert.match(version, /APP_VERSION = "1\.1\.9"/);
  assert.match(version, /Category Grid & Save Performance Fix/);
});
