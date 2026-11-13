import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CategoryDetailPayload, CategoryDetailRow } from "@/features/reports/category-detail-preview";
import type { ReportFlowType } from "@/features/reports/experience";

/*
 * Targeted one-day / one-month query. The old category endpoint hydrated the
 * entire report ledger (including all categories and currencies) for each click.
 * This endpoint only reads this user's selected category, date range, and the
 * attached ledger entries. All important filters remain enforced server-side.
 */
export async function loadFastCategoryEntries(
  supabase: SupabaseClient<Database>, userId: string,
  params: { type: ReportFlowType; category: string; from: string; to: string; currency: string }
): Promise<CategoryDetailPayload> {
  const rows: CategoryDetailRow[] = [];
  const pageSize = 400;
  let offset = 0;
  for (;;) {
    let query = supabase.from("transactions")
      .select("id, title, transaction_date, transaction_type, transaction_purpose, category_id, category_label, categories(name, icon_name, icon_color), transaction_entries(currency_code, amount_minor, entry_role)")
      .eq("user_id", userId)
      .eq("transaction_type", params.type)
      .gte("transaction_date", params.from)
      .lte("transaction_date", params.to)
      .order("transaction_date", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + pageSize - 1);
    query = params.category.startsWith("uncategorized-") ? query.is("category_id", null) : query.eq("category_id", params.category);
    const { data, error } = await query;
    if (error) throw error;
    const page = (data ?? []) as unknown as Array<{
      id: string; title: string; transaction_date: string; transaction_type: string;
      transaction_purpose: string | null; category_label: string | null;
      categories: { name: string; icon_name: string | null; icon_color: string | null } | Array<{ name: string; icon_name: string | null; icon_color: string | null }> | null;
      transaction_entries: Array<{ currency_code: string; amount_minor: number; entry_role: string }> | null;
    }>;
    for (const tx of page) {
      if ((tx.transaction_purpose ?? "standard") !== "standard" || tx.transaction_type !== params.type) continue;
      const entry = tx.transaction_entries?.find((item) => item.entry_role === params.type && item.currency_code === params.currency);
      const amount = Number(entry?.amount_minor);
      if (!Number.isFinite(amount) || amount === 0) continue;
      const category = Array.isArray(tx.categories) ? tx.categories[0] : tx.categories;
      rows.push({ id: tx.id, title: tx.title, transactionDate: tx.transaction_date,
        categoryName: category?.name ?? tx.category_label ?? "Chưa phân loại",
        iconName: category?.icon_name ?? null, iconColor: category?.icon_color ?? null, amount: Math.abs(amount) });
    }
    if (page.length < pageSize) break;
    offset += page.length;
    if (offset > 100000) throw new Error("Danh sách giao dịch quá lớn; vui lòng thu hẹp kỳ báo cáo.");
  }
  return { transactions: rows, total: rows.reduce((sum, row) => sum + row.amount, 0), count: rows.length };
}
