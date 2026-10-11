export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatMoney(value: number, currency = "VND") {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "VND" || currency === "JPY" ? 0 : 2
  }).format(value);
}

export function formatMinorMoney(valueMinor: number, currency = "VND", decimalDigits = 0) {
  const safeValue = Number.isFinite(Number(valueMinor)) ? Number(valueMinor) : 0;
  const safeDigits = Number.isInteger(Number(decimalDigits)) ? Math.max(0, Math.min(6, Number(decimalDigits))) : 0;
  const safeCurrency = typeof currency === "string" && /^[A-Z]{3}$/.test(currency.toUpperCase()) ? currency.toUpperCase() : "VND";
  const scale = 10 ** safeDigits;
  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: safeCurrency,
      minimumFractionDigits: safeDigits,
      maximumFractionDigits: safeDigits
    }).format(safeValue / scale);
  } catch {
    const amount = new Intl.NumberFormat("vi-VN", {
      minimumFractionDigits: safeDigits,
      maximumFractionDigits: safeDigits
    }).format(safeValue / scale);
    return `${amount} ${safeCurrency}`;
  }
}

export function formatCompactMoney(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)} tr`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return `${value}`;
}
