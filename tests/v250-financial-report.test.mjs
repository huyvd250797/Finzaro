import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { inflateRawSync } from "node:zlib";
import vm from "node:vm";
const require = createRequire(import.meta.url);
// TypeScript is a declared dev dependency. Fall back to globally installed tsc
// only for isolated source checks when node_modules is not available.
let ts;
try { ts = require("typescript"); }
catch { const globalRoot = execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", ["root", "-g"], { encoding: "utf8" }).trim(); ts = require(join(globalRoot, "typescript")); }
const root = resolve(import.meta.dirname, "..");
const read = (f) => readFileSync(join(root,f),"utf8");
function loadCompiled(file, injections = {}) {
  const result = ts.transpileModule(read(file), { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }, reportDiagnostics: true });
  assert.equal(result.diagnostics?.filter((d) => d.category === ts.DiagnosticCategory.Error).length ?? 0, 0, "TypeScript syntax should be valid");
  const exports = {};
  vm.runInNewContext(result.outputText, { exports, require: (id) => injections[id] ?? require(id), Buffer, TextEncoder, Uint32Array, Math, Set, Map, Number, String, Object, Date, Intl, console });
  return exports;
}
const mockTransactionEntry = (tx, role) => tx.entries.find((entry) => entry.entry_role === role) ?? null;
const analytics = loadCompiled("features/reports/advanced.ts", { "@/features/transactions/data": { transactionEntry: mockTransactionEntry } });
const workbook = loadCompiled("features/reports/report-workbook.ts");
const mk = (date, type, amount, role = type, currency = "VND", purpose = "standard", category = "food") => ({
  id: `${date}-${type}-${amount}`, transaction_date: date, transaction_type: type, transaction_purpose: purpose,
  category_id: category, category: { name: category === "food" ? "Ăn uống" : "Khác" },
  entries: [{ entry_role: role, currency_code: currency, amount_minor: amount, account_id: "bank" }]
});

test("V2.5 financial totals exclude transfers, legacy finance and other currencies", () => {
  const current = [mk("2026-11-01","income",100000),mk("2026-11-02","expense",25000),mk("2026-11-03","transfer",500000,"transfer_out"),mk("2026-11-04","expense",80000,"expense","VND","loan"),mk("2026-11-04","expense",20000,"expense","USD")];
  const before = [mk("2026-10-01","income",90000),mk("2026-10-02","expense",15000)];
  const result = analytics.compareFinancialPeriods(current,before,"VND");
  assert.equal(result.current.income,100000);
  assert.equal(result.current.expense,25000);
  assert.equal(result.current.net,75000);
  assert.equal(result.current.savingsRate,75);
  assert.equal(result.previous.savingsRate,83.3);
  assert.equal(result.incomeChange,11.1);
  assert.equal(result.expenseChange,66.7);
  assert.equal(result.current.expenseCount,1);
  assert.equal(analytics.percentChange(500,0),null);
  assert.equal(analytics.maskIncompleteCashflowRatio(result, "income").current.savingsRate, null);
  const daily = analytics.dailyCashflow(current,"VND","2026-11-01","2026-11-30");
  assert.deepEqual(Array.from(daily.map(row => row.date)),["2026-11-01","2026-11-02"]);
  const category = analytics.categoryMovement(current,before,"VND");
  assert.equal(category[0].delta,10000);
});

test("XLSX creates a genuine workbook with Vietnamese and literal user-provided formulas", () => {
  const buffer = workbook.makeReportXlsx([{ name: "Tổng hợp", rows: [["Ngày", "Nội dung", "Tiền"],["2026-11-11", '=HYPERLINK("https://phishing.invalid")', 12345],["", "Tiền ăn & uống", -125]] }]);
  assert.equal(buffer.readUInt32LE(0),0x04034b50);
  let offset=0, foundWorksheet=false;
  while(offset < buffer.length && buffer.readUInt32LE(offset)===0x04034b50) {
    const compressed = buffer.readUInt32LE(offset+18), nameLength=buffer.readUInt16LE(offset+26), extra=buffer.readUInt16LE(offset+28);
    const name = buffer.subarray(offset+30, offset+30+nameLength).toString("utf8");
    const data=inflateRawSync(buffer.subarray(offset+30+nameLength+extra, offset+30+nameLength+extra+compressed)).toString("utf8");
    if(name === "xl/worksheets/sheet1.xml") {
      foundWorksheet=true;
      assert.match(data,/<worksheet/);
      assert.match(data,/Tiền ăn &amp; uống/);
      assert.match(data,/<t xml:space="preserve">=HYPERLINK/);
      assert.doesNotMatch(data,/<f>/);
      assert.match(data,/<v>12345<\/v>/);
    }
    offset+=30+nameLength+extra+compressed;
  }
  assert.ok(foundWorksheet);
  assert.equal(buffer.readUInt32LE(offset),0x02014b50);
});

test("V2.5 integrated analytical views and print/XLSX/CSV exports preserve six modules", () => {
  assert.equal(JSON.parse(read("package.json")).version, "3.2.1");
  assert.match(read("lib/app-version.ts"), /APP_VERSION = "3\.2\.1"/);
  const dirs = readdirSync(join(root,"app/(dashboard)"),{withFileTypes:true}).filter(item=>item.isDirectory()).map(x=>x.name).sort();
  assert.deepEqual(dirs,["accounts","categories","overview","reports","settings","transactions"]);
  const page = read("app/(dashboard)/reports/analysis/page.tsx");
  for(const item of ["FinancialTrendExplorer","ReportDonut","comparison.current.savingsRate","categoryMovement","insights","/reports/statements"]) {
    const bundle = page + read("features/reports/server-report.ts"); assert.ok(bundle.includes(item),item);
  }
  assert.match(read("app/api/reports/export/route.ts"), /makeReportXlsx\(sheets\)/);
  assert.match(read("app/api/reports/export/route.ts"), /getClaims\(\)/);
  assert.match(read("app/api/reports/export/route.ts"), /no-store/);
  assert.match(read("app/(dashboard)/reports/print/page.tsx"), /ReportPrintButton/);
  assert.match(read("components/report-print-button.tsx"), /window\.print\(\)/);
  assert.match(read("features/reports/statement.ts"), /Chỉ gồm Thu\/Chi thông thường/);
  assert.match(read("features/transactions/data.ts"), /filters.category === "uncategorized"/);
});
