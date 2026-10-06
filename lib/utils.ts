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
  const scale = 10 ** decimalDigits;
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    minimumFractionDigits: decimalDigits,
    maximumFractionDigits: decimalDigits
  }).format(valueMinor / scale);
}

export function formatCompactMoney(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)} tr`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return `${value}`;
}
