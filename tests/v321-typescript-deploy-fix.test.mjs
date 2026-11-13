import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (name) => readFileSync(join(root, name), "utf8");

test("V3.2.1: report snapshots and period URLs have statically complete flow keys", () => {
  const report = read("app/(dashboard)/reports/page.tsx");
  assert.match(report, /const flows: Record<ReportFlowType, ReportFlowSnapshot> = \{/);
  assert.match(report, /income: buildFlowSnapshot\("income"\)/);
  assert.match(report, /expense: buildFlowSnapshot\("expense"\)/);
  assert.match(report, /<FastReportOverview/);
  assert.match(read("components/fast-report-overview.tsx"), /periodId\(visible\)/);
  assert.match(read("components/fast-report-overview.tsx"), /mode === "year"/);
  assert.match(read("components/fast-report-overview.tsx"), /shiftMonthKey/);
  assert.doesNotMatch(report, /Object\.fromEntries\([^;]+as Record<ReportFlowType/);
});

test("V3.2.1: batch RPC unknown envelope and receipts are validated before use", () => {
  const actions = read("features/transactions/actions.ts");
  assert.match(actions, /function isCopyTransactionReceipt\(value: unknown\): value is CopyTransactionReceipt/);
  assert.match(actions, /function isCopyTransactionReceipts\(value: unknown\): value is CopyTransactionReceipt\[\]/);
  assert.match(actions, /typeof result !== "object" \|\| !\("data" in result\)/);
  assert.match(actions, /const receipts: unknown = result\.data/);
  assert.match(actions, /!isCopyTransactionReceipts\(receipts\)/);
  assert.match(actions, /new Set\(receipts\.map\(\(row\) => row\.date\)\)\.size/);
  assert.doesNotMatch(actions, /result\.data as Array/);
});

test("V3.2.1: no new SQL migration; repaired V3.2.0 one is retained", () => {
  const sql = read("supabase/migrations/20261111180000_instant_copy_batch_v320.sql");
  assert.match(sql, /v_expected_entries integer := 1/);
  assert.match(sql, /if v_entries <> v_expected_entries then/);
  assert.match(sql, /for v_date in\s+select distinct/);
  assert.match(read("DEPLOY_V3.2.1.md"), /Không yêu cầu migration SQL mới/);
});
