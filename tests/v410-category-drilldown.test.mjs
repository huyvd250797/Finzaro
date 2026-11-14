import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const read = (file) => readFileSync(join(root, file), "utf8");
const require = createRequire(import.meta.url);
const ts = (() => {
  try { return require("typescript"); }
  catch { return require(`${execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim()}/typescript`); }
})();
function evaluateTypeScript(file, deps) {
  const result = ts.transpileModule(read(file), { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const module = { exports: {} };
  new Function("require", "module", "exports", result.outputText)((path) => {
    if (!(path in deps)) throw new Error(`Unexpected module ${path}`);
    return deps[path];
  }, module, module.exports);
  return module.exports;
}
const canonical = evaluateTypeScript("features/transactions/financial-flow.ts", {});
const experience = evaluateTypeScript("features/reports/experience.ts", {
  "@/features/transactions/financial-flow": canonical
});
const drilldown = evaluateTypeScript("features/reports/category-drilldown.ts", { "@/features/reports/experience": experience });
const tx = (id, type, date, amount, category = "food", currency = "VND", purpose = "standard") => ({
  id, transaction_type: type, transaction_date: date, transaction_purpose: purpose, category_id: category,
  title: `TX${id}`, category_label: category === "food" ? "Ăn uống" : "Khác", category: null,
  entries: [{ entry_role: type, currency_code: currency, amount_minor: amount }]
});

test("V4.1.0 release and Today expenses are collapsed by default", () => {
  assert.equal(JSON.parse(read("package.json")).version, "4.2.1");
  assert.match(read("lib/app-version.ts"), /APP_VERSION = "4\.2\.1"/);
  const card = read("components/spending-period-card.tsx");
  assert.match(card, /<details className="fin-today-expense-details/);
  assert.match(card, /<summary/);
  assert.doesNotMatch(card, /<details[^>]*\sopen(?:\s|=|>)/);
});

test("calendar month chart covers February leap year and the actual day count, including zero-spend days", () => {
  const leap = drilldown.reportBucketTemplates("month", "2028-02", 2028);
  const normal = drilldown.reportBucketTemplates("month", "2027-02", 2027);
  assert.equal(leap.length, 29); assert.equal(normal.length, 28);
  assert.equal(leap[0].key, "2028-02-01"); assert.equal(leap[28].key, "2028-02-29");
  assert.equal(drilldown.reportBucketTemplates("month", "2026-04", 2026).length, 30);
  assert.equal(drilldown.reportBucketTemplates("month", "2026-11", 2026).length, 30);
  assert.equal(drilldown.reportBucketTemplates("month", "2026-12", 2026).length, 31);
});

test("annual chart contains exactly 12 months and correct keys", () => {
  const series = drilldown.reportBucketTemplates("year", "2026-11", 2026);
  assert.equal(series.length, 12);
  assert.equal(series[0].key, "2026-01");
  assert.equal(series[11].key, "2026-12");
});

test("group summaries filter income/expense, currency, nonstandard and transfer, and agree with period totals", () => {
  const rows = [
    tx("1", "expense", "2026-11-02", -12000),
    tx("2", "expense", "2026-11-02", -23000),
    tx("3", "expense", "2026-11-12", -3500, "shopping"),
    tx("4", "expense", "2026-11-12", -9000, null),
    tx("5", "expense", "2026-11-12", -900, "food", "USD"),
    tx("6", "income", "2026-11-02", 50000, "salary"),
    tx("7", "transfer", "2026-11-02", 50000),
    tx("8", "expense", "2026-11-02", -100000, "food", "VND", "opening_balance")
  ];
  const categoryGroups = drilldown.buildCategoryPeriodGroups(rows, "VND", "expense", "month", "2026-11", 2026);
  assert.equal(categoryGroups.reduce((sum, item) => sum + item.amount, 0), experience.periodFlowTotals(rows, "VND").expense);
  assert.equal(categoryGroups.find((item) => item.id === "food").amount, 35000);
  assert.equal(categoryGroups.find((item) => item.id === "food").count, 2);
  assert.equal(categoryGroups.find((item) => item.id === "food").buckets[1].amount, 35000);
  assert.equal(categoryGroups.find((item) => item.id === "food").buckets[0].count, 0);
  assert.equal(categoryGroups.find((item) => item.id === "uncategorized-expense").amount, 9000);
  assert.equal(drilldown.buildCategoryPeriodGroups(rows, "VND", "income", "month", "2026-11", 2026)[0].amount, 50000);
  const yearGroups = drilldown.buildCategoryPeriodGroups(rows, "VND", "expense", "year", "2026-11", 2026);
  assert.equal(yearGroups[0].buckets[10].key, "2026-11");
  assert.equal(yearGroups[0].buckets[10].amount, 35000);
  assert.equal(yearGroups[0].buckets[9].amount, 0);
});

test("report summary precomputes both flow tabs, and only selected bar triggers authenticated API detail fetch", () => {
  const reports = read("app/(dashboard)/reports/page.tsx");
  const component = read("components/instant-report-breakdown.tsx");
  const api = read("app/api/reports/category-entries/route.ts");
  assert.match(reports, /loadPeriodSnapshot/);
  assert.match(read("features/reports/period-snapshot.ts"), /income: makeFlow\("income"\)/);
  assert.match(read("features/reports/period-snapshot.ts"), /expense: makeFlow\("expense"\)/);
  assert.match(component, /history\.pushState/);
  assert.match(component, /fetch\(`\/api\/reports\/category-entries/);
  assert.match(component, /aria-pressed=\{isSelected\}/);
  assert.match(component, /role="group" aria-label="Chọn cột để tải giao dịch"/);
  assert.match(component, /detailsCache\.current/);
  assert.match(component, /AbortController/);
  assert.match(api, /await requireUser\(\)/);
  assert.match(api, /Cache-Control": "private, no-store"/);
  assert.match(api, /transaction\.category_id/);
  assert.match(api, /flowAmount\(transaction, currency/);
  assert.match(api, /fromDate, toDate/);
});
