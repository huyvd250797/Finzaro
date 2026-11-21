import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createRequire} from 'node:module';
const root=resolve(import.meta.dirname,'..');
const read=path=>readFileSync(join(root,path),'utf8');
const require=createRequire(import.meta.url);
const ts=require('typescript');
const src=read('features/accounts/family-balances.ts');
const out=ts.transpileModule(src,{fileName:'family-balances.ts',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
assert.deepEqual((out.diagnostics??[]).filter(x=>x.category===ts.DiagnosticCategory.Error),[]);
const module={exports:{}};
new Function('module','exports',out.outputText)(module,module.exports);
const {familyBalanceTotals}=module.exports;

test('V4.6.9 separates spendable and reserved money without counting salary transfer as expense',()=>{
  const rows=[
    {account_type:'bank',currency_code:'VND',current_balance_minor:8_000_000,is_archived:false},
    {account_type:'family_savings',currency_code:'VND',current_balance_minor:12_000_000,is_archived:false},
    {account_type:'bank',currency_code:'USD',current_balance_minor:500,is_archived:false},
    {account_type:'family_savings',currency_code:'VND',current_balance_minor:500_000,is_archived:true},
  ];
  assert.deepEqual(familyBalanceTotals(rows,'VND'),{available:8_000_000,reserved:12_000_000,managed:20_000_000});
});

test('V4.6.9 family fund SQL enforces owner scoping, nonnegative fund, transfer-only ledger and safe metadata',()=>{
  const sql=read('supabase/migrations/20261120203000_family_savings_fund_v466.sql').toLowerCase();
  for(const part of ['auth.uid()','security definer','family_fund_create_v466','family_fund_update_v466','family_fund_transfer_v466',"account_type='family_savings'",'family_fund_nonnegative_v466','for update',"p_transaction_type=>'transfer'",'simple_transaction_ids_v120','v_total<>2 or v_family<>1','v_uid']) assert.ok(sql.includes(part),part);
  assert.doesNotMatch(sql,/cron\.schedule|market_sync|drop table|delete from public\.transactions/);
  assert.match(read('features/accounts/family-fund-actions.ts'),/rpc\("family_fund_transfer_v466"/);
});

test('V4.6.9 hides old action grid, exposes swipe left Sửa/Xóa and preserves Copy/Duplicate',()=>{
  const row=read('components/transaction-swipe-row.tsx');
  const list=read('components/transaction-list.tsx');
  for(const part of ['onTouchEnd={onTouchEnd}','dx<0','setRevealed(true)','deleteTransactionInlineAction(tx.id)','/transactions?edit=','/transactions?copy=','/transactions?duplicate=','window.confirm']) assert.ok(row.includes(part),part);
  assert.match(list,/TransactionSwipeRow/);
  assert.doesNotMatch(list,/fin-transaction-action grid size-10/);
});

test('V4.6.9 keeps failing income edits in the sheet with visible errors and pending state',()=>{
  const form=read('components/transaction-edit-form.tsx');
  const actions=read('features/transactions/actions.ts');
  for(const part of ['useActionState','state.error','role="alert"','disabled={pending}','submitLock.current','Đang cập nhật...']) assert.ok(form.includes(part),part);
  assert.match(form,/id=\{formId\} action=\{formAction\}/);
  assert.match(form,/type="submit" form=\{formId\}/);
  assert.match(actions,/updateTransactionStateAction/);
  assert.match(actions,/rpc\("update_simple_transaction_v120"/);
});

test('V4.6.9 release has seven modules and the additive one-file migration',()=>{
  assert.equal(JSON.parse(read('package.json')).version,'4.6.9');
  assert.match(read('lib/app-version.ts'),/Family Savings Fund Management|Personal Lending & Borrowing Management|Dedicated Debts & Family Funds UX/);
  assert.match(read('CHANGELOG.md'),/^## V4\.6\.9/);
  assert.equal(readdirSync(join(root,'supabase/migrations')).filter(x=>x.endsWith('.sql')).length,36);
  assert.match(read('DEPLOY_V4.6.9.md'),/migration/);
});
