import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(join(root, path), "utf8");
const require = createRequire(import.meta.url);
let ts;
try { ts = require("typescript"); } catch { ts = require(join(execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim(), "typescript")); }
function loadTs(path, deps = {}) {
  const { outputText, diagnostics } = ts.transpileModule(read(path), { fileName: path, reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, strict: true } });
  assert.deepEqual((diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error), []);
  const module = { exports: {} };
  new Function("module", "exports", "require", outputText)(module, module.exports, id => {
    if (id in deps) return deps[id];
    throw new Error(`Unexpected dependency ${id}`);
  });
  return module.exports;
}
const comp = loadTs("features/dashboard/period-comparison.ts", { "@/features/transactions/financial-flow": {
  standardFlowValue: (tx, currency, flow) => tx.transaction_purpose === "standard" && tx.transaction_type === flow && tx.currency === currency ? tx.amount : 0
} });
const tx = (date, flow, amount, currency = "VND", purpose = "standard") => ({ transaction_date: date, transaction_type: flow, amount, currency, transaction_purpose: purpose });

test("V4.5.7 has a consistent version, source, migration and deploy gate", () => {
  assert.equal(JSON.parse(read("package.json")).version, "4.6.11");
  assert.match(read("lib/app-version.ts"), /APP_VERSION = "4\.6\.11"/);
  assert.match(read("lib/app-version.ts"), /Full Previous Period Comparison|Comparison Icon Alignment Fix|Multi-Asset Portfolio|Asset Management UX & Edit|Market Price Reliability Fix|Market Price Reliability Deploy Fix|Portfolio UX & Snapshot Fix|Portfolio Mobile Layout & Save Feedback|Family Savings Fund Management|Personal Lending & Borrowing Management|Dedicated Debts & Family Funds UX|Accounts Redeclaration Deploy Hotfix|Family Opening Balance & Dashboard Privacy/);
  assert.match(read("features/dashboard/snapshot.ts"), /dashboard_period_comparison_v457/);
  assert.match(read("DEPLOY_V4.5.7.md"), /Migration Supabase/);
});

test("V4.5.7 compares running current periods to complete previous periods", () => {
  assert.deepEqual(comp.comparisonRanges("2026-11-17"), {
    today: { from: "2026-11-16", to: "2026-11-16" },
    month: { from: "2026-10-01", to: "2026-10-31" },
    year: { from: "2025-01-01", to: "2025-12-31" }
  });
  assert.deepEqual(comp.comparisonRanges("2026-01-01"), {
    today: { from: "2025-12-31", to: "2025-12-31" },
    month: { from: "2025-12-01", to: "2025-12-31" },
    year: { from: "2025-01-01", to: "2025-12-31" }
  });
  assert.deepEqual(comp.comparisonRanges("2026-03-15").month, { from: "2026-02-01", to: "2026-02-28" });
  assert.deepEqual(comp.comparisonRanges("2024-03-15").month, { from: "2024-02-01", to: "2024-02-29" });
  assert.deepEqual(comp.comparisonRanges("2024-02-29").year, { from: "2023-01-01", to: "2023-12-31" });
  assert.deepEqual(comp.comparisonRanges("2026-05-02").month, { from: "2026-04-01", to: "2026-04-30" });
  assert.deepEqual(comp.comparisonRanges("2026-12-31").month, { from: "2026-11-01", to: "2026-11-30" });
  for (const date of ["2026-02-29", "2026-11-31", "2026-00-01"]) assert.throws(() => comp.comparisonRanges(date));
});

test("V4.5.7 ledger fallback includes final days of previous month/year and filters nonstandard flows", () => {
  const result = comp.previousFromLedger([
    tx("2026-11-16", "expense", 20),
    tx("2026-10-17", "expense", 100), tx("2026-10-31", "expense", 200),
    tx("2025-11-17", "income", 300), tx("2025-12-31", "income", 400),
    tx("2025-12-31", "expense", 50, "USD"),
    tx("2025-12-31", "expense", 60, "VND", "loan_payment"),
    tx("2026-11-17", "expense", 999),
  ], "2026-11-17", "VND");
  assert.deepEqual(result.expense, { today: 20, month: 300, year: 0 });
  assert.deepEqual(result.income, { today: 0, month: 0, year: 700 });
});

test("V4.5.7 RPC response validates version, all six amounts, full date ranges and currency", () => {
  const data = { snapshotVersion: "v457", today: "2026-11-17", currency: "VND",
    ranges: comp.comparisonRanges("2026-11-17"), current: { income: { today: 0, month: 0, year: 0 }, expense: { today: 45_000, month: 45_000, year: 45_000 } },
    previous: { income: { today: 0, month: 0, year: 0 }, expense: { today: 1_200_000, month: 8_000_000, year: 80_000_000 } } };
  assert.equal(comp.parseDashboardComparison(data, "2026-11-17", "VND").previous.expense.month, 8_000_000);
  assert.throws(() => comp.parseDashboardComparison({ ...data, snapshotVersion: "v455" }, data.today, "VND"));
  assert.throws(() => comp.parseDashboardComparison({ ...data, ranges: { ...data.ranges, month: { from: "2026-10-01", to: "2026-10-17" } } }, data.today, "VND"));
  assert.throws(() => comp.parseDashboardComparison({ ...data, currency: "USD" }, data.today, "VND"));
});

test("V4.5.7 uses zigzag arrow icons from supplied image, color by financial impact", () => {
  const card = read("components/spending-period-card.tsx");
  for (const item of ["TrendingUp", "TrendingDown", "Minus", "So với toàn bộ hôm qua", "So với toàn bộ tháng trước", "So với toàn bộ năm trước", "Tổng chi tiêu tháng trước", "Tổng thu nhập năm trước", "Chi", "Thu", "thấp hơn", "vượt"]) assert.ok(card.includes(item), item);
  assert.match(card, /change\.difference > 0 \? TrendingUp : change\.difference < 0 \? TrendingDown : Minus/);
  assert.match(card, /change\.direction === "positive"/);
  assert.match(card, /change\.direction === "negative"/);
  assert.doesNotMatch(card, /ArrowDownRight/);
});

test("V4.5.7 SQL creates separate authenticated read-only full-calendar RPC with no writes", () => {
  const sql = read("supabase/migrations/20261117130000_full_previous_period_comparison_v457.sql").toLowerCase();
  for (const token of ["dashboard_period_comparison_v457", "snapshotversion', 'v457'", "security invoker", "auth.uid()", "v_previous_month_end date := v_month_start - 1", "v_previous_year_end date := v_year_start - 1", "t.transaction_date between v_previous_year and p_today", "t.user_id = v_user", "e.user_id = v_user", "e.currency_code = p_currency", "coalesce(t.transaction_purpose, 'standard') = 'standard'", "revoke all on function", "grant execute on function"]) assert.ok(sql.includes(token), token);
  assert.doesNotMatch(sql, /(?:insert into|update|delete from)\s+public\.(?:transactions|transaction_entries|accounts)/);
});
