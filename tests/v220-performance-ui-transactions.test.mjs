import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (file) => readFileSync(join(root, file), "utf8");

test("V2.2.0 includes three combined milestones as one production release", () => {
  assert.equal(JSON.parse(read("package.json")).version, "2.2.0");
  assert.match(read("lib/app-version.ts"), /APP_VERSION = "2\.2\.0"/);
  assert.match(read("lib/app-version.ts"), /Premium Fintech & Fluid Transaction UX/);
  const modules = readdirSync(join(root, "app/(dashboard)"), { withFileTypes: true })
    .filter((dir) => dir.isDirectory()).map((dir) => dir.name).sort();
  assert.deepEqual(modules, ["accounts", "categories", "overview", "reports", "settings", "transactions"]);
});

test("V2.0.4 removes fixed splash startup delay", () => {
  const splash = read("components/app-splash.tsx");
  assert.match(splash, /requestAnimationFrame/);
  assert.match(splash, /setVisible\(false\)/);
  assert.doesNotMatch(splash, /setTimeout\(\(\) => setVisible\(false\), 650\)/);
});

test("V2.0.4 aggregates months in a single pass and bounds history queries", () => {
  const ledger = read("features/transactions/data.ts");
  const overview = read("app/(dashboard)/overview/page.tsx");
  assert.match(ledger, /monthlyCashflowTotals\(/);
  assert.match(ledger, /const totals = new Map\(months\.map/);
  assert.match(ledger, /transaction_purpose !== "standard"/);
  assert.match(ledger, /entry\.currency_code !== currency/);
  assert.match(overview, /monthlyCashflowTotals\(ledger\.transactions/);
  assert.match(ledger, /query = query\.eq\("transaction_type", options\.type!\)/);
  assert.match(ledger, /query = query\.eq\("category_id", options\.categoryId\)/);
  assert.match(ledger, /\^\[0-9a-f\]\{8\}/);
});

test("V2.0.4 performance logging remains explicit opt-in and private", () => {
  const vitals = read("components/performance-vitals.tsx");
  assert.match(vitals, /NEXT_PUBLIC_FINZARO_PERF_DEBUG/);
  assert.match(vitals, /largest-contentful-paint/);
  assert.match(vitals, /layout-shift/);
  assert.match(vitals, /eventDurationMax/);
  assert.doesNotMatch(vitals, /fetch\(|sendBeacon|localStorage\.setItem/);
  assert.match(read("app/layout.tsx"), /<PerformanceVitals \/>/);
});

test("V2.1.0 declares semantic light/dark UI tokens and consistent page surfaces", () => {
  const css = read("app/globals.css");
  for (const token of ["--fin-surface", "--fin-canvas", "--fin-income", "--fin-expense", "--fin-transfer", "--fin-text-primary", "--fin-edge"]) assert.ok(css.includes(token), token);
  assert.match(css, /\.dark\s*\{[\s\S]*--fin-income:/);
  assert.match(css, /\.fin-page-shell/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  for (const module of ["overview", "accounts", "categories", "transactions", "reports", "settings"]) {
    assert.match(read(`app/(dashboard)/${module}/page.tsx`), /fin-page-shell/, `${module} page shell`);
  }
});

test("V2.2.0 preserves form drafts across income/expense/transfer tab changes", () => {
  const launcher = read("components/instant-transaction-launcher.tsx");
  assert.match(launcher, /\[visited, setVisited\]/);
  assert.match(launcher, /visited\.map\(\(kind\) =>/);
  assert.match(launcher, /hidden=\{type !== kind\}/);
  assert.match(launcher, /role="tablist"/);
  assert.match(launcher, /aria-selected=\{type === kind\}/);
  assert.match(launcher, /onTabKeyDown/);
  assert.doesNotMatch(launcher, /key=\{type\}/);
});

test("V2.2.0 restores natural touch scrolling while keeping horizontal day actions", () => {
  assert.match(read("app/globals.css"), /body \{ touch-action: auto; \}/);
  assert.match(read("components/report-calendar-interactive.tsx"), /overflow-x-auto overscroll-x-contain overscroll-y-auto touch-auto snap-x/);
  assert.match(read("components/transaction-category-select.tsx"), /onCategoryKeyDown/);
  assert.match(read("components/bottom-sheet.tsx"), /touch-pan-y/);
});

test("V2.2.0 improves navigation without a permanent progress indicator", () => {
  const progress = read("components/navigation-progress.tsx");
  assert.match(progress, /next\.pathname === window\.location\.pathname && next\.search === window\.location\.search/);
  assert.match(progress, /setTimeout\(\(\) => setActive\(false\), 12000\)/);
  assert.match(read("components/mobile-nav.tsx"), /aria-current=\{active \? "page" : undefined\}/);
  assert.match(read("components/app-sidebar.tsx"), /aria-current=\{active \? "page" : undefined\}/);
  assert.match(read("components/app-header.tsx"), /transactions\?search=1/);
});

test("V2.2.0 keeps accounting RPC contracts unchanged", () => {
  const actions = read("features/transactions/actions.ts");
  for (const rpc of ["create_simple_transaction_v120", "update_simple_transaction_v120", "delete_simple_transaction_v120"]) assert.match(actions, new RegExp(rpc));
  assert.match(actions, /if \(transactionType === "transfer" && fromAccountId === toAccountId\)/);
  assert.match(actions, /transactionType !== "transfer" && !categoryId/);
  assert.match(read("features/transactions/data.ts"), /transaction_purpose === "standard"/);
});
