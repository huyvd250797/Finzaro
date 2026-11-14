import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(join(root, path), "utf8");
const require = createRequire(import.meta.url);
const ts = (() => {
  try { return require("typescript"); }
  catch { return require(join(execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim(), "typescript")); }
})();

const isJsx = (node) => ts.isJsxElement(node) || ts.isJsxFragment(node) || ts.isJsxSelfClosingElement(node);

function inspectReactTryBlocks(file) {
  const ast = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  assert.equal(ast.parseDiagnostics.length, 0, `${file}: syntax is valid`);
  const issues = [];
  let tryCount = 0;
  const walk = (node) => {
    if (ts.isTryStatement(node)) {
      tryCount++;
      // A JSX tree constructed inside try/catch cannot be caught by that
      // catch block; React renders it later. Keep only data loading here.
      const check = (child) => {
        if (isJsx(child)) issues.push(child.getStart(ast));
        ts.forEachChild(child, check);
      };
      check(node.tryBlock);
    }
    ts.forEachChild(node, walk);
  };
  walk(ast);
  assert.ok(tryCount > 0, `${file} must still handle failed server data loads`);
  assert.deepEqual(issues, [], `${file} must not construct JSX in a try/catch`);
}

test("V4.2.1 Dashboard handles failed snapshots without constructing JSX in try/catch", () => {
  inspectReactTryBlocks("app/(dashboard)/overview/page.tsx");
  const source = read("app/(dashboard)/overview/page.tsx");
  assert.match(source, /await loadDashboardSnapshot\(/);
  assert.match(source, /if \(!snapshot\)\s*\{\s*return <div role="alert"/);
  assert.match(source, /<SpendingPeriodCard/);
  assert.match(source, /<CashflowChart/);
});

test("V4.2.1 Reports separates period-snapshot errors from JSX rendering", () => {
  inspectReactTryBlocks("app/(dashboard)/reports/page.tsx");
  const source = read("app/(dashboard)/reports/page.tsx");
  assert.match(source, /snapshot = result\.snapshot/);
  assert.match(source, /const content = snapshot\s*\? <FastReportOverview/);
  assert.match(source, /<ReportNavigation active="overview"/);
});

test("V4.2.1 trend modal retains stable focus target during effect cleanup", () => {
  const source = read("components/cashflow-chart.tsx");
  assert.match(source, /const returnFocusTarget = expandRef\.current/);
  assert.match(source, /returnFocusTarget\?\.focus\(/);
  assert.doesNotMatch(source, /window\.removeEventListener\("keydown", onKey\); expandRef\.current/);
});

test("V4.2.1 release retains strict lint, typecheck, tests, and build", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.version, "4.4.0");
  assert.match(read("lib/app-version.ts"), /APP_VERSION = "4\.4\.0"/);
  assert.equal(pkg.scripts.check, "npm run lint && npm run typecheck && npm run test && npm run build");
  assert.equal(JSON.parse(read("vercel.json")).buildCommand, "npm run check");
  assert.doesNotMatch(read("next.config.ts"), /ignoreBuildErrors|ignoreDuringBuilds/);
});
