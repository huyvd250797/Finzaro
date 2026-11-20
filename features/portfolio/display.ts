/** Display-only formats. Use non-breaking space so the currency sign stays with its number. */
const vn = (places: number) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: places });

export function formatDong(value: number, places = 0): string {
  return `${vn(places).format(value)}\u00a0₫`;
}

export function formatMarketAmount(value: number, currency: "VND" | "USDT", places = 8): string {
  return currency === "VND" ? formatDong(value, places) : `${vn(places).format(value)}\u00a0USDT`;
}

/** Responsive type scale for very large balances; rendering still allows scrolling if necessary. */
export function sizeForDong(value: number, area: "hero" | "tile" | "card" = "card"): string {
  const digits = vn(0).format(value).length;
  if (area === "hero") return digits > 17 ? "text-[clamp(1.15rem,5vw,2rem)]" : digits > 13 ? "text-[clamp(1.4rem,6vw,2.5rem)]" : "text-[clamp(1.8rem,8vw,3rem)]";
  if (area === "tile") return digits > 13 ? "text-[clamp(0.85rem,3.5vw,1.15rem)]" : "text-[clamp(0.95rem,4.1vw,1.4rem)]";
  return digits > 13 ? "text-[clamp(0.8rem,3.3vw,1.05rem)]" : "text-[clamp(0.95rem,3.9vw,1.35rem)]";
}
