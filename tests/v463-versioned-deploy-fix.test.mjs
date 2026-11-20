import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (file) => readFileSync(join(root, file), "utf8");

test("V4.6.3 version is consistent in runtime, package, docs and release metadata", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.version, "4.6.3");
  assert.match(read("lib/app-version.ts"), /APP_VERSION = "4\.6\.3"/);
  assert.match(read("lib/app-version.ts"), /Market Price Reliability Deploy Fix/);
  assert.match(read("README.md"), /Current release: Finzaro V4\.6\.3/);
  assert.match(read("CHANGELOG.md"), /^## V4\.6\.3/);
  assert.match(read("DEPLOY_V4.6.3.md"), /không có migration V4\.6\.3/i);
});

test("V4.6.3 retains 7 modules, historical V4.6.2 SQL and no background market sync", () => {
  const routes = readdirSync(join(root, "app/(dashboard)"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  assert.deepEqual(routes, ["accounts", "categories", "overview", "portfolio", "reports", "settings", "transactions"]);
  const migrations = readdirSync(join(root, "supabase/migrations")).filter((file) => file.endsWith(".sql"));
  assert.equal(migrations.length, 33);
  assert.ok(migrations.includes("20261120163000_market_price_reliability_v462.sql"));
  assert.equal(existsSync(join(root, "app/api/portfolio/market-sync/route.ts")), false);
  assert.equal(existsSync(join(root, "features/portfolio/market-sync.ts")), false);
  assert.match(read("tests/v462-market-price-reliability.test.mjs"), /require\('typescript'\)/);
});
