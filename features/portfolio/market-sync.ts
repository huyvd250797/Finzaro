import type { Position, Quote } from "@/features/portfolio/core";
import { fetchMarketPositionQuote, marketQuoteKey, portfolioMarketQuote } from "@/features/portfolio/market";
/* eslint-disable @typescript-eslint/no-explicit-any -- V4.6.2 quote table is introduced by SQL migration and has no generated DB types yet. */

export const MARKET_SYNC_INTERVAL_MS = 60_000;
/** Price freshness is explicitly scoped: closing quotes may be older when exchanges are closed. */
export function quoteAgeLimit(kind: Position["kind"]): number {
  return kind === "crypto" ? 90_000 : kind === "gold" ? 5 * 60_000 : 2 * 60_000;
}
export type CachedMarketRow = {
  quote_key: string; price: string | number; source: string; observed_at: string; fetched_at: string;
};
export function cachedMarketQuote(row: CachedMarketRow | null, kind: Position["kind"], now = Date.now()): Quote | null {
  if (!row) return null;
  const price = Number(row.price);
  const last = Date.parse(row.fetched_at);
  if (!(price > 0) || !Number.isFinite(price) || !(last <= now) || !Number.isFinite(last)) return null;
  const age = now - last;
  return { price, source: row.source, at: row.observed_at, type: "market", stale: age > quoteAgeLimit(kind) };
}

/** Prefer a fresh shared quote; refresh expired quotes on demand; keep confirmed historical
 * quotation labeled "Giá gần nhất" if upstream stops responding. Never use purchase cost.
 */
export async function resolvePortfolioQuotes(db: { from: (table: string) => any }, positions: Position[]): Promise<Map<string, Quote | null>> {
  const active = positions.filter(p => !p.archived && Number(p.quantity) > 0);
  const keys = [...new Set(active.map(marketQuoteKey).filter((key): key is string => Boolean(key)))];
  const rows = new Map<string, CachedMarketRow>();
  if (keys.length) {
    try {
      const response = await db.from("portfolio_market_quotes_v462")
        .select("quote_key,price,source,observed_at,fetched_at").in("quote_key", keys.slice(0, 150));
      if (!response.error) for (const row of (response.data ?? []) as CachedMarketRow[]) rows.set(row.quote_key, row);
    } catch { /* Migration or cache may be unavailable; live market remains a best-effort read. */ }
  }
  const unique = new Map<string, Promise<Quote | null>>();
  const result = new Map<string, Quote | null>();
  await Promise.all(active.map(async position => {
    const key = marketQuoteKey(position);
    if (!key) { result.set(position.id, await portfolioMarketQuote(position)); return; }
    if (!unique.has(key)) unique.set(key,(async () => {
      const cached = cachedMarketQuote(rows.get(key) ?? null, position.kind);
      if (cached && !cached.stale) return cached;
      try {
        const quote = await fetchMarketPositionQuote(position);
        if (quote) return quote;
      } catch { /* retain correctly labeled last known verified price */ }
      if (cached) return { ...cached, stale:true, source:`${cached.source} · giá gần nhất` };
      return null;
    })());
    const quote = await unique.get(key)!;
    result.set(position.id, quote ?? (position.manual_price ? {
      price:Number(position.manual_price),source:"Giá dự phòng thủ công (chưa xác minh)",at:"",type:"manual",stale:true
    } : null));
  }));
  return result;
}
