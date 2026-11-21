import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const root=resolve(import.meta.dirname,'..');
const read=(p)=>readFileSync(join(root,p),'utf8');
const require=createRequire(import.meta.url);
// Resolve the project devDependency; never depend on a machine-specific global installation.
const ts=require('typescript');
function load(file, mock={}){
 const src=read(file);
 const result=ts.transpileModule(src,{fileName:file,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}});
 assert.deepEqual((result.diagnostics??[]).filter(x=>x.category===ts.DiagnosticCategory.Error),[],file);
 const module={exports:{}};
 new Function('module','exports','require',result.outputText)(module,module.exports,(name)=>{
   if(Object.hasOwn(mock,name))return mock[name];
   throw new Error(`Unexpected dependency ${name}`);
 });
 return module.exports;
}
const core=load('features/portfolio/core.ts');
const market=load('features/portfolio/market.ts',{'react':{cache:fn=>fn}});
const quote=(variant,manual_price=null)=>({id:'test',kind:'gold',symbol:'GOLD9999',name:'Nhẫn',variant,exchange:'',quote_currency:'VND',provider:'pnj',quantity:'41',cost_total:'328000000',manual_price,archived:false});
const html=`<div>Giá vàng ngày: 20/11/2026 10:05:19</div><div>(Đơn vị: ngàn đồng/lượng)</div><table><tr><th>Khu vực</th><th>Loại vàng</th><th>Giá mua</th><th>Giá bán</th></tr><tr><td>Giá vàng nữ trang</td><td>Nhẫn Trơn PNJ 999.9</td><td>127.800</td><td>132.000</td></tr><tr><td>TPHCM</td><td>SJC</td><td>129.200</td><td>134.200</td></tr></table>`;

test('V4.6.9 release retains exact retained modules and additional VCI dependency',()=>{
 assert.equal(JSON.parse(read('package.json')).version,'4.6.9');
 assert.equal(JSON.parse(read('package.json')).dependencies['vnstock-js'],'2.0.0');
 assert.match(read('lib/app-version.ts'),/Portfolio UX & Snapshot Fix|Portfolio Mobile Layout & Save Feedback|Family Savings Fund Management|Personal Lending & Borrowing Management|Dedicated Debts & Family Funds UX/);
 assert.equal(readdirSync(join(root,'supabase/migrations')).filter(n=>n.endsWith('.sql')).length,36);
 assert.equal(readdirSync(join(root,'app/(dashboard)'),{withFileTypes:true}).filter(x=>x.isDirectory()).length,9);
});
test('Shares accept only integer quantities without invalid regex; edit and trade share the same parser',()=>{
 for(const value of ['1','100','200','1000000']) assert.equal(core.parseDecimal(value,0),Number(value));
 for(const value of ['1.5','10,2','-1','1e3','1.000','']) assert.equal(core.parseDecimal(value,0),null);
 assert.equal(core.parseDecimal('12,3',1),12.3);
 assert.equal(core.parseDecimal('2,123456789012',12),2.123456789012);
 assert.equal(core.parseDecimal('22',-1),null);
 assert.match(read('features/portfolio/actions.ts'),/kind === "gold" \? 1 : 0/);
});
test('Official PNJ row parser handles leading grouping/region columns and thousand VND per LUONG',()=>{
 assert.equal(market.parsePnjGold(html,'pnj_ring'),12780000);
 assert.equal(market.parsePnjGold(html,'sjc_bar'),12920000);
 assert.equal(market.parsePnjGold(html,'other_ring'),null);
 assert.equal(market.parsePnjGold(html.replace('127.800','Không có giá'),'pnj_ring'),null);
 assert.equal(market.parsePnjPublishedAt(html),'2026-11-20T03:05:19.000Z');
});
test('PNJ never accepts selling price or wrong product as a substitute',()=>{
 const malformed='<div>(Đơn vị: ngàn đồng/lượng)</div><table><tr><td>Nhẫn Trơn PNJ 999.9</td><td>Không công bố</td><td>132.000</td></tr></table>';
 assert.equal(market.parsePnjGold(malformed,'pnj_ring'),null,'The parser must not skip missing buy and take the sell column');
});
test('Fetch PNJ uses official board URL and extracted publisher timestamp, not user cost',async()=>{
 const original=globalThis.fetch;
 let called='';
 globalThis.fetch=async(url)=>{called=String(url);return {ok:true,text:async()=>html};};
 try {
  const result=await market.fetchPNJ('pnj_ring');
  assert.equal(called,'https://www.giavang.pnj.com.vn/home');
  assert.equal(result?.price,12780000);
  assert.equal(result?.at,'2026-11-20T03:05:19.000Z');
  assert.match(result?.source??'',/PNJ/);
 }finally{globalThis.fetch=original;}
});
test('Vietcap quote normalization insists on VND/share, matching symbol and plausible range',()=>{
 const vci=load('features/portfolio/vci.ts',{'server-only':{},'next/cache':{unstable_cache:fn=>fn}});
 assert.equal(vci.normalizeVciPrice({price:22500,symbol:'MBB'},'MBB'),22500);
 assert.equal(vci.normalizeVciPrice({price:22.5,symbol:'MBB'},'MBB'),null);
 assert.equal(vci.normalizeVciPrice({price:22500,symbol:'VND'},'MBB'),null);
 assert.equal(vci.normalizeVciPrice({price:'999999999'},'MBB'),null);
 assert.equal(vci.normalizeVciPrice({price:0},'MBB'),null);
});
test('Manual fallback is explicitly labelled; no fabricated 0 price',async()=>{
 const result=await market.portfolioMarketQuoteStatus({...quote('pnj_ring','13000000'),provider:'manual'});
 assert.equal(result.quote?.price,13000000);
 assert.equal(result.quote?.type,'manual');
 const missing=await market.portfolioMarketQuoteStatus({...quote('pnj_ring'),provider:'manual'});
 assert.equal(missing.quote,null);
 assert.match(missing.problem??'',/Chưa nhập giá/);
});
test('V4.6.2 SQL limits change to portfolio provider checks and owned edit/update RPCs',()=>{
 const sql=read('supabase/migrations/20261120163000_market_price_reliability_v462.sql').toLowerCase();
 for(const needle of ['begin;','commit;','drop constraint if exists portfolio_unit_v460','portfolio_positions_v460_provider_check','provider in (\'manual\',\'ssi\',\'vci\')','security definer','auth.uid()','where id = p_position_id and user_id = v_uid','for update'])assert.ok(sql.includes(needle),needle);
 assert.doesNotMatch(sql,/\b(?:delete\s+from|truncate|drop\s+table|create\s+table)\b/);
 assert.doesNotMatch(sql,/\b(?:market_sync|cron\.schedule|service_role|supabase_realtime)\b/);
 assert.match(read('DEPLOY_V4.6.2.md'),/No Cron/);
});
test('Page displays missing quote reasons, incomplete total, and dynamic gold units',()=>{
 const page=read('app/(dashboard)/portfolio/page.tsx');
 const dash=read('components/portfolio-dashboard.tsx');
 const sheet=read('components/portfolio-asset-sheet.tsx');
 assert.match(page,/portfolioMarketQuoteStatus/);
 assert.match(dash,/quoteProblem/);
 assert.match(dash,/TỔNG ĐÃ ĐỊNH GIÁ/);
 assert.match(sheet,/goldUnits\(quantityPreview\)/);
 assert.match(sheet,/Tổng giá vốn mua đầu/);
 assert.doesNotMatch(sheet,/>12,3 chỉ = 1 cây 2 chỉ 3 phân</);
});
