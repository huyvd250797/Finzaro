/** Normalize user-entered major amounts to a canonical dot-decimal form. Accepts both iOS comma and dot keyboards. */
function canonicalMoneyInput(input: string, decimalDigits: number) {
  let raw = input.trim().replace(/\s/g, "");
  if (!raw) return raw;
  const sign = raw.startsWith("-") ? "-" : "";
  raw = raw.replace(/^[+-]/, "").replace(/[^\d.,]/g, "");
  if (decimalDigits <= 0) return `${sign}${raw.replace(/[.,]/g, "")}`;

  const lastDot = raw.lastIndexOf(".");
  const lastComma = raw.lastIndexOf(",");
  const decimalIndex = Math.max(lastDot, lastComma);
  if (decimalIndex < 0) return `${sign}${raw}`;
  const fractionCandidate = raw.slice(decimalIndex + 1).replace(/[.,]/g, "");
  const before = raw.slice(0, decimalIndex).replace(/[.,]/g, "");

  // Treat the last separator as decimal only when the tail can fit the currency precision.
  if (fractionCandidate.length <= decimalDigits) return `${sign}${before || "0"}.${fractionCandidate}`;
  return `${sign}${raw.replace(/[.,]/g, "")}`;
}

export function parseMajorAmountToMinor(input: string, decimalDigits: number) {
  const raw = canonicalMoneyInput(input, decimalDigits);
  const match = raw.match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!match) return null;

  const [, sign, whole, fraction = ""] = match;
  if (fraction.length > decimalDigits) return null;
  const scale = 10n ** BigInt(decimalDigits);
  const fractionMinor = decimalDigits === 0 ? 0n : BigInt(fraction.padEnd(decimalDigits, "0") || "0");
  let minor = BigInt(whole) * scale + fractionMinor;
  if (sign === "-") minor *= -1n;

  const max = BigInt(Number.MAX_SAFE_INTEGER);
  if (minor > max || minor < -max) return null;
  return Number(minor);
}

export function minorToMajorInput(value: number, decimalDigits: number) {
  if (decimalDigits === 0) return String(value);
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const scale = 10 ** decimalDigits;
  const whole = Math.floor(abs / scale);
  const fraction = String(abs % scale).padStart(decimalDigits, "0").replace(/0+$/, "");
  return fraction ? `${sign}${whole}.${fraction}` : `${sign}${whole}`;
}
