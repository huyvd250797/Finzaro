import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { filterReportTransactions, normalizeReportFilters, resolveReportRange } from "@/features/reports/data";
import { loadLedger, transactionEntry } from "@/features/transactions/data";

export const dynamic = "force-dynamic";

function csv(value: unknown) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    const userId = !error && typeof data?.claims?.sub === "string" ? data.claims.sub : null;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: preferences } = await supabase.from("user_preferences").select("currency_code, timezone").eq("id", userId).maybeSingle();
    const defaultCurrency = preferences?.currency_code ?? "VND";
    const timeZone = preferences?.timezone ?? "Asia/Ho_Chi_Minh";
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const range = resolveReportRange(params.range, params.from, params.to, timeZone);
    const ledger = await loadLedger(supabase, userId, { fromDate: range.from, toDate: range.to, limit: 10000 });
    const currency = ledger.currencies.some((item) => item.code === params.currency) ? params.currency : defaultCurrency;
    const requestedFilters = normalizeReportFilters({ ...params, currency }, range, defaultCurrency);
    const filters = {
      ...requestedFilters,
      account: requestedFilters.account === "all" || ledger.accounts.some((item) => item.id === requestedFilters.account && item.currency_code === currency) ? requestedFilters.account : "all",
      category: requestedFilters.category === "all" || ledger.categories.some((item) => item.id === requestedFilters.category) ? requestedFilters.category : "all",
      type: ["all", "income", "expense", "transfer"].includes(requestedFilters.type) ? requestedFilters.type : "all"
    };
    const transactions = filterReportTransactions(ledger.transactions, filters, ledger.categories);

    const rows = [
      ["Ngày", "Loại", "Tiêu đề", "Danh mục", "Tài khoản nguồn", "Tài khoản đích", "Tiền tệ nguồn", "Số tiền nguồn (minor)", "Tiền tệ đích", "Số tiền đích (minor)", "Ghi chú"]
    ];

    for (const transaction of transactions) {
      const income = transactionEntry(transaction, "income");
      const expense = transactionEntry(transaction, "expense");
      const transferOut = transactionEntry(transaction, "transfer_out");
      const transferIn = transactionEntry(transaction, "transfer_in");
      const source = expense ?? transferOut;
      const destination = income ?? transferIn;
      rows.push([
        transaction.transaction_date,
        transaction.transaction_type,
        transaction.title,
        transaction.category?.name ?? transaction.category_label ?? "",
        source?.account?.name ?? "",
        destination?.account?.name ?? "",
        source?.currency_code ?? "",
        source ? Math.abs(source.amount_minor) : "",
        destination?.currency_code ?? "",
        destination ? Math.abs(destination.amount_minor) : "",
        transaction.notes ?? ""
      ]);
    }

    const body = "\uFEFF" + rows.map((row) => row.map(csv).join(",")).join("\r\n");
    const filename = `finzaro-report-${range.from}-${range.to}-${currency}.csv`;
    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store"
      }
    });
  } catch {
    return NextResponse.json({ error: "Không thể xuất báo cáo." }, { status: 500 });
  }
}
