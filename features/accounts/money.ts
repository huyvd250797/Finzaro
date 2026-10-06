export function parseMajorAmountToMinor(input: string, decimalDigits: number) {
  const raw = input.trim().replace(/\s/g, "").replace(/,/g, "");
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
