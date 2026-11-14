import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const source = readFileSync(join(root, 'features/reports/load-period-snapshot.ts'), 'utf8');
const require = createRequire(import.meta.url);
let ts;
try { ts = require('typescript'); }
catch { ts = require(join(execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim(), 'typescript')); }

function compileSnippet(code) {
  const filename = join(root, '__v422_rpc_unknown_typecheck__.ts');
  const options = { strict: true, noEmit: true, target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext, skipLibCheck: true };
  const host = ts.createCompilerHost(options);
  const original = host.getSourceFile.bind(host);
  host.getSourceFile = (path, version, onError, fresh) => path === filename
    ? ts.createSourceFile(path, code, version, true, ts.ScriptKind.TS)
    : original(path, version, onError, fresh);
  return ts.getPreEmitDiagnostics(ts.createProgram([filename], options, host))
    .filter((d) => d.category === ts.DiagnosticCategory.Error);
}

const guard = source.match(/type ReportSummaryRpcResult = \{[\s\S]*?\n\};\s*function isReportSummaryRpcResult\(value: unknown\): value is ReportSummaryRpcResult \{[\s\S]*?\n\}/)?.[0];

test('V4.2.2 narrows the unknown Supabase RPC envelope under strict TypeScript', () => {
  assert.ok(guard, 'Missing runtime type predicate for RPC response');
  const fixture = `${guard}\ndeclare const summaryResult: unknown;\nfunction inspect(): string {\n` +
    `  if (!isReportSummaryRpcResult(summaryResult)) throw new Error('invalid RPC');\n` +
    `  return summaryResult.error?.code ?? String(summaryResult.data);\n}\n`;
  assert.deepEqual(compileSnippet(fixture).map((d) => d.code), []);
  const withoutGuard = fixture.replace("  if (!isReportSummaryRpcResult(summaryResult)) throw new Error('invalid RPC');\n", '');
  assert.ok(compileSnippet(withoutGuard).some((d) => d.code === 18046), 'Fixture must reproduce TS18046');
  assert.match(source, /if \(!isReportSummaryRpcResult\(summaryResult\)\)/);
  assert.doesNotMatch(source, /summaryResult\s+as\s+any/);
});

function loaderFor(rpcResponse, counters = { ledger: 0 }) {
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  const module = { exports: {} };
  let capturedRows;
  const snapshot = { totals: { income: 0, expense: 0, net: 0 }, flows: {}, prefetchedDetails: {} };
  const bindings = {
    '@/features/transactions/data': { currencyDigits: () => 0 },
    '@/features/reports/experience': { monthBounds: () => ({ from: '2026-11-01', to: '2026-11-30' }), yearBounds: () => ({ from: '2026-01-01', to: '2026-12-31' }) },
    '@/features/reports/data': { loadReportLedger: async () => { counters.ledger++; return { transactions: [], currencies: [], diagnostics: { strategy: 'ledger', warnings: ['compatible'] } }; } },
    '@/features/reports/period-snapshot': {
      snapshotFromSummaryRows: (rows) => { capturedRows = rows; return snapshot; },
      snapshotFromTransactions: () => snapshot
    },
    '@/features/reports/reconcile-snapshot': { reconcilePeriodSnapshot: () => true },
    '@/lib/performance': { measureServerOperation: async (_label, fn) => fn() }
  };
  new Function('module', 'exports', 'require', transpiled)(module, module.exports, (name) => {
    assert.ok(name in bindings, `Unexpected dependency: ${name}`);
    return bindings[name];
  });
  const supabase = {
    from: (table) => {
      assert.equal(table, 'supported_currencies');
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ error: null, data: { code: 'VND', decimal_digits: 0 } }) }) }) };
    },
    rpc: async (name) => { assert.equal(name, 'report_period_summary_v412'); return rpcResponse; }
  };
  const run = () => module.exports.loadPeriodSnapshot(supabase, 'test-user', {
    mode: 'month', period: '2026-11', year: 2026, currency: 'VND'
  });
  return { run, counters, rows: () => capturedRows };
}

test('V4.2.2 accepts a valid RPC envelope and uses the summary without loading the ledger', async () => {
  const rows = [{ type: 'expense', id: 'food', label: 'Ăn uống', iconName: 'Shapes', iconColor: null, bucket: '2026-11-13', amount: 100, count: 1 }];
  const mock = loaderFor({ data: { rows }, error: null });
  const result = await mock.run();
  assert.equal(result.source, 'rpc');
  assert.deepEqual(mock.rows(), rows);
  assert.equal(mock.counters.ledger, 0);
});

test('V4.2.2 retains the missing-RPC compatibility fallback', async () => {
  const mock = loaderFor({ data: null, error: { code: 'PGRST202', message: 'RPC unavailable' } });
  const result = await mock.run();
  assert.equal(result.source, 'compatibility');
  assert.equal(mock.counters.ledger, 1);
  assert.deepEqual(result.warnings, ['compatible']);
});

test('V4.2.2 rejects malformed RPC results and real database errors without a full ledger fallback', async () => {
  const malformed = loaderFor({ data: { rows: [] }, error: 'unexpected' });
  await assert.rejects(malformed.run(), /Phản hồi RPC báo cáo không hợp lệ/);
  assert.equal(malformed.counters.ledger, 0);
  const serverError = loaderFor({ data: null, error: { code: 'XX000', message: 'Internal database failure' } });
  await assert.rejects(serverError.run(), (error) => error?.message === 'Internal database failure');
  assert.equal(serverError.counters.ledger, 0);
});
