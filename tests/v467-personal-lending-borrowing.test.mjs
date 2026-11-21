import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createRequire} from 'node:module';
const root=resolve(import.meta.dirname,'..');
const read=(file)=>readFileSync(join(root,file),'utf8');
const require=createRequire(import.meta.url);
const ts=require('typescript');
const code=ts.transpileModule(read('features/debts/core.ts'),{fileName:'core.ts',reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
assert.deepEqual((code.diagnostics??[]).filter(x=>x.category===ts.DiagnosticCategory.Error),[]);
const module={exports:{}};
new Function('module','exports',code.outputText)(module,module.exports);
const {personalDebtTotals,debtLifecycle}=module.exports;
const loan=(partial={})=>({id:'l',user_id:'u',direction:'receivable',party_name:'Anh A',title:'Cho vay',original_principal_minor:10000000,outstanding_minor:6000000,started_on:'2026-11-01',due_on:'2026-11-30',annual_interest_rate:null,notes:null,archived:false,created_at:'2026-11-01',...partial});

test('V4.6.9 totals receivables, payables, and net without mixing cash or family savings',()=>{
 const items=[loan(),loan({id:'p',direction:'payable',original_principal_minor:5000000,outstanding_minor:3000000}),loan({id:'a',archived:true,outstanding_minor:0})];
 assert.deepEqual(personalDebtTotals(items),{receivable:6000000,payable:3000000,net:3000000,active:2});
 assert.deepEqual(personalDebtTotals([]),{receivable:0,payable:0,net:0,active:0});
});
test('Due-date and settlement statuses are based on actual outstanding and Vietnam-local today',()=>{
 assert.equal(debtLifecycle(loan({due_on:'2026-11-20'}),'2026-11-21'),'overdue');
 assert.equal(debtLifecycle(loan({due_on:'2026-11-25'}),'2026-11-21'),'upcoming');
 assert.equal(debtLifecycle(loan({due_on:'2026-12-30'}),'2026-11-21'),'active');
 assert.equal(debtLifecycle(loan({outstanding_minor:0}),'2026-11-21'),'settled');
 assert.equal(debtLifecycle(loan({archived:true,outstanding_minor:0}),'2026-11-21'),'archived');
});
test('Migration creates only dedicated personal debt tables with owner RLS and guarded grants',()=>{
 const sql=read('supabase/migrations/20261121150000_personal_lending_borrowing_v467.sql').toLowerCase();
 for(const token of ['create table if not exists public.personal_debts_v467','create table if not exists public.personal_debt_events_v467','enable row level security','auth.uid()','grant select on public.personal_debts_v467','grant select on public.personal_debt_events_v467','revoke all on public.personal_debts_v467','revoke all on public.personal_debt_events_v467','security definer','set search_path=\'\'']) assert.ok(sql.includes(token),token);
 assert.doesNotMatch(sql,/\bdrop\s+table\b|\btruncate\b|cron\.schedule|supabase_realtime/);
});
test('Principal uses transfer-only purpose and never counts as standard income/expense',()=>{
 const sql=read('supabase/migrations/20261121150000_personal_lending_borrowing_v467.sql');
 assert.match(sql,/transaction_type,transaction_purpose,title,category_label/);
 assert.match(sql,/VALUES\(p_user_id,'transfer','personal_debt'/);
 assert.match(sql,/CASE WHEN p_delta_minor>0 THEN 'transfer_in' ELSE 'transfer_out' END/);
 assert.match(sql,/personal_debt_cash_v467\(v_uid,p_account_id,v_delta/);
 assert.match(sql,/p_transaction_purpose=>'standard'/);
 assert.match(sql,/p_transaction_type=>v_interest_type/);
});
test('Old debts do not re-post money; cash creation and repayment remain transactionally atomic',()=>{
 const sql=read('supabase/migrations/20261121150000_personal_lending_borrowing_v467.sql');
 for(const token of ["p_mode='cash'", "p_mode NOT IN ('cash','existing')", "p_account_id IS NOT NULL", "FOR UPDATE", "p_principal_minor>v_loan.outstanding_minor", "p_request_key", "UNIQUE(user_id,request_key)", "current_balance_minor=current_balance_minor+p_delta_minor"]) assert.ok(sql.includes(token),token);
 assert.match(sql,/CREATE OR REPLACE FUNCTION public.personal_debt_repay_v467/);
 assert.match(sql,/UPDATE public.personal_debts_v467 SET outstanding_minor=outstanding_minor-p_principal_minor/);
});
test('Only historical no-cash loans may be deleted; funded debt audit cannot be destroyed',()=>{
 const sql=read('supabase/migrations/20261121150000_personal_lending_borrowing_v467.sql');
 assert.match(sql,/CREATE OR REPLACE FUNCTION public.personal_debt_delete_unposted_v467/);
 assert.match(sql,/event_type<>'opening_existing' OR cash_transaction_id IS NOT NULL OR interest_transaction_id IS NOT NULL/);
 assert.match(sql,/IF v_count>0 THEN RAISE EXCEPTION/);
});
test('Accounts embeds a mobile-friendly personal debt panel and server actions call owner RPCs',()=>{
 const page=read('app/(dashboard)/debts/page.tsx');
 const panel=read('components/personal-debt-panel.tsx');
 const actions=read('features/debts/actions.ts');
 for(const tag of ['PersonalDebtPanel','personal_debts_v467','personal_debt_events_v467','managedBalance']) assert.ok(page.includes(tag),tag);
 for(const tag of ['Người khác nợ tôi','Tôi đang nợ','Thu hồi nợ','Trả nợ','Nợ cũ','Lãi đã ghi nhận','onSubmit={stampKey}','PendingSubmitButton','Xóa dư nợ cũ']) assert.ok(panel.includes(tag),tag);
 for(const rpc of ['personal_debt_create_v467','personal_debt_repay_v467','personal_debt_update_v467','personal_debt_delete_unposted_v467']) assert.ok(actions.includes(`rpc("${rpc}"`),rpc);
});
test('Release remains seven modules and V4.6.9 includes a new migration',()=>{
 assert.equal(JSON.parse(read('package.json')).version,'4.6.12');
 assert.match(read('lib/app-version.ts'),/Personal Lending & Borrowing Management|Dedicated Debts & Family Funds UX|Accounts Redeclaration Deploy Hotfix|Keyboard-Safe Forms & Family Fund Deletion/);
 assert.match(read('CHANGELOG.md'),/^## V4\.6\.12/);
 assert.equal(readdirSync(join(root,'supabase/migrations')).filter(s=>s.endsWith('.sql')).length,38);
 const routes=readdirSync(join(root,'app/(dashboard)'),{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name).sort();
 assert.deepEqual(routes,['accounts','categories','debts','funds','overview','portfolio','reports','settings','transactions']);
});
