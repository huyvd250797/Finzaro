import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { accountSpending, categorySpending, filterReportTransactions, loadReportLedger, monthlyCashflow, normalizeReportFilters, previousComparableRange, resolveReportRange } from "@/features/reports/data";
import { compareFinancialPeriods, maskIncompleteCashflowRatio } from "@/features/reports/advanced";
import { statementSheets, statementBalancesMatch, type FinancialStatement } from "@/features/reports/statement";
import { makeReportXlsx } from "@/features/reports/report-workbook";
import { currencyDigits } from "@/features/transactions/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function csvCell(value: unknown) {
  const text = String(value ?? "");
  // UTF-8 BOM below improves Excel Vietnamese support; neutralize formula injection.
  const literal = /^[\s\u0000-\u001f]*[=+@-]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(literal) ? `"${literal.replace(/"/g, '""')}"` : literal;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    const userId = !error && typeof data?.claims?.sub === "string" ? data.claims.sub : null;
    if (!userId) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    const format = request.nextUrl.searchParams.get("format") ?? "csv";
    if (!["csv", "xlsx"].includes(format)) return NextResponse.json({ error: "Định dạng không được hỗ trợ." }, { status: 400 });
    const { data: preferences } = await supabase.from("user_preferences").select("currency_code, timezone").eq("id", userId).maybeSingle();
    const fallbackCurrency = (preferences?.currency_code ?? "VND").toUpperCase();
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const range = resolveReportRange(params.range, params.from, params.to, preferences?.timezone ?? "Asia/Ho_Chi_Minh");
    const previousRange = previousComparableRange(range);
    const ledger = await loadReportLedger(supabase, userId, { fromDate: previousRange.from, toDate: range.to, includeAccounts: true, includeCategories: true });
    if (ledger.diagnostics.strategy === "empty") return NextResponse.json({ error: "Không thể đọc dữ liệu, tạm ngưng xuất để tránh sai lệch." }, { status: 503 });
    const currency = ledger.currencies.some((c) => c.code === params.currency?.toUpperCase()) ? params.currency.toUpperCase() : fallbackCurrency;
    const digits = currencyDigits(ledger.currencies, currency);
    const requested = normalizeReportFilters({ ...params, currency }, range, fallbackCurrency);
    const filters = {
      ...requested,
      account: requested.account === "all" || ledger.accounts.some((a) => a.id === requested.account && a.currency_code === currency) ? requested.account : "all",
      category: (requested.category === "all" || requested.category === "uncategorized") || ledger.categories.some((c) => c.id === requested.category) ? requested.category : "all",
      type: ["all", "income", "expense"].includes(requested.type) ? requested.type : "all"
    };
    // Keep only ordinary income/expense entries, never count transfers as flow.
    const current = filterReportTransactions(ledger.transactions, filters, ledger.categories).filter((tx) => tx.transaction_purpose === "standard" && (tx.transaction_type === "income" || tx.transaction_type === "expense"));
    const previous = filterReportTransactions(ledger.transactions, { ...filters, from: previousRange.from, to: previousRange.to }, ledger.categories).filter((tx) => tx.transaction_purpose === "standard" && (tx.transaction_type === "income" || tx.transaction_type === "expense"));
    const report: FinancialStatement = {
      from: range.from, to: range.to, currency, digits,
      comparison: maskIncompleteCashflowRatio(compareFinancialPeriods(current, previous, currency), filters.type),
      monthly: monthlyCashflow(current, currency, range.from, range.to),
      categories: categorySpending(current, currency),
      accounts: accountSpending(current, currency, ledger.accounts),
      transactions: current, reportType: filters.type === "income" || filters.type === "expense" ? filters.type : "all"
    };
    if (!statementBalancesMatch(report)) {
      console.error("[Finzaro reconcile] Export totals do not match monthly/category/account data.");
      return NextResponse.json({ error: "Số liệu báo cáo chưa khớp. Tạm ngưng xuất để tránh sai lệch." }, { status: 409 });
    }
    const sheets = statementSheets(report);
    const filename = `Finzaro-${range.from}-${range.to}-${currency}`;
    const headers = { "Content-Disposition": `attachment; filename="${filename}.${format}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
    if (format === "xlsx") {
      const content = makeReportXlsx(sheets);
      return new NextResponse(new Uint8Array(content), { headers: { ...headers, "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" } });
    }
    const transactionsSheet = sheets.find((sheet) => sheet.name === "Giao dich")!;
    const body = "\uFEFF" + transactionsSheet.rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    return new NextResponse(body, { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8" } });
  } catch (error) {
    console.error("[Finzaro report export]", error);
    return NextResponse.json({ error: "Không thể xuất báo cáo. Hãy kiểm tra dữ liệu và thử lại." }, { status: 500 });
  }
}
