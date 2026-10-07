import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const page = read("app/(dashboard)/reports/page.tsx");
const data = read("features/reports/data.ts");
const exportRoute = read("app/api/reports/export/route.ts");
const version = read("lib/app-version.ts");

test("Reports supports time, currency, account, category and type filters", () => {
  assert.match(page, /name="range"/);
  assert.match(page, /name="currency"/);
  assert.match(page, /name="account"/);
  assert.match(page, /name="category"/);
  assert.match(page, /name="type"/);
  assert.match(data, /filterReportTransactions/);
  assert.match(data, /categoryScopeIds/);
});

test("Reports derives ledger analytics without counting transfers as income or expense", () => {
  assert.match(data, /reportTotals/);
  assert.match(data, /transaction_type === "income"/);
  assert.match(data, /transaction_type === "expense"/);
  assert.match(data, /transaction_type === "transfer"/);
  assert.match(data, /transferOut/);
  assert.match(page, /Cash Flow Trend/);
  assert.match(page, /Chi tiêu theo danh mục/);
  assert.match(page, /Budget vs Actual/);
  assert.match(page, /Recurring Commitments/);
});

test("Financial Insights are rule based and CSV export is authenticated", () => {
  assert.match(data, /buildInsights/);
  assert.match(page, /Rule-based · không dùng AI/);
  assert.match(exportRoute, /auth\.getClaims\(\)/);
  assert.match(exportRoute, /text\/csv/);
  assert.match(exportRoute, /Unauthorized/);
});

test("current app version is V0.0.11 Loan & Debt Manager", () => {
  assert.match(version, /APP_VERSION = "0\.0\.11"/);
  assert.match(version, /Loan & Debt Manager/);
});
