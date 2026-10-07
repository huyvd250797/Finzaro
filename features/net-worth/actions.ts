"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { loadNetWorthData, positionForCurrency } from "@/features/net-worth/data";
import { todayInTimeZone } from "@/features/recurring/data";
import { requireUser } from "@/lib/auth";

function destination(kind: "error" | "message", message: string, currency?: string) {
  const params = new URLSearchParams({ [kind]: message });
  if (currency) params.set("currency", currency);
  return `/net-worth?${params.toString()}`;
}

export async function saveNetWorthSnapshotAction(formData: FormData) {
  const requestedCurrency = String(formData.get("currency_code") ?? "").trim().toUpperCase();
  try {
    const { supabase, userId } = await requireUser();
    const { data: preferences } = await supabase.from("user_preferences").select("currency_code, timezone").eq("id", userId).maybeSingle();
    const currencyCode = requestedCurrency || preferences?.currency_code || "VND";
    const timeZone = preferences?.timezone ?? "Asia/Ho_Chi_Minh";
    const today = todayInTimeZone(timeZone);
    const data = await loadNetWorthData(supabase, userId, today);
    const summary = positionForCurrency(data.summaries, currencyCode);

    const { error } = await (supabase as any).from("net_worth_snapshots").upsert({
      user_id: userId,
      snapshot_date: today,
      currency_code: currencyCode,
      account_assets_minor: summary.account_assets_minor,
      deposit_assets_minor: summary.deposit_assets_minor,
      loan_liabilities_minor: summary.loan_liabilities_minor,
      credit_card_liabilities_minor: summary.credit_card_liabilities_minor,
      total_assets_minor: summary.total_assets_minor,
      total_liabilities_minor: summary.total_liabilities_minor,
      net_worth_minor: summary.net_worth_minor,
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id,snapshot_date,currency_code" });
    if (error) throw error;
    revalidatePath("/net-worth");
    revalidatePath("/overview");
    redirect(destination("message", "Đã lưu snapshot tài sản ròng hôm nay.", currencyCode));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(destination("error", "Không thể lưu snapshot tài sản ròng.", requestedCurrency));
  }
}
