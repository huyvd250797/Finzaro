"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { loadFinancialHealthData } from "@/features/financial-health/data";
import { todayInTimeZone } from "@/features/recurring/data";
import { requireUser } from "@/lib/auth";

function destination(kind: "error" | "message", message: string) {
  return `/health?${new URLSearchParams({ [kind]: message }).toString()}`;
}

export async function saveFinancialHealthSnapshotAction(_formData: FormData) {
  try {
    const { supabase, userId } = await requireUser();
    const { data: preferences } = await supabase.from("user_preferences").select("timezone").eq("id", userId).maybeSingle();
    const today = todayInTimeZone(preferences?.timezone ?? "Asia/Ho_Chi_Minh");
    const health = await loadFinancialHealthData(supabase, userId);
    const subscore = Object.fromEntries(health.subscores.map((item) => [item.key, item.score]));
    const { error } = await (supabase as any).from("financial_health_snapshots").upsert({
      user_id: userId,
      snapshot_date: today,
      currency_code: health.currency_code,
      overall_score: health.overall_score,
      data_confidence: health.data_confidence,
      cashflow_score: subscore.cashflow ?? 0,
      savings_score: subscore.savings ?? 0,
      budget_score: subscore.budget ?? 0,
      liquidity_score: subscore.liquidity ?? 0,
      debt_score: subscore.debt ?? 0,
      credit_score: subscore.credit ?? 0,
      net_worth_score: subscore.net_worth ?? 0,
      metrics: health.metrics,
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id,snapshot_date,currency_code" });
    if (error) throw error;
    revalidatePath("/health");
    revalidatePath("/overview");
    redirect(destination("message", "Đã lưu Financial Health snapshot hôm nay."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(destination("error", "Không thể lưu Financial Health snapshot. Hãy chắc chắn SQL V0.2.0 đã được chạy."));
  }
}
