import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { createRequire } from "node:module";

const root = resolve(import.meta.dirname, "..");
const read = (relative) => readFileSync(join(root, relative), "utf8");

for (const file of ["v412-compact-fast-periods.test.mjs", "v413-report-period-typescript-hotfix.test.mjs"]) {
  test(`${file} loads TypeScript as a project dependency rather than a machine-specific Node install`, () => {
    const contents = read(`tests/${file}`);
    assert.match(contents, /require\(['"]typescript['"]\)/);
    assert.doesNotMatch(contents, /process\.execPath\.replace\(/);
    assert.doesNotMatch(contents, /\/lib\/node_modules\/typescript/);
    const requireFromTest = createRequire(join(root, "tests", file));
    const modulePath = requireFromTest.resolve("typescript");
    assert.ok(modulePath.includes("typescript"), "Expected a resolvable TypeScript devDependency");
  });
}

test("V4.2.0 retains full quality gate and all historical test suites", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.version, "4.5.0");
  assert.equal(pkg.devDependencies.typescript, "5.9.3");
  assert.equal(pkg.scripts.test, "node --test tests/*.test.mjs");
  assert.equal(pkg.scripts.check, "npm run lint && npm run typecheck && npm run test && npm run build");
  assert.equal(JSON.parse(read("vercel.json")).buildCommand, "npm run check");
  assert.match(read("lib/app-version.ts"), /APP_VERSION = "4\.5\.0"/);
});
