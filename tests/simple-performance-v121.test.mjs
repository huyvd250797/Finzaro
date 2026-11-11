import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");
const dataSource = read("features/reports/data.ts");

function reportLoaders() {
  const require = createRequire(import.meta.url);
  let ts;
  try { ts = require("typescript"); }
  catch { ts = require(join(dirname(process.execPath), "../lib/node_modules/typescript")); }
  const source = `${dataSource}\nexport const __testLoadReportTransactionsDirect = loadReportTransactionsDirect;\nexport const __testLoadReportEntriesDirect = loadReportEntriesDirect;`;
  const { outputText, diagnostics } = ts.transpileModule(source, {
    fileName: "features/reports/data.ts",
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  });
  assert.deepEqual((diagnostics ?? []).filter(item => item.category === ts.DiagnosticCategory.Error), []);
  const module = { exports: {} };
  const fakeRequire = () => ({});
  new Function("require", "module", "exports", outputText)(fakeRequire, module, module.exports);
  return module.exports;
}

test("V1.2.1 version and active module scope are consistent", () => {
  assert.equal(JSON.parse(read("package.json")).version, "2.0.1");
  assert.match(read("lib/app-version.ts"), /APP_VERSION\s*=\s*"2\.0\.1"/);
  assert.match(read("README.md"), /V1\.7\.0/);
  assert.match(read("docs/VERSIONING.md"), /V1\.7\.0/);
});

test("reports never silently serve a failed ledger read as a verified zero or empty CSV", () => {
  assert.match(read("components/report-data-status.tsx"), /diagnostics\?\.strategy !== "empty"/);
  for (const route of ["app/(dashboard)/overview/page.tsx", "app/(dashboard)/reports/page.tsx", "app/(dashboard)/reports/calendar/page.tsx", "app/(dashboard)/reports/analysis/page.tsx", "app/(dashboard)/reports/category/[categoryId]/page.tsx"]) {
    assert.match(read(route), /ReportDataStatus/);
  }
  const csv = read("app/api/reports/export/route.ts");
  assert.match(csv, /loadReportLedger/);
  assert.match(csv, /diagnostics\.strategy === "empty"/);
  assert.match(csv, /status: 503/);
});

test("report transaction loader skips preflight query and retries only schema-compatibility errors", async () => {
  const { __testLoadReportTransactionsDirect: load } = reportLoaders();
  const projections = [];
  const supabase = { from: (name) => {
    assert.equal(name, "transactions");
    return {
      select(value) { this.projection = value; return this; },
      eq() { return this; }, gte() { return this; }, lte() { return this; },
      order() { return this; },
      async range() {
        projections.push(this.projection);
        if (this.projection.includes("transaction_purpose")) return { data: null, error: { code: "42703", message: "column does not exist" } };
        return { data: [{ id: "tx-one", transaction_date: "2026-11-10" }], error: null };
      }
    };
  }};
  const rows = await load(supabase, "user-1", "2026-11-01", "2026-11-30");
  assert.equal(rows.length, 1);
  assert.equal(projections.length, 2, "one real query per projection; no redundant limit(1) preflight");
  assert.ok(projections[0].includes("transaction_purpose"));
  assert.ok(!projections[1].includes("transaction_purpose"));
});

test("report entry loader respects bounded parallelism, stable batching, and full results", async () => {
  const { __testLoadReportEntriesDirect: load } = reportLoaders();
  let inflight = 0, peak = 0, requestCount = 0;
  const supabase = { from: (name) => {
    assert.equal(name, "transaction_entries");
    return { select() { return this; }, eq() { return this; },
      async in(_, chunk) {
        requestCount += 1;
        inflight += 1;
        peak = Math.max(peak, inflight);
        await new Promise(resolve => setTimeout(resolve, Number(chunk[0].slice(2)) % 4 + 2));
        inflight -= 1;
        return { data: chunk.map(transaction_id => ({ transaction_id, entry_role: "expense" })), error: null };
      }
    };
  }};
  const ids = Array.from({ length: 810 }, (_, i) => `tx${i}`);
  const rows = await load(supabase, "user-1", ids);
  assert.equal(rows.length, ids.length);
  assert.deepEqual(rows.map(row => row.transaction_id), ids, "entries remain complete and in deterministic batch order");
  assert.equal(requestCount, Math.ceil(ids.length / 80));
  assert.ok(peak > 1 && peak <= 4, `bounded parallelism (actual ${peak})`);
});

test("invalid timezone preferences do not crash core date helpers", () => {
  const core = read("features/transactions/data.ts");
  assert.match(core, /function zonedYearMonth\(timeZone: string\) \{[\s\S]*?try \{/);
  assert.match(core, /return \{ year: now\.getUTCFullYear\(\), month: now\.getUTCMonth\(\) \+ 1 \}/);
});
