import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const root = resolve(import.meta.dirname, '..');
const read = (file) => readFileSync(join(root, file), 'utf8');
const require = createRequire(import.meta.url);
// Resolve the project-local devDependency installed by npm on Vercel/CI.
const ts = require('typescript');

/** Regression for the TS2345 failure in V4.1.2 period-snapshot/route.ts. */
test('V4.1.3 annotates period mode as month/year and enforces PeriodArgs at construction', () => {
  const route = read('features/reports/load-period-snapshot.ts');
  const parsed = ts.createSourceFile('route.ts', route, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const declarations = [];
  function walk(node) {
    if (ts.isVariableDeclaration(node)) declarations.push(node);
    ts.forEachChild(node, walk);
  }
  walk(parsed);
  // V4.2.0 derives mode from a parameter typed as ReportPeriodRequest,
  // instead of declaring it on the route itself. This retains the TS2345 guard.
  assert.match(route, /mode: "month" \| "year"/);
  assert.match(route, /pick: ReportPeriodRequest/);
  assert.match(route, /const \{ mode, period, year, currency \} = pick/);
  const args = declarations.find((node) => node.name.getText(parsed) === 'args');
  assert.ok(args, 'period snapshot args must exist');
  assert.ok(ts.isSatisfiesExpression(args.initializer), 'verify PeriodArgs structurally at the construction site');
  assert.equal(args.initializer.type.getText(parsed), 'Parameters<typeof snapshotFromSummaryRows>[1]');
  assert.match(route, /snapshotFromSummaryRows\([^;]*, args\)/);
  assert.match(route, /snapshotFromTransactions\(ledger\.transactions, \{ \.\.\.args,/);
});

test('V4.1.3 deploy hotfix keeps the authenticated RPC and existing fallback', () => {
  assert.equal(JSON.parse(read('package.json')).version, '4.2.1');
  assert.match(read('lib/app-version.ts'), /APP_VERSION = "4\.2\.1"/);
  const route = read('app/api/reports/period-snapshot/route.ts');
  const loader = read('features/reports/load-period-snapshot.ts');
  for (const text of ['requireUser()', 'PRIVATE_HEADERS', 'loadPeriodSnapshot']) assert.ok(route.includes(text), `missing ${text}`);
  for (const text of ['report_period_summary_v412', 'loadReportLedger', 'PGRST202']) assert.ok(loader.includes(text), `missing ${text}`);
});
