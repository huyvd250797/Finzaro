import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(join(root, path), 'utf8');
const require = createRequire(import.meta.url);
// Resolve the project-local devDependency installed by npm on Vercel/CI.
const ts = require('typescript');
function load(path, deps = {}) {
  const compiled = ts.transpileModule(read(path), {fileName:path, compilerOptions: {target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
  const module = {exports:{}};
  new Function('require','module','exports',compiled.outputText)((name)=>{
    if (!(name in deps)) throw new Error(`Unexpected import: ${name}`);
    return deps[name];
  },module,module.exports);
  return module.exports;
}
const canonical = load('features/transactions/financial-flow.ts');
const experience = load('features/reports/experience.ts', { '@/features/transactions/financial-flow': canonical });
const drilldown = load('features/reports/category-drilldown.ts', {'@/features/reports/experience':experience});
const period = load('features/reports/period-snapshot.ts', {
  '@/features/categories/icons': {iconColorValue:color=>color??'#0d8b66'},
  '@/features/reports/category-drilldown':drilldown,
  '@/features/reports/category-detail-preview':{buildInstantCategoryDetails:()=>({})},
  '@/features/reports/experience':experience
});
const args = (mode, periodKey, year) => ({mode, period:periodKey, year, from:`${periodKey}-01`, to:`${periodKey}-30`, periodLabel:'Kiểm thử', currency:'VND',digits:0});
const row = (type,id,bucket,amount,count=1) => ({type,id,label:id??'Chưa phân loại',iconName:'Utensils',iconColor:'#ff6500',bucket,amount,count});

test('V4.1.2 report entry is compact: no oversized cash-retention CTA or advanced shortcut',()=>{
  assert.equal(JSON.parse(read('package.json')).version,'4.5.0');
  const page=read('app/(dashboard)/reports/page.tsx');
  assert.doesNotMatch(page,/Hiệu quả dòng tiền|HIỆU QUẢ DÒNG TIỀN|Tỷ lệ giữ lại trong kỳ|Phân tích nâng cao|fin-retention-card/);
  assert.match(page,/<FastReportOverview/);
  assert.match(read('components/fast-report-overview.tsx'),/<FinanceMetricCard/);
  assert.doesNotMatch(read('components/report-navigation.tsx'),/Phân tích/,'Analysis tab must be removed in V4.2.0');
});

test('fast SQL aggregates only standard income/expense, currency-scoped user-owned ledger entries',()=>{
  const sql=read('supabase/migrations/20261113160000_report_period_summary_v412.sql');
  for (const fragment of [
    'security invoker', 'auth.uid()', 't.user_id = (select auth.uid())',
    "e.entry_role = t.transaction_type", "coalesce(t.transaction_purpose, 'standard') = 'standard'",
    "e.currency_code = upper(p_currency)", "t.transaction_type in ('income', 'expense')",
    'sum(abs(e.amount_minor::numeric))', 'count(*)', 'jsonb_build_object',
    'revoke all on function', 'grant execute on function', "p_mode not in ('month', 'year')"
  ]) assert.ok(sql.includes(fragment),`missing ${fragment}`);
  assert.doesNotMatch(sql,/drop table|delete from public\.transactions|update public\.transactions/i);
});

test('month summary has all 28/29/30/31 days and consistent category totals',()=>{
  const rows=[row('expense','food','2028-02-01',15000,2),row('expense','food','2028-02-29','25000',1),row('expense','travel','2028-02-03',5000),row('income','salary','2028-02-20',100000)];
  const snapshot=period.snapshotFromSummaryRows(rows,args('month','2028-02',2028));
  assert.equal(snapshot.flows.expense.categories.find(x=>x.id==='food').buckets.length,29);
  assert.equal(snapshot.flows.expense.categories.find(x=>x.id==='food').buckets[28].amount,25000);
  assert.equal(snapshot.flows.expense.categories.find(x=>x.id==='food').count,3);
  assert.deepEqual(snapshot.totals,{income:100000,expense:45000,net:55000});
  assert.equal(snapshot.flows.expense.slices[0].color,'#ff6500');
  for (const [month,days] of [['2027-02',28],['2026-04',30],['2026-12',31]]){
    const parsed=period.snapshotFromSummaryRows([row('expense','food',`${month}-01`,1)],args('month',month,2026));
    assert.equal(parsed.flows.expense.categories[0].buckets.length,days);
  }
});

test('year summary yields 12 monthly columns including zero months, with uncategorized handling',()=>{
  const rows=[row('expense',null,'2026-02','15000',2),row('expense','food','2026-12',9000),row('income','salary','2026-09',40000)];
  const snapshot=period.snapshotFromSummaryRows(rows,args('year','2026-11',2026));
  const unc=snapshot.flows.expense.categories.find(item=>item.id==='uncategorized-expense');
  assert.equal(unc.buckets.length,12);assert.equal(unc.buckets[1].count,2);
  assert.equal(unc.buckets[0].amount,0);
  assert.equal(snapshot.totals.expense,24000);
  assert.equal(snapshot.totals.net,16000);
});

test('period switches are client-only, cache bounded, and API is private with SQL compatibility fallback',()=>{
  const controls=read('components/fast-report-overview.tsx');
  for(const part of ['window.history.pushState','window.addEventListener("popstate"','maxPeriods = 12','ttlMs = 90_000',
    'fetchPeriod(next)', 'requestSequence.current', 'finzaro:report-flow-change', 'setLoading(true)']) assert.ok(controls.includes(part),part);
  assert.doesNotMatch(controls,/router\.push\(|router\.refresh\(/);
  const api=read('app/api/reports/period-snapshot/route.ts');
  const loader=read('features/reports/load-period-snapshot.ts');
  for(const part of ['requireUser()', 'loadPeriodSnapshot', '"Cache-Control": "private, no-store, max-age=0"']) assert.ok(api.includes(part),part);
  for(const part of ['report_period_summary_v412','snapshotFromSummaryRows','loadReportLedger','snapshotFromTransactions','PGRST202']) assert.ok(loader.includes(part),part);
  assert.match(loader,/ledger\.diagnostics\.strategy === "empty"/);
});
