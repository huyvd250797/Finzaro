import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (file) => readFileSync(join(root, file), "utf8");

test("V4.6.9 version is consistent in runtime, package, docs and release metadata", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.version, "4.6.11");
  assert.match(read("lib/app-version.ts"), /APP_VERSION = "4\.6\.11"/);
  assert.match(read("lib/app-version.ts"), /Portfolio UX & Snapshot Fix|Portfolio Mobile Layout & Save Feedback|Family Savings Fund Management|Personal Lending & Borrowing Management|Dedicated Debts & Family Funds UX|Accounts Redeclaration Deploy Hotfix|Family Opening Balance & Dashboard Privacy/);
  assert.match(read("README.md"), /Current release: Finzaro V4\.6\.11/);
  assert.match(read("CHANGELOG.md"), /^## V4\.6\.11/m);
  assert.match(read("DEPLOY_V4.6.4.md"), /Migration bắt buộc/i);
});

test("V4.6.9 retains 7 modules, historical no-background-sync stance, and adds one SQL migration", () => {
  const routes = readdirSync(join(root, "app/(dashboard)"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  assert.deepEqual(routes, ["accounts", "categories", "debts", "funds", "overview", "portfolio", "reports", "settings", "transactions"]);
  const migrations = readdirSync(join(root, "supabase/migrations")).filter((file) => file.endsWith(".sql"));
  assert.equal(migrations.length, 37);
  assert.ok(migrations.includes("20261120163000_market_price_reliability_v462.sql"));
  assert.ok(migrations.includes("20261120190000_portfolio_ux_snapshot_delete_v464.sql"));
  assert.equal(existsSync(join(root, "app/api/portfolio/market-sync/route.ts")), false);
  assert.equal(existsSync(join(root, "features/portfolio/market-sync.ts")), false);
  assert.match(read("tests/v462-market-price-reliability.test.mjs"), /require\('typescript'\)/);
});
