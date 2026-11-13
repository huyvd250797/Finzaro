import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const read = (name) => readFileSync(join(root, name), "utf8");
const reportPage = read("app/(dashboard)/reports/page.tsx");
const instantFlow = read("components/instant-report-breakdown.tsx");
const actions = read("features/transactions/actions.ts");
const sql = read("supabase/migrations/20261111180000_instant_copy_batch_v320.sql");

test("V3.2.0 full source version and six-module contract", () => {
  const current = JSON.parse(read("package.json")).version;
  assert.match(current, /^(?:3|4)\.\d+\.\d+$/);
  assert.match(read("lib/app-version.ts"), new RegExp(`APP_VERSION = "${current.replaceAll(".", "\\.")}"`));
  assert.deepEqual(readdirSync(join(root, "app/(dashboard)"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort(),
    ["accounts", "categories", "overview", "reports", "settings", "transactions"]);
});

test("Instant Reports: both flow datasets are computed once from one ledger", () => {
  assert.equal((reportPage.match(/loadReportLedger\(/g) ?? []).length, 1);
  assert.match(reportPage, /const flows: Record<ReportFlowType, ReportFlowSnapshot>/);
  assert.match(reportPage, /income: buildFlowSnapshot\("income"\)/);
  assert.match(reportPage, /expense: buildFlowSnapshot\("expense"\)/);
  assert.match(reportPage, /reportCategoryBreakdown\(transactions, currency, flowType\)/);
  assert.match(reportPage, /buildCategoryPeriodGroups\(transactions, currency, flowType/);
  assert.match(read("components/fast-report-overview.tsx"), /<InstantReportBreakdown/);
  assert.match(instantFlow, /"use client"/);
  assert.match(instantFlow, /const \[type, setType\] = useState/);
  assert.match(instantFlow, /window\.history\.pushState/);
  assert.match(instantFlow, /window\.addEventListener\("popstate"/);
  assert.doesNotMatch(instantFlow, /router\.(?:push|replace|refresh)|useSWR|useQuery/);
  assert.match(instantFlow, /fetch\(`\/api\/reports\/category-entries/);
  assert.match(instantFlow, /aria-pressed=\{type === next\}/);
});

test("Instant Copy: existing rows open modal without loading transaction listing", () => {
  const overlay = read("components/instant-copy-overlay.tsx");
  const list = read("components/transaction-list.tsx");
  const calendar = read("components/report-calendar-interactive.tsx");
  const txPage = read("app/(dashboard)/transactions/page.tsx");
  assert.match(overlay, /document\.addEventListener\("click", onCopyClick, true\)/);
  assert.match(overlay, /event\.preventDefault\(\)/);
  assert.match(overlay, /<BottomSheet open=\{Boolean\(source\)\}/);
  assert.doesNotMatch(overlay, /router\.push|router\.replace|fetch\(/);
  for (const source of [list, calendar]) {
    assert.match(source, /data-fin-copy-id=/);
    assert.match(source, /data-fin-copy-date=/);
    assert.match(source, /data-fin-copy-type=/);
  }
  assert.match(txPage, /if \(params\.copy\) \{/);
  assert.ok(txPage.indexOf("if (params.copy) {") < txPage.indexOf("loadLedger(supabase, userId"));
  assert.match(txPage, /\.select\("id, title, transaction_date, transaction_type, transaction_purpose"\)/);
  assert.match(read("app/(dashboard)/layout.tsx"), /<MobileNav \/>/);
  assert.doesNotMatch(read("app/(dashboard)/layout.tsx"), /<InstantCopyOverlay \/>/);
});

test("Batch SQL: authenticated source, protected legacy data, valid counts and existing atomic ledger", () => {
  assert.match(sql, /v_uid uuid := auth\.uid\(\)/);
  assert.match(sql, /where id = p_source_id and user_id = v_uid/);
  assert.match(sql, /not between 1 and 20/);
  assert.match(sql, /is distinct from \(case when v_source\.transaction_type/);
  assert.match(sql, /simple_transaction_ids_v120/);
  assert.match(sql, /public\.create_simple_transaction_v120\(/);
  assert.match(sql, /for v_date in\s+select distinct/);
  assert.match(sql, /security definer set search_path = ''/);
  assert.match(sql, /revoke execute on function public\.copy_simple_transaction_batch_v320.*from public, anon/);
  assert.match(sql, /grant execute on function public\.copy_simple_transaction_batch_v320.*to authenticated/);
});

test("Batch SQL: idempotency receipt and serialization protect against duplicate retries", () => {
  assert.match(sql, /primary key \(user_id, source_transaction_id, destination_date\)/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /target_transaction_id into v_target/);
  assert.match(sql, /v_reused := found/);
  assert.match(sql, /if not v_reused then/);
  assert.match(sql, /insert into public\.simple_transaction_copy_receipts_v320/);
  assert.match(sql, /alter table public\.simple_transaction_copy_receipts_v320 enable row level security/);
  assert.match(sql, /revoke all on public\.simple_transaction_copy_receipts_v320/);
});

test("Batch action sends one RPC, verifies confirmations and invalidates after new commits", () => {
  const copyAction = actions.slice(actions.indexOf("export async function copyTransactionDatesAction"));
  assert.equal((copyAction.match(/\.rpc\("copy_simple_transaction_batch_v320"/g) ?? []).length, 1);
  assert.doesNotMatch(copyAction, /\.rpc\("create_simple_transaction_v120"/);
  assert.match(copyAction, /receipts\.length !== remaining\.length/);
  assert.match(copyAction, /receipts\.some\(\(row\) => !row\.reused\)/);
  assert.match(copyAction, /Chưa cập nhật database V3\.2\.0/);
  assert.match(copyAction, /requested\.filter\(\(date\) => !copiedDates\.includes\(date\)\)/);
});

test("Cold-start splash waits for actual content instead of artificial 650 ms", () => {
  const splash = read("components/app-splash.tsx");
  const overview = read("app/(dashboard)/overview/page.tsx");
  assert.match(splash, /MutationObserver/);
  assert.match(splash, /data-fin-startup-ready/);
  assert.match(overview, /data-fin-startup-ready/);
  assert.match(splash, /window\.requestAnimationFrame/);
  assert.match(splash, /window\.setTimeout\(finish, 4000\)/);
  assert.doesNotMatch(splash, /setTimeout\([^,]+,\s*650\)/);
  assert.match(read("app/layout.tsx"), /<AppSplash \/>/);
});

test("All V3.2 TS/TSX files parse successfully with configured TypeScript", () => {
  const require = createRequire(import.meta.url);
  let ts;
  try { ts = require("typescript"); }
  catch { ts = require(join(execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", ["root", "-g"], { encoding: "utf8" }).trim(), "typescript")); }
  let count = 0;
  const walk = (folder) => {
    for (const entry of readdirSync(join(root, folder), { withFileTypes: true })) {
      const path = `${folder}/${entry.name}`;
      if (entry.isDirectory()) walk(path);
      else if (/\.tsx?$/.test(entry.name)) {
        const result = ts.transpileModule(read(path), { fileName: path, reportDiagnostics: true, compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } });
        const errors = (result.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error);
        assert.equal(errors.length, 0, `${path}: ${errors.map((e) => ts.flattenDiagnosticMessageText(e.messageText, " ")).join("; ")}`);
        count++;
      }
    }
  };
  for (const folder of ["app", "components", "features", "lib"]) walk(folder);
  assert.ok(count >= 100);
});

test("Batch server action runtime: one RPC for multiple days, no second call after success", async () => {
  const require = createRequire(import.meta.url);
  let ts;
  try { ts = require("typescript"); }
  catch { ts = require(join(execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim(), "typescript")); }
  const vm = await import("node:vm");
  const js = ts.transpileModule(actions, {
    fileName: "features/transactions/actions.ts",
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  const record = { rpc: 0, paths: [] };
  let reused = false;
  const fakeSupabase = { rpc: async (name, params) => {
    record.rpc++;
    assert.equal(name, "copy_simple_transaction_batch_v320");
    return { error: null, data: params.p_destination_dates.map((date) => ({ date, transaction_id: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", reused })) };
  }};
  const injections = {
    "next/cache": { revalidatePath: (p) => record.paths.push(p) },
    "next/navigation": { redirect() { throw Error("Unexpected redirect"); } },
    "@/features/accounts/money": { parseMajorAmountToMinor() {} },
    "@/features/transactions/constants": { isTransactionType: () => true },
    "@/lib/auth": { requireUser: async () => ({ supabase: fakeSupabase }) },
    "@/lib/performance": { measureServerOperation: async (_label, fn) => fn() },
    "@/features/transactions/rpc-response": { transactionRpcError: (result) => result.error }
  };
  const exp = {};
  vm.runInNewContext(js, { exports: exp, require: (name) => {
    assert.ok(name in injections, `Unexpected ${name}`);
    return injections[name];
  }, FormData, URL, URLSearchParams, performance, process }, { filename: "actions.js" });
  const form = new FormData();
  form.set("source_id", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  form.set("dates", JSON.stringify(["2026-12-01", "2026-12-02", "2026-12-03"]));
  const first = await exp.copyTransactionDatesAction({ error: "", copiedDates: [] }, form);
  assert.equal(first.error, "");
  assert.deepEqual([...first.copiedDates], ["2026-12-01", "2026-12-02", "2026-12-03"]);
  assert.equal(record.rpc, 1, "one RPC per multi-day request");
  assert.equal(record.paths.length, 6, "one cache invalidation batch only after new writes");
  const second = await exp.copyTransactionDatesAction(first, form);
  assert.match(second.error, /đều đã được sao chép/);
  assert.equal(record.rpc, 1, "do not send previously confirmed dates twice");

  // Simulate a new page/session: server returns receipts as reused (DB already copied).
  reused = true;
  const restarted = await exp.copyTransactionDatesAction({ error: "", copiedDates: [] }, form);
  assert.equal(restarted.error, "");
  assert.equal(record.rpc, 2);
  assert.equal(record.paths.length, 6, "replayed DB receipts do not invalidate unchanged data");
});


test("Copy overlay does not trigger global navigation progress and UI timings are opt-in", () => {
  const progress = read("components/navigation-progress.tsx");
  const measure = read("lib/client-performance.ts");
  assert.match(progress, /anchor\.hasAttribute\("data-fin-copy-id"\)/);
  assert.match(read("components/instant-copy-overlay.tsx"), /measureClientPaint\("transactions\.copy\.open"/);
  assert.match(read("components/instant-report-breakdown.tsx"), /measureClientPaint\("reports\.flow\.toggle"/);
  assert.match(measure, /sessionStorage\.getItem\("finzaro-perf"\)/);
  assert.doesNotMatch(measure, /transaction_id|amount_minor|userId/);
});

test("Period links follow client flow, prefetch only on intent", () => {
  const periods = read("components/report-period-controls.tsx");
  assert.match(periods, /finzaro:report-flow-change/);
  assert.match(periods, /const current = links\[type\]/);
  assert.match(periods, /prefetch=\{false\}/);
  assert.match(periods, /onMouseEnter=\{\(\) => warm/);
  assert.match(periods, /navigator as Navigator/);
});
