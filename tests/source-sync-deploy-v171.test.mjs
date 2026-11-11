import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const syncScript = readFileSync(join(root, "scripts/sync-retired-source.mjs"), "utf8");

test("V1.7.1 syncs retired modules before Vercel prebuild release gate", () => {
  assert.equal(pkg.version, "2.0.0");
  assert.match(pkg.scripts.prebuild, /source:sync.*check-env\.mjs.*check-release\.mjs/);
  assert.match(pkg.scripts["release:check"], /source:sync.*check-release\.mjs/);
  assert.match(pkg.scripts["source:sync"], /sync-retired-source\.mjs/);
  assert.match(readFileSync(join(root, "lib/app-version.ts"), "utf8"), /APP_VERSION = "2\.0\.0"/);
});

test("legacy route names are all explicitly retired; financial SQL is untouched", () => {
  for (const name of ["assets", "budgets", "cash-flow", "credit-cards", "debt-strategy", "deposits", "forecast", "goal-planner", "goals", "health", "loans", "net-worth", "recurring"]) {
    assert.match(syncScript, new RegExp(`app/\\(dashboard\\)/${name}\\b`));
  }
  assert.doesNotMatch(syncScript, /supabase\/sql-editor|supabase\/migrations|\.env/);
});

test("overlay reconciliation removes only old application paths and is idempotent", () => {
  const scratch = mkdtempSync(join(tmpdir(), "finzaro-v171-overlay-"));
  const put = (relative) => {
    const target = join(scratch, relative);
    mkdirSync(resolve(target, ".."), { recursive: true });
    writeFileSync(target, "legacy or active stub\n");
  };
  try {
    mkdirSync(join(scratch, "scripts"), { recursive: true });
    copyFileSync(join(root, "scripts/sync-retired-source.mjs"), join(scratch, "scripts/sync-retired-source.mjs"));
    for (const path of [
      "app/(dashboard)/assets/page.tsx", "app/(dashboard)/loans/page.tsx",
      "app/api/market/ssi/refresh/route.ts", "features/deposits/data.ts",
      "components/loan-simulator.tsx", "tests/loan-debt-manager.test.mjs"
    ]) put(path);
    for (const path of [
      "app/(dashboard)/overview/page.tsx", "app/(dashboard)/reports/page.tsx",
      "features/transactions/actions.ts", "components/transaction-entry-form.tsx",
      "supabase/sql-editor/V1.2.0_simple_expense_management.sql",
      "tests/legacy/from-v141/loan-debt-manager.test.mjs"
    ]) put(path);
    const run = () => spawnSync(process.execPath, ["scripts/sync-retired-source.mjs"], { cwd: scratch, encoding: "utf8" });
    const first = run();
    assert.equal(first.status, 0, first.stdout + first.stderr);
    assert.match(first.stdout, /Removed retired source/);
    assert.ok(!existsSync(join(scratch, "app/(dashboard)/assets")));
    assert.ok(!existsSync(join(scratch, "features/deposits")));
    assert.ok(!existsSync(join(scratch, "tests/loan-debt-manager.test.mjs")));
    for (const relative of [
      "app/(dashboard)/overview/page.tsx", "app/(dashboard)/reports/page.tsx",
      "features/transactions/actions.ts", "components/transaction-entry-form.tsx",
      "supabase/sql-editor/V1.2.0_simple_expense_management.sql",
      "tests/legacy/from-v141/loan-debt-manager.test.mjs"
    ]) assert.ok(existsSync(join(scratch, relative)), `Active data/file removed: ${relative}`);
    const second = run();
    assert.equal(second.status, 0, second.stdout + second.stderr);
    assert.match(second.stdout, /OK: 0 obsolete source paths removed/);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
