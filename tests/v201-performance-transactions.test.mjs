import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";

const root = resolve(import.meta.dirname, "..");
const read = (name) => readFileSync(join(root, name), "utf8");
const require = createRequire(import.meta.url);
const ts = (() => { try { return require("typescript"); } catch { return require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript"); } })();

test("V2.0.3 synchronizes all runtime versions and retains six modules", () => {
  assert.ok((Number(JSON.parse(read("package.json")).version.split(".")[0]) > 2 || Number(JSON.parse(read("package.json")).version.split(".")[1]) >= 2), "release should retain V2.2 baseline");
  assert.match(read("lib/app-version.ts"), /APP_VERSION = "(?:2\.[2-9]\.\d+|3\.\d+\.\d+)"/);
  assert.deepEqual(readdirSync(join(root,"app/(dashboard)"),{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name).sort(),["accounts","categories","overview","reports","settings","transactions"]);
});

test("App first load restores splash and still streams overview sections independently", () => {
  assert.match(read("app/layout.tsx"), /<AppSplash/);
  const overview = read("app/(dashboard)/overview/page.tsx");
  assert.match(overview, /<Suspense fallback=/);
  assert.match(overview, /function OverviewEssentials/);
  assert.match(overview, /function OverviewTrends/);
  assert.match(overview, /function OverviewRecent/);
  assert.match(overview, /fromDate: `\$\{month\}-01`/);
  assert.match(overview, /fromDate: `\$\{months\[0\]\.key\}-01`/);
  assert.match(read("app/(dashboard)/layout.tsx"), /<Suspense fallback=\{<AppHeader/);
});

test("Expense income transfer buttons use the same rose emerald sky coding as calendar", () => {
  const launcher = read("components/instant-transaction-launcher.tsx");
  const mobile = read("components/mobile-nav.tsx");
  const calendar = read("components/report-calendar-interactive.tsx");
  for (const source of [launcher,mobile,calendar]) {
    for (const color of ["rose-500","emerald-500","sky-500"]) assert.ok(source.includes(color), color);
  }
});

test("Transaction history groups by actual transaction_date and exposes duplicate workflow", () => {
  const list = read("components/transaction-list.tsx");
  const route = read("app/(dashboard)/transactions/page.tsx");
  assert.match(list,/groups\.get\(tx\.transaction_date\)/);
  assert.match(list,/groupByDate/);
  assert.match(list,/Sao chép giao dịch sang ngày khác/);
  assert.match(route,/groupByDate/);
  assert.match(route,/params\.copy/);
  assert.match(route,/<TransactionCopyPanel/);
});

test("Date cloning uses authenticated original, hard limit and protected historical transactions", () => {
  const action = read("features/transactions/actions.ts");
  assert.match(action,/copyTransactionDatesAction/);
  assert.match(action,/raw\.length > 20/);
  const sql = read("supabase/migrations/20261111180000_instant_copy_batch_v320.sql");
  assert.match(sql,/where id = p_source_id and user_id = v_uid/);
  assert.match(sql,/simple_transaction_ids_v120/);
  assert.match(sql,/public.create_simple_transaction_v120/);
  assert.match(sql,/simple_transaction_copy_receipts_v320/);
  assert.match(action,/requested\.filter\(\(date\) => !copiedDates\.includes\(date\)\)/);
  assert.match(action,/create_simple_transaction_v120/);
  assert.doesNotMatch(action,/delete.*sourceId|\.delete\(\).*sourceId/);
  const picker = read("components/transaction-copy-panel.tsx");
  assert.match(picker,/aria-pressed=\{isSelected\}/);
  assert.match(picker,/const isSelected = dates\.includes\(date\)/);
  assert.match(picker,/useActionState\(copyTransactionDatesAction/);
  assert.match(picker,/max.*20|20 ngày/);
});

test("Calendar day cells are smaller but retain income and expense lines", () => {
  const calendar = read("components/report-calendar-interactive.tsx");
  assert.match(calendar,/min-h-\[76px\]/);
  assert.doesNotMatch(calendar,/min-h-\[120px\]/);
  assert.match(calendar,/compactCalendarAmount\(cell\.income!/);
  assert.match(calendar,/compactCalendarAmount\(cell\.expense!/);
});

test("Shared bottom sheets animate both directions and support downward drag", () => {
  const sheet = read("components/bottom-sheet.tsx");
  const css = read("app/globals.css");
  for(const pattern of [/onPointerDown=\{onDragStart\}/,/onPointerMove=\{onDragMove\}/,/onPointerUp=\{onDragEnd\}/,/distance >= 75/,/aria-modal="true"/]) assert.match(sheet,pattern);
  for(const pattern of [/fin-sheet-panel-in/,/fin-sheet-panel-out/,/prefers-reduced-motion: reduce/]) assert.match(css,pattern);
  for(const component of ["instant-transaction-launcher","instant-reveal","mobile-nav","report-calendar-interactive","money-calculator-input"]) assert.match(read(`components/${component}.tsx`), /<BottomSheet/);
});

test("Logo, app name and version present together in both desktop and mobile", () => {
  assert.match(read("components/app-header.tsx"), /<BrandLogo header/);
  assert.match(read("components/app-header.tsx"), /\{APP_VERSION_LABEL\}/);
  assert.match(read("components/app-sidebar.tsx"), /<BrandLogo/);
  assert.match(read("components/app-sidebar.tsx"), /\{APP_VERSION_LABEL\}/);
});

test("All active TypeScript/TSX modules parse with local compiler", () => {
  const folders = ["app","components","features","lib"];
  const files=[];
  function walk(folder) { for (const entry of readdirSync(join(root,folder),{withFileTypes:true})) { const sub=join(folder,entry.name); if(entry.isDirectory()) walk(sub); else if(/\.tsx?$/.test(entry.name)) files.push(sub); } }
  folders.forEach(walk);
  const errors=[];
  for(const file of files) { const output=ts.transpileModule(read(file),{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.Preserve}}); for(const diagnostic of output.diagnostics??[]) if(diagnostic.category===ts.DiagnosticCategory.Error) errors.push(`${file}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText," ")}`); }
  assert.deepEqual(errors,[]);
});
