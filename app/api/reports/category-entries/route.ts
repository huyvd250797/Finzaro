import { NextRequest, NextResponse } from "next/server";
import { loadReportLedger } from "@/features/reports/data";
import { flowAmount, monthBounds, type ReportFlowType } from "@/features/reports/experience";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "private, no-store" } });
}

/** Only the selected day (month view) or month (year view) is loaded on demand. */
export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const mode = search.get("mode");
  const type = search.get("type");
  const category = search.get("category") ?? "";
  const key = search.get("key") ?? "";
  if (mode !== "month" && mode !== "year") return fail("Chế độ báo cáo không hợp lệ.", 400);
  if (type !== "expense" && type !== "income") return fail("Loại giao dịch không hợp lệ.", 400);
  const validCategory = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category) || category === `uncategorized-${type}`;
  if (!validCategory) return fail("Danh mục không hợp lệ.", 400);
  const keyPattern = mode === "month" ? /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/ : /^\d{4}-(0[1-9]|1[0-2])$/;
  if (!keyPattern.test(key) || Number(key.slice(0, 4)) < 2000 || Number(key.slice(0, 4)) > 2200) return fail("Kỳ báo cáo không hợp lệ.", 400);
  if (mode === "month" && Number(key.slice(8)) > monthBounds(key.slice(0, 7)).days) return fail("Ngày không hợp lệ.", 400);
  const fromDate = mode === "month" ? key : monthBounds(key).from;
  const toDate = mode === "month" ? key : monthBounds(key).to;

  try {
    const { supabase, userId } = await requireUser();
    const { data: preferences, error: preferencesError } = await supabase.from("user_preferences")
      .select("currency_code").eq("id", userId).maybeSingle();
    if (preferencesError) throw preferencesError;
    const currency = (preferences?.currency_code ?? "VND").toUpperCase();
    const ledger = await loadReportLedger(supabase, userId, { fromDate, toDate });
    if (ledger.diagnostics.strategy === "empty" && ledger.diagnostics.warnings.length) {
      return fail("Không thể tải dữ liệu giao dịch. Vui lòng thử lại.", 503);
    }
    const entries = ledger.transactions
      .filter((transaction) => (transaction.category_id ?? `uncategorized-${type}`) === category)
      .map((transaction) => ({ transaction, amount: flowAmount(transaction, currency, type as ReportFlowType) }))
      .filter(({ amount }) => amount > 0)
      .map(({ transaction, amount }) => ({
        id: transaction.id, title: transaction.title, transactionDate: transaction.transaction_date,
        categoryName: transaction.category?.name ?? transaction.category_label ?? "Chưa phân loại",
        iconName: transaction.category?.icon_name ?? null,
        iconColor: transaction.category?.icon_color ?? null, amount
      }))
      .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate) || b.id.localeCompare(a.id));
    return NextResponse.json({ transactions: entries, total: entries.reduce((sum, item) => sum + item.amount, 0), count: entries.length }, {
      headers: { "Cache-Control": "private, no-store" }
    });
  } catch (error) {
    console.error("[Finzaro Report Drilldown]", error);
    return fail("Không thể tải giao dịch. Hãy thử lại.", 500);
  }
}
