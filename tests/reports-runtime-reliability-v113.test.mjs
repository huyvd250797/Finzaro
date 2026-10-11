import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("V1.1.4 Reports runtime does not require the versioned report RPC", async () => {
  const data = await read("features/reports/data.ts");
  assert.match(data, /loadReportTransactionsDirect/);
  assert.match(data, /loadReportEntriesDirect/);
  assert.doesNotMatch(data, /\.rpc\("report_flow_rows_v112"/);
  assert.doesNotMatch(data, /categories\(id, name/);
});

test("V1.1.4 retries legacy-compatible transaction projections", async () => {
  const data = await read("features/reports/data.ts");
  assert.match(data, /REPORT_TRANSACTION_PROJECTIONS/);
  assert.match(data, /transaction_purpose/);
  assert.match(data, /schemaCompatibilityError/);
  assert.match(data, /PGRST204/);
  assert.match(data, /PGRST200/);
});

test("V1.1.4 optional metadata cannot blank the whole Reports module", async () => {
  const data = await read("features/reports/data.ts");
  assert.match(data, /loadReportCurrenciesBestEffort/);
  assert.match(data, /loadReportCategoriesBestEffort/);
  assert.match(data, /loadReportAccountsBestEffort/);
  assert.match(data, /return \[\] as CategoryRow\[\]/);
  assert.match(data, /fallbackCurrency/);
});

test("V1.1.4 recovery copy no longer requires a Reports migration", async () => {
  const boundary = await read("app/(dashboard)/reports/error.tsx");
  assert.match(boundary, /APP_VERSION_LABEL/);
  assert.match(boundary, /không còn để lỗi truy vấn ledger làm sập toàn bộ Báo cáo/);
  assert.doesNotMatch(boundary, /chạy migration V1\.1\.2/);
});

test("V1.1.4 release metadata is current", async () => {
  const pkg = JSON.parse(await read("package.json"));
  const version = await read("lib/app-version.ts");
  assert.equal(pkg.version, "1.1.4");
  assert.match(version, /APP_VERSION = "1\.1\.4"/);
  assert.match(version, /Reports Recovery & PWA Refresh Fix/);
});
