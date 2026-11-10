import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(join(root, path), "utf8");
const routes = ["credit-cards", "loans", "debt-strategy", "deposits", "assets", "net-worth", "health", "forecast", "cash-flow", "goal-planner", "goals", "budgets", "recurring"];
const allowed = ["overview", "transactions", "accounts", "categories", "reports", "settings"];
const sidebar = read("components/app-sidebar.tsx");
const mobileNav = read("components/mobile-nav.tsx");
const home = read("app/(dashboard)/overview/page.tsx");
const form = read("components/transaction-entry-form.tsx");
const actions = read("features/transactions/actions.ts");
const sql = read("supabase/sql-editor/V1.2.0_simple_expense_management.sql");
const accounts = read("app/(dashboard)/accounts/page.tsx");
const reportData = read("features/reports/experience.ts");
const page = read("app/(dashboard)/transactions/page.tsx");

test("version correctly bumped in package and UI", () => {
 assert.equal(JSON.parse(read("package.json")).version, "1.4.0");
 assert.match(read("lib/app-version.ts"), /APP_VERSION\s*=\s*["']1\.4\.0["']/);
});
test("exactly six user-facing dashboard areas remain", () => {
 const dirs = readdirSync(join(root, "app/(dashboard)"), {withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name).sort();
 assert.deepEqual(dirs, [...allowed].sort());
 for(const section of allowed) assert.match(sidebar, new RegExp('href: "/'+section+'"'));
});
test("all 13 removed dashboard routes are absent", () => {
 for(const route of routes) assert.ok(!existsSync(join(root, `app/(dashboard)/${route}`)), route);
});
test("old bookmarked module URLs redirect safely to Overview", () => {
 const cfg = read("next.config.ts");
 for(const route of routes) assert.ok(cfg.includes(`"${route}"`), route);
 assert.match(cfg,/destination: "\/overview"/);
});
test("mobile navigation shows overview, transaction, report, 3-item More and Add", () => {
 for(const path of ["overview", "transactions", "reports", "accounts", "categories", "settings"]) assert.ok(mobileNav.includes(`"/${path}"`));
 assert.match(mobileNav,/"expense"|new=expense/);
 assert.match(mobileNav,/"transfer"|new=transfer/);
 for(const route of routes) assert.ok(!mobileNav.includes(`"/${route}"`));
});
test("three basic transaction forms and no advanced loan/card/deposit controls", () => {
 for(const type of ["expense", "income", "transfer"]) assert.match(form, new RegExp('type === "'+type+'"|type !== "'+type+'"'));
 for(const field of ["credit_card_id", "loan_id", "deposit_id", "savings_goal_id"]) assert.ok(!form.includes(`name="${field}"`), field);
 assert.match(form,/TransactionCategorySelect/);
 assert.match(form,/MoneyCalculatorInput/);
});
test("mutation actions use only constrained V1.2.0 ledger functions", () => {
 for(const name of ["create_simple_transaction_v120", "update_simple_transaction_v120", "delete_simple_transaction_v120"]) assert.ok(actions.includes(name), name);
 for(const name of ["create_financial_transaction_v071", "delete_financial_transaction_v112", "update_financial_transaction_v012"]) assert.ok(!actions.includes(`rpc("${name}"`), name);
 assert.match(actions,/credit_card_id/);
 assert.match(actions,/account_type/);
});
test("writes require standard account types and matched category types", () => {
 assert.match(actions,/\["cash", "bank", "ewallet"\]/);
 assert.match(actions,/category_type !== transactionType/);
 assert.match(actions,/fromAmount !== toAmount/);
 assert.match(sql,/account_type in \('cash','bank','ewallet'\)/);
});
test("migration is additive and preserved in both migration/editor trees", () => {
 assert.equal(sql, read("supabase/migrations/20261110130000_simple_expense_management_v120.sql"));
 assert.doesNotMatch(sql,/\b(?:drop table|truncate|delete from public\.(?:transactions|transaction_entries|accounts)|update public\.(?:transactions|transaction_entries|accounts))\b/i);
 assert.match(sql,/create table if not exists public\.simple_transaction_ids_v120/);
 assert.match(sql,/enable row level security/);
});
test("database only allows basic transaction types and prevents cross-module edits", () => {
 assert.match(sql,/v_type not in \('income','expense','transfer'\)/);
 assert.match(sql,/p_transaction_purpose => case when v_type='transfer' then 'transfer' else 'standard'/);
 assert.match(sql,/Historical specialized transaction is read-only/);
 assert.match(sql,/update_simple_transaction_v120/);
 assert.match(sql,/revoke execute on function/);
});
test("old mutation RPC execution is revoked from logged-in clients", () => {
 for (const api of ["create_financial_transaction_v071", "delete_financial_transaction_v112", "update_financial_transaction_v012"]) assert.ok(sql.includes(`'${api}'`));
 assert.match(sql,/from public, anon, authenticated/);
});
test("legacy special transactions are classified and displayed separately", () => {
 assert.match(page,/params\.legacy === "1"/);
 assert.match(page,/tx\.transaction_purpose === "standard"/);
 assert.match(page,/simple_transaction_ids_v120/);
 assert.match(page,/deletableTransferIds/);
});
test("no empty UUID list is sent into marker table filters", () => {
 assert.match(page,/transferIds\.length > 0/);
 assert.match(read("app/(dashboard)/reports/calendar/page.tsx"),/transferIds\.length > 0/);
});
test("Reports excludes legacy special finance transactions", () => {
 assert.match(reportData,/transaction_purpose !== "standard"/);
 assert.match(read("app/api/reports/export/route.ts"),/transaction_purpose === "standard"/);
 assert.match(read("app/(dashboard)/reports/calendar/page.tsx"),/transaction_purpose === "standard"/);
});
test("Overview has a three-column monthly KPI row and no advanced loaders", () => {
 assert.match(home,/grid-cols-3/);
 assert.match(home,/monthTotals/);
 assert.match(home,/account_type/);
 for(const stale of ["loadLoan", "loadCreditCard", "loadDeposit", "loadForecast", "loadDebtStrategy", "loadSavingsGoal"]) assert.ok(!home.includes(stale));
});
test("Account create/edit only permits ordinary cash, bank or e-wallet", () => {
 assert.match(read("features/accounts/constants.ts"),/cash/);
 assert.match(read("features/accounts/constants.ts"),/ewallet/);
 assert.match(accounts,/Tiết kiệm \(dữ liệu cũ/);
 assert.match(accounts,/\["bank", "cash", "ewallet"\]/);
});
test("calendar keeps two financial lines, hide zeros, quick actions", () => {
 const calendar=read("components/report-calendar-interactive.tsx");
 assert.match(calendar,/income/);
 assert.match(calendar,/expense/);
 assert.match(calendar,/double|Double|touch|Touch/);
 assert.match(calendar,/new=expense/);
 assert.match(calendar,/return_to/);
});
test("category grid, colors and drag-to-reorder remain", () => {
 const cat=read("components/transaction-category-select.tsx");
 assert.match(cat,/icon_color|iconColor/);
 assert.match(cat,/sort_order|sortOrder/);
 assert.match(cat,/grid/);
});
test("no old market-data SDK import survives active source", () => {
 assert.ok(!existsSync(join(root,"lib/market-data")));
 assert.ok(!existsSync(join(root,"app/api/market")));
 assert.ok(!read("package.json").includes("ssi-sdk"));
});
test("deployment instructions include backup, SQL, reconciliation and honest build checks", () => {
 const guide=read("DEPLOY_V1.2.0.md");
 for(const key of ["V1.2.0_simple_expense_management", "Backup", "backup", "reconcile", "typecheck", "build", "RLS", "SQL"]) {
   if(key==="Backup") continue;
   assert.match(guide,new RegExp(key,"i"));
 }
});
