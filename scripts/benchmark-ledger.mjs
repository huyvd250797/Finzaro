/** Synthetic CPU-only benchmark: no database or personal transaction data used.
 * Run: npm run benchmark:ledger (requires dev dependency `typescript`).
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import vm from "node:vm";
import { performance } from "node:perf_hooks";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = readFileSync(resolve(import.meta.dirname, "../features/transactions/data.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const module = { exports: {} };
vm.runInNewContext(compiled, {
  module, exports: module.exports,
  require: () => ({ formatMinorMoney: () => "", minorToMajorInput: () => "" })
}, { filename: "transactions-data.cjs" });
const { monthlyCashflowTotals, monthTotals } = module.exports;
if (typeof monthlyCashflowTotals !== "function" || typeof monthTotals !== "function") throw new Error("Cannot load aggregation functions");

const months = Array.from({ length: 6 }, (_, i) => `2026-${String(i + 1).padStart(2, "0")}`);
for (const size of [1000, 5000, 10000]) {
  const transactions = Array.from({ length: size }, (_, i) => {
    const transaction_type = i % 13 === 0 ? "transfer" : i % 3 === 0 ? "income" : "expense";
    const type = transaction_type === "transfer" ? "transfer_out" : transaction_type;
    return {
      id: `synthetic-${i}`,
      transaction_type,
      transaction_purpose: transaction_type === "transfer" ? "transfer" : "standard",
      transaction_date: `${months[i % 6]}-${String(i % 27 + 1).padStart(2, "0")}`,
      entries: [{ entry_role: type, currency_code: i % 17 === 0 ? "USD" : "VND", amount_minor: transaction_type === "expense" ? -10000 - i : 10000 + i }]
    };
  });
  const baseline = months.map((key) => monthTotals(transactions, "VND", key));
  for (let iteration = 0; iteration < 4; iteration++) monthlyCashflowTotals(transactions, "VND", months);
  const t0 = performance.now();
  const fast = monthlyCashflowTotals(transactions, "VND", months);
  const durationMs = performance.now() - t0;
  for (const [index, month] of months.entries()) {
    const result = fast.get(month);
    if (!result || JSON.stringify(result) !== JSON.stringify(baseline[index])) throw new Error(`Aggregation mismatch for ${month}`);
  }
  console.log(`${size.toLocaleString("en-US")} synthetic transactions | six months | ${durationMs.toFixed(2)} ms | totals verified`);
}
