/** Pure, audited Finzaro V4.6.0 portfolio math. Not a transaction ledger. */
export type AssetKind = "gold" | "stock" | "crypto";
export type MarketProvider = "manual" | "pnj" | "ssi" | "binance";
export type Position = {
  id: string; kind: AssetKind; symbol: string; name: string; variant: string; exchange: string;
  quote_currency: "VND" | "USDT"; provider: MarketProvider; quantity: string;
  cost_total: string; manual_price: string | null; archived: boolean;
};
export type Quote = { price: number; source: string; at: string; type: "market" | "manual"; stale?: boolean };
export type ValuedPosition = Position & {
  quantityNumber: number; costNumber: number; quote: Quote | null;
  valueVnd: number | null; costVnd: number | null; pnlVnd: number | null;
  valueNative: number | null; pnlNative: number | null;
};
export function parseDecimal(text: string, maxPlaces = 12): number | null {
  const normalized = text.trim().replace(/\s/g, "").replace(",", ".");
  if (!new RegExp(`^(?:\\d+)(?:\\.\\d{1,${maxPlaces}})?$`).test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount <= 1e12 ? amount : null;
}
/** VND-friendly prices: 21.150 means 21150; 21.150,5 means 21150.5. */
export function parseVndAmount(text: string, decimals=8): number | null {
  const cleaned=text.trim().replace(/\s/g,"");
  const grouped=/^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(cleaned);
  const normalized=grouped ? cleaned.replace(/\./g,"").replace(",",".") : cleaned.replace(",",".");
  return parseDecimal(normalized,decimals);
}

export function goldUnits(chi: number): string {
  if (!Number.isInteger(Math.round(chi * 10)) || Math.abs(chi * 10 - Math.round(chi * 10)) > 1e-7 || chi < 0) throw new Error("Gold quantity must be a multiple of 0.1 chi");
  const phanTotal = Math.round(chi * 10);
  const cay = Math.floor(phanTotal / 100);
  const chiPart = Math.floor((phanTotal % 100) / 10);
  const phan = phanTotal % 10;
  return [cay ? `${cay} cây` : "", chiPart ? `${chiPart} chỉ` : "", phan ? `${phan} phân` : ""].filter(Boolean).join(" ") || "0 chỉ";
}
export function valuePosition(position: Position, quote: Quote | null, usdtVnd: number | null): ValuedPosition {
  const quantityNumber = Number(position.quantity);
  const costNumber = Number(position.cost_total);
  if (!Number.isFinite(quantityNumber) || !Number.isFinite(costNumber) || quantityNumber < 0 || costNumber < 0) throw new Error("Invalid position values");
  const rawValue = quote && Number.isFinite(quote.price) && quote.price > 0 ? quantityNumber * quote.price : null;
  const valueNative = rawValue !== null && Number.isFinite(rawValue) ? rawValue : null;
  const pnlNative = valueNative === null ? null : valueNative - costNumber;
  const rate = position.quote_currency === "VND" ? 1 : usdtVnd;
  const converted = valueNative !== null && rate !== null && rate > 0 ? valueNative * rate : null;
  const convertedCost = rate !== null && rate > 0 ? costNumber * rate : null;
  // Financial totals must not silently exceed JS safe integers; flag incomplete instead.
  const valueVnd = converted !== null && Number.isSafeInteger(Math.round(converted)) ? Math.round(converted) : null;
  const costVnd = convertedCost !== null && Number.isSafeInteger(Math.round(convertedCost)) ? Math.round(convertedCost) : null;
  const pnlVnd = valueVnd !== null && costVnd !== null ? valueVnd - costVnd : null;
  return { ...position, quantityNumber, costNumber, quote, valueVnd, costVnd, pnlVnd, valueNative, pnlNative };
}
export function summarizePortfolio(rows: ValuedPosition[]) {
  const counted = rows.filter(row => !row.archived && row.quantityNumber > 0);
  const missing = counted.filter(row => row.valueVnd === null).length;
  const value = counted.reduce((sum, row) => sum + (row.valueVnd ?? 0), 0);
  const cost = counted.filter(row => row.valueVnd !== null).reduce((sum,row)=>sum+(row.costVnd ?? 0),0);
  const byKind = { gold: 0, stock: 0, crypto: 0 };
  for (const row of counted) if (row.valueVnd !== null) byKind[row.kind] += row.valueVnd;
  return { value, cost, pnl: value - cost, percent: cost > 0 ? (value - cost) / cost * 100 : null, missing, byKind, count: counted.length, complete: missing === 0 };
}
