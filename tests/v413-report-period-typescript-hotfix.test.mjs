import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const root = resolve(import.meta.dirname, '..');
const read = (file) => readFileSync(join(root, file), 'utf8');
const require = createRequire(import.meta.url);
const ts = require(`${process.execPath.replace(/\/bin\/node$/, '')}/lib/node_modules/typescript`);

/** Regression for the TS2345 failure in V4.1.2 period-snapshot/route.ts. */
test('V4.1.3 annotates period mode as month/year and enforces PeriodArgs at construction', () => {
  const route = read('app/api/reports/period-snapshot/route.ts');
  const parsed = ts.createSourceFile('route.ts', route, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const declarations = [];
  function walk(node) {
    if (ts.isVariableDeclaration(node)) declarations.push(node);
    ts.forEachChild(node, walk);
  }
  walk(parsed);
  const mode = declarations.find((node) => node.name.getText(parsed) === 'mode');
  assert.ok(mode, 'period mode variable must exist');
  assert.equal(mode.type?.getText(parsed), 'CategoryDrilldownMode', 'mode must not be widened to string');
  const args = declarations.find((node) => node.name.getText(parsed) === 'args');
  assert.ok(args, 'period snapshot args must exist');
  assert.ok(ts.isSatisfiesExpression(args.initializer), 'verify PeriodArgs structurally at the construction site');
  assert.equal(args.initializer.type.getText(parsed), 'Parameters<typeof snapshotFromSummaryRows>[1]');
  assert.match(route, /snapshotFromSummaryRows\([^;]*, args\)/);
  assert.match(route, /snapshotFromTransactions\(ledger\.transactions, \{ \.\.\.args,/);
});

test('V4.1.3 deploy hotfix keeps the authenticated RPC and existing fallback', () => {
  assert.equal(JSON.parse(read('package.json')).version, '4.1.3');
  assert.match(read('lib/app-version.ts'), /APP_VERSION = "4\.1\.3"/);
  const route = read('app/api/reports/period-snapshot/route.ts');
  for (const text of ['requireUser()', 'report_period_summary_v412', 'loadReportLedger', 'PGRST202', 'PRIVATE_HEADERS']) {
    assert.ok(route.includes(text), `missing ${text}`);
  }
});
