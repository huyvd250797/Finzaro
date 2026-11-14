import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (f) => readFileSync(join(root, f), "utf8");
const require = createRequire(import.meta.url);
let ts;
try { ts = require("typescript"); }
catch { ts = require(join(execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim(), "typescript")); }
function loadTs(path, bindings = {}) {
  const output = ts.transpileModule(read(path), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  new Function("module", "exports", "require", output)(module, module.exports, (name) => {
    if (name in bindings) return bindings[name];
    throw new Error(`Unmapped module ${name}`);
  });
  return module.exports;
}
const flow = loadTs("features/transactions/financial-flow.ts");
const dashboard = loadTs("features/dashboard/snapshot.ts", {
  "@/features/transactions/financial-flow": flow,
  "@/features/reports/data": { loadReportLedger: () => { throw new Error("Unexpected database call"); } },
  "@/features/transactions/data": { currentDateKey: () => "2026-11-14", currencyDigits: () => 0 },
  "@/lib/performance": { measureServerOperation: async (_label, fn) => fn() },
});
const tx = (id, date, type, value, options = {}) => ({
  id, title: options.title ?? id, transaction_date: date, transaction_type: type,
  transaction_purpose: options.purpose ?? "standard", category_id: options.category ?? "food",
  category_label: options.label ?? "Ăn uống", entries: [{
    account_id: "wallet", currency_code: options.currency ?? "VND",
    amount_minor: type === "expense" ? -value : value, entry_role: type,
  }],
});
const accounts = [{ id: "wallet", account_type: "bank", currency_code: "VND", is_archived: false, current_balance_minor: 5000 }];

test("V4.5.0 release is versioned, preserves strict deployment gate and six modules", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.version, "4.5.0");
  assert.match(read("lib/app-version.ts"), /APP_VERSION = "4\.5\.0"/);
  assert.equal(pkg.scripts.check, "npm run lint && npm run typecheck && npm run test && npm run build");
  assert.deepEqual(readdirSync(join(root, "app/(dashboard)"), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort(), ["accounts", "categories", "overview", "reports", "settings", "transactions"]);
});

test("V4.5.0 separate income and expense day/month/year correctly, excluding transfers, loans and FX", () => {
  const rows = [
    tx("salary", "2026-11-14", "income", 1000, { category: "salary", label: "Lương" }),
    tx("freelance", "2026-11-12", "income", 500, { category: "work", label: "Công việc" }),
    tx("feb", "2026-02-14", "income", 200, { category: "salary", label: "Lương" }),
    tx("future", "2026-11-20", "income", 400, { category: "salary", label: "Lương" }),
    tx("lunch", "2026-11-14", "expense", 150),
    tx("snack", "2026-11-12", "expense", 50),
    tx("transfer", "2026-11-14", "transfer", 800),
    tx("debt", "2026-11-14", "income", 400, { purpose: "loan_disbursement" }),
    tx("usd", "2026-11-14", "income", 900, { currency: "USD" }),
  ];
  const actual = dashboard.dashboardFromLedger(rows, accounts, "2026-11-14", "VND", 0);
  assert.deepEqual([actual.incoming.today.amount, actual.incoming.month.amount, actual.incoming.year.amount], [1000, 1900, 2100]);
  assert.deepEqual([actual.spending.today.amount, actual.spending.month.amount, actual.spending.year.amount], [150, 200, 200]);
  assert.deepEqual([actual.incoming.today.count, actual.incoming.month.count, actual.incoming.year.count], [1, 3, 4]);
  assert.equal(actual.monthTotals.income, actual.incoming.month.amount);
  assert.equal(actual.monthTotals.expense, actual.spending.month.amount);
  assert.equal(actual.incoming.today.recent[0].id, "salary");
  assert.equal(actual.spending.today.recent[0].id, "lunch");
  assert.equal(actual.incoming.month.categories.find((item) => item.id === "salary").amount, 1400);
  assert.equal(actual.daily.at(-1).income, 1000);
});

test("V4.5.0 RPC parser separates dual-flow slices and rejects altered monthly totals", () => {
  const raw = {
    snapshotVersion: "v450", today: "2026-11-14", balance: 1500, closingBalance: 1500,
    monthTotals: { income: 300, expense: 100 },
    daily: [{ date: "2026-11-14", income: 300, expense: 100 }],
    movements: [{ date: "2026-11-14", delta: 200 }],
    categories: ["today", "month", "year"].flatMap((period) => [
      { period, flowType: "income", id: "salary", label: "Lương", amount: 300, count: 1 },
      { period, flowType: "expense", id: "food", label: "Ăn uống", amount: 100, count: 1 },
    ]),
    recent: [
      { period: "today", flowType: "income", id: "a", date: "2026-11-14", title: "Lương", amount: 300 },
      { period: "today", flowType: "expense", id: "b", date: "2026-11-14", title: "Bữa ăn", amount: 100 },
    ],
  };
  const parsed = dashboard.parseDashboardSummary(raw, "2026-11-14", "VND", 0);
  assert.equal(parsed.incoming.month.amount, 300);
  assert.equal(parsed.spending.month.amount, 100);
  assert.equal(parsed.incoming.today.recent.length, 1);
  assert.equal(parsed.spending.today.recent.length, 1);
  assert.throws(() => dashboard.parseDashboardSummary({ ...raw, monthTotals: { income: 301, expense: 100 } }, "2026-11-14", "VND", 0), /Đối soát tổng thu/);
  assert.throws(() => dashboard.parseDashboardSummary({ ...raw, categories: [{ period: "today", flowType: "transfer", amount: 200 }] }, "2026-11-14", "VND", 0), /Loại dòng tiền/);
  assert.throws(() => dashboard.parseDashboardSummary({ ...raw, monthTotals: { income: 300, expense: 101 } }, "2026-11-14", "VND", 0), /Đối soát tổng chi/);
});

test("V4.5.0 report category/account tables use 4 adaptive columns and no forced minimum width", () => {
  const page = read("app/(dashboard)/reports/statements/page.tsx");
  const css = read("app/globals.css");
  assert.equal((page.match(/fin-statement-summary-table/g) ?? []).length, 2);
  assert.match(css, /\.fin-report-table\.fin-statement-summary-table \{ min-width: 0; width: 100%; table-layout: fixed;/);
  assert.match(css, /fin-statement-summary-scroll \{ max-height: 460px; overflow-y: auto; overflow-x: hidden/);
  assert.match(css, /overflow-wrap: anywhere/);
  assert.match(page, /<th>Loại<\/th><th>Danh mục<\/th><th>Giá trị<\/th><th>%<\/th>/);
  assert.match(page, /<th>Loại<\/th><th>Tài khoản<\/th><th>Giá trị<\/th><th>%<\/th>/);
});

test("V4.5.0 mobile transaction detail displays all fields as readable stacked rows", () => {
  const page = read("app/(dashboard)/reports/statements/page.tsx");
  assert.match(page, /hidden overflow-x-auto sm:block/);
  assert.match(page, /sm:hidden.*role="list" aria-label="Chi tiết giao dịch trên điện thoại"/);
  for (const value of ["tx.transaction_date", "tx.title", "tx.category?.name", '"Thu"', '"Chi"']) assert.ok(page.includes(value), value);
});

test("V4.5.0 quick categories show persisted icon and original mapped color in scrolling chips", () => {
  const code = read("components/transaction-category-select.tsx");
  const section = code.split('aria-label="Cuộn ngang danh mục thường dùng"')[1].split('<div className="mb-2 flex')[0];
  assert.match(section, /iconColorValue\(category.icon_color\)/);
  assert.match(section, /CategoryIcon name=\{category.icon_name\}/);
  assert.match(section, /style=\{\{ borderColor:/);
  assert.match(code, /overflow-x-auto/);
});

test("V4.5.0 dashboard hides and reveals just the available balance and preserves other metrics", () => {
  const source = read("components/balance-visibility.tsx");
  const page = read("app/(dashboard)/overview/page.tsx");
  assert.match(source, /Eye, EyeOff/);
  assert.match(source, /visible \? amount : "\*\*\*\*\*"/);
  assert.match(source, /aria-label=\{visible \? "Ẩn số dư khả dụng" : "Hiện số dư khả dụng"\}/);
  assert.match(page, /<BalanceVisibility amount=\{money\(snapshot.balance\)\}/);
  assert.match(page, /snapshot.monthTotals.income/);
});

test("V4.5.0 period cards toggle Thu/Chi without page reload and keep corresponding transaction filters", () => {
  const code = read("components/spending-period-card.tsx");
  const page = read("app/(dashboard)/overview/page.tsx");
  assert.match(code, /useState<DashboardFlow>\("expense"\)/);
  assert.match(code, /setFlow\("income"\)/);
  assert.match(code, /setFlow\("expense"\)/);
  assert.match(code, /aria-pressed=\{isIncome\}/);
  assert.match(code, /type: "expense", from, to/);
  assert.match(code, /type: "income", from, to/);
  assert.match(code, /flow === "expense" \? summary : incomeSummary/);
  assert.match(page, /incomeSummary=\{snapshot.incoming\[period\]\}/);
});

test("V4.5.0 uses identical icon source on header, runtime splash and PWA launch", () => {
  const src = "/icons/finzaro-v0012-192.png";
  for (const file of ["components/brand-logo.tsx", "components/app-splash.tsx", "app/pwa/route.ts", "app/manifest.ts"]) {
    assert.ok(read(file).includes(src), `${file} should use ${src}`);
  }
  assert.doesNotMatch(read("components/app-splash.tsx"), /<svg/);
  assert.doesNotMatch(read("app/pwa/route.ts"), /<svg/);
});

test("V4.5.0 SQL uses invoker RLS, authenticates and filters both standard flows, no data writes", () => {
  const sql = read("supabase/migrations/20261114120000_dashboard_income_expense_v450.sql");
  assert.match(sql, /create or replace function public\.dashboard_snapshot_v450\(/);
  assert.match(sql, /security invoker/);
  assert.match(sql, /auth\.uid\(\)/);
  assert.match(sql, /t\.user_id\s*=\s*v_user/);
  assert.match(sql, /t\.transaction_type in \('income','expense'\)/);
  assert.match(sql, /e\.entry_role=t\.transaction_type/);
  assert.match(sql, /coalesce\(t\.transaction_purpose,'standard'\)='standard'/);
  assert.match(sql, /'flowType',flow_type/);
  assert.match(sql, /grant execute on function public\.dashboard_snapshot_v450\(text,date\) to authenticated/);
  assert.doesNotMatch(sql, /\b(?:insert into|update|delete from)\s+public\.(transactions|transaction_entries|accounts)\b/i);
  assert.match(read("features/dashboard/snapshot.ts"), /rpc\("dashboard_snapshot_v450"/);
});
