import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const read = (file) => readFileSync(join(root, file), "utf8");
const require = createRequire(import.meta.url);
let ts;
try { ts = require("typescript"); }
catch { ts = require(join(execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim(), "typescript")); }

function loadTs(path, bindings = {}) {
  const source = read(path);
  const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  new Function("module", "exports", "require", output)(module, module.exports, (name) => {
    if (name in bindings) return bindings[name];
    throw new Error(`Unexpected module: ${name}`);
  });
  return module.exports;
}
const flow = loadTs("features/transactions/financial-flow.ts");
const snapshot = loadTs("features/dashboard/snapshot.ts", {
  "@/features/transactions/financial-flow": flow,
  "@/features/reports/data": { loadReportLedger: () => { throw new Error("Unexpected DB call"); } },
  "@/features/transactions/data": { currentDateKey: () => "2026-11-13", currencyDigits: () => 0 },
  "@/lib/performance": { measureServerOperation: async (_name, fn) => fn() },
});
const trends = loadTs("features/dashboard/trends.ts");

const account = (id, balance, currency = "VND") => ({ id, account_type: "bank", currency_code: currency, is_archived: false, current_balance_minor: balance });
const tx = (id, date, type, value, opts = {}) => ({
  id, transaction_date: date, title: opts.title ?? id,
  transaction_type: type, transaction_purpose: opts.purpose ?? "standard",
  category_id: opts.category ?? "food", category_label: opts.label ?? "Ăn uống",
  entries: opts.entries ?? [{ account_id: "a", currency_code: opts.currency ?? "VND", amount_minor: type === "expense" ? -value : value, entry_role: type }]
});

test("V4.2.0 uses canonical standard flows across day/month/year cards and excludes transfers, debt and FX", () => {
  const transactions = [
    tx("lunch", "2026-11-13", "expense", 100),
    tx("taxi", "2026-11-13", "expense", 50, { category: "transport", label: "Di chuyển" }),
    tx("previous", "2026-11-12", "expense", 200),
    tx("feb", "2026-02-01", "expense", 30),
    tx("income", "2026-11-13", "income", 1000),
    tx("trans", "2026-11-13", "transfer", 600, { purpose: "transfer" }),
    tx("debt", "2026-11-13", "expense", 999, { purpose: "loan_payment" }),
    tx("usd", "2026-11-13", "expense", 700, { currency: "USD" }),
  ];
  const result = snapshot.dashboardFromLedger(transactions, [account("a", 10000), account("u", 100, "USD")], "2026-11-13", "VND", 0);
  assert.deepEqual([result.spending.today.amount, result.spending.month.amount, result.spending.year.amount], [150,350,380]);
  assert.deepEqual([result.spending.today.count, result.spending.month.count, result.spending.year.count], [2,3,4]);
  assert.deepEqual([result.monthTotals.income, result.monthTotals.expense, result.monthTotals.net], [1000,350,650]);
  assert.deepEqual(result.spending.today.categories.map((x) => [x.id,x.amount]), [["food",100],["transport",50]]);
  assert.equal(result.balance, 10000);
  assert.equal(result.daily.at(-1).date, "2026-11-13");
  assert.deepEqual([result.daily.at(-1).income, result.daily.at(-1).expense], [1000,150]);
});

test("V4.2.0 month/year cards include future-dated postings but today and historical position do not", () => {
  const transactions = [tx("today", "2026-11-13", "expense", 20), tx("future", "2026-11-20", "expense", 30)];
  const result = snapshot.dashboardFromLedger(transactions, [account("a", 950)], "2026-11-13", "VND", 0);
  assert.equal(result.spending.today.amount, 20);
  assert.equal(result.spending.month.amount, 50);
  assert.equal(result.spending.year.amount, 50);
  assert.equal(result.closingBalance, 980);
});

test("V4.2.0 aggregate parser reconciles monthly expenses with all categories and rejects discrepancies", () => {
  const raw = { today: "2026-11-13", balance: 2000, closingBalance: 2000, monthTotals: { income: 500, expense: 100 },
    daily: [{ date: "2026-11-13", income: 500, expense: 100 }], movements: [{ date: "2026-11-13", delta: 400 }],
    categories: [{ period: "today", id: "food", label: "Food", amount: 100, count: 1 },
      { period: "month", id: "food", label: "Food", amount: 100, count: 1 },
      { period: "year", id: "food", label: "Food", amount: 100, count: 1 }], recent: [] };
  const result = snapshot.parseDashboardSummary(raw, raw.today, "VND", 0);
  assert.equal(result.spending.month.amount, 100);
  assert.equal(result.daily.at(-1).delta, 400);
  assert.equal(result.daily.length, 366);
  assert.throws(() => snapshot.parseDashboardSummary({ ...raw, monthTotals: { income: 500, expense: 101 } }, raw.today, "VND", 0), /Đối soát/);
  assert.throws(() => snapshot.parseDashboardSummary({ ...raw, daily: [{ date: "invalid", income: 500, expense: 100 }] }, raw.today, "VND", 0), /Ngày/);
  assert.throws(() => snapshot.parseDashboardSummary({ ...raw, categories: [{ period: "month", amount: Infinity }] }, raw.today, "VND", 0));
});

test("V4.2.0 5 trend modes show correct number of buckets; liquid net position uses a separate blue series", () => {
  const rows = snapshot.dashboardFromLedger([
    tx("nov", "2026-11-13", "expense", 50), tx("oct", "2026-10-13", "income", 120),
    tx("feb", "2026-02-03", "expense", 20)
  ], [account("a", 10000)], "2026-11-13", "VND", 0).daily;
  assert.equal(trends.buildTrendPoints(rows, 10000, "2026-11-13", "7d").length, 7);
  assert.equal(trends.buildTrendPoints(rows, 10000, "2026-11-13", "1m").length, 30);
  assert.equal(trends.buildTrendPoints(rows, 10000, "2026-11-13", "6m").length, 6);
  assert.equal(trends.buildTrendPoints(rows, 10000, "2026-11-13", "1y").length, 12);
  assert.ok(trends.buildTrendPoints(rows, 10000, "2026-11-13", "3m").length >= 10);
  const week = trends.buildTrendPoints(rows, 10000, "2026-11-13", "7d");
  assert.equal(week.at(-1).netWorth, 10000);
  assert.equal(week.at(-2).netWorth, 10050);
  assert.equal(week.at(-1).expense, 50);
  assert.deepEqual(trends.TREND_RANGES.map(({key}) => key), ["7d","1m","3m","6m","1y"]);
});

test("V4.2.0 first reports load and subsequent navigation use the same service", () => {
  const page = read("app/(dashboard)/reports/page.tsx");
  const route = read("app/api/reports/period-snapshot/route.ts");
  const shared = read("features/reports/load-period-snapshot.ts");
  assert.match(page, /loadPeriodSnapshot\(/);
  assert.match(route, /loadPeriodSnapshot\(/);
  assert.match(shared, /report_period_summary_v412/);
  assert.match(shared, /reconcilePeriodSnapshot/);
});

test("V4.2.0 UI: three period cards, 5 trend ranges, net worth, fullscreen chart, no Analysis tab", () => {
  const dashboard = read("app/(dashboard)/overview/page.tsx");
  const spending = read("components/spending-period-card.tsx");
  const chart = read("components/cashflow-chart.tsx");
  const navigation = read("components/report-navigation.tsx");
  assert.match(dashboard, /\["today", "month", "year"\]/);
  assert.doesNotMatch(dashboard, /Phân bổ ngân sách|Phân tích/);
  assert.match(spending, /<details className=/);
  assert.match(chart, /"6m"/);
  assert.match(chart, /createPortal\(/);
  assert.match(chart, /netWorth/);
  assert.match(chart, /#3b82f6|#2563eb/);
  assert.doesNotMatch(navigation, /Phân tích|href="\/reports\/analysis"/);
});

test("V4.2.0 user-scoped SQL RPC and index are present; no write into business tables", () => {
  const sql = read("supabase/migrations/20261113193000_unified_fast_data_v420.sql");
  assert.match(sql, /function public\.dashboard_snapshot_v420\(/);
  assert.match(sql, /auth\.uid\(\)/);
  assert.match(sql, /t\.user_id\s*=\s*v_user/);
  assert.match(sql, /security invoker/);
  assert.match(sql, /transactions_user_purpose_date_v420_idx/);
  assert.doesNotMatch(sql, /\b(?:update|delete\s+from|insert\s+into)\s+public\.(?:transactions|transaction_entries|accounts)\b/i);
});

test("V4.2.0 performance instrumentation and safe fallbacks preserve release quality gate", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.version, "4.4.0");
  assert.equal(pkg.scripts.check, "npm run lint && npm run typecheck && npm run test && npm run build");
  const loader = read("features/dashboard/snapshot.ts");
  assert.match(loader, /dashboard\.v420\.summary/);
  assert.match(loader, /dashboard\.v420\.compatibility/);
  assert.match(read("features/reports/fast-category-entries.ts"), /transaction_purpose/);
  assert.match(read("lib/performance.ts"), /FINZARO_PERF_LOG/);
});
