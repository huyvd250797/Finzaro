/**
 * V0.1.0 contract only. Authoritative money arithmetic starts in V0.2.0.
 * Amounts cross boundaries as decimal strings; never JS float for ledger calculations.
 */
export type CurrencyCode = string;
export type DecimalMoney = Readonly<{ amount: string; currency: CurrencyCode }>;

export interface MoneyEngine {
  add(a: DecimalMoney, b: DecimalMoney): DecimalMoney;
  subtract(a: DecimalMoney, b: DecimalMoney): DecimalMoney;
  compare(a: DecimalMoney, b: DecimalMoney): -1 | 0 | 1;
}
