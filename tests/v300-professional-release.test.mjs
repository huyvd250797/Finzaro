import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(join(root, path), "utf8");
const require = createRequire(import.meta.url);
let ts;
try { ts = require("typescript"); }
catch { ts = require(join(execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", ["root", "-g"], { encoding: "utf8" }).trim(), "typescript")); }
function compile(path) {
  const result = ts.transpileModule(read(path), { fileName: path, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }, reportDiagnostics: true });
  assert.equal(result.diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error).length ?? 0, 0);
  const exports = {};
  vm.runInNewContext(result.outputText, { exports, require: () => { throw new Error("Unexpected runtime import"); }, Math, Map, Set, Date, String, Number, Array, Object });
  return exports;
}
test("V3.0.0 version is consistent and app retains six modules", () => {
  assert.equal(JSON.parse(read("package.json")).version, "3.2.0");
  assert.match(read("lib/app-version.ts"), /APP_VERSION = "3\.2\.0"/);
  assert.deepEqual(readdirSync(join(root,"app/(dashboard)"),{withFileTypes:true}).filter(entry=>entry.isDirectory()).map(x=>x.name).sort(),["accounts","categories","overview","reports","settings","transactions"]);
});
test("Scale: chart visual buckets preserve all financial totals and bound DOM bars", () => {
  const { trendChartBuckets } = compile("features/reports/chart-buckets.ts");
  const mk = (count) => Array.from({length:count}, (_,i) => {
    const month = String(i % 12 + 1).padStart(2,"0");
    const year = String(2020 + Math.floor(i / 12));
    return { key:`${year}-${month}`,month:`${month}/${year}`,income:100+i,expense:50+i,net:50 };
  });
  for (const size of [0,12,60,120,1000]) {
    const input=mk(size), buckets=trendChartBuckets(input);
    assert.ok(buckets.length <= 32, `chart should cap visual bars for ${size} months`);
    for (const metric of ["income","expense","net"]) {
      const sum=(rows)=>rows.reduce((n,row)=>n+row[metric],0);
      assert.equal(sum(buckets),sum(input), `${metric} ${size}`);
    }
  }
  const leap = trendChartBuckets(mk(60));
  assert.equal(leap[0].from,"2020-01-01");
  assert.equal(leap[0].to,"2020-03-31");
});
test("Scale: category descendant traversal handles large tree and cycles", () => {
  const { categoryScopeIds } = compile("features/reports/category-scope.ts");
  const categories = Array.from({length:10000},(_,i)=>({ id:`c${i+1}`, parent_id:i===0 ? "root" : `c${i}` }));
  categories.push({id:"root",parent_id:"c10000"});
  const result=categoryScopeIds("root",categories);
  assert.equal(result.length,10001);
  assert.equal(result[0],"root");
  assert.equal(result.at(-1),"c10000");
});
test("Scale: transaction history progressively renders groups and remains date-filterable", () => {
  const page=read("app/(dashboard)/transactions/page.tsx");
  assert.match(page,/const pageSize = 80/);
  assert.match(page,/historyPage = Math\.min\(13/);
  assert.match(page,/const shownTransactions = filtered\.slice\(0, displayLimit\)/);
  assert.match(page,/transactions=\{shownTransactions\}/);
  assert.match(page,/hasMoreHistory &&/);
  assert.match(page,/new URLSearchParams\(\)/);
  assert.match(read("features/transactions/data.ts"),/order\("id", \{ ascending: false \}\)/);
});
test("Motion: keypad enlarges while pressed and returns after release without React state churn", () => {
  const money=read("components/money-calculator-input.tsx"),css=read("app/globals.css");
  for (const action of ["onPointerDown", "onPointerUp", "onPointerCancel", "onPointerLeave", "onKeyDown", "onKeyUp", "onBlur"]) assert.ok(money.includes(action));
  assert.match(money,/dataset\.pressed = "true"/);
  assert.match(money,/dataset\.pressed = "false"/);
  assert.match(css,/\.fin-money-key:is\(:active, \[data-pressed="true"\]\)/);
  assert.match(css,/transform: scale\(1\.075\)/);
  assert.match(css,/prefers-reduced-motion: reduce/);
  assert.match(money,/keyboardActionRef\.current/);
});
test("Accessibility: focus trapping, recovery and high-contrast presentation", () => {
  const sheet=read("components/bottom-sheet.tsx"),css=read("app/globals.css");
  assert.match(sheet,/returnFocusRef/);
  assert.match(sheet,/onCloseRef/);
  assert.match(sheet,/event\.key !== "Tab"/);
  assert.match(sheet,/event\.key === "Escape"/);
  assert.match(sheet,/aria-modal="true"/);
  assert.match(sheet,/focus\(\{ preventScroll: true \}\)/);
  assert.match(css,/prefers-contrast: more/);
  assert.match(css,/\.fin-money-key:focus-visible/);
});
