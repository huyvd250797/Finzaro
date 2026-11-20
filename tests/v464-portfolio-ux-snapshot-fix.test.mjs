import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const root=resolve(import.meta.dirname,'..');
const read=(p)=>readFileSync(join(root,p),'utf8');

test('V4.6.4 adds snapshot-save and delete-asset RPCs and updates source to use them',()=>{
  const sql=read('supabase/migrations/20261120190000_portfolio_ux_snapshot_delete_v464.sql').toLowerCase();
  for(const needle of ['begin;','commit;','portfolio_save_snapshot_v464','portfolio_delete_v464','security definer','auth.uid()','on conflict(user_id,snapshot_date) do update','delete from public.portfolio_trades_v460','delete from public.portfolio_positions_v460']) assert.ok(sql.includes(needle),needle);
  const actions=read('features/portfolio/actions.ts');
  assert.match(actions,/rpc\("portfolio_save_snapshot_v464"/);
  assert.match(actions,/rpc\("portfolio_delete_v464"/);
});

test('Portfolio UX source emphasizes one-line totals and delete action',()=>{
  const dash=read('components/portfolio-dashboard.tsx');
  const sheet=read('components/portfolio-asset-sheet.tsx');
  assert.match(dash,/whitespace-nowrap text-\[clamp\(2rem,8vw,3\.25rem\)\]/);
  assert.match(sheet,/Xóa tài sản/);
  assert.match(read('README.md'),/permission denied for table portfolio_snapshots_v460/);
});
