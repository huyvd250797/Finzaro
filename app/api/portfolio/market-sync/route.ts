/** Authenticated internal scheduler endpoint. Never expose service key / holdings to clients. */
import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Position } from "@/features/portfolio/core";
import { fetchMarketPositionQuote, marketQuoteKey } from "@/features/portfolio/market";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const json = (body: object, status = 200) => Response.json(body, { status, headers:{ "Cache-Control":"no-store" } });
function authorized(request: Request): boolean {
  const secret = process.env.MARKET_SYNC_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || secret.length < 32 || !header?.startsWith("Bearer ")) return false;
  const expected = Buffer.from(secret), actual = Buffer.from(header.slice(7));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export async function POST(request: Request) {
  if (!authorized(request)) return json({ error:"Unauthorized" },401);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return json({ error:"Market sync not configured" },503);
  const supabase = createClient(url,key,{ auth:{ persistSession:false, autoRefreshToken:false } });
  // Privileged access stays server-side. Do not emit any portfolio owner data.
  const { data: positions, error } = await supabase.from("portfolio_positions_v460")
    .select("id,kind,symbol,variant,exchange,provider,quote_currency,quantity,cost_total,manual_price,archived,name")
    .eq("archived",false).gt("quantity",0).limit(1001);
  if (error) return json({ error:"Database read failed" },502);
  if ((positions?.length ?? 0)>1000) return json({ error:"Too many holdings; configure batched sync" },503);
  const unique=new Map<string,Position>();
  for (const item of (positions ?? []) as Position[]) {
    const quoteKey=marketQuoteKey(item);
    if (quoteKey && !unique.has(quoteKey)) unique.set(quoteKey,item);
  }
  let updated=0, failed=0;
  const entries=[...unique.entries()];
  // Bound serverless runtime: never pretend a truncated portfolio was fully synchronized.
  if (entries.length > 48) return json({error:"Too many distinct symbols for a single sync run; use sharded jobs"},503);
  for (let i=0;i<entries.length;i+=8) {
    await Promise.all(entries.slice(i,i+8).map(async ([quoteKey,position])=>{
      try {
        const quote=await fetchMarketPositionQuote(position);
        if (!quote || quote.type!=="market" || !Number.isFinite(quote.price) || quote.price<=0) {failed++;return;}
        const timestamp=new Date().toISOString();
        const { error:writeError }=await supabase.from("portfolio_market_quotes_v462").upsert({
          quote_key:quoteKey,kind:position.kind,symbol:position.symbol,variant:position.variant,
          provider:position.provider,price:quote.price,quote_currency:position.quote_currency,
          source:quote.source,observed_at:quote.at || timestamp,fetched_at:timestamp
        },{onConflict:"quote_key"});
        if(writeError) failed++; else updated++;
      } catch { failed++; }
    }));
  }
  return json({ status:failed ? "partial" : "ok", updated, failed, checked:entries.length });
}
