import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("V1.1.6 Reports has three data strategies and never throws the authenticated shell for ledger read failures", async () => {
  const data = await read("features/reports/data.ts");
  assert.match(data, /directReportLedger/);
  assert.match(data, /canonicalReportLedger/);
  assert.match(data, /legacyCoreReportLedger/);
  assert.match(data, /diagnostics: \{ strategy: "empty", warnings \}/);
  assert.match(data, /loadLedger\(supabase, userId/);
  assert.match(data, /loadReportEntriesLegacyCore/);
});

test("V1.1.6 report routes are force-dynamic and bypass stale RSC output", async () => {
  for (const path of [
    "app/(dashboard)/reports/page.tsx",
    "app/(dashboard)/reports/calendar/page.tsx",
    "app/(dashboard)/reports/analysis/page.tsx",
    "app/(dashboard)/reports/category/[categoryId]/page.tsx"
  ]) {
    const source = await read(path);
    assert.match(source, /export const dynamic = "force-dynamic"/);
    assert.match(source, /export const revalidate = 0/);
  }
});

test("V1.1.6 installed PWA hard-refreshes once when server version differs", async () => {
  const source = await read("components/pwa-register.tsx");
  assert.match(source, /hardRefreshToVersion/);
  assert.match(source, /finzaro-hard-refresh-/);
  assert.match(source, /__finzaro_version/);
  assert.match(source, /window\.location\.replace/);
  assert.match(source, /finzaro-static-v/);
});

test("V1.1.6 release metadata is current", async () => {
  const pkg = JSON.parse(await read("package.json"));
  const version = await read("lib/app-version.ts");
  assert.equal(pkg.version, "1.1.6");
  assert.match(version, /APP_VERSION = "1\.1\.6"/);
  assert.match(version, /Reports RSC Boundary Root Cause Fix/);
});
