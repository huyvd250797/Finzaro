/** Compact labels for 7-column mobile calendars; values remain in minor units. */
export function compactCalendarAmount(valueMinor: number, decimalDigits = 0): string {
  const numeric = Number(valueMinor);
  if (!Number.isFinite(numeric) || numeric <= 0) return "";
  const digits = Number.isInteger(decimalDigits) ? Math.min(6, Math.max(0, decimalDigits)) : 0;
  const whole = Math.round(numeric / 10 ** digits);
  if (whole === 0) return "";
  const local = (value: number, fractionDigits = 0) => new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: 0
  }).format(value);
  if (whole >= 1_000_000_000) return `${local(whole / 1_000_000_000, 1)}tỷ`;
  if (whole >= 1_000_000) return `${local(whole / 1_000_000, whole < 10_000_000 ? 2 : 1)}tr`;
  if (whole >= 100_000) return `${local(whole / 1_000, 0)}k`;
  if (whole >= 10_000) return `${local(whole / 1_000, 1)}k`;
  return local(whole);
}
