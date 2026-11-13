import type { LedgerAccount, TransactionView } from "@/features/transactions/data";
import { transactionEntry } from "@/features/transactions/data";
import { categoryFlow, accountFlow, type CategorySpendRow, type AccountSpendRow, type MonthlyCashflowRow, type FinancialFlowType } from "@/features/reports/data";
import { calculateFinancialTotals, type PeriodComparison } from "@/features/reports/advanced";
import type { WorkbookSheet } from "@/features/reports/report-workbook";

export type FinancialStatement = {
  from: string; to: string; currency: string; digits: number; comparison: PeriodComparison;
  monthly: MonthlyCashflowRow[]; categories: CategorySpendRow[]; accounts: AccountSpendRow[];
  transactions: TransactionView[];
  reportType?: "all" | FinancialFlowType;
};

export function statementSheets(report: FinancialStatement): WorkbookSheet[] {
  const { from, to, currency, digits, comparison, monthly, transactions } = report;
  const types: FinancialFlowType[] = report.reportType === "income" ? ["income"] : report.reportType === "expense" ? ["expense"] : ["income", "expense"];
  const categoryRows = types.flatMap((type) => categoryFlow(transactions, currency, type).map((row) => [type === "income" ? "Thu" : "Chi", row.label, row.amount, row.percent] as const));
  const accountRows = types.flatMap((type) => accountFlow(transactions, currency, [], type).map((row) => [type === "income" ? "Thu" : "Chi", row.label, row.amount, row.percent] as const));
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
    { name: "Danh muc", rows: [["Loại", "Danh mục", `Số tiền (${currency})`, "Tỷ trọng (%)"], ...categoryRows.map((row) => [row[0], row[1], n(row[2]), row[3]])] },
    { name: "Tai khoan", rows: [["Loại", "Tài khoản", `Số tiền (${currency})`, "Tỷ trọng (%)"], ...accountRows.map((row) => [row[0], row[1], n(row[2]), row[3]])] },
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Public compatibility placeholder; report does not claim accounting balances.
export function cashAccountPosition(_accounts: LedgerAccount[], _currency: string) {
  // Deliberately not presented as a balance-sheet statement. Historical ledger
  // filters and transfers are insufficient to certify opening/closing balances.
  return null;
}

export function statementBalancesMatch(report: FinancialStatement) {
  const recomputed = calculateFinancialTotals(report.transactions, report.currency);
  const monthTotals = report.monthly.reduce((sum, row) => ({ income: sum.income + row.income, expense: sum.expense + row.expense }), { income: 0, expense: 0 });
  const incomeCategories = categoryFlow(report.transactions, report.currency, "income");
  const expenseCategories = categoryFlow(report.transactions, report.currency, "expense");
  const incomeAccounts = accountFlow(report.transactions, report.currency, [], "income");
  const expenseAccounts = accountFlow(report.transactions, report.currency, [], "expense");
  return recomputed.income === report.comparison.current.income
    && recomputed.expense === report.comparison.current.expense
    && recomputed.net === report.comparison.current.net
    && monthTotals.income === recomputed.income && monthTotals.expense === recomputed.expense
    && incomeCategories.reduce((sum, row) => sum + row.amount, 0) === recomputed.income
    && expenseCategories.reduce((sum, row) => sum + row.amount, 0) === recomputed.expense
    && incomeAccounts.reduce((sum, row) => sum + row.amount, 0) === recomputed.income
    && expenseAccounts.reduce((sum, row) => sum + row.amount, 0) === recomputed.expense;
}
