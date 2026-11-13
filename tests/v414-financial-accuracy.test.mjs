import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const read = path => readFileSync(join(root, path), 'utf8');
const require = createRequire(import.meta.url);
let ts;
try { ts = require('typescript'); } catch { ts = require(join(execFileSync('npm',['root','-g'],{encoding:'utf8'}).trim(),'typescript')); }
function compiled(path, injections = {}) {
  const output = ts.transpileModule(read(path), {fileName:path, compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}, reportDiagnostics:true});
  assert.equal(output.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error).length??0,0,`${path}: syntax`);
  const mod={exports:{}};
  new Function('require','module','exports', output.outputText)((name)=>{
    assert.ok(name in injections,`Unmocked runtime import ${path}: ${name}`);
    return injections[name];
  },mod,mod.exports);
  return mod.exports;
}
const canonical = compiled('features/transactions/financial-flow.ts');
const transactionData = compiled('features/transactions/data.ts', {
  '@/features/accounts/money': {minorToMajorInput:()=>''},
  '@/lib/utils': {formatMinorMoney:()=>''},
  '@/features/transactions/financial-flow': canonical
});
const advanced = compiled('features/reports/advanced.ts', {'@/features/transactions/financial-flow': canonical});
const catScope = compiled('features/reports/category-scope.ts');
const reports = compiled('features/reports/data.ts', {
  '@/features/categories/data': {},
  '@/features/reports/category-scope':catScope,
  '@/features/transactions/data':transactionData,
  '@/features/reports/advanced':advanced
});
const statement = compiled('features/reports/statement.ts', {
  '@/features/reports/data':reports,
  '@/features/reports/advanced':advanced,
  '@/features/transactions/data':transactionData
});
const experience = compiled('features/reports/experience.ts', {'@/features/transactions/financial-flow':canonical});
const money=(id,name)=>({id,name,account_type:'bank',currency_code:'VND',institution_name:null,is_archived:false,current_balance_minor:0});
const cash=money('cash','Tiền mặt'),bank=money('bank','Ngân hàng');
function item(id,date,type,value,categoryId='food',account=cash,currency='VND',purpose='standard'){
  return {
    id, transaction_type:type,transaction_purpose:purpose,transaction_date:date,created_at:date,title:`Giao dịch ${id}`,
    category_id:categoryId, category_label:categoryId??'Chưa phân loại',notes:null,
    category:categoryId?{id:categoryId,name:categoryId,icon_name:'Shapes',icon_color:'#ff6c32',category_type:type,parent_id:null,is_archived:false}:null,
    entries:[{id:`e-${id}`,transaction_id:id,account_id:account.id,account,currency_code:currency,amount_minor:type==='expense'?-value:value,entry_role:type}]
  };
}
// Top-5 sum = 100, full expense sum = 140. Every KPI/chart/export must use 140.
const rows=[item('salary','2026-11-01','income',200,'salary',bank),
  item('bonus','2026-11-09','income',50,'bonus',bank),
  item('e1','2026-11-02','expense',40,'food',cash),
  item('e2','2026-11-03','expense',30,'rent',bank),
  item('e3','2026-11-04','expense',20,'travel',cash),
  item('e4','2026-11-05','expense',10,'health',bank),
  item('e5','2026-11-06','expense',10,'shopping',cash),
  item('e6','2026-11-07','expense',20,'education',cash),
  item('e7','2026-11-08','expense',10,null,cash),
  item('usd','2026-11-09','expense',999,'food',cash,'USD'),
  item('loan','2026-11-09','expense',999,'food',cash,'VND','loan_payment'),
  item('transfer','2026-11-09','transfer',999,'food',cash,'VND','transfer'),
  item('previous','2026-10-01','expense',25,'food',cash)];
const current=rows.filter(r=>r.transaction_date.startsWith('2026-11'));
const expected={income:250,expense:140,net:110};

function reportFor(transactions,reportType='all') {
  return {
    from:'2026-11-01',to:'2026-11-30',currency:'VND',digits:0,reportType,transactions,
    comparison: advanced.compareFinancialPeriods(transactions,[],'VND'),
    monthly:reports.monthlyCashflow(transactions,'VND','2026-11-01','2026-11-30'),
    categories:reports.categorySpending(transactions,'VND'),
    accounts:reports.accountSpending(transactions,'VND',[cash,bank])
  };
}
const sum=(arr)=>arr.reduce((n,r)=>n+r.amount,0);
test('V4.1.4 release version and CI gates include lint, typecheck, tests, build',()=>{
  assert.equal(JSON.parse(read('package.json')).version,'4.1.7');
  assert.match(read('.github/workflows/ci.yml'),/npm run lint/);
  assert.match(read('.github/workflows/ci.yml'),/npm run typecheck/);
  assert.match(read('.github/workflows/ci.yml'),/npm run test/);
  assert.match(read('.github/workflows/ci.yml'),/npm run build/);
  assert.doesNotMatch(read('next.config.ts'),/ignoreBuildErrors|ignoreDuringBuilds/);
  assert.equal(JSON.parse(read('vercel.json')).buildCommand,'npm run check');
});
test('Top-5 category display uses denominator including undisplayed categories without fake minimum',()=>{
  const top=transactionData.expenseCategories(current,'VND','2026-11');
  assert.equal(top.length,5);
  assert.equal(top[0].percent,Math.round(40/140*1000)/10);
  assert.ok(top.reduce((s,r)=>s+r.percent,0)<100,'top five must not sum to 100% when other categories exist');
  assert.match(read('app/(dashboard)/overview/page.tsx'),/width: `\$\{item.percent\}%`/);
  assert.doesNotMatch(read('features/transactions/data.ts'),/Math\.max\(4, Math\.round\(\(row\.value/);
});
test('A single canonical minor-unit policy matches dashboard, analysis, report and category drilldown',()=>{
  const month=transactionData.monthTotals(current,'VND','2026-11');
  const cashflow=reports.reportTotals(current,'VND');
  const detail=advanced.calculateFinancialTotals(current,'VND');
  const period=experience.periodFlowTotals(current,'VND');
  for(const actual of [month,cashflow,detail,period]){
    assert.equal(actual.income,expected.income);
    assert.equal(actual.expense,expected.expense);
    assert.equal(actual.net,expected.net);
  }
  const monthly=transactionData.monthlyCashflowTotals(current,'VND',['2026-11']).get('2026-11');
  assert.deepEqual([monthly.income,monthly.expense,monthly.net],[250,140,110]);
});
test('Transfers, legacy finance and foreign currency are excluded; income/expense are not double-counted',()=>{
  assert.equal(canonical.standardFlowValue(current.find(r=>r.id==='transfer'),'VND','expense'),0);
  assert.equal(canonical.standardFlowValue(current.find(r=>r.id==='loan'),'VND','expense'),0);
  assert.equal(canonical.standardFlowValue(current.find(r=>r.id==='usd'),'VND','expense'),0);
  assert.equal(canonical.standardFlowValue(current.find(r=>r.id==='e1'),'VND','expense'),40);
  assert.equal(sum(reports.categoryFlow(current,'VND','expense')),140);
  assert.equal(sum(reports.categoryFlow(current,'VND','income')),250);
  assert.equal(sum(reports.accountFlow(current,'VND',[cash,bank],'income')),250);
  assert.equal(sum(reports.accountFlow(current,'VND',[cash,bank],'expense')),140);
});
test('Export sheets show only selected flow; All separates Thu and Chi, and account totals reconcile',()=>{
  for(const [kind,expectTypes] of [['income',['Thu']],['expense',['Chi']],['all',['Chi','Thu']]]){
    const filtered=kind==='all'?current:current.filter(t=>t.transaction_type===kind);
    const report=reportFor(filtered,kind);
    assert.equal(statement.statementBalancesMatch(report),true,`reconciliation ${kind}`);
    const sheets=statement.statementSheets(report);
    const cats=sheets.find(s=>s.name==='Danh muc');const accounts=sheets.find(s=>s.name==='Tai khoan');
    for(const sheet of [cats,accounts]){
      assert.equal(sheet.rows[0][0],'Loại');
      const actualTypes=[...new Set(sheet.rows.slice(1).map(r=>r[0]))].sort();
      assert.deepEqual(actualTypes,expectTypes);
      for(const type of actualTypes){
        const total=sheet.rows.slice(1).filter(r=>r[0]===type).reduce((n,r)=>n+r[2],0);
        assert.equal(total,type==='Thu'?250:140);
      }
    }
    const transactionsSheet=sheets.find(s=>s.name==='Giao dich');
    assert.ok(transactionsSheet.rows.slice(1).every(r=>r[1]==='Thu'||r[1]==='Chi'));
  }
});
test('Reconciliation rejects inconsistent KPI or month buckets rather than exporting misleading totals',()=>{
  const report=reportFor(current);
  assert.equal(statement.statementBalancesMatch(report),true);
  const badKpi={...report,comparison:{...report.comparison,current:{...report.comparison.current,expense:141}}};
  assert.equal(statement.statementBalancesMatch(badKpi),false);
  const badMonth={...report,monthly:[{...report.monthly[0],expense:139}]};
  assert.equal(statement.statementBalancesMatch(badMonth),false);
  assert.match(read('app/api/reports/export/route.ts'),/statementBalancesMatch\(report\)/);
  assert.match(read('app/api/reports/export/route.ts'),/status: 409/);
});
test('Report filters apply exact range, account, parent-child categories, flow type and currency',()=>{
  const categories=[{id:'parent',parent_id:null},{id:'food',parent_id:'parent'}];
  const base={range:'custom',from:'2026-11-01',to:'2026-11-30',currency:'VND',account:'cash',category:'parent',type:'expense'};
  const matched=reports.filterReportTransactions(current,base,categories);
  assert.deepEqual(matched.map(r=>r.id),['e1']);
  const uncategorized=reports.filterReportTransactions(current,{...base,category:'uncategorized'},categories);
  assert.deepEqual(uncategorized.map(r=>r.id),['e7']);
  const salary=reports.filterReportTransactions(current,{...base,account:'bank',type:'income',category:'all'},categories);
  assert.deepEqual(salary.map(r=>r.id).sort(),['bonus','salary']);
});

const reconcile = compiled('features/reports/reconcile-snapshot.ts');
const periodSnapshot = (amount=40)=>({
  totals:{income:250,expense:amount,net:250-amount},
  flows:{
    income:{amount:250,slices:[{id:'salary',amount:250}],categories:[{id:'salary',amount:250,count:1,buckets:[{key:'2026-11',amount:250,count:1}]}]},
    expense:{amount,slices:[{id:'food',amount}],categories:[{id:'food',amount,count:1,buckets:[{key:'2026-11',amount,count:1}]}]}
  }
});
test('Runtime month/year snapshot reconciliation checks KPI, category, slices and buckets',()=>{
  const base=periodSnapshot();
  assert.equal(reconcile.reconcilePeriodSnapshot(base),true);
  assert.equal(reconcile.reconcilePeriodSnapshot({...base,totals:{...base.totals,net:0}}),false);
  assert.equal(reconcile.reconcilePeriodSnapshot({...base,flows:{...base.flows,expense:{...base.flows.expense,slices:[{id:'food',amount:41}]}}}),false);
  assert.equal(reconcile.reconcilePeriodSnapshot({...base,flows:{...base.flows,expense:{...base.flows.expense,categories:[{id:'food',amount:40,count:1,buckets:[{key:'2026-11',amount:39,count:1}]}]}}}),false);
  assert.match(read('app/api/reports/period-snapshot/route.ts'),/reconcilePeriodSnapshot\(snapshot\)/);
  assert.match(read('app/(dashboard)/reports/page.tsx'),/reconcilePeriodSnapshot\(snapshot\)/);
});
test('Export, PDF and on-screen statement have consistent income/expense type grouping',()=>{
  assert.match(read('app/api/reports/export/route.ts'),/reportType: filters\.type/);
  assert.match(read('app/(dashboard)/reports/statements/page.tsx'),/r\.statementCategories/);
  assert.match(read('app/(dashboard)/reports/statements/page.tsx'),/r\.statementAccounts/);
  assert.match(read('app/(dashboard)/reports/print/page.tsx'),/r\.statementCategories/);
  assert.match(read('app/(dashboard)/reports/print/page.tsx'),/r\.statementAccounts/);
});
test('Invalid calendar dates are rejected rather than silently normalized to another month',()=>{
  const bad=reports.resolveReportRange('custom','2026-02-30','2026-03-15','Asia/Ho_Chi_Minh');
  assert.equal(bad.key,'this_month');
  const good=reports.resolveReportRange('custom','2028-02-29','2028-03-15','Asia/Ho_Chi_Minh');
  assert.equal(good.key,'custom');
  assert.equal(good.from,'2028-02-29');
});
