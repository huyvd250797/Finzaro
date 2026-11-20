import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve,join } from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const root=resolve(import.meta.dirname,'..');
const read=(file)=>readFileSync(join(root,file),'utf8');
const require=createRequire(import.meta.url);
let ts;try{ts=require('typescript');}catch{ts=require(join(execFileSync('npm',['root','-g'],{encoding:'utf8'}).trim(),'typescript'));}
function loadTs(path,deps={}){
 const result=ts.transpileModule(read(path),{fileName:path,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,strict:true}});
 assert.deepEqual((result.diagnostics??[]).filter(d=>d.category===ts.DiagnosticCategory.Error),[]);
 const module={exports:{}};
 new Function('module','exports','require',result.outputText)(module,module.exports,(name)=>{if(name in deps)return deps[name];throw Error(`Missing stub ${name}`);});
 return module.exports;
}
const core=loadTs('features/portfolio/core.ts');
const market=loadTs('features/portfolio/market.ts',{'react':{cache:f=>f}});
const holding=(id,opts={})=>({id,kind:'stock',symbol:'MBB',name:'MBB',variant:'',exchange:'HOSE',provider:'vci',quote_currency:'VND',quantity:'200',cost_total:'4200000',manual_price:null,archived:false,...opts});

test('V4.6.2 public providers, seven modules and exact app version',()=>{
 const pkg=JSON.parse(read('package.json'));
 assert.equal(pkg.version,'4.6.2');
 assert.equal(pkg.dependencies['vnstock-js'],'2.0.0');
 assert.match(read('lib/app-version.ts'),/Automatic Market Price Sync/);
 assert.match(read('features/portfolio/actions.ts'),/kind === "stock" \? "vci"/);
 assert.match(read('components/portfolio-asset-sheet.tsx'),/Vietcap \(công khai\)/);
 assert.match(read('features/portfolio/market.ts'),/await import\("vnstock-js"\)/);
});

test('PNJ matches exact product and BUY quote even after a grouping column',()=>{
 const html='<table><tr><td>Vàng nữ trang</td><td>Nhẫn Trơn PNJ 999.9</td><td>127.800</td><td>132.000</td></tr><tr><td>Nhẫn PNJ 24k</td><td>5.000</td><td>6.000</td></tr></table>';
 assert.equal(market.parsePnjGold(html,'pnj_ring'),12780000);
 assert.equal(market.parsePnjGold(html,'sjc_bar'),null);
 assert.equal(market.parsePnjGold('<tr><td>Nhẫn Trơn PNJ 999.9</td><td>abc</td><td>132.000</td></tr>','pnj_ring'),null);
 assert.equal(market.marketQuoteKey(holding('a')),'stock:vci:MBB');
 assert.equal(market.marketQuoteKey(holding('b',{kind:'gold',provider:'pnj',variant:'pnj_ring',symbol:'GOLD9999'})),'gold:pnj:pnj_ring');
 assert.equal(market.marketQuoteKey(holding('c',{kind:'crypto',provider:'binance',symbol:'SOL'})),'crypto:binance:SOL');
});

test('Shared quote cache rejects future timestamps, zero prices, retains stale truth',()=>{
 const sync=loadTs('features/portfolio/market-sync.ts',{'@/features/portfolio/market':market});
 const now=Date.parse('2026-11-20T08:00:00Z');
 const row={quote_key:'stock:vci:MBB',price:'25000',source:'VCI',observed_at:'2026-11-20T07:59:00Z',fetched_at:'2026-11-20T07:59:30Z'};
 assert.equal(sync.cachedMarketQuote(row,'stock',now).stale,false);
 assert.equal(sync.cachedMarketQuote({...row,fetched_at:'2026-11-20T07:50:00Z'},'stock',now).stale,true);
 assert.equal(sync.cachedMarketQuote({...row,price:'0'},'stock',now),null);
 assert.equal(sync.cachedMarketQuote({...row,fetched_at:'2026-11-21T08:00:00Z'},'stock',now),null);
});

test('Two same-symbol holdings never borrow the other user-defined manual fallback price',async()=>{
 const mockMarket={marketQuoteKey:market.marketQuoteKey,portfolioMarketQuote:async()=>null,fetchMarketPositionQuote:async()=>null};
 const sync=loadTs('features/portfolio/market-sync.ts',{'@/features/portfolio/market':mockMarket});
 const db={from:()=>({select:()=>({in:async()=>({data:[],error:null})})})};
 const got=await sync.resolvePortfolioQuotes(db,[holding('a',{manual_price:'21000'}),holding('b',{manual_price:'23000'})]);
 assert.equal(got.get('a').price,21000);
 assert.equal(got.get('b').price,23000);
 assert.equal(got.get('a').type,'manual');
 assert.equal(got.get('b').stale,true);
});

test('Cached market quote becomes marked last-known on upstream failure',async()=>{
 const sync=loadTs('features/portfolio/market-sync.ts',{'@/features/portfolio/market':{
  marketQuoteKey:market.marketQuoteKey,portfolioMarketQuote:async()=>null,fetchMarketPositionQuote:async()=>{throw Error('blocked');}
 }});
 const row={quote_key:'stock:vci:MBB',price:'25500',source:'VCI',observed_at:'2026-11-18T08:00:00Z',fetched_at:'2026-11-18T08:00:00Z'};
 const db={from:()=>({select:()=>({in:async()=>({data:[row],error:null})})})};
 const got=await sync.resolvePortfolioQuotes(db,[holding('a')]);
 assert.equal(got.get('a').price,25500);
 assert.equal(got.get('a').stale,true);
 assert.match(got.get('a').source,/giá gần nhất/);
});

test('Migration has RLS, read-only user access, privileged-only write, preserves existing holdings',()=>{
 const sql=read('supabase/migrations/20261120135000_automatic_market_price_sync_v462.sql').toLowerCase();
 for(const phrase of ['portfolio_market_quotes_v462','enable row level security','grant select on public.portfolio_market_quotes_v462 to authenticated','grant select, insert, update, delete on public.portfolio_market_quotes_v462 to service_role',"provider='vci'",'portfolio_edit_v461']) assert.ok(sql.includes(phrase),phrase);
 assert.doesNotMatch(sql,/\b(?:update|delete from|insert into)\s+public\.(?:transactions|accounts|transaction_entries|investment_assets)\b/);
 assert.doesNotMatch(sql,/grant (?:insert|update|delete) on public.portfolio_market_quotes_v462 to authenticated/);
 assert.match(sql,/create or replace function public\.portfolio_update_v460/);
 assert.match(sql, /\(v_kind='stock' and p_provider in \('manual','ssi','vci'\)\)/);
 assert.match(sql, /constraint portfolio_unit_v460 check/);
});

test('Background sync route rejects unauthenticated calls, bounded jobs, no private user output',()=>{
 const source=read('app/api/portfolio/market-sync/route.ts');
 for(const phrase of ['timingSafeEqual','MARKET_SYNC_SECRET','SUPABASE_SERVICE_ROLE_KEY','createClient','marketQuoteKey','limit(1001)','return json({ error:"Unauthorized" },401)']) assert.ok(source.includes(phrase),phrase);
 assert.doesNotMatch(source,/export async function GET/);
 assert.doesNotMatch(source,/console\.log\(positions/);
});

test('Client refreshes via realtime, visibility and Binance Spot WebSocket',()=>{
 const client=read('components/portfolio-price-sync.tsx');
 assert.doesNotMatch(client,/from ["']@\/features\/portfolio\/market-sync["']/); // client must not bundle server-only pricing adapter
 for(const phrase of ['portfolio_market_quotes_v462',"window.setInterval",'router.refresh()', 'visibilitychange','wss://stream.binance.com:9443/stream?streams=','@miniTicker','onCryptoQuote']) assert.ok(client.includes(phrase),phrase);
 assert.match(read('components/portfolio-dashboard.tsx'),/Binance Spot · WebSocket/);
});

test('V4.6.2 modified TS/TSX files parse correctly',()=>{
 for(const file of ['features/portfolio/market.ts','features/portfolio/market-sync.ts','components/portfolio-price-sync.tsx','components/portfolio-dashboard.tsx','components/portfolio-asset-sheet.tsx','app/api/portfolio/market-sync/route.ts','app/(dashboard)/portfolio/page.tsx','components/portfolio-overview-card.tsx']) {
   const result=ts.transpileModule(read(file),{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}});
   assert.deepEqual((result.diagnostics??[]).filter(d=>d.category===ts.DiagnosticCategory.Error),[],file);
 }
});
