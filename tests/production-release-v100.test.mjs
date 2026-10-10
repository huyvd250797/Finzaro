import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("current release is V1.0.0 Production Release", async () => {
  const pkg = JSON.parse(await read("package.json"));
  const version = await read("lib/app-version.ts");
  assert.equal(pkg.version, "1.0.0");
  assert.match(version, /APP_VERSION = "1\.0\.0"/);
  assert.match(version, /APP_RELEASE_NAME = "Production Release"/);
});

test("production dependencies are pinned and build validates environment first", async () => {
  const pkg = JSON.parse(await read("package.json"));
  for (const group of [pkg.dependencies, pkg.devDependencies]) {
    for (const value of Object.values(group)) {
      assert.doesNotMatch(value, /^[~^]/);
    }
  }
  assert.equal(pkg.scripts.prebuild, "node scripts/check-env.mjs");
  assert.equal(pkg.packageManager, "npm@10.9.2");
  const envCheck = await read("scripts/check-env.mjs");
  assert.match(envCheck, /placeholder value/);
  assert.match(envCheck, /must use HTTPS in production/);
});

test("production security and deterministic error recovery are present", async () => {
  const config = await read("next.config.ts");
  assert.match(config, /X-Frame-Options/);
  assert.match(config, /Strict-Transport-Security/);
  assert.match(config, /Cross-Origin-Opener-Policy/);
  assert.match(await read("app/error.tsx"), /Không thể tải màn hình/);
  assert.match(await read("app\/(dashboard)\/error.tsx"), /Dữ liệu chưa tải được/);
  assert.match(await read("app/global-error.tsx"), /Finzaro cần tải lại/);
  assert.match(await read("app/not-found.tsx"), /Không tìm thấy trang/);
});

test("reports never silently stop at ten thousand transactions", async () => {
  const ledger = await read("features/transactions/data.ts");
  assert.match(ledger, /fetchAll\?: boolean/);
  assert.match(ledger, /fetchAll \? 100001/);
  assert.match(ledger, /rows\.length > 100000/);
  for (const path of [
    "app/(dashboard)/reports/page.tsx",
    "app/(dashboard)/reports/calendar/page.tsx",
    "app/(dashboard)/reports/analysis/page.tsx",
    "app/(dashboard)/reports/category/[categoryId]/page.tsx",
    "app/api/reports/export/route.ts"
  ]) {
    const source = await read(path);
    assert.match(source, /fetchAll: true/);
    assert.doesNotMatch(source, /limit: 10000/);
  }
});

test("category historical usage counting is paginated instead of capped", async () => {
  const data = await read("features/categories/data.ts");
  const page = await read("app/(dashboard)/categories/page.tsx");
  assert.match(data, /loadCategoryUsageCounts/);
  assert.match(data, /\.range\(offset, offset \+ pageSize - 1\)/);
  assert.match(page, /loadCategoryUsageCounts/);
  assert.doesNotMatch(page, /\.limit\(10000\)/);
});

test("V1.0.0 ships read-only production database verification", async () => {
  const verify = await read("supabase/sql-editor/V1.0.0_production_release_verify.sql");
  assert.match(verify, /Read-only verification/);
  assert.match(verify, /transactions_rls_ok/);
  assert.match(verify, /create_financial_transaction_v071/);
  assert.match(verify, /categories_icon_allowed_v080/);
  assert.doesNotMatch(verify, /\b(insert|update|delete|alter|drop|create)\b/i);
});
