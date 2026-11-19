import { cache } from "react";
import type { Position, Quote } from "@/features/portfolio/core";

const TIMEOUT = 5500;
const numeric = (value: unknown) => {
  const number = typeof value === "number" || typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(number) && number > 0 && number < 1e12 ? number : null;
};

async function request(url: string, init?: RequestInit, revalidate = 0): Promise<Response> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT), ...(revalidate > 0 ? { next: { revalidate } } : { cache: "no-store" }) });
  if (!res.ok) throw new Error(`Market source HTTP ${res.status}`);
  return res;
}
function live(price: number | null, source: string, at: string): Quote | null {
  return price === null ? null : { price, source, at, type: "market" };
}

/** Binance market-only public endpoint; no account credentials or trade privileges. */
export async function fetchBinance(symbol: string): Promise<Quote | null> {
  if (!/^[A-Z0-9]{2,15}$/.test(symbol)) return null;
  const payload: unknown = await (await request(`https://data-api.binance.vision/api/v3/ticker/price?symbol=${symbol}USDT`,undefined,60)).json();
  if (!payload || typeof payload !== "object" || !("symbol" in payload) || payload.symbol !== `${symbol}USDT`) return null;
  const price = "price" in payload ? numeric(payload.price) : null;
  return live(price, "Binance Spot", new Date().toISOString());
}

/** SSI FastConnect v2 daily Stock Price (VND/share), only if credentials configured server-side. */
export async function fetchSSI(symbol: string, exchange: string): Promise<Quote | null> {
  const consumerID = process.env.SSI_CONSUMER_ID;
  const consumerSecret = process.env.SSI_CONSUMER_SECRET;
  if (!consumerID || !consumerSecret || !/^[A-Z0-9]{2,10}$/.test(symbol) || !/^(HOSE|HNX|UPCOM)$/.test(exchange)) return null;
  const tokenReply: unknown = await (await request("https://fc-data.ssi.com.vn/api/v2/Market/AccessToken", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ consumerID, consumerSecret })
  })).json();
  if (!tokenReply || typeof tokenReply !== "object") return null;
  const data = "data" in tokenReply ? tokenReply.data : null;
  const token = data && typeof data === "object" && "accessToken" in data ? data.accessToken : null;
  if (typeof token !== "string" || !token) return null;
  const now = new Date();
  const from = new Date(now.getTime() - 14 * 86400000);
  const vi = (d: Date) => `${String(d.getUTCDate()).padStart(2,"0")}/${String(d.getUTCMonth()+1).padStart(2,"0")}/${d.getUTCFullYear()}`;
  const search = new URLSearchParams({ symbol, market: exchange, fromDate: vi(from), toDate: vi(now), pageIndex: "1", pageSize: "50" });
  const result: unknown = await (await request(`https://fc-data.ssi.com.vn/api/v2/Market/DailyStockPrice?${search}`, {
    headers: { Authorization: `Bearer ${token}` }
  })).json();
  if (!result || typeof result !== "object" || !("data" in result) || !Array.isArray(result.data)) return null;
  const entries = result.data.filter((row: unknown) => row && typeof row === "object" && "Symbol" in row && row.Symbol === symbol);
  const candidates = entries.map((row: Record<string, unknown>) => ({ price: numeric(row.ClosePrice), date: String(row.TradingDate ?? row.Tradingdate ?? "") }))
    .filter((row) => row.price !== null);
  candidates.sort((a,b) => {
    const dateKey = (s:string) => /^\d{2}\/\d{2}\/\d{4}$/.test(s) ? `${s.slice(6)}-${s.slice(3,5)}-${s.slice(0,2)}` : "";
    return dateKey(b.date).localeCompare(dateKey(a.date));
  });
  return candidates.length ? live(candidates[0].price, `SSI · đóng cửa ${candidates[0].date}`, new Date().toISOString()) : null;
}

/** PNJ official public price table: best-effort parser. Fail closed on markup/units mismatch. */
export function parsePnjGold(html: string, variant: string): number | null {
  const wanted = variant === "pnj_ring" ? /nhẫn\s*trơn\s*pnj\s*999/i : variant === "sjc_bar" ? /(?:vàng\s*miếng\s*)?sjc/i : null;
  if (!wanted) return null;
  const rows = html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  for (const row of rows) {
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(x => x[1]
      .replace(/<[^>]+>/g," ").replace(/&nbsp;|&#160;/gi," ").replace(/\s+/g," ").trim());
    if (cells.length < 3 || !wanted.test(cells[0])) continue;
    const token = cells[1].replace(/\s/g, "");
    if (!/^(?:\d{1,3}(?:[.,]\d{3})+|\d{4,6})$/.test(token)) continue;
    const raw = Number(token.replace(/[.,]/g,""));
    // Published PNJ figures may use 1,000 VND/chỉ (~13,000) or 1,000 VND/lượng (~130,000).
    // Explicit range validation avoids treating ambiguous values as valid.
    const perChi = raw >= 5000 && raw <= 50000 ? raw * 1000 : raw > 50000 && raw <= 500000 ? raw * 100 : null;
    if (perChi !== null && perChi >= 5_000_000 && perChi <= 50_000_000) return perChi;
  }
  return null;
}
export async function fetchPNJ(variant: string): Promise<Quote | null> {
  const response = await request("https://www.pnj.com.vn/site/gia-vang",undefined,600);
  const html = await response.text();
  const price = parsePnjGold(html, variant);
  return live(price, "PNJ · giá mua vào", new Date().toISOString());
}

/** Optional reference USDT/VND from CoinGecko Demo API. Manual FX remains a transparent fallback. */
export const marketUsdtVnd = cache(async (): Promise<{rate:number; source:string; at:string}|null> => {
  try {
    const apiKey=process.env.COINGECKO_DEMO_API_KEY;
    const payload:unknown=await (await request("https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=vnd",
      apiKey ? {headers:{"x-cg-demo-api-key":apiKey}} : undefined, 300)).json();
    if (!payload || typeof payload!=="object" || !("tether" in payload) || !payload.tether || typeof payload.tether!=="object" || !("vnd" in payload.tether)) return null;
    const rate=numeric(payload.tether.vnd);
    return rate !== null && rate >= 10000 && rate <= 100000 ? {rate,source:"CoinGecko · USDT/VND",at:new Date().toISOString()} : null;
  } catch { return null; }
});

/** Request-local cache prevents repeated API fetch for the same holding during one render. */
export const portfolioMarketQuote = cache(async (position: Position): Promise<Quote | null> => {
  if (position.provider === "manual") return position.manual_price ? { price:Number(position.manual_price), source:"Nhập thủ công", at:"", type:"manual" } : null;
  try {
    const quote = position.provider === "binance" && position.kind === "crypto" ? await fetchBinance(position.symbol)
      : position.provider === "ssi" && position.kind === "stock" ? await fetchSSI(position.symbol, position.exchange)
      : position.provider === "pnj" && position.kind === "gold" ? await fetchPNJ(position.variant) : null;
    if (quote) return quote;
  } catch { /* Fail closed to explicitly labeled manual price. */ }
  return position.manual_price ? { price:Number(position.manual_price),source:"Giá dự phòng thủ công (chưa xác minh)",at:"",type:"manual",stale:true } : null;
});
