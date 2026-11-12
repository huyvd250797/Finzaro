/** Client-side feedback only. Server actions remain the authority for financial
 * validation, currency precision and available account balance. */
export function validateTransactionAmounts(type: "income" | "expense" | "transfer", from: string, to: string, differentCurrency: boolean): string | null {
  const validPositive = (value: string) => value.trim().length > 0 && Number.isFinite(Number(value)) && Number(value) > 0;
  if (type === "income") return validPositive(to) ? null : "Vui lòng nhập số tiền thu lớn hơn 0.";
  if (!validPositive(from)) return type === "expense" ? "Vui lòng nhập số tiền chi lớn hơn 0." : "Vui lòng nhập số tiền chuyển lớn hơn 0.";
  if (type === "transfer" && differentCurrency && !validPositive(to)) return "Vui lòng nhập số tiền thực nhận lớn hơn 0.";
  return null;
}
