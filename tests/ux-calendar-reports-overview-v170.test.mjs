import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => readFileSync(join(root, name), "utf8");
const require = createRequire(import.meta.url);
let ts;
try { ts = require("typescript"); } catch { ts = require(join(dirname(process.execPath), "../lib/node_modules/typescript")); }
const calendar = read("components/report-calendar-interactive.tsx");
const calendarPage = read("app/(dashboard)/reports/calendar/page.tsx");
const reports = read("app/(dashboard)/reports/page.tsx");
const donut = read("components/report-donut.tsx");
const overview = read("app/(dashboard)/overview/page.tsx");

function compilePure(source, name) {
  const result = ts.transpileModule(source, { fileName: name, reportDiagnostics: true, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
  assert.deepEqual((result.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error).map((d) => d.code), []);
  const module = { exports: {} };
  new Function("module", "exports", result.outputText)(module, module.exports);
  return module.exports;
}

test("V1.7.0 is consistent across app, packaging and deploy documentation", () => {
  assert.equal(JSON.parse(read("package.json")).version, "1.7.0");
  assert.match(read("lib/app-version.ts"), /APP_VERSION = "1\.7\.0"/);
  assert.match(read("README.md"), /V1\.7\.0/);
  assert.match(read("CHANGELOG.md"), /V1\.7\.0.*Calendar/);
  assert.match(read("DEPLOY_V1.7.0.md"), /No V1\.7\.0 SQL migration/);
});

test("calendar renders compact money from minor units and hides zero", () => {
  const { compactCalendarAmount } = compilePure(read("features/reports/compact-money.ts"), "compact-money.ts");
  assert.equal(compactCalendarAmount(0), "");
  assert.equal(compactCalendarAmount(-2000), "");
  assert.equal(compactCalendarAmount(Number.NaN), "");
  assert.equal(compactCalendarAmount(9000), "9.000");
  assert.equal(compactCalendarAmount(850000), "850k");
  assert.equal(compactCalendarAmount(1250000), "1,25tr");
  assert.equal(compactCalendarAmount(125000000), "125tr");
  assert.equal(compactCalendarAmount(123456, 2), "1.235");
});

test("calendar uses responsive seven-column two-line cells and no redundant week", () => {
  assert.match(calendarPage, /cellCount = Math\.ceil\(\(leading \+ bounds\.days\) \/ 7\) \* 7/);
  assert.match(calendar, /grid grid-cols-7/);
  assert.match(calendar, /min-h-\[108px\]/);
  assert.match(calendar, /compactCalendarAmount\(cell\.income!/);
  assert.match(calendar, /compactCalendarAmount\(cell\.expense!/);
  assert.match(calendar, /\(cell\.income \?\? 0\) > 0/);
  assert.match(calendar, /\(cell\.expense \?\? 0\) > 0/);
  assert.doesNotMatch(calendar, /calendarIntegerMoney/);
});

test("date selection is local; quick-create, swipe, back-navigation and safe overlays remain", () => {
  assert.match(calendar, /window\.history\.replaceState/);
  assert.match(calendar, /now - previous\.at <= 360/);
  assert.match(calendar, /useOverlayScrollLock\(Boolean\(quickDay\)\)/);
  assert.match(calendar, /name="return_to"/);
  assert.match(calendar, /deleteTransactionAction/);
  assert.match(calendar, /editHref\(transaction\.id/);
  assert.match(calendar, /new: type, date, return_to/);
  assert.match(calendar, /snap-x snap-mandatory/);
});

test("Reports pie keeps actual configured category colors and interactive selection", () => {
  assert.match(reports, /color: iconColorValue\(item\.icon_color\)/);
  assert.match(reports, /ReportDonut slices=\{chartSlices\}/);
  assert.match(donut, /conic-gradient/);
  assert.match(donut, /slice\.color/);
  assert.match(donut, /slice\.href/);
  assert.match(donut, /setSelectedIndex\(index\)/);
  assert.match(donut, /aria-pressed=\{currentIndex === index\}/);
  assert.doesNotMatch(donut, /reportSliceColor/);
  assert.doesNotMatch(donut, /mask|clipPath/);
});

test("Overview combines account balance and three KPIs while preserving ledger logic", () => {
  assert.match(overview, /monthTotals\(ledger\.transactions/);
  assert.match(overview, /current_balance_minor/);
  assert.match(overview, /grid grid-cols-3/);
  assert.match(overview, /compactCalendarAmount/);
  assert.match(overview, /iconColorValue\(item\.icon_color\)/);
  assert.match(overview, /transaction_purpose === "standard"/);
  assert.doesNotMatch(overview, /loadLoan|loadCreditCard|loadDeposit|loadDebtStrategy/);
});

test("mobile plus is fully inside fixed safe-area-aware taskbar", () => {
  const nav = read("components/mobile-nav.tsx");
  assert.match(nav, /fin-mobile-taskbar fixed inset-x-0 bottom-0/);
  assert.match(nav, /safe-area-inset-bottom/);
  assert.match(nav, /grid size-10 place-items-center rounded-xl/);
  assert.doesNotMatch(nav, /absolute -top-6/);
});

test("only six dashboard modules are buildable; old URLs are redirected", () => {
  const basic = ["overview", "transactions", "accounts", "categories", "reports", "settings"];
  const old = ["assets", "budgets", "cash-flow", "credit-cards", "debt-strategy", "deposits", "forecast", "goal-planner", "goals", "health", "loans", "net-worth", "recurring"];
  for (const item of basic) assert.ok(existsSync(join(root, `app/(dashboard)/${item}`)), item);
  const config = read("next.config.ts");
  for (const item of old) {
    assert.ok(!existsSync(join(root, `app/(dashboard)/${item}`)), item);
    assert.ok(config.includes(`"${item}"`), item);
  }
  const actions = read("features/transactions/actions.ts");
  for (const rpc of ["create_simple_transaction_v120", "update_simple_transaction_v120", "delete_simple_transaction_v120"]) assert.ok(actions.includes(rpc));
});

test("route server component does not invoke helper exported by client ReportDonut", () => {
  assert.match(donut, /^"use client";/);
  assert.match(reports, /import \{ ReportDonut \} from "@\/components\/report-donut"/);
  assert.doesNotMatch(reports, /import \{[^}]+reportSliceColor[^}]+\} from "@\/components\/report-donut"/);
});

test("patched framework versions remain aligned for Vercel", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.dependencies.next, "16.4.6");
  assert.equal(pkg.devDependencies["eslint-config-next"], "16.4.6");
  assert.equal(pkg.dependencies.react, "19.3.1");
  assert.equal(pkg.dependencies["react-dom"], "19.3.1");
  assert.doesNotMatch(read("next.config.ts"), /ignoreBuildErrors|ignoreDuringBuilds/);
});
