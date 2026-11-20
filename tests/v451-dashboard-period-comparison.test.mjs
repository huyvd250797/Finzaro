import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const read = (name) => readFileSync(join(root, name), "utf8");
const require = createRequire(import.meta.url);
let ts;
try { ts = require("typescript"); }
catch { ts = require(join(execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim(), "typescript")); }
function loadTs(path, deps = {}) {
  const compiled = ts.transpileModule(read(path), { fileName: path, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  new Function("module", "exports", "require", compiled)(module, module.exports, (id) => {
    if (id in deps) return deps[id];
    throw new Error(`Unmapped import: ${id}`);
  });
  return module.exports;
}
const flow = loadTs("features/transactions/financial-flow.ts");
const comparison = loadTs("features/dashboard/period-comparison.ts", { "@/features/transactions/financial-flow": flow });
const tx = (id, date, type, amount, purpose = "standard", currency = "VND") => ({
  id, title: id, transaction_date: date, transaction_type: type, transaction_purpose: purpose,
  entries: [{ account_id: "a", currency_code: currency, entry_role: type, amount_minor: type === "expense" ? -amount : amount }]
});

test("V4.5.1 release retains strict deploy gates and six modules", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.version, "4.6.2");
  assert.equal(pkg.scripts.check, "npm run lint && npm run typecheck && npm run test && npm run build");
  assert.deepEqual(readdirSync(join(root, "app/(dashboard)"), { withFileTypes: true }).filter((item) => item.isDirectory()).map((item) => item.name).sort(), ["accounts", "categories", "overview", "portfolio", "reports", "settings", "transactions"]);
});

test("V4.5.1 prior periods handle January/year boundary and leap day correctly", () => {
  assert.deepEqual(comparison.comparisonRanges("2026-01-01"), {
    today: { from: "2025-12-31", to: "2025-12-31" },
    month: { from: "2025-12-01", to: "2025-12-31" },
    year: { from: "2025-01-01", to: "2025-12-31" }
  });
  assert.equal(comparison.comparisonRanges("2024-03-01").today.from, "2024-02-29");
  assert.equal(comparison.comparisonRanges("2026-03-01").today.from, "2026-02-28");
});

test("V4.5.7 compares complete prior day/month/year", () => {
  const transactions = [
    tx("yesterday-exp", "2026-11-14", "expense", 25),
    tx("oct-income", "2026-10-02", "income", 300),
    tx("oct-expense", "2026-10-30", "expense", 150),
    tx("oct-expense-aligned", "2026-10-15", "expense", 51),
    tx("prev-year-income", "2025-01-01", "income", 10),
    tx("prev-year-last", "2025-12-31", "income", 400),
    tx("prev-year-aligned", "2025-11-15", "income", 71),
    tx("prev-year-exp", "2025-07-01", "expense", 70),
    tx("current-month", "2026-11-03", "income", 9999),
    tx("current-year", "2026-08-01", "expense", 9999),
    tx("excluded-transfer", "2025-12-31", "transfer", 600),
    tx("excluded-loan", "2025-12-31", "expense", 550, "loan_payment"),
    tx("excluded-fx", "2025-12-31", "income", 500, "standard", "USD")
  ];
  const result = comparison.previousFromLedger(transactions, "2026-11-15", "VND");
  assert.deepEqual(result.income, { today: 0, month: 300, year: 481 });
  assert.deepEqual(result.expense, { today: 25, month: 201, year: 70 });
});

test("V4.5.1 computes -10 million (-33.33%) and sign-independent green/red change", () => {
  const less = comparison.comparePeriodTotals(20_000_000, 30_000_000, "income");
  assert.equal(less.difference, -10_000_000);
  assert.ok(Math.abs(less.percent + 33.3333333333) < 0.00001);
  assert.equal(less.direction, "negative");
  const more = comparison.comparePeriodTotals(40_000_000, 30_000_000, "income");
  assert.equal(more.difference, 10_000_000);
  assert.ok(Math.abs(more.percent - 33.3333333333) < 0.00001);
  assert.equal(more.direction, "positive");
  assert.equal(comparison.comparePeriodTotals(20, 20, "income").direction, "neutral");
});

test("V4.5.5 zero baseline uses undefined percentage, not fabricated ±100%", () => {
  assert.deepEqual(comparison.comparePeriodTotals(20_000_000, 0, "income"), { difference: 20_000_000, percent: null, direction: "positive" });
  assert.deepEqual(comparison.comparePeriodTotals(25_000, 0, "expense"), { difference: 25_000, percent: null, direction: "negative" });
  assert.deepEqual(comparison.comparePeriodTotals(0, 0, "expense"), { difference: 0, percent: 0, direction: "neutral" });
});

test("V4.5.1 authenticated comparison JSON must match date, currency, all six totals", () => {
  const valid = { snapshotVersion: "v457", today: "2026-11-15", currency: "VND", ranges: comparison.comparisonRanges("2026-11-15"), current: { income: {today: 0,month: 0,year: 0}, expense:{today: 0,month: 0,year: 0}}, previous: {
    income: { today: 0, month: "30000000", year: 60000000 },
    expense: { today: 25000, month: 800000, year: 1500000 }
  } };
  assert.equal(comparison.parseDashboardComparison(valid, valid.today, "VND").previous.income.month, 30_000_000);
  assert.throws(() => comparison.parseDashboardComparison({ ...valid, currency: "USD" }, valid.today, "VND"), /mismatch/);
  assert.throws(() => comparison.parseDashboardComparison({ ...valid, previous: { expense: {} } }, valid.today, "VND"));
  assert.throws(() => comparison.parseDashboardComparison({ ...valid, previous: { ...valid.previous, income: { ...valid.previous.income, today: -1 } } }, valid.today, "VND"));
  assert.throws(() => comparison.parseDashboardComparison({ ...valid, previous: { ...valid.previous, expense: { ...valid.previous.expense, year: Number.MAX_SAFE_INTEGER + 1 } } }, valid.today, "VND"));
});

test("V4.5.1 all three cards share the right aligned comparison and Chi/Thu toggle", () => {
  const card = read("components/spending-period-card.tsx");
  const page = read("app/(dashboard)/overview/page.tsx");
  assert.match(card, /So với toàn bộ hôm qua/);
  assert.match(card, /So với toàn bộ tháng trước/);
  assert.match(card, /So với toàn bộ năm trước/);
  assert.match(card, /previous\[flow\]\[period\]/);
  assert.match(card, /items-end justify-between/);
  assert.match(card, /text-right/);
  assert.match(card, /text-\[var\(--fin-income\)\]/);
  assert.match(card, /text-\[var\(--fin-expense\)\]/);
  assert.match(card, /aria-pressed=\{isIncome\}/);
  assert.match(page, /previous=\{previous\}/);
});

test("V4.5.1 RPC is read-only, RLS-invoker, standard-flow and currency scoped", () => {
  const sql = read("supabase/migrations/20261115090000_dashboard_period_comparison_v451.sql");
  for (const fragment of ["security invoker", "auth.uid()", "t.user_id = v_user", "e.user_id = v_user", "e.currency_code = p_currency", "e.entry_role = t.transaction_type", "coalesce(t.transaction_purpose, 'standard') = 'standard'", "t.transaction_type in ('income', 'expense')", "d < v_year_start", "t.transaction_date < p_today", "revoke all on function", "grant execute on function"]) {
    assert.ok(sql.includes(fragment), `Missing RLS/flow contract: ${fragment}`);
  }
  assert.doesNotMatch(sql, /(?:insert into|delete from|update)\s+public\.(?:transactions|accounts|transaction_entries)/i);
  assert.match(read("features/dashboard/snapshot.ts"), /rpc\("dashboard_period_comparison_v457"/);
  assert.match(read("features/dashboard/snapshot.ts"), /parseDashboardComparison\(/);
});

test("V4.5.1 only falls back for missing RPC, never fabricates previous values on database errors", () => {
  const source = read("features/dashboard/snapshot.ts");
  assert.match(source, /if \(!isMissingRPC\(comparison\.error\)\) throw comparison\.error/);
  assert.match(source, /if \(ledger\.diagnostics\.strategy === "empty"\) throw/);
  assert.match(source, /previousFromLedger\(transactions, today, currency\)/);
  assert.match(source, /fromDate: ranges\.year\.from/);
});


function dashboardLoader({ compareRpc, overviewRpc, fallbackRows = [], onLedger } = {}) {
  const dashboard = loadTs("features/dashboard/snapshot.ts", {
    "@/features/transactions/financial-flow": flow,
    "@/features/dashboard/period-comparison": comparison,
    "@/features/reports/data": { loadReportLedger: async (_client, _userId, options) => {
      onLedger?.(options);
      return { diagnostics: { strategy: "direct" }, transactions: fallbackRows,
        accounts: [{ id: "a", account_type: "bank", currency_code: "VND", is_archived: false, current_balance_minor: 1000 }] };
    } },
    "@/features/transactions/data": { currentDateKey: () => "2026-11-15", currencyDigits: () => 0 },
    "@/lib/performance": { measureServerOperation: (_name, callback) => callback() }
  });
  const rpcCalls = [];
  const client = {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({
      data: { code: "VND", decimal_digits: 0, symbol: "đ" }, error: null
    }) }) }) }),
    rpc: async (name) => {
      rpcCalls.push(name);
      if (name === "dashboard_snapshot_v450") return overviewRpc ?? {
        data: { snapshotVersion: "v450", today: "2026-11-15", balance: 1000, closingBalance: 1000,
          monthTotals: { income: 0, expense: 0 }, daily: [], movements: [], categories: [], recent: [] }, error: null
      };
      if (name === "dashboard_period_comparison_v457") return compareRpc ?? {
        data: { snapshotVersion: "v457", today: "2026-11-15", currency: "VND", ranges: comparison.comparisonRanges("2026-11-15"),
        current: { income: { today: 0, month: 0, year: 0 }, expense: { today: 0, month: 0, year: 0 } }, previous: {
          income: { today: 100, month: 200, year: 300 }, expense: { today: 10, month: 20, year: 30 }
        } }, error: null
      };
      throw new Error(`Unexpected RPC: ${name}`);
    }
  };
  return { dashboard, client, rpcCalls };
}

test("V4.5.1 both fast RPCs run together and do not load historical ledgers", async () => {
  const { dashboard, client, rpcCalls } = dashboardLoader({ onLedger: () => { throw new Error("Unexpected ledger fallback"); } });
  const snapshot = await dashboard.loadDashboardSnapshot(client, "user", "VND", "Asia/Ho_Chi_Minh");
  assert.deepEqual(rpcCalls.sort(), ["dashboard_period_comparison_v457", "dashboard_snapshot_v450"].sort());
  assert.equal(snapshot.previous.income.month, 200);
  assert.equal(snapshot.spending.month.amount, 0);
});

test("V4.5.5 only missing v457 RPC falls back to previous-year ledger", async () => {
  let ledgerOptions;
  const { dashboard, client } = dashboardLoader({
    compareRpc: { data: null, error: { code: "PGRST202", message: "No function" } },
    fallbackRows: [tx("previous-year", "2025-01-01", "income", 400), tx("previous-month", "2026-10-15", "expense", 150)],
    onLedger: (options) => { ledgerOptions = options; }
  });
  const snapshot = await dashboard.loadDashboardSnapshot(client, "user", "VND", "Asia/Ho_Chi_Minh");
  assert.deepEqual([snapshot.previous.income.year, snapshot.previous.expense.month], [400, 150]);
  assert.deepEqual([ledgerOptions.fromDate, ledgerOptions.toDate, ledgerOptions.includeAccounts], ["2025-01-01", "2026-11-14", false]);
});

test("V4.5.5 real v457 RPC errors fail the Dashboard instead of showing incorrect comparisons", async () => {
  const { dashboard, client } = dashboardLoader({ compareRpc: { data: null, error: { code: "42501", message: "Access denied" } } });
  await assert.rejects(dashboard.loadDashboardSnapshot(client, "user", "VND", "Asia/Ho_Chi_Minh"), { code: "42501", message: "Access denied" });
});
