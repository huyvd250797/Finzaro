import "server-only";

export type SsiQuote = {
  symbol: string;
  tradingDate: string | null;
  price: number;
  priceChange: number | null;
  priceChangePercent: number | null;
  openPrice: number | null;
  highPrice: number | null;
  lowPrice: number | null;
  provider: "ssi";
};

export function hasSsiMarketDataConfig() {
  return Boolean(process.env.SSI_FASTCONNECT_API_KEY?.trim() && process.env.SSI_FASTCONNECT_API_SECRET?.trim());
}

function numberOrNull(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// Vietnam equity quotations are commonly expressed in units of 1,000 VND
// (e.g. 19.05 means 19,050 VND). Some provider/client responses may already
// be normalized to VND, so keep values >= 1,000 unchanged.
export function normalizeSsiPriceToVnd(value: number | null) {
  if (value === null || !Number.isFinite(value)) return null;
  if (value === 0) return 0;
  return Math.abs(value) < 1_000 ? value * 1_000 : value;
}

function firstSummary(raw: unknown) {
  if (Array.isArray(raw)) return raw[0] ?? null;
  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    if (Array.isArray(record.data)) return record.data[0] ?? null;
    return raw;
  }
  return null;
}

export async function fetchSsiQuotes(symbols: string[]): Promise<SsiQuote[]> {
  const apiKey = process.env.SSI_FASTCONNECT_API_KEY?.trim();
  const apiSecret = process.env.SSI_FASTCONNECT_API_SECRET?.trim();
  const clientId = process.env.SSI_FASTCONNECT_CLIENT_ID?.trim();
  if (!apiKey || !apiSecret) throw new Error("SSI FastConnect chưa được cấu hình trên server.");

  const { Auth, Data } = await import("@ssi.developer/ssi-sdk");
  const auth = new Auth({ apiKey, apiSecret, ...(clientId ? { clientId } : {}) });
  await auth.authenticate();
  const data = new Data(auth);

  const unique = [...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))].slice(0, 30);
  const results: SsiQuote[] = [];
  for (const symbol of unique) {
    const raw = await data.marketData.getSecuritiesSummary(symbol);
    const summary = firstSummary(raw) as Record<string, unknown> | null;
    if (!summary) continue;
    const close = normalizeSsiPriceToVnd(numberOrNull(summary.closePrice ?? summary.close_price ?? summary.price ?? summary.lastPrice));
    if (close === null || close <= 0) continue;
    results.push({
      symbol,
      tradingDate: String(summary.tradingDate ?? summary.trading_date ?? "") || null,
      price: close,
      priceChange: normalizeSsiPriceToVnd(numberOrNull(summary.priceChange ?? summary.price_change)),
      priceChangePercent: numberOrNull(summary.priceChangePercent ?? summary.price_change_percent),
      openPrice: normalizeSsiPriceToVnd(numberOrNull(summary.openPrice ?? summary.open_price)),
      highPrice: normalizeSsiPriceToVnd(numberOrNull(summary.highPrice ?? summary.high_price)),
      lowPrice: normalizeSsiPriceToVnd(numberOrNull(summary.lowPrice ?? summary.low_price)),
      provider: "ssi"
    });
  }
  return results;
}
