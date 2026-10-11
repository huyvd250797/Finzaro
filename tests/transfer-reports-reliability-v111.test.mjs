import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("V1.1.1 makes Savings destinations explicit in Transfer", async () => {
  const form = await read("components/transaction-entry-form.tsx");
  assert.match(form, /savingsAccounts/);
  assert.match(form, /<optgroup label="Tài khoản tiết kiệm">/);
  assert.match(form, /Chọn nhanh tài khoản tiết kiệm/);
  assert.match(form, /Thêm vào mục tiêu/);
  assert.match(form, /linkedSavingsGoal/);
});

test("V1.1.1 Reports use the production-proven canonical ledger hydration", async () => {
  const data = await read("features/reports/data.ts");
  assert.match(data, /import \{ loadLedger, transactionEntry/);
  assert.match(data, /loadLedger\(supabase, userId/);
  assert.match(data, /fetchAll: true/);
  assert.doesNotMatch(data, /const transactionPromise = \(async \(\) =>/);
});

test("V1.1.1 surfaces a clear error when the V1.1.0 Savings Goal RPC is missing", async () => {
  const action = await read("features/transactions/actions.ts");
  assert.match(action, /create_transfer_with_goal_v110/);
  assert.match(action, /PGRST202/);
  assert.match(action, /V1\.1\.0_ui_design_system_visual_polish\.sql/);
});

test("V1.1.1 metadata is current", async () => {
  const pkg = JSON.parse(await read("package.json"));
  const version = await read("lib/app-version.ts");
  assert.equal(pkg.version, "1.1.1");
  assert.match(version, /APP_VERSION = "1\.1\.1"/);
  assert.match(version, /Transfer & Reports Reliability Fix/);
});
