import type { LedgerAccount, TransactionView } from "@/features/transactions/data";
import { transactionEntry } from "@/features/transactions/data";
import type { CategorySpendRow, AccountSpendRow, MonthlyCashflowRow } from "@/features/reports/data";
import { calculateFinancialTotals, type PeriodComparison } from "@/features/reports/advanced";
import type { WorkbookSheet } from "@/features/reports/report-workbook";

export type FinancialStatement = {
  from: string; to: string; currency: string; digits: number; comparison: PeriodComparison;
  monthly: MonthlyCashflowRow[]; categories: CategorySpendRow[]; accounts: AccountSpendRow[];
  transactions: TransactionView[];
};

export function statementSheets(report: FinancialStatement): WorkbookSheet[] {
  const { from, to, currency, digits, comparison, monthly, categories, accounts, transactions } = report;
  const unit = 10 ** digits;
  const n = (value: number) => Number((value / unit).toFixed(digits));
  const curr = comparison.current;
  return [
    { name: "Tong hop", rows: [
      ["FINZARO — BÁO CÁO THU CHI"], ["Từ ngày", from], ["Đến ngày", to], ["Tiền tệ", currency],
      ["Chỉ tiêu", "Kỳ hiện tại", "Kỳ trước", "Đơn vị"],
      ["Tổng thu", n(curr.income), n(comparison.previous.income), currency],
      ["Tổng chi", n(curr.expense), n(comparison.previous.expense), currency],
      ["Dòng tiền ròng", n(curr.net), n(comparison.previous.net), currency],
      ["Tỷ lệ giữ lại (%)", curr.savingsRate ?? "Không áp dụng", comparison.previous.savingsRate ?? "Không áp dụng", "%"],
      ["Số khoản chi", curr.expenseCount, comparison.previous.expenseCount, "giao dịch"],
      ["Trung bình mỗi khoản chi", n(curr.averageExpense), n(comparison.previous.averageExpense), currency],
      [], ["Ghi chú", "Chỉ gồm Thu/Chi thông thường; chuyển khoản không được tính là thu nhập hoặc chi tiêu."],
      ["Tiền tệ", "Không cộng gộp các loại tiền; số liệu chỉ áp dụng cho tiền tệ đã chọn."],
      ["Đơn vị", `Số tiền hiển thị bằng đơn vị ${currency}, không phải minor units.`]
    ] },
    { name: "Theo thang", rows: [["Tháng", `Thu (${currency})`, `Chi (${currency})`, `Ròng (${currency})`], ...monthly.map((row) => [row.key, n(row.income), n(row.expense), n(row.net)])] },
    { name: "Danh muc", rows: [["Danh mục chi", `Số tiền (${currency})`, "Tỷ trọng (%)"], ...categories.map((row) => [row.label, n(row.amount), row.percent])] },
    { name: "Tai khoan", rows: [["Tài khoản chi", `Số tiền (${currency})`, "Tỷ trọng (%)"], ...accounts.map((row) => [row.label, n(row.amount), row.percent])] },
    { name: "Giao dich", rows: [["Ngày", "Loại", "Nội dung", "Danh mục", "Tài khoản", `Thu (${currency})`, `Chi (${currency})`, "Ghi chú"], ...transactions.flatMap((tx) => {
      if (tx.transaction_purpose !== "standard" || !["income", "expense"].includes(tx.transaction_type)) return [];
      const type = tx.transaction_type as "income" | "expense";
      const entry = transactionEntry(tx, type);
      if (!entry || entry.currency_code !== currency) return [];
      return [[tx.transaction_date, type === "income" ? "Thu" : "Chi", tx.title,
        tx.category?.name ?? tx.category_label ?? "Chưa phân loại", entry.account?.name ?? "",
        type === "income" ? n(Math.abs(entry.amount_minor)) : 0,
        type === "expense" ? n(Math.abs(entry.amount_minor)) : 0, tx.notes ?? ""]];
    })] }
  ];
}

export function cashAccountPosition(_accounts: LedgerAccount[], _currency: string) {
  // Deliberately not presented as a balance-sheet statement. Historical ledger
  // filters and transfers are insufficient to certify opening/closing balances.
  return null;
}

export function statementBalancesMatch(report: FinancialStatement) {
  const recomputed = calculateFinancialTotals(report.transactions, report.currency);
  return recomputed.income === report.comparison.current.income && recomputed.expense === report.comparison.current.expense;
}
