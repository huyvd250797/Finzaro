import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const root = join(import.meta.dirname, "..");
const read = (name) => readFileSync(join(root, name), "utf8");
const transactions = read("app/(dashboard)/transactions/page.tsx");
const form = read("components/transaction-entry-form.tsx");
const actions = read("features/transactions/actions.ts");
const css = read("app/globals.css");

test("combined version and scope remain consistent", () => {
  assert.ok((Number(JSON.parse(read("package.json")).version.split(".")[0]) > 2 || Number(JSON.parse(read("package.json")).version.split(".")[1]) >= 2), "release should retain V2.2 baseline");
  assert.match(read("lib/app-version.ts"), /APP_VERSION\s*=\s*"(?:2\.[2-9]\.\d+|(?:3|4)\.\d+\.\d+)"/);
  assert.match(read("lib/app-version.ts"), /APP_RELEASE_NAME\s*=\s*"(?:Premium Fintech & Fluid Transaction UX|Financial Dashboard & Advanced Reports|Professional Release|Instant Reports|Premium Visual Foundation|Mobile-First Transaction UX|Premium Overview & Reports|Fluid Motion & Navigation|Premium UX Release|Fixed Mobile Chrome & Sheet Actions|Viewport-Locked Mobile Chrome & Keyboard Focus|Instant Launch Splash, Clean Sheet Grip & Today Spending|Category Drill-down Reports & Today Spending Disclosure|Full-screen Category Analytics & Instant Details|Compact Reports & Instant Period Navigation|Period Snapshot Type Safety Hotfix|Financial Accuracy & Release Gate|ESLint Flat Config Deploy Hotfix)/);
  assert.match(read("README.md"), /V1\.7\.0/);
  assert.match(read("DEPLOY_V1.4.0.md"), /V1\.2\.3.*V1\.3\.0.*V1\.4\.0/s);
  assert.match(read("docs/VERSIONING.md"), /V1\.7\.0/);
});

test("quick entry does not load a full transaction history or transfer metadata", () => {
  assert.match(transactions, /quickFormOnly \? \{ limit: 24 \}/);
  assert.match(transactions, /if \(quickFormOnly\) return/);
  assert.ok(transactions.indexOf("if (quickFormOnly) return") < transactions.indexOf("const transferIds ="));
  assert.match(transactions, /transaction_date"\)\.eq\("id", selectedId\)/);
});

test("three transaction types share a form with money first and context-safe defaults", () => {
  assert.match(form, /useActionState\(createTransactionStateAction/);
  assert.match(form, /role="alert"/);
  assert.ok(form.indexOf('className="fin-amount-field') < form.indexOf('<TransactionCategorySelect'));
  assert.match(form, /kind === "recent"/);
  assert.match(form, /autoTitle/);
  assert.match(form, /differentCurrency &&/);
  assert.match(form, /isTransfer && !differentCurrency && <input name="to_amount" type="hidden" value=""/);
  assert.match(read("components/instant-transaction-launcher.tsx"), /<div onClickCapture=/);
});

test("failed saves retain values; success commits through unchanged atomic V1.2 RPC", () => {
  assert.match(actions, /export async function createTransactionStateAction/);
  assert.match(actions, /return \{ error: error instanceof Error/);
  assert.match(actions, /redirect\(feedbackDestination\(returnTo, "message"/);
  assert.match(actions, /rpc\("create_simple_transaction_v120"/);
  assert.match(actions, /rpc\("update_simple_transaction_v120"/);
  assert.match(actions, /rpc\("delete_simple_transaction_v120"/);
  assert.match(read("components/pending-submit-button.tsx"), /disabled=\{disabled \|\| pending\}/);
});

test("semantic design tokens and opt-in non-sensitive performance timings exist", () => {
  for (const token of ["--fin-radius-lg", "--fin-control-height", "--fin-focus-ring", ".fin-inline-error", ".fin-amount-field", ".fin-filter-panel"]) assert.ok(css.includes(token), token);
  const perf = read("lib/performance.ts");
  assert.match(perf, /FINZARO_PERF_LOG/);
  assert.match(perf, /console\.info\(`\[Finzaro performance\] \${label}: \${Math\.round/);
  for (const name of ["transaction.create.rpc", "transaction.update.rpc", "reports.overview.load", "reports.calendar.load", "overview.essentials"]) {
    assert.ok(read("features/transactions/actions.ts") .includes(name) || ["app/(dashboard)/reports/page.tsx", "app/(dashboard)/reports/calendar/page.tsx", "app/(dashboard)/overview/page.tsx"].some((path) => read(path).includes(name)), name);
  }
});

test("timing helper returns operation result and preserves exceptions", async () => {
  const req = createRequire(import.meta.url);
  let ts;
  try { ts = req("typescript"); } catch { ts = req(join(process.execPath, "../../lib/node_modules/typescript")); }
  const source = read("lib/performance.ts");
  const output = ts.transpileModule(source, { fileName: "lib/performance.ts", compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  new Function("module", "exports", "process", "performance", output)(module, module.exports, { env: {} }, globalThis.performance);
  const { measureServerOperation } = module.exports;
  assert.equal(await measureServerOperation("test", async () => 23), 23);
  await assert.rejects(() => measureServerOperation("test", async () => { throw new Error("RPC unavailable"); }), /RPC unavailable/);
});
