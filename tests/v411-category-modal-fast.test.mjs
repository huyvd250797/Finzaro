import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
const root = resolve(import.meta.dirname, "..");
const read = (f) => readFileSync(join(root, f), "utf8");
const require = createRequire(import.meta.url);
const ts = (() => { try { return require("typescript"); } catch { return require(`${execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim()}/typescript`); } })();
function load(file, deps = {}) {
  const js = ts.transpileModule(read(file), { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const module = { exports: {} };
  new Function("require", "module", "exports", js.outputText)((path) => {
    if (!(path in deps)) throw new Error(`Unexpected dependency: ${path}`);
    return deps[path];
  }, module, module.exports);
  return module.exports;
}
const canonical = load("features/transactions/financial-flow.ts");
const experience = load("features/reports/experience.ts", { "@/features/transactions/financial-flow": canonical });
const drilldown = load("features/reports/category-drilldown.ts", { "@/features/reports/experience": experience });
const preview = load("features/reports/category-detail-preview.ts", { "@/features/reports/experience": experience });
const fast = load("features/reports/fast-category-entries.ts");
const tx = (id, type, date, amount, categoryId = "food", currency = "VND", purpose = "standard") => ({
  id, title: `Giao dịch ${id}`, transaction_type: type, transaction_purpose: purpose, category_id: categoryId,
  transaction_date: date, category_label: categoryId ?? "Chưa phân loại", category: { name: "Ăn uống", icon_name: "Utensils", icon_color: "#FF7700" },
  entries: [{ entry_role: type, currency_code: currency, amount_minor: type === "expense" ? -amount : amount }]
});

test("V4.1.1 category drilldown opens a full viewport portal with close button and category-colored bars", () => {
  assert.equal(JSON.parse(read("package.json")).version, "4.4.0");
  const component = read("components/instant-report-breakdown.tsx");
  const css = read("app/globals.css");
  assert.match(component, /createPortal\(/);
  assert.match(component, /role="dialog" aria-modal="true"/);
  assert.match(component, /aria-label="Đóng chi tiết danh mục"/);
  assert.match(component, /event\.key === "Escape"/);
  assert.match(component, /const barTone = iconColorValue\(color\)/);
  assert.match(component, /useOverlayScrollLock/);
  assert.match(css, /\.fin-report-drilldown-modal\s*\{[^}]*position:\s*fixed/s);
  assert.match(css, /height:\s*100dvh/);
});

test("instant previews contain only COMPLETE, correctly scoped day buckets", () => {
  const rows = [ tx("a", "expense", "2026-11-01", 10000), tx("b", "expense", "2026-11-01", 20000),
    tx("c", "expense", "2026-11-05", 30000), tx("d", "income", "2026-11-01", 50000, "salary"),
    tx("e", "expense", "2026-11-01", 10000, "food", "USD"), tx("f", "transfer", "2026-11-01", 80000),
    tx("g", "expense", "2026-11-01", 90000, "food", "VND", "loan_payment") ];
  const groups = drilldown.buildCategoryPeriodGroups(rows, "VND", "expense", "month", "2026-11", 2026);
  const full = preview.buildInstantCategoryDetails(rows, "VND", "expense", "month", groups, 10);
  assert.deepEqual(full["expense|food|2026-11-01"].transactions.map((t) => t.id).sort(), ["a", "b"]);
  assert.equal(full["expense|food|2026-11-01"].total, 30000);
  assert.equal(full["expense|food|2026-11-01"].count, 2);
  const limited = preview.buildInstantCategoryDetails(rows, "VND", "expense", "month", groups, 1);
  assert.equal(limited["expense|food|2026-11-01"], undefined, "never ship partial bucket detail");
  const yearly = drilldown.buildCategoryPeriodGroups(rows, "VND", "expense", "year", "2026-11", 2026);
  assert.equal(preview.buildInstantCategoryDetails(rows, "VND", "expense", "year", yearly)["expense|food|2026-11"].count, 3);
});

test("targeted details query filters by authenticated user, type, category and date before joining entries", async () => {
  const applied = [];
  const page = [{ id: "one", title: "Ăn trưa", transaction_date: "2026-11-13", transaction_type: "expense", transaction_purpose: "standard", category_label: "Ăn uống", categories: { name: "Ăn uống", icon_name: "Utensils", icon_color: "#CC4400" }, transaction_entries: [ { entry_role: "expense", currency_code: "VND", amount_minor: -35000 } ] },
    { id: "two", title: "Thanh toán khoản vay", transaction_date: "2026-11-13", transaction_type: "expense", transaction_purpose: "loan_payment", category_label: "Ăn uống", categories: null, transaction_entries: [ { entry_role: "expense", currency_code: "VND", amount_minor: -90000 } ] },
    { id: "three", title: "USD", transaction_date: "2026-11-13", transaction_type: "expense", transaction_purpose: "standard", category_label: "Ăn uống", categories: null, transaction_entries: [ { entry_role: "expense", currency_code: "USD", amount_minor: -200 } ] }];
  const query = { select(...args) { applied.push(["select", ...args]); return this; }, eq(...args) { applied.push(["eq", ...args]); return this; }, is(...args) { applied.push(["is", ...args]); return this; }, gte(...args) { applied.push(["gte", ...args]); return this; }, lte(...args) { applied.push(["lte", ...args]); return this; }, order(...args) { applied.push(["order", ...args]); return this; }, range(...args) { applied.push(["range", ...args]); return this; }, then(resolve, reject) { return Promise.resolve({ data: page, error: null }).then(resolve, reject); } };
  const supabase = { from(table) { assert.equal(table, "transactions"); return query; } };
  const payload = await fast.loadFastCategoryEntries(supabase, "private-user", { type: "expense", category: "food", currency: "VND", from: "2026-11-13", to: "2026-11-13" });
  assert.equal(payload.count, 1); assert.equal(payload.total, 35000); assert.equal(payload.transactions[0].iconColor, "#CC4400");
  for (const required of [ ["eq", "user_id", "private-user"], ["eq", "transaction_type", "expense"], ["eq", "category_id", "food"], ["gte", "transaction_date", "2026-11-13"], ["lte", "transaction_date", "2026-11-13"] ]) {
    assert.ok(applied.some((part) => required.every((value, index) => part[index] === value)), `missing filter ${required}`);
  }
});

test("API first uses focused loader but preserves legacy fallback and no-store privacy", () => {
  const api = read("app/api/reports/category-entries/route.ts");
  assert.match(api, /await loadFastCategoryEntries/);
  assert.match(api, /await loadReportLedger\(/);
  assert.match(api, /await requireUser\(\)/);
  assert.match(api, /Cache-Control": "private, no-store"/);
  assert.match(read("features/reports/period-snapshot.ts"), /prefetchedDetails/);
  assert.match(read("components/fast-report-overview.tsx"), /prefetchedDetails=\{visible.prefetchedDetails\}/);
});
