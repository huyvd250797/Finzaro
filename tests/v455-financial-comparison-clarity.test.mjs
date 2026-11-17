import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(join(root, path), "utf8");
const require = createRequire(import.meta.url);
let ts;
try { ts = require("typescript"); } catch {
  ts = require(join(execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim(), "typescript"));
}
function loadTs(path, deps = {}) {
  const { outputText, diagnostics } = ts.transpileModule(read(path), {
    fileName: path, reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, strict: true }
  });
  assert.deepEqual((diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error), []);
  const module = { exports: {} };
  new Function("module", "exports", "require", outputText)(module, module.exports, (id) => {
    if (id in deps) return deps[id];
    throw new Error(`Unmapped dependency: ${id}`);
  });
  return module.exports;
}
const comp = loadTs("features/dashboard/period-comparison.ts", {
  "@/features/transactions/financial-flow": { standardFlowValue: () => 0 }
});
const ranges = comp.comparisonRanges;
const compare = comp.comparePeriodTotals;

test("V4.5.5 real-world 45k versus 1.2m: raw signed negative and green expense impact", () => {
  const actual = compare(45_000, 1_200_000, "expense");
  assert.deepEqual(actual, { difference: -1_155_000, percent: -96.25, direction: "positive" });
  const card = read("components/spending-period-card.tsx");
  assert.match(card, /Giảm \${isIncome \? "thu" : "chi"}/);
  assert.match(card, /Math\.abs\(change\.difference\)/);
  assert.match(card, /So với toàn bộ hôm qua/);
  assert.match(card, /Tổng chi tiêu hôm qua/);
  assert.match(card, /previousLink/);
});

test("All financial cases use mathematically signed percent and impact-only colors", () => {
  assert.deepEqual(compare(1_200_000, 1_000_000, "expense"), { difference: 200_000, percent: 20, direction: "negative" });
  assert.deepEqual(compare(1_500_000, 1_000_000, "income"), { difference: 500_000, percent: 50, direction: "positive" });
  assert.deepEqual(compare(500_000, 1_000_000, "income"), { difference: -500_000, percent: -50, direction: "negative" });
  assert.deepEqual(compare(0, 45_000, "expense"), { difference: -45_000, percent: -100, direction: "positive" });
  assert.deepEqual(compare(45_000, 0, "expense"), { difference: 45_000, percent: null, direction: "negative" });
  assert.deepEqual(compare(0, 0, "expense"), { difference: 0, percent: 0, direction: "neutral" });
  assert.deepEqual(compare(20, 20, "income"), { difference: 0, percent: 0, direction: "neutral" });
});

test("Option B uses complete previous day while month/year align calendar-to-date", () => {
  assert.deepEqual(ranges("2026-11-17"), {
    today: { from: "2026-11-16", to: "2026-11-16" },
    month: { from: "2026-10-01", to: "2026-10-17" },
    year: { from: "2025-01-01", to: "2025-11-17" }
  });
  assert.deepEqual(ranges("2026-03-31").month, { from: "2026-02-01", to: "2026-02-28" });
  assert.deepEqual(ranges("2024-03-31").month, { from: "2024-02-01", to: "2024-02-29" });
  assert.deepEqual(ranges("2024-02-29").year, { from: "2023-01-01", to: "2023-02-28" });
  assert.deepEqual(ranges("2026-01-01").today, { from: "2025-12-31", to: "2025-12-31" });
  for (const invalid of ["2026-02-29", "2026-13-01", "2026-00-01", "2026-11-31"]) {
    assert.throws(() => ranges(invalid));
  }
});

test("RPC v455 validates dates, signed-in currency, and each current + previous six totals", () => {
  const valid = { snapshotVersion: "v455", today: "2026-11-17", currency: "VND", ranges: ranges("2026-11-17"),
    current: { income: { today: 0, month: 0, year: 0 }, expense: { today: 45_000, month: 45_000, year: 45_000 } },
    previous: { income: { today: 0, month: 0, year: 0 }, expense: { today: 1_200_000, month: 1_200_000, year: 1_200_000 } }
  };
  assert.equal(comp.parseDashboardComparison(valid, valid.today, "VND").previous.expense.today, 1_200_000);
  assert.throws(() => comp.parseDashboardComparison({ ...valid, currency: "USD" }, valid.today, "VND"));
  assert.throws(() => comp.parseDashboardComparison({ ...valid, snapshotVersion: "v451" }, valid.today, "VND"));
  assert.throws(() => comp.parseDashboardComparison({ ...valid, ranges: { ...valid.ranges, today: { from: "2026-11-16", to: "2026-11-17" } } }, valid.today, "VND"));
  assert.throws(() => comp.parseDashboardComparison({ ...valid, current: { income: { today: 0, month: 0 } } }, valid.today, "VND"));
  assert.throws(() => comp.parseDashboardComparison({ ...valid, previous: { ...valid.previous, expense: { ...valid.previous.expense, today: -1 } } }, valid.today, "VND"));
});

test("New SQL is read-only, RLS invoker, and limits current month/year to today", () => {
  const sql = read("supabase/migrations/20261117110000_financial_comparison_clarity_v455.sql").toLowerCase();
  for (const clause of ["security invoker", "auth.uid()", "t.user_id = v_user", "e.user_id = v_user", "e.currency_code = p_currency",
    "coalesce(t.transaction_purpose, 'standard') = 'standard'", "t.transaction_type in ('income', 'expense')",
    "between v_month_start and p_today", "between v_year_start and p_today", "dashboard_period_comparison_v455",
    "revoke all on function", "grant execute on function"]) {
    assert.ok(sql.includes(clause), clause);
  }
  assert.doesNotMatch(sql, /\bv_end_month\b|\bv_end_year\b/);
  assert.doesNotMatch(sql, /\b(?:insert into|delete from|update)\s+public\.(?:transactions|accounts|transaction_entries)\b/);
  const snapshot = read("features/dashboard/snapshot.ts");
  assert.match(snapshot, /actual !== comparisons\.current\[flow\]\[period\]/);
  assert.match(snapshot, /dashboard_period_comparison_v455/);
  assert.match(snapshot, /previousFromLedger\(transactions, today, currency\)/);
});
