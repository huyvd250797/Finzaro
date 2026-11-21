import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root=resolve(import.meta.dirname,'..');
const read=(p)=>readFileSync(join(root,p),'utf8');
const dirs=()=>readdirSync(join(root,'app/(dashboard)'),{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name).sort();

test('V4.6.9 introduces two independent modules without altering current Supabase schema',()=>{
  assert.equal(JSON.parse(read('package.json')).version,'4.6.12');
  assert.match(read('lib/app-version.ts'),/APP_VERSION = "4\.6\.12"/);
  assert.match(read('lib/app-version.ts'),/Dedicated Debts & Family Funds UX|Accounts Redeclaration Deploy Hotfix|Keyboard-Safe Forms & Family Fund Deletion/);
  assert.deepEqual(dirs(),['accounts','categories','debts','funds','overview','portfolio','reports','settings','transactions']);
  assert.equal(readdirSync(join(root,'supabase/migrations')).filter(f=>f.endsWith('.sql')).length,38);
  assert.ok(existsSync(join(root,'app/(dashboard)/debts/page.tsx')));
  assert.ok(existsSync(join(root,'app/(dashboard)/funds/page.tsx')));
});

test('Both new modules are discoverable on desktop and iPhone More menu',()=>{
  for(const path of ['/debts','/funds']){
    assert.ok(read('components/app-sidebar.tsx').includes(`href: "${path}"`));
    assert.ok(read('components/mobile-nav.tsx').includes(`href: "${path}"`));
  }
  assert.match(read('scripts/check-release.mjs'),/"funds", "debts"/);
});

test('Personal debt forms open fullscreen dialogs instead of extending cards',()=>{
  const source=read('components/personal-debt-panel.tsx');
  assert.match(source,/import \{ BottomSheet \}/);
  assert.match(source,/label="Tạo khoản công nợ" panelClassName="fin-fullscreen-sheet/);
  assert.match(source,/label=\{`Thanh toán \$\{debt\.title\}`\}/);
  assert.match(source,/label=\{`Sửa công nợ \$\{debt\.title\}`\}/);
  assert.match(source,/onSubmit=\{stampKey\}/);
  assert.match(source,/pendingLabel="Đang xử lý\.\.\."/);
  assert.match(source,/onClose=\{\(\)=>setShowPay\(false\)\}/);
});

test('Family saving create, edit, transfer use fullscreen mobile modals',()=>{
  const source=read('components/family-savings-panel.tsx');
  assert.match(source,/label="Tạo quỹ gia đình" panelClassName="fin-fullscreen-sheet/);
  assert.match(source,/label=\{mode==="deposit"\?"Gửi tiền vào quỹ":"Rút tiền khỏi quỹ"\}/);
  assert.match(source,/label=\{`Sửa \$\{account\.name\}`\}/);
  assert.match(source,/PendingSubmitButton idleLabel="Tạo quỹ tiết kiệm"/);
  assert.doesNotMatch(source,/showCreate&&<form action=\{createFamilyFundAction\} className="mt-4/);
});

test('Dashboard cards show fund cash and receivable/payable debt with quick actions',()=>{
  const overview=read('app/(dashboard)/overview/page.tsx');
  for(const path of ['/funds','/debts','/funds?new=1','/debts?new=1']) assert.ok(overview.includes(`href="${path}"`));
  for(const label of ['Quỹ gia đình','Công nợ cá nhân','Người khác nợ tôi','Tôi đang nợ']) assert.ok(overview.includes(label));
  assert.match(overview,/personal_debts_v467/);
  assert.match(overview,/family_savings/);
});

test('Existing financial actions now redirect to independent modules with unchanged RPCs',()=>{
  const debt=read('features/debts/actions.ts');
  const fund=read('features/accounts/family-fund-actions.ts');
  assert.match(debt,/return `\/debts\?/);
  assert.match(fund,/redirect\(`\/funds\?/);
  for(const rpc of ['personal_debt_create_v467','personal_debt_repay_v467','personal_debt_update_v467']) assert.ok(debt.includes(`rpc("${rpc}"`));
  for(const rpc of ['family_fund_create_v4611','family_fund_transfer_v466','family_fund_update_v466']) assert.ok(fund.includes(`rpc("${rpc}"`));
  assert.doesNotMatch(read('DEPLOY_V4.6.9.md'),/run new SQL|tạo migration mới/i);
});
