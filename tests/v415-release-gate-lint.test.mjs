import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(join(root, path), "utf8");
const packageJson = JSON.parse(read("package.json"));
const config = read("eslint.config.mjs");

test("V4.2.0 is a real version bump, not a silent V4.1.4 overwrite", () => {
  assert.equal(packageJson.version, "4.2.0");
  assert.match(read("lib/app-version.ts"), /APP_VERSION\s*=\s*"4\.2\.0"/);
  assert.match(read("lib/app-version.ts"), /Financial Snapshot Type Safety Hotfix|Portable Test Runner CI Hotfix|Unified Fast Data Layer/);
});

test("ESLint 9.17 uses a parseable Flat Config, not eslint/config", () => {
  execFileSync(process.execPath, ["--check", join(root, "eslint.config.mjs")]);
  assert.doesNotMatch(config, /from\s+["']eslint\/config["']/);
  assert.match(config, /\.\.\.nextVitals/);
  assert.match(config, /\.\.\.nextTs/);
  assert.match(config, /export default config/);
  assert.match(config, /"react-hooks\/set-state-in-effect": "off"/);
  assert.match(config, /"react-hooks\/refs": "off"/);
  assert.match(config, /"@next\/next\/no-assign-module-variable": "off"/);
  assert.doesNotMatch(config, /"react-hooks\/purity": "off"/);
  assert.doesNotMatch(config, /"@typescript-eslint\/no-explicit-any": "off"/);
  assert.match(config, /files:\s*legacyEffectSyncFiles/);
  assert.match(config, /files:\s*\["tests\/\*\*\/\*\.mjs", "scripts\/benchmark-ledger\.mjs"\]/);
});

test("legacy Supabase any casts have individual lint justifications", () => {
  const files = [
    "app/(dashboard)/reports/calendar/page.tsx",
    "app/(dashboard)/transactions/page.tsx",
    "app/api/reports/period-snapshot/route.ts",
    "features/reports/load-period-snapshot.ts",
    "features/dashboard/snapshot.ts",
    "features/categories/actions.ts",
    "features/reports/data.ts",
    "features/transactions/actions.ts",
  ];
  let annotated = 0;
  for (const file of files) {
    const rows = read(file).split("\n");
    for (let index = 0; index < rows.length; index++) {
      if (!/\b(?:as any|:\s*any)\b/.test(rows[index])) continue;
      assert.match(rows[index - 1] ?? "", /eslint-disable-next-line @typescript-eslint\/no-explicit-any/, `${file}:${index+1} dynamic cast is not justified`);
      annotated++;
    }
  }
  assert.ok(annotated >= 22, `expected all guarded Supabase casts; found ${annotated}`);
});

test("render purity fixes retain the interaction timing and release pipeline", () => {
  assert.doesNotMatch(read("app/(dashboard)/transactions/page.tsx"), /const startedAt = performance\.now\(\)/);
  assert.doesNotMatch(read("components/instant-report-breakdown.tsx"), /const startedAt = performance\.now\(\)/);
  assert.doesNotMatch(read("components/report-calendar-interactive.tsx"), /const now = Date\.now\(\)/);
  assert.match(read("components/fast-report-overview.tsx"), /\[periodId\(initialSnapshot\), \{ snapshot: initialSnapshot, at: 0 \}\]/);
  assert.match(read("components/pwa-register.tsx"), /const periodic = window\.setInterval/);
  assert.equal(JSON.parse(read("vercel.json")).buildCommand, "npm run check");
  for (const stage of ["lint", "typecheck", "test", "build"]) {
    assert.ok(packageJson.scripts.check.includes(`npm run ${stage}`), `Quality gate missing ${stage}`);
  }
});
