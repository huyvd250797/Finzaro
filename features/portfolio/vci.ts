import "server-only";
import { unstable_cache } from "next/cache";
import type { Quote } from "@/features/portfolio/core";

/** VCI output from vnstock-js v2 is in DONG per share, not thousands of VND. */
export function normalizeVciPrice(data: unknown, requestedSymbol:string): number | null {
  if(!data || typeof data!=="object") return null;
  const value=data as Record<string,unknown>;
  if(typeof value.symbol==="string" && value.symbol.toUpperCase()!==requestedSymbol) return null;
  const price=typeof value.price==="number"?value.price:typeof value.price==="string"?Number(value.price):NaN;
  return Number.isFinite(price) && price >= 1000 && price <= 3_000_000 ? price : null;
}
async function queryVci(symbol:string,exchange:string):Promise<Quote|null>{
  const {vn} = await import("vnstock-js");
  const raw:unknown = await vn.stock(symbol).price();
  const price=normalizeVciPrice(raw,symbol);
  if(price===null)return null;
  const at=new Date().toISOString();
  return {price,source:`Vietcap · bảng giá ${exchange} · thời điểm truy vấn`,at,type:"market",checkedAt:at,
    note:"Báo giá công khai tham khảo, không được bảo đảm realtime hoặc quyền tái phân phối."};
}
/** No Cron / no Supabase writes. Cache for 120 seconds on server (also deduplicates by symbol). */
const cached=unstable_cache(queryVci,["portfolio-v462-vci"],{revalidate:120});
export async function fetchVciPrice(symbol:string,exchange:string):Promise<Quote|null>{
  if(!/^[A-Z0-9]{2,10}$/.test(symbol) || !/^(HOSE|HNX|UPCOM)$/.test(exchange))return null;
  return cached(symbol,exchange);
}
