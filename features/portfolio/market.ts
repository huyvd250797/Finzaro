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

/** PNJ publishes prices in thousands of VND per LUONG (10 chi) on its official gold board. */
function htmlText(value: string): string {
  return value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ")
    .replace(/<[^>]*>/g," ")
    .replace(/&nbsp;|&#160;|&#xA0;/gi," ")
    .replace(/&amp;/gi,"&").replace(/&[a-z]+;|&#\d+;/gi," ")
    .replace(/\s+/g," ").trim();
}
function ascii(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/gi,"d").toLowerCase();
}
function pnjPriceToken(value: string, perLuong: boolean | null): number | null {
  const cleaned = value.replace(/\s/g,"");
  if (!/^(?:\d{1,3}(?:[.,]\d{3})+|\d{4,6})$/.test(cleaned)) return null;
  const raw = Number(cleaned.replace(/[.,]/g,""));
  const unit = perLuong === null ? (raw >= 50000 ? 100 : 1000) : (perLuong ? 100 : 1000);
  const price = raw * unit;
  return price >= 5_000_000 && price <= 50_000_000 ? price : null;
}
/** A name may be preceded by category/region columns. Always take the next numeric cell as BUY price. */
export function parsePnjGold(html: string, variant: string): number | null {
  if (variant !== "pnj_ring" && variant !== "sjc_bar") return null;
  const heading = ascii(htmlText(html.slice(0, Math.min(html.length, 30000))));
  const perLuong = /(?:don vi|dvt)[^a-z0-9]{0,15}(?:ngan|nghin)[^a-z0-9]{0,15}(?:dong)[^a-z0-9]{0,12}(?:\/|tren )?luong/.test(heading)
    || /(?:ngan|nghin) dong\s*\/\s*luong/.test(heading) ? true
    : /(?:ngan|nghin) dong\s*\/\s*chi/.test(heading) ? false : null;
  const rows = html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  for (const row of rows) {
    const cells = [...row.matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)].map(x => htmlText(x[1]));
    const index = cells.findIndex(cell => {
      const name = ascii(cell).replace(/\s+/g," ").trim();
      return variant === "pnj_ring" ? /nhan\s+tron\s+pnj\s+999(?:[.,]9)?(?:\b|$)/.test(name)
        : /^(?:vang\s+mieng\s+)?sjc(?:\s+9999)?$/.test(name);
    });
    if (index < 0) continue;
    // Ignore unrelated numeric identifiers, and NEVER pick the selling price as buying price.
    const buy = pnjPriceToken(cells[index + 1] ?? "",perLuong);
    if (buy !== null) return buy;
  }
  return null;
}
/** Extract the board's publication time, not only the time when Finzaro requested it. */
export function parsePnjPublishedAt(html: string): string | null {
  const heading = htmlText(html.slice(0,Math.min(html.length,20000)));
  const match = heading.match(/gi[aá]\s+v[aà]ng\s+ng[aà]y\s*:\s*(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?/i);
  if (!match) return null;
  const [,dd,mm,yyyy,hh,minute,seconds="00"]=match;
  const date = new Date(`${yyyy}-${mm}-${dd}T${hh}:${minute}:${seconds}+07:00`);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now()+300000 ? date.toISOString() : null;
}
export async function fetchPNJ(variant: string): Promise<Quote | null> {
  if (variant !== "pnj_ring" && variant !== "sjc_bar") return null;
  const response = await request("https://giavang.pnj.com.vn/",undefined,300);
  const html = await response.text();
  const price = parsePnjGold(html,variant);
  const quote = live(price,variant === "pnj_ring" ? "PNJ · nhẫn trơn 999.9 · giá mua vào" : "PNJ · SJC · giá mua vào",parsePnjPublishedAt(html) ?? new Date().toISOString());
  if (quote) quote.checkedAt = new Date().toISOString();
  return quote;
}

/** Vietcap public board via maintained vnstock-js package; no SSI credentials needed. */
export async function fetchVCI(symbol: string,exchange: string): Promise<Quote | null> {
  if (!/^[A-Z0-9]{2,10}$/.test(symbol) || !/^(HOSE|HNX|UPCOM)$/.test(exchange)) return null;
  const {fetchVciPrice}=await import("@/features/portfolio/vci");
  return fetchVciPrice(symbol,exchange);
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

/** Missing prices are intentionally not converted to zero. The result explains why. */
export type QuoteStatus = {quote: Quote | null; problem: string | null};
export const portfolioMarketQuoteStatus = cache(async(position:Position): Promise<QuoteStatus> => {
  if(position.provider==="manual") return {quote:position.manual_price ? {price:Number(position.manual_price),source:"Giá do người dùng nhập",at:"",type:"manual"} : null,
    problem:position.manual_price ? null : "Chưa nhập giá thị trường thủ công."};
  let problem="Nguồn giá chưa trả về báo giá hợp lệ.";
  let quote:Quote|null=null;
  try {
    quote=position.kind==="crypto" && position.provider==="binance" ? await fetchBinance(position.symbol)
      : position.kind==="stock" && position.provider==="vci" ? await fetchVCI(position.symbol,position.exchange)
      : position.kind==="stock" && position.provider==="ssi" ? (await fetchSSI(position.symbol,position.exchange)) ?? await fetchVCI(position.symbol,position.exchange)
      : position.kind==="gold" && position.provider==="pnj" ? await fetchPNJ(position.variant) : null;
    if (!quote) problem=position.provider==="ssi" && (!process.env.SSI_CONSUMER_ID || !process.env.SSI_CONSUMER_SECRET)
      ? "SSI chưa cấu hình API Key; Vietcap công khai cũng chưa trả về giá. Có thể chọn giá thủ công."
      : position.provider==="pnj" && position.variant==="sjc_bar"
      ? "Không đọc được giá SJC từ bảng PNJ. Kiểm tra giá niêm yết hoặc nhập dự phòng."
      : "Nguồn không có giá khớp mã/loại tài sản hoặc cấu trúc dữ liệu đã thay đổi.";
  } catch (error) {
    const message=error instanceof Error ? error.message : "Unknown upstream error";
    const http=message.match(/Market source HTTP (\d{3})/);
    problem=http?`Nguồn báo giá trả HTTP ${http[1]}. Vui lòng thử lại sau.`
      : "Không kết nối được nguồn báo giá. Vui lòng thử lại hoặc nhập giá dự phòng.";
  }
  if (quote) return {quote,problem:null};
  return {quote:position.manual_price ? {price:Number(position.manual_price),source:"Giá dự phòng thủ công · chưa xác minh",at:"",type:"manual",stale:true}:null,problem};
});
export const portfolioMarketQuote = cache(async (position:Position):Promise<Quote|null> => (await portfolioMarketQuoteStatus(position)).quote);
