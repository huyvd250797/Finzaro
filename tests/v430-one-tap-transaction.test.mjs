import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const source = (path) => readFileSync(join(root, path), "utf8");
const require = createRequire(import.meta.url);
let ts;
try { ts = require("typescript"); }
catch { ts = require(join(execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim(), "typescript")); }
const libCode = ts.transpileModule(source("features/transactions/quick-entry.ts"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const mod = { exports: {} };
new Function("module", "exports", "require", libCode)(mod, mod.exports, (name) => { throw new Error(`Unexpected runtime dependency: ${name}`); });
const quick = mod.exports;
const userA = "11111111-1111-4111-8111-111111111111";
const userB = "22222222-2222-4222-8222-222222222222";
const draft = (title = "Ăn trưa") => ({ title, from_account_id: "account-a", to_account_id: "", category_id: "food", from_amount: "45000", to_amount: "", notes: "Bữa trưa" });

test("V4.5.0 release retains six modules, one read-only dashboard RPC migration, and strict quality gate", () => {
  const pkg = JSON.parse(source("package.json"));
  assert.equal(pkg.version, "4.5.0");
  assert.match(source("lib/app-version.ts"), /APP_VERSION = "4\.5\.0"/);
  assert.match(source("lib/app-version.ts"), /One-Tap Transaction UX|Reporting Trust & UX|Mobile Finance UX & Reporting Layout/);
  assert.equal(pkg.scripts.check, "npm run lint && npm run typecheck && npm run test && npm run build");
  assert.equal(JSON.parse(source("vercel.json")).buildCommand, "npm run check");
  assert.deepEqual(readdirSync(join(root, "app/(dashboard)"), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort(), ["accounts", "categories", "overview", "reports", "settings", "transactions"]);
  assert.equal(readdirSync(join(root, "supabase/migrations")).filter((name) => name.endsWith(".sql")).length,
    27);
});

test("V4.5.0 storage keys isolate templates/preferences by account and transaction type", () => {
  assert.notEqual(quick.quickEntryStorageKey(userA, "expense"), quick.quickEntryStorageKey(userB, "expense"));
  assert.notEqual(quick.quickEntryStorageKey(userA, "expense"), quick.quickEntryStorageKey(userA, "income"));
  assert.equal(quick.quickEntryStorageKey("invalid", "expense"), "");
  assert.equal(quick.quickEntryStorageKey(userA, "unknown"), "");
});

test("V4.5.0 old template payloads are ignored without losing preferences", () => {
  const payload = { preference: { from_account_id: "a", recent_category_ids: ["food", "food", 1, null, "travel"] }, templates: [
    { id: "valid", name: "Ăn sáng", type: "expense", draft: draft() },
    { id: "other", name: "Khác", type: "income", draft: draft() },
    { id: "invalid", name: "Hỏng", type: "expense", draft: null },
    { id: "unknown", name: "", type: "expense", draft: draft() },
  ] };
  const clean = quick.parseQuickEntryState(payload, "expense");
  assert.deepEqual(clean.preference.recent_category_ids, ["food", "travel"]);
  assert.equal("templates" in clean, false);
  assert.deepEqual(quick.parseQuickEntryState(null, "expense"), quick.emptyQuickEntryState());
});

test("V4.5.0 templates API is retired and financial RPC remains the only save path", () => {
  assert.equal("upsertQuickEntryTemplate" in quick, false);
  assert.equal("removeQuickEntryTemplate" in quick, false);
  assert.ok(!("templates" in quick.emptyQuickEntryState()));
  assert.doesNotMatch(source("components/transaction-entry-form.tsx"), /data-fin-transaction-templates|Lưu mẫu|applyTemplate\(/);
});

test("V4.5.0 user preferences remember only account/category choices after confirmed save", () => {
  const next = quick.rememberSavedChoice(quick.emptyQuickEntryState(), draft());
  assert.equal(next.preference.from_account_id, "account-a");
  assert.equal(next.preference.category_id, "food");
  assert.deepEqual(next.preference.recent_category_ids, ["food"]);
  assert.ok(!("from_amount" in next.preference));
  assert.ok(!("notes" in next.preference));
  const again = quick.rememberSavedChoice(next, { ...draft("Bữa tối"), category_id: "travel" });
  const repeated = quick.rememberSavedChoice(again, draft());
  assert.deepEqual(repeated.preference.recent_category_ids, ["food", "travel"]);
});

test("V4.5.0 Quick Add opens directly from taskbar and still switches all three types", () => {
  const nav = source("components/mobile-nav.tsx");
  const launcher = source("components/instant-transaction-launcher.tsx");
  assert.match(nav, /href=\{`\/transactions\?new=\$\{quickType\}`\}/);
  assert.match(nav, /finzaro:quick-type/);
  assert.match(launcher, /type: "expense"/);
  assert.match(launcher, /type: "income"/);
  assert.match(launcher, /type: "transfer"/);
  assert.match(launcher, /setVisited/);
  assert.match(launcher, /measureClientPaint/);
});

test("V4.5.0 form stays mounted on errors, remembers preferences only after server-confirmed save", () => {
  const actions = source("features/transactions/actions.ts");
  const form = source("components/transaction-entry-form.tsx");
  assert.match(actions, /return \{ error: "", saved: true \}/);
  assert.match(actions, /await commitSimpleTransaction\(formData\)/);
  assert.match(actions, /invalidateSimpleLedger\(\)/);
  assert.match(form, /if \(!state\.saved\)/);
  assert.match(form, /rememberSavedChoice\(/);
  assert.match(form, /submittingRef\.current/);
  assert.match(form, /event\.preventDefault\(\)/);
  assert.match(form, /router\.refresh\(\)/);
  assert.doesNotMatch(form, /data-fin-transaction-templates/);
  assert.match(form, /Lưu giao dịch/);
});

test("V4.5.0 category search and recent/frequent shortcuts preserve drag-order outside search", () => {
  const selector = source("components/transaction-category-select.tsx");
  assert.match(selector, /normalize\("NFD"\)/);
  assert.match(selector, /type="search"/);
  assert.match(selector, /priorityIds/);
  assert.match(selector, /priorityCategories/);
  assert.match(selector, /if \(!search\) beginPress/);
  assert.match(selector, /reorderCategoriesAction\(/);
});

test("V4.5.0 duplicate requires a new save and editing uses the same atomic update RPC", () => {
  const page = source("app/(dashboard)/transactions/page.tsx");
  const list = source("components/transaction-list.tsx");
  const edit = source("components/edit-transaction-dialog.tsx");
  assert.match(list, /\/transactions\?duplicate=/);
  assert.match(list, /\/transactions\?copy=/);
  assert.match(page, /const duplicateId/);
  assert.match(page, /const duplicateSuggestion/);
  assert.match(page, /prefill=\{/);
  assert.match(page, /<EditTransactionDialog/);
  assert.match(edit, /<BottomSheet/);
  assert.match(page, /updateTransactionAction/);
  assert.match(source("features/transactions/actions.ts"), /update_simple_transaction_v120/);
});

test("V4.5.0 fixed sheet actions keep iPhone keyboard separate from page scroll", () => {
  const sheet = source("components/bottom-sheet.tsx");
  const footer = source("components/transaction-form-footer-slot.tsx");
  const form = source("components/transaction-entry-form.tsx");
  assert.match(sheet, /visualViewport/);
  assert.match(sheet, /data-fin-sheet-scroll/);
  assert.match(sheet, /fin-sheet-action-slot/);
  assert.match(footer, /createPortal\(/);
  assert.match(form, /useSheetFooterSlot\(/);
  assert.match(form, /pendingLabel="Đang lưu…"/);
});

test("V4.5.0 device-local preferences never mix users and discard legacy templates", () => {
  const previous = global.window;
  const records = new Map();
  global.window = { localStorage: {
    setItem(key, value) { records.set(key, value); },
    getItem(key) { return records.get(key) ?? null; }
  }};
  try {
    const first = quick.rememberSavedChoice(quick.emptyQuickEntryState(), draft());
    assert.equal(quick.writeQuickEntry(userA, "expense", first), true);
    assert.equal(quick.readQuickEntry(userA, "expense").preference.category_id, "food");
    assert.equal(quick.readQuickEntry(userB, "expense").preference.category_id, "");
    assert.equal(quick.readQuickEntry(userA, "income").preference.category_id, "");
    assert.equal(records.size, 1);
    records.set(quick.quickEntryStorageKey(userA,"expense"), JSON.stringify({ preference: first.preference, templates: [{name: "Retired"}] }));
    assert.ok(!("templates" in quick.readQuickEntry(userA, "expense")));
    assert.equal(quick.writeQuickEntry(userA, "expense", quick.readQuickEntry(userA, "expense")), true);
    assert.ok(!records.get(quick.quickEntryStorageKey(userA,"expense")).includes("templates"));
    records.set(quick.quickEntryStorageKey(userA,"expense"), "broken json");
    assert.equal(quick.readQuickEntry(userA, "expense").preference.category_id, "");
  } finally { if (previous === undefined) delete global.window; else global.window = previous; }
});

test("V4.5.0 duplicate draft requires explicit submit; retired templates have no UI", () => {
  const form = source("components/transaction-entry-form.tsx");
  const page = source("app/(dashboard)/transactions/page.tsx");
  assert.match(form, /action=\{formAction\}/);
  assert.doesNotMatch(form, /applyTemplate|saveTemplate|templateName/);
  assert.match(page, /transaction_purpose/);
  assert.match(page, /quickTransactionSuggestions\(\[sourceDuplicate\]/);
});

test("V4.5.0 device-local preference model passes strict TypeScript typecheck", () => {
  const configPath = join(root, "tsconfig.v430-isolated.json");
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  assert.equal(configFile.error, undefined);
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, root, { incremental: false }, configPath);
  const errors = ts.getPreEmitDiagnostics(ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options }))
    .filter((d) => d.category === ts.DiagnosticCategory.Error)
    .map((d) => `${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`);
  assert.deepEqual(errors, []);
});
