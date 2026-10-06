export const TRANSACTION_TYPE_LABELS = {
  income: "Thu nhập",
  expense: "Chi tiêu",
  transfer: "Chuyển tiền"
} as const;

export type TransactionType = keyof typeof TRANSACTION_TYPE_LABELS;

export const INCOME_CATEGORY_SUGGESTIONS = [
  "Lương",
  "Thưởng",
  "Freelance",
  "Kinh doanh",
  "Lãi / cổ tức",
  "Hoàn tiền",
  "Thu nhập khác"
] as const;

export const EXPENSE_CATEGORY_SUGGESTIONS = [
  "Ăn uống",
  "Nhà ở",
  "Di chuyển",
  "Mua sắm",
  "Hóa đơn",
  "Sức khỏe",
  "Giáo dục",
  "Giải trí",
  "Gia đình",
  "Chi tiêu khác"
] as const;

export function isTransactionType(value: string): value is TransactionType {
  return value in TRANSACTION_TYPE_LABELS;
}
