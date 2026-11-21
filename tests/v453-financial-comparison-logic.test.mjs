import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const read = (file) => readFileSync(join(root, file), "utf8");
const require = createRequire(import.meta.url);
let ts;
try { ts = require("typescript"); }
catch { ts = require(join(execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim(), "typescript")); }
const source = read("features/dashboard/period-comparison.ts");
const compiled = ts.transpileModule(source, {
  fileName: "features/dashboard/period-comparison.ts",
  reportDiagnostics: true,
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, strict: true },
});
assert.deepEqual((compiled.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error), []);
const module = { exports: {} };
new Function("module", "exports", "require", compiled.outputText)(module, module.exports, (name) => {
  if (name === "@/features/transactions/financial-flow") return { standardFlowValue: () => 0 };
  throw new Error(`Unexpected module: ${name}`);
});
const { comparePeriodTotals } = module.exports;
const expect = (current, previous, flow, difference, percent, direction) => {
  assert.deepEqual(comparePeriodTotals(current, previous, flow), { difference, percent, direction });
};

test("V4.5.5 release is versioned, retains category UX and strict Vercel release gate", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.version, "4.6.8");
  assert.match(read("lib/app-version.ts"), /APP_VERSION = "4\.6\.8"/);
  assert.match(read("lib/app-version.ts"), /Financial Comparison Clarity Fix|Comparison Direction Icons|Full Previous Period Comparison|Comparison Icon Alignment Fix|Multi-Asset Portfolio|Asset Management UX & Edit|Market Price Reliability Fix|Market Price Reliability Deploy Fix|Portfolio UX & Snapshot Fix|Portfolio Mobile Layout & Save Feedback|Family Savings Fund Management|Personal Lending & Borrowing Management|Personal Debt Deploy Hotfix/);
  assert.equal(pkg.scripts.check, "npm run lint && npm run typecheck && npm run test && npm run build");
  assert.match(read("components/category-manager-grid.tsx"), /420\)/);
  assert.deepEqual(readdirSync(join(root, "app/(dashboard)"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort(),
  ["accounts", "categories", "overview", "portfolio", "reports", "settings", "transactions"]);
});

test("Yesterday expense 0, today expense 25k is +25k and undefined percentage", () => {
  expect(25_000, 0, "expense", 25_000, null, "negative");
});

test("Expense rising over a nonzero baseline is red with an adverse percentage", () => {
  expect(1_500_000, 1_000_000, "expense", 500_000, 50, "negative");
});

test("Expense falling versus prior month is negative delta but green", () => {
  expect(7_000_000, 8_000_000, "expense", -1_000_000, -12.5, "positive");
});

test("Expense stops entirely: previous 25k, current zero -> -25k (-100%)", () => {
  expect(0, 25_000, "expense", -25_000, -100, "positive");
});

test("Equal expenses normalize signed negative zero and show neutral color", () => {
  expect(25_000, 25_000, "expense", 0, 0, "neutral");
  assert.equal(Object.is(comparePeriodTotals(0, 0, "expense").difference, -0), false);
});

test("Income decline follows conventional red sign and percentage", () => {
  const actual = comparePeriodTotals(20_000_000, 30_000_000, "income");
  assert.equal(actual.difference, -10_000_000);
  assert.ok(Math.abs(actual.percent + 33.333333333333336) < 0.00000001);
  assert.equal(actual.direction, "negative");
});

test("Income increase is green and zero baseline has no percentage", () => {
  expect(30_000_000, 20_000_000, "income", 10_000_000, 50, "positive");
  expect(25_000, 0, "income", 25_000, null, "positive");
  expect(0, 25_000, "income", -25_000, -100, "negative");
});

test("No income/expense in either period remains neutral 0%", () => {
  expect(0, 0, "income", 0, 0, "neutral");
  expect(0, 0, "expense", 0, 0, "neutral");
});

test("Comparison rejects invalid amount, unsafe integer and unsupported flow", () => {
  for (const [current, previous, flow] of [[-1, 0, "expense"], [1.1, 0, "income"], [NaN, 0, "income"], [1, Infinity, "expense"], [1, 0, "transfer"]]) {
    assert.throws(() => comparePeriodTotals(current, previous, flow));
  }
  // Valid, boundary-safe totals must remain supported.
  assert.equal(comparePeriodTotals(Number.MAX_SAFE_INTEGER, 1, "expense").direction, "negative");
});

test("All three dashboard cards pass active Chi/Thu type to shared comparison and keep amounts right aligned", () => {
  const card = read("components/spending-period-card.tsx");
  assert.match(card, /comparePeriodTotals\(current\.amount, previousAmount, flow\)/);
  assert.match(card, /previous\[flow\]\[period\]/);
  assert.match(card, /So với toàn bộ hôm qua/);
  assert.match(card, /So với toàn bộ tháng trước/);
  assert.match(card, /So với toàn bộ năm trước/);
  assert.match(card, /items-end justify-between/);
  assert.match(card, /max-w-\[49%\]/);
  assert.match(card, /change\.direction === "positive" \? "text-\[var\(--fin-income\)\]"/);
  assert.match(card, /change\.direction === "negative" \? "text-\[var\(--fin-expense\)\]"/);
  assert.match(card, /TrendingDown/);
  assert.match(card, /TrendingUp/);
  assert.match(card, /ChangeIcon/);
  assert.match(card, /Mới phát sinh/);
  assert.match(card, /minimumFractionDigits: 0, maximumFractionDigits: 2/);
  assert.equal(new Intl.NumberFormat("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(100), "100");
  assert.equal(new Intl.NumberFormat("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(34.343434343), "34,34");
});

test("V4.5.5 adds read-only migration with strict fallback and does not mutate accounts", () => {
  assert.match(read("features/dashboard/snapshot.ts"), /dashboard_period_comparison_v457/);
  assert.match(read("features/dashboard/snapshot.ts"), /previousFromLedger/);
  assert.match(source, /beneficialChange = difference \* \(flow === "expense" \? -1 : 1\)/);
  const sqlMigrations = readdirSync(join(root, "supabase/migrations"));
  assert.equal(sqlMigrations.length, 36);
  assert.equal(sqlMigrations.some((f) => /financial_comparison_clarity_v455/.test(f)), true);
});
