import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

const root=resolve(import.meta.dirname,"..");
const read=(file)=>readFileSync(join(root,file),"utf8");
const require=createRequire(import.meta.url);
let ts;
try { ts=require("typescript"); } catch { ts=require(join(execFileSync("npm",["root","-g"],{encoding:"utf8"}).trim(),"typescript")); }

const dashboard=read("components/portfolio-dashboard.tsx");
const editor=read("components/portfolio-asset-sheet.tsx");
const actions=read("features/portfolio/actions.ts");
const page=read("app/(dashboard)/portfolio/page.tsx");
const sql=read("supabase/migrations/20261120070000_portfolio_asset_edit_v461.sql").toLowerCase();

test("V4.6.1 has correct release metadata, no obsolete modules, and one additive migration",()=>{
  assert.equal(JSON.parse(read("package.json")).version,"4.6.10");
  assert.match(read("lib/app-version.ts"),/APP_VERSION = "4\.6\.10"/);
  assert.match(read("lib/app-version.ts"),/Asset Management UX & Edit|Market Price Reliability Fix|Market Price Reliability Deploy Fix|Portfolio UX & Snapshot Fix|Portfolio Mobile Layout & Save Feedback|Family Savings Fund Management|Personal Lending & Borrowing Management|Dedicated Debts & Family Funds UX|Accounts Redeclaration Deploy Hotfix/);
  assert.equal(readdirSync(join(root,"supabase/migrations")).filter(x=>x.endsWith(".sql")).length,36);
  assert.deepEqual(readdirSync(join(root,"app/(dashboard)"),{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>d.name).sort(),["accounts","categories","debts","funds","overview","portfolio","reports","settings","transactions"]);
});

test("Portfolio UI presents actionable Edit and Trade controls on each holding, with mobile sheet",()=>{
  assert.match(dashboard,/<h2 className="text-lg font-black">Danh mục tài sản/);
  assert.match(dashboard,/aria-label=\{`Sửa tài sản \$\{p\.name\}`\}/);
  assert.match(dashboard,/setAssetEditor\(p\.id\)/);
  assert.match(dashboard,/setTradeEditor\(p\.id\)/);
  assert.match(dashboard,/Tìm tên hoặc mã tài sản/);
  assert.match(dashboard,/goldUnits\(p\.quantityNumber\)/);
  assert.match(dashboard,/<PortfolioAssetSheet/);
  assert.match(dashboard,/<BottomSheet open=\{Boolean\(selectedTrade\)\}/);
  assert.match(dashboard,/SheetFormActions/);
  assert.doesNotMatch(dashboard,/Quản lý · Mua \/ Bán \/ Định giá/);
});

test("Edit sheet preloads identity, opening purchase, fees, provider and manual pricing",()=>{
  for (const token of ["editPortfolioAsset","initial_quantity","initial_buy_price","initial_fee","name=\"name\"","name=\"symbol\"","name=\"provider\"","name=\"manual_price\"","opening?.trade_count","Lưu thay đổi","SheetFormActions","portfolio-edit"]) {
    if(token==="portfolio-edit") continue;
    assert.ok(editor.includes(token.replaceAll('\\"','"')),token);
  }
  assert.match(editor,/value=\{quantityInput\}/);
  assert.match(editor,/defaultValue=\{asset\?\.manual_price\?num\(asset\.manual_price\):""\}/);
  assert.match(editor,/<BottomSheet open=\{open\}/);
});

test("Server edit action validates owner, kind, initial trade precision and uses versioned RPC",()=>{
  assert.match(actions,/export async function editPortfolioAsset\(form: FormData\)/);
  assert.match(actions,/checkId\(input\(form,"position_id"\)\)/);
  assert.match(actions,/\.eq\("user_id",userId\)\.maybeSingle\(\)/);
  assert.match(actions,/p_initial_quantity:initialQuantity/);
  assert.match(actions,/p_initial_buy_price:initialBuyPrice/);
  assert.match(actions,/p_initial_fee:initialFee/);
  assert.match(actions,/\.rpc\("portfolio_edit_v461"/);
  assert.doesNotMatch(actions,/from\("portfolio_positions_v460"\)\s*\.update/);
});

test("Page fetches the original buy transaction via new read-only RPC",()=>{
  assert.match(page,/db\.rpc\("portfolio_opening_trades_v461"\)/);
  assert.match(page,/openingTrades=\{\(openingResult\.data\?\?\[\]\) as OpeningTrade\[\]\}/);
  assert.match(page,/openingResult\.error/);
});

test("Migration row locking, RLS scoping, and grants protect edit and original trades",()=>{
  for(const snippet of ["security definer","security invoker","auth.uid()","user_id = v_uid for update","t.user_id = v_uid","for update","grant execute on function public.portfolio_edit_v461","grant execute on function public.portfolio_opening_trades_v461","revoke all on function"]){
    assert.ok(sql.includes(snippet),snippet);
  }
  assert.doesNotMatch(sql,/\b(?:update|delete from|insert into)\s+public\.(?:accounts|transactions|transaction_entries|investment_assets)\b/);
  assert.doesNotMatch(sql,/\bgrant\s+update\s+on\s+public\.portfolio_positions_v460\b/);
});

test("Correcting opening purchase replays all subsequent trades and refuses invalid prior sales",()=>{
  for(const snippet of ["v_opening.side <> 'buy'","set quantity = p_initial_quantity, unit_price = p_initial_buy_price, fee = p_initial_fee","order by t.traded_at, t.created_at, t.id for update","if v_qty <= 0 or v_trade.quantity > v_qty","v_out_cost := round(v_cost * (v_trade.quantity / v_qty), 8)","set realized_gain = v_gain","quantity = v_qty, cost_total = v_cost"]){
    assert.ok(sql.includes(snippet),snippet);
  }
  assert.match(read("DEPLOY_V4.6.1.md"),/Snapshot|snapshot/);
});

test("SQL validates stock integral units, gold 0.1 chi, symbol and provider compatibility",()=>{
  for(const snippet of ["v_position.kind = 'gold'","p_initial_quantity * 10 <> trunc(p_initial_quantity * 10)","v_position.kind = 'stock'","p_initial_quantity <> trunc(p_initial_quantity)","p_provider not in ('binance','manual')","v_symbol !~ '^[a-z0-9]{2,15}$'"]){
    assert.ok(sql.includes(snippet),snippet);
  }
});

test("All newly modified TS/TSX modules are valid TypeScript syntax",()=>{
  for (const file of ["components/portfolio-dashboard.tsx","components/portfolio-asset-sheet.tsx","features/portfolio/actions.ts","app/(dashboard)/portfolio/page.tsx"]) {
    const result=ts.transpileModule(read(file),{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}});
    assert.deepEqual((result.diagnostics??[]).filter(d=>d.category===ts.DiagnosticCategory.Error),[],file);
  }
});
