import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {join} from "node:path";
const read = (name) => readFileSync(join(import.meta.dirname,"..",name),"utf8");

test("V4.6.11 creates family funds with a true opening balance rather than fake transaction",()=>{
  const sql=read("supabase/migrations/20261121190000_family_fund_opening_v4611.sql");
  const actions=read("features/accounts/family-fund-actions.ts");
  const ui=read("components/family-savings-panel.tsx");
  for(const fragment of ["family_fund_create_v4611","p_opening_balance_minor","opening_balance_minor,current_balance_minor","family_fund_openings_v4611","family_fund_declare_opening_v4611","auth.uid()","FOR UPDATE","transaction_entries"]) assert.ok(sql.includes(fragment),fragment);
  assert.doesNotMatch(sql,/INSERT INTO public\.(transactions|transaction_entries)\s*\(/i);
  assert.match(sql,/v_account\.current_balance_minor<>0/);
  assert.match(sql,/v_account\.opening_balance_minor<>0/);
  assert.match(actions,/rpc\("family_fund_create_v4611"/);
  assert.match(actions,/rpc\("family_fund_declare_opening_v4611"/);
  assert.match(ui,/name="opening_balance"/);
  assert.match(ui,/Khai báo số dư đầu kỳ/);
});

test("V4.6.11 privacy toggle is global in toolbar; numbers are masked across Dashboard",()=>{
  const header=read("components/app-header.tsx");
  const root=read("app/layout.tsx");
  const visibility=read("components/dashboard-money.tsx");
  const overview=read("app/(dashboard)/overview/page.tsx");
  const spending=read("components/spending-period-card.tsx");
  const portfolio=read("components/portfolio-overview-card.tsx");
  const list=read("components/transaction-list.tsx");
  const chart=read("components/cashflow-chart.tsx");
  assert.ok(header.indexOf("<DashboardMoneyToggle />") < header.indexOf("<ThemeToggle />"));
  assert.match(visibility,/useSyncExternalStore/);
  assert.match(visibility,/"\*\*\*\*\*\*"/);
  assert.match(root,/sessionStorage.getItem\('finzaro-dashboard-privacy-v4611'\)/);
  assert.doesNotMatch(overview,/BalanceVisibility/);
  assert.match(overview,/maskDashboardMoney/);
  for(const source of [overview,spending,portfolio,chart]) assert.match(source,/DashboardMoney/);
  assert.match(list,/maskDashboardMoney/);
  assert.match(chart,/data-fin-money/);
});

test("V4.6.11 financial trend compares grouped income/expense bars with a separate cash-balance series",()=>{
  const chart=read("components/cashflow-chart.tsx");
  assert.match(chart,/barWidth/);
  assert.match(chart,/row\.income/);
  assert.match(chart,/row\.expense/);
  assert.match(chart,/linePath/);
  assert.match(chart,/colors\.netWorth/);
  assert.match(chart,/aria-label="Biểu đồ xu hướng tài chính tương tác"/);
  assert.match(chart,/useOverlayScrollLock\(expanded\)/);
  assert.match(chart,/useDashboardMoneyHidden\(\)/);
  assert.doesNotMatch(chart,/fetch\(|router\.push\(/);
});
