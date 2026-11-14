import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(join(root, path), "utf8");
const require = createRequire(import.meta.url);
let ts;
try { ts = require("typescript"); }
catch { ts = require(join(execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim(), "typescript")); }

function quickEntryModule() {
  const output = ts.transpileModule(read("features/transactions/quick-entry.ts"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const mod = { exports: {} };
  new Function("module", "exports", "require", output)(mod, mod.exports, (name) => { throw new Error(`Unexpected dependency ${name}`); });
  return mod.exports;
}

const form = read("components/transaction-entry-form.tsx");
const select = read("components/transaction-category-select.tsx");
const css = read("app/globals.css");

test("V4.4.0 metadata is synchronized and full deploy gate remains intact", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.version, "4.4.0");
  assert.match(read("lib/app-version.ts"), /APP_VERSION = "4\.4\.0"/);
  assert.match(read("lib/app-version.ts"), /Reporting Trust & UX/);
  assert.equal(pkg.scripts.check, "npm run lint && npm run typecheck && npm run test && npm run build");
  assert.equal(JSON.parse(read("vercel.json")).buildCommand, "npm run check");
  assert.deepEqual(readdirSync(join(root, "app/(dashboard)"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort(),
    ["accounts", "categories", "overview", "reports", "settings", "transactions"]);
});

test("V4.4.0 removes template UI, template mutation code and legacy template persistence", () => {
  for (const code of [form, read("features/transactions/quick-entry.ts")]) {
    assert.doesNotMatch(code, /Mẫu giao dịch|data-fin-transaction-templates|saveTemplate|applyTemplate|QuickEntryTemplate|upsertQuickEntryTemplate|removeQuickEntryTemplate/);
  }
  const quick = quickEntryModule();
  assert.deepEqual(Object.keys(quick.emptyQuickEntryState()), ["preference"]);
  const old = quick.parseQuickEntryState({
    preference: { category_id: "food", recent_category_ids: ["food"] },
    templates: [{ id: "old", name: "Legacy template", type: "expense", draft: {} }]
  }, "expense");
  assert.deepEqual(old.preference.recent_category_ids, ["food"]);
  assert.equal(old.preference.category_id, "food");
  assert.ok(!("templates" in old));
});

test("V4.4.0 title field is directly below amount, above category and accounts", () => {
  const start = form.indexOf('<form id={formId}');
  assert.ok(start > 0);
  const amount = form.indexOf('className="fin-amount-field', start);
  const title = form.indexOf('name="title"', amount);
  const category = form.indexOf('<TransactionCategorySelect', title);
  const account = form.indexOf('name="from_account_id"', category);
  assert.ok(amount < title && title < category && category < account);
  assert.equal(form.match(/name="title"/g)?.length, 1);
});

test("V4.4.0 frequent categories use a single horizontal swipe row like recent suggestions", () => {
  assert.match(select, /fin-category-favorites flex min-w-0 snap-x snap-mandatory items-center gap-2 overflow-x-auto/);
  assert.match(select, /Cuộn ngang danh mục thường dùng/);
  assert.match(select, /shrink-0 snap-start whitespace-nowrap rounded-lg/);
  assert.match(css, /\.fin-category-favorites\s*\{[^}]*flex-wrap: nowrap/);
  assert.match(css, /touch-action: pan-x/);
  assert.match(form, /flex snap-x gap-2 overflow-x-auto/);
});

test("V4.4.0 mobile picker shows four complete rows with overflow to remaining categories", () => {
  assert.match(css, /\.fin-category-scroll\s*\{[^}]*max-height: 336px/s);
  assert.match(css, /\.fin-transaction-sheet \.fin-category-scroll\s*\{[^}]*max-height: 336px/s);
  assert.doesNotMatch(css, /max-height: min\(336px, 32dvh\)/);
  assert.match(select, /grid grid-cols-3 auto-rows-\[78px\] gap-2/);
  assert.match(css, /\.fin-category-scroll\s*\{[^}]*overflow-y: auto/s);
});

test("V4.4.0 search icon and text have independent space under fin-input CSS", () => {
  assert.match(select, /fin-category-search-wrap relative mb-2/);
  assert.match(select, /fin-category-search-input min-h-11 w-full/);
  assert.match(select, /pointer-events-none absolute left-3\.5 top-1\/2 z-10/);
  assert.match(css, /\.fin-category-search-wrap input\.fin-input\[type="search"\]/);
  assert.match(css, /padding-inline-start: 2\.75rem !important/);
  assert.match(css, /padding-inline-end: 2\.25rem !important/);
});

test("V4.4.0 smart preferences only write after a confirmed server transaction", () => {
  assert.match(form, /if \(!state\.saved\)/);
  assert.match(form, /rememberSavedChoice\(stored, submitted\)/);
  assert.match(form, /submittingRef\.current/);
  assert.match(form, /submittedDraft\.current = cleanQuickEntryDraft\(currentDraft\(\)\)/);
  assert.match(read("features/transactions/actions.ts"), /await commitSimpleTransaction\(formData\)/);
});

test("V4.4.0 Report Overview remains reconciled before displaying each fetched period", () => {
  const page = read("components/fast-report-overview.tsx");
  const service = read("features/reports/load-period-snapshot.ts");
  assert.match(service, /if \(!reconcilePeriodSnapshot\(snapshot\)\) throw/);
  assert.match(page, /reconcilePeriodSnapshot\(snapshot as FastPeriodSnapshot\)/);
  assert.match(page, /data-fin-report-verified/);
  assert.match(page, /periodId\(visible\) === periodId\(requested\)/);
});

test("V4.4.0 statement, export and print use one financial reconciliation policy", () => {
  const statements = read("app/(dashboard)/reports/statements/page.tsx");
  const print = read("app/(dashboard)/reports/print/page.tsx");
  const exportRoute = read("app/api/reports/export/route.ts");
  for (const code of [statements, print, exportRoute]) assert.match(code, /statementBalancesMatch\(/);
  assert.match(statements, /!invalid && <>/);
  assert.match(statements, /data-fin-statement-verified/);
  assert.match(print, /if \(r\.ledger\.diagnostics\.strategy === "empty" \|\| !statementBalancesMatch\(r\.statement\)\)/);
  assert.match(exportRoute, /status: 409/);
});

test("V4.4.0 contains no new database migrations and retains Supabase RPC transactions", () => {
  assert.equal(readdirSync(join(root, "supabase/migrations")).filter((name) => name.endsWith(".sql")).length, 26);
  const code = read("features/transactions/actions.ts");
  assert.match(code, /create_simple_transaction_v120/);
  assert.match(code, /update_simple_transaction_v120/);
  assert.match(code, /delete_simple_transaction_v120/);
});
