/** Reserved domain contract. No bank calculator is implemented in V0.1.0. */
export type InterestRateInput = Readonly<{
  annualRatePercent: string;
  effectiveFrom: string;
  source?: string;
}>;

export interface BankingCalculator<TInput, TResult> {
  readonly formulaVersion: string;
  calculate(input: TInput): TResult;
}
