import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (filename) => readFileSync(join(root, filename), 'utf8');
const require = createRequire(import.meta.url);
const ts = require('typescript');

function loadFormat() {
  const source = read('features/portfolio/display.ts');
  const result = ts.transpileModule(source, { fileName:'display.ts', reportDiagnostics:true,
    compilerOptions: { target:ts.ScriptTarget.ES2022, module:ts.ModuleKind.CommonJS } });
  assert.deepEqual((result.diagnostics ?? []).filter(d => d.category===ts.DiagnosticCategory.Error), []);
  const module = { exports: {} };
  new Function('module','exports',result.outputText)(module,module.exports);
  return module.exports;
}

test('V4.6.9 formats VND with the dong sign on the same line even for negative and large numbers', () => {
  const { formatDong, formatMarketAmount } = loadFormat();
  for(const [amount,expected] of [
    [580195827,'580.195.827\u00a0₫'],
    [-280000,'-280.000\u00a0₫'],
    [0,'0\u00a0₫'],
    [574000000,'574.000.000\u00a0₫']
  ]) assert.equal(formatDong(amount), expected);
  assert.equal(formatMarketAmount(14700,'VND'),'14.700\u00a0₫');
  assert.equal(formatMarketAmount(72.73,'USDT'),'72,73\u00a0USDT');
  assert.equal(formatDong(580195827).includes(' đ'),false);
});

test('V4.6.9 hero amount has full width and action buttons occupy a separate row', () => {
  const dash=read('components/portfolio-dashboard.tsx');
  const amount=dash.indexOf('<AmountLine amount={summary.value} size="hero"/>');
  const actions=dash.indexOf('aria-label="Thao tác tài sản"');
  assert.ok(amount > 0 && actions > amount,'Full-width total must appear before independent action row');
  assert.match(dash,/grid-cols-\[52px_minmax\(0,1fr\)\]/);
  assert.match(dash,/grid grid-cols-2 gap-2/);
  assert.match(dash,/formatMarketAmount\(p\.quote\.price,p\.quote_currency\)/);
  assert.doesNotMatch(dash,/VND quy đổi<\/p>/);
});

test('V4.6.9 save feedback stays visible and disables repeat submission in a sheet portal', () => {
  const sheet=read('components/portfolio-asset-sheet.tsx');
  const footer=read('components/sheet-form-actions.tsx');
  assert.match(footer,/createPortal/,'Sheet footer is portaled outside DOM form');
  assert.match(sheet,/useActionState\(/);
  assert.match(sheet,/action=\{saveAction\}/);
  assert.match(sheet,/saveLocked\.current \|\| saving/);
  assert.match(sheet,/disabled=\{saving\} aria-busy=\{saving\}/);
  assert.match(sheet,/LoaderCircle className="size-4 animate-spin"/);
  assert.match(sheet,/Đang lưu thay đổi\.\.\./);
  assert.match(sheet,/Đang thêm tài sản\.\.\./);
  assert.match(sheet,/aria-live="polite"/);
});

test('V4.6.9 retains seven modules, unchanged SQL migration count and no scheduled price sync',()=>{
  assert.equal(JSON.parse(read('package.json')).version,'4.6.11');
  assert.match(read('lib/app-version.ts'),/APP_VERSION = "4\.6\.11"/);
  assert.match(read('README.md'),/Current release: Finzaro V4\.6\.11/);
  assert.match(read('CHANGELOG.md'),/^## V4\.6\.11/);
  assert.equal(readdirSync(join(root,'supabase/migrations')).filter(f=>f.endsWith('.sql')).length,37);
  assert.match(read('DEPLOY_V4.6.5.md'),/Không có migration mới/);
  assert.doesNotMatch(read('DEPLOY_V4.6.9.md'),/cron\.schedule/);
});
