import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";

const root=resolve(import.meta.dirname,"..");
const read=(p)=>readFileSync(join(root,p),"utf8");
const require=createRequire(import.meta.url);
let ts;
try {ts=require("typescript");} catch {ts=require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript");}
function loadTs(file,deps={}) {
  const {outputText,diagnostics}=ts.transpileModule(read(file),{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,strict:true,jsx:ts.JsxEmit.ReactJSX}});
  assert.deepEqual((diagnostics??[]).filter(d=>d.category===ts.DiagnosticCategory.Error),[]);
  const mod={exports:{}};
  new Function("module","exports","require",outputText)(mod,mod.exports,(name)=>{
    if(name in deps)return deps[name];
    throw new Error(`Unexpected dependency: ${name}`);
  });
  return mod.exports;
}
const core=loadTs("features/portfolio/core.ts");
const market=loadTs("features/portfolio/market.ts",{"react":{cache:(fn)=>fn}});
const position=(partial={})=>({id:"p",kind:"stock",name:"MBB",symbol:"MBB",variant:"",exchange:"HOSE",quote_currency:"VND",provider:"ssi",quantity:"200",cost_total:"4230000",manual_price:null,archived:false,...partial});
const live=(price)=>({price,source:"test",at:"2026-11-19T11:00:00Z",type:"market"});

test("V4.6.0 version, seven modules, migration and navigation",()=>{
  assert.equal(JSON.parse(read("package.json")).version,"4.6.6");
  assert.match(read("lib/app-version.ts"),/APP_RELEASE_NAME = "Family Savings Fund Management"/);
  assert.deepEqual(readdirSync(join(root,"app/(dashboard)"),{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name).sort(),["accounts","categories","overview","portfolio","reports","settings","transactions"]);
  assert.match(read("components/app-sidebar.tsx"),/href: "\/portfolio"/);
  assert.match(read("components/mobile-nav.tsx"),/href: "\/portfolio"/);
  assert.match(read("app/(dashboard)/overview/page.tsx"),/PortfolioOverviewCard/);
});

test("VND price fields parse Vietnamese grouping, without misreading 21.150 as 21.15",()=>{
  assert.equal(core.parseVndAmount("21.150"),21150);
  assert.equal(core.parseVndAmount("13.500.000"),13500000);
  assert.equal(core.parseVndAmount("21.150,5"),21150.5);
  assert.equal(core.parseVndAmount("21,5"),21.5);
  assert.equal(core.parseDecimal("120.50",8),120.5);
  assert.equal(core.parseVndAmount("1.23.4"),null);
});

test("Gold accepts Vietnamese decimal chi and converts 12,3 chi to 1 cay 2 chi 3 phan",()=>{
  assert.equal(core.parseDecimal("12,3",1),12.3);
  assert.equal(core.goldUnits(12.3),"1 cây 2 chỉ 3 phân");
  assert.equal(core.goldUnits(0.1),"1 phân");
  assert.equal(core.goldUnits(10),"1 cây");
  assert.throws(()=>core.goldUnits(12.35));
  for(const invalid of ["12,3,4","abc","-1","1e4","2.000,5",""]){assert.equal(core.parseDecimal(invalid,1),null,invalid);}
});

test("Stock quantity, cost basis, market value and unrealized PnL are consistent",()=>{
  const priced=core.valuePosition(position(),live(25000),null);
  assert.equal(priced.valueVnd,5000000);
  assert.equal(priced.costVnd,4230000);
  assert.equal(priced.pnlVnd,770000);
  const summary=core.summarizePortfolio([priced]);
  assert.equal(summary.value,5000000);
  assert.equal(summary.percent,770000/4230000*100);
  assert.equal(summary.byKind.stock,5000000);
});

test("Crypto is never converted as 1 USDT=1 USD/VND silently",()=>{
  const crypto=position({kind:"crypto",symbol:"SOL",name:"SOL",exchange:"",quote_currency:"USDT",provider:"binance",quantity:"2.5",cost_total:"300"});
  const noFx=core.valuePosition(crypto,live(150),null);
  assert.equal(noFx.valueNative,375);
  assert.equal(noFx.valueVnd,null);
  assert.equal(core.summarizePortfolio([noFx]).missing,1);
  const withFx=core.valuePosition(crypto,live(150),25000);
  assert.equal(withFx.valueVnd,9375000);
  assert.equal(withFx.costVnd,7500000);
  assert.equal(withFx.pnlVnd,1875000);
});

test("Missing quotes are explicitly incomplete, never valued at zero",()=>{
  const missing=core.valuePosition(position(),null,null);
  assert.equal(missing.valueVnd,null);
  assert.equal(core.summarizePortfolio([missing]).value,0);
  assert.equal(core.summarizePortfolio([missing]).complete,false);
  assert.equal(core.summarizePortfolio([missing]).missing,1);
});

test("Gold 12.3 chi × VND per chi; no incorrect per-cay conversion",()=>{
  const gold=position({kind:"gold",symbol:"GOLD9999",name:"Nhẫn PNJ",variant:"pnj_ring",exchange:"",quantity:"12.3",cost_total:"150000000",provider:"pnj"});
  const priced=core.valuePosition(gold,live(13500000),null);
  assert.equal(priced.valueVnd,166050000);
  assert.equal(priced.pnlVnd,16050000);
});

test("PNJ parser requires a matched product row and a plausible bid price",()=>{
  const html='<table><tr><td>Nhẫn Trơn PNJ 999.9</td><td>13,080</td><td>13,500</td></tr><tr><td>SJC</td><td>133.200</td><td>136.200</td></tr></table>';
  assert.equal(market.parsePnjGold(html,"pnj_ring"),13080000);
  assert.equal(market.parsePnjGold(html,"sjc_bar"),13320000);
  assert.equal(market.parsePnjGold('<table><tr><td>Nhẫn PNJ 24k</td><td>Không có dữ liệu</td><td>0</td></tr></table>',"pnj_ring"),null);
  assert.equal(market.parsePnjGold(html,"other_ring"),null);
});

test("Binance uses public market-only ticker symbol endpoint",async()=>{
  const original=globalThis.fetch;
  let called="";
  globalThis.fetch=async(url)=>{called=String(url);return {ok:true,json:async()=>({symbol:"SOLUSDT",price:"150.25"})};};
  try {
    const quote=await market.fetchBinance("SOL");
    assert.equal(quote.price,150.25);
    assert.match(called,/data-api\.binance\.vision\/api\/v3\/ticker\/price\?symbol=SOLUSDT/);
    assert.equal(await market.fetchBinance("ABC!"),null);
  } finally {globalThis.fetch=original;}
});

test("SSI without credentials never fakes a stock price",async()=>{
  const oldId=process.env.SSI_CONSUMER_ID,oldSecret=process.env.SSI_CONSUMER_SECRET;
  delete process.env.SSI_CONSUMER_ID;delete process.env.SSI_CONSUMER_SECRET;
  try {assert.equal(await market.fetchSSI("MBB","HOSE"),null);} finally {
    if(oldId!==undefined)process.env.SSI_CONSUMER_ID=oldId;
    if(oldSecret!==undefined)process.env.SSI_CONSUMER_SECRET=oldSecret;
  }
});

test("SQL migration isolates old investment assets, enforces RLS and atomic trades",()=>{
  const sql=read("supabase/migrations/20261119220000_multi_asset_portfolio_v460.sql").toLowerCase();
  for(const text of ["create table if not exists public.portfolio_positions_v460","create table if not exists public.portfolio_trades_v460","create table if not exists public.portfolio_fx_v460","create table if not exists public.portfolio_snapshots_v460","auth.uid()","for update","security definer","p_quantity>v_position.quantity","round(v_position.cost_total*(p_quantity/nullif(v_position.quantity,0)),8)","portfolio_gold_granularity_v460"]){assert.ok(sql.includes(text),text);}
  assert.doesNotMatch(sql,/\b(?:update|delete from|insert into)\s+public\.(?:investment_assets|transactions|accounts)\b/);
  assert.match(sql,/grant execute on function public\.portfolio_create_v460/);
  assert.match(sql,/grant select on public\.portfolio_positions_v460/);
  assert.doesNotMatch(sql,/grant insert\s*\([^)]*\) on public\.portfolio_positions_v460 to authenticated/);
});

test("Portfolio user-facing UI supports gold view toggle, quote provenance, trade, snapshots and restore",()=>{
  const code=read("components/portfolio-dashboard.tsx");
  for(const phrase of ["goldUnits(p.quantityNumber)","savePortfolioFx","savePortfolioSnapshot","portfolioTrade","updatePortfolioPosition","Mua thêm","Bán bớt","Khôi phục","Chưa có giá hợp lệ","Đã thực hiện","Thêm tài sản"]){assert.ok(code.includes(phrase),phrase);}
  assert.match(read("features/portfolio/actions.ts"),/p_fee:fee/);
  assert.match(read("features/portfolio/market.ts"),/marketUsdtVnd/);
});

