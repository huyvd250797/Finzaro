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

/** Parse only a matching official PNJ product row and the BUY price following its name.
 * PNJ currently publishes quotations in 1,000 VND/chi or 1,000 VND/luong;
 * reject values outside plausible ranges instead of guessing an arbitrary currency scale.
 */
export function parsePnjGold(html: string, variant: string): number | null {
  const wanted = variant === "pnj_ring" ? /nhẫn\s*trơn\s*pnj\s*999(?:[.,]9)?/i
    : variant === "sjc_bar" ? /(?:vàng\s*miếng\s*)?sjc(?:\s*9999|\s*1l|\b)/i : null;
  if (!wanted) return null;
  for (const row of html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) ?? []) {
    const cells = [...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)]
      .map(m => m[1].replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/\s+/g, " ").trim());
    const index = cells.findIndex((cell) => wanted.test(cell) && !(variant === "sjc_bar" && /nhẫn|trang\s*sức/i.test(cell)));
    if (index < 0 || index + 2 >= cells.length) continue;
    const token = cells[index + 1].replace(/\s/g, "");
    if (!/^(?:\d{1,3}(?:[.,]\d{3})+|\d{4,6})$/.test(token)) continue;
    const raw = Number(token.replace(/[.,]/g, ""));
    const perChi = raw >= 5000 && raw <= 50000 ? raw * 1000 : raw > 50000 && raw <= 500000 ? raw * 100 : null;
    if (perChi !== null && perChi >= 5_000_000 && perChi <= 50_000_000) return perChi;
  }
  return null;
}
export async function fetchPNJ(variant: string): Promise<Quote | null> {
  if (!['pnj_ring','sjc_bar'].includes(variant)) return null;
  const response = await request("https://giavang.pnj.com.vn/",undefined,120);
  const html = await response.text();
  const price = parsePnjGold(html, variant);
  const plain = html.replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ');
  const date = plain.match(/giá\s*vàng\s*ngày\s*:?\s*(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?/i);
  const published=date ? new Date(`${date[3]}-${date[2]}-${date[1]}T${date[4]}:${date[5]}:${date[6]??'00'}+07:00`) : null;
  const now=Date.now();
  const observed=published && Number.isFinite(published.getTime()) && published.getTime() <= now + 300000 && published.getTime() > now - 30*86400000
    ? published.toISOString() : new Date(now).toISOString();
  return live(price, variant === 'sjc_bar' ? 'PNJ · bảng giá vàng miếng SJC, mua vào' : 'PNJ · nhẫn trơn 9999, mua vào', observed);
}

/** Public Vietcap adapter via vnstock-js (Node server only, not in client bundle).
 * The library normalizes listed-share prices to full VND, not thousands of VND.
 * Unsupported/refused responses must not become a fabricated quote.
 */
export async function fetchVietcap(symbol: string): Promise<Quote | null> {
  if (!/^[A-Z0-9]{2,10}$/.test(symbol)) return null;
  const { vn } = await import("vnstock-js");
  const quote: unknown = await vn.stock(symbol).price();
  if (!quote || typeof quote !== 'object' || !('price' in quote)) return null;
  const price = numeric(quote.price);
  if (price === null || price < 100 || price > 5_000_000) return null;
  return live(price, 'Vietcap · giá khớp/đóng cửa gần nhất', new Date().toISOString());
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

/** Stable public quote key; never includes per-user portfolio data. */
export function marketQuoteKey(position: Pick<Position,'kind'|'symbol'|'variant'|'provider'>): string | null {
  if (position.provider === 'manual') return null;
  if (position.kind === 'gold') return ['pnj_ring','sjc_bar'].includes(position.variant) ? `gold:pnj:${position.variant}` : null;
  if (position.kind === 'stock') return /^[A-Z0-9]{2,10}$/.test(position.symbol) ? `stock:${position.provider === 'ssi' ? 'ssi' : 'vci'}:${position.symbol}` : null;
  if (position.kind === 'crypto') return /^[A-Z0-9]{2,15}$/.test(position.symbol) ? `crypto:binance:${position.symbol}` : null;
  return null;
}

export async function fetchMarketPositionQuote(position: Position): Promise<Quote | null> {
  if (position.provider === 'manual') return null;
  if (position.kind === 'gold') return fetchPNJ(position.variant);
  if (position.kind === 'stock') return position.provider === 'ssi' ? fetchSSI(position.symbol,position.exchange) : fetchVietcap(position.symbol);
  if (position.kind === 'crypto') return fetchBinance(position.symbol);
  return null;
}

/** Request-local cache prevents repeated API fetch for the same holding during one render. */
export const portfolioMarketQuote = cache(async (position: Position): Promise<Quote | null> => {
  if (position.provider === 'manual') return position.manual_price ? { price:Number(position.manual_price), source:'Nhập thủ công', at:'', type:'manual' } : null;
  try {
    const quote=await fetchMarketPositionQuote(position);
    if (quote) return quote;
  } catch { /* no invented market price on failed upstream */ }
  return position.manual_price ? { price:Number(position.manual_price),source:'Giá dự phòng thủ công (chưa xác minh)',at:'',type:'manual',stale:true } : null;
});
