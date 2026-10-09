"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseMajorAmountToMinor } from "@/features/accounts/money";
import { requireUser } from "@/lib/auth";

function field(formData: FormData, key: string) { return String(formData.get(key) ?? "").trim(); }

export async function saveDebtStrategyPlanAction(formData: FormData) {
  let destination = "/debt-strategy";
  try {
    const currencyCode = field(formData, "currency_code").toUpperCase();
    const strategy = field(formData, "strategy");
    const extra = field(formData, "extra_monthly");
    if (!currencyCode) throw new Error("Thiếu tiền tệ chiến lược.");
    if (!["avalanche", "snowball"].includes(strategy)) throw new Error("Chiến lược không hợp lệ.");

    const { supabase, userId } = await requireUser();
    const { data: currency, error: currencyError } = await supabase.from("supported_currencies").select("decimal_digits").eq("code", currencyCode).eq("is_active", true).maybeSingle();
    if (currencyError || !currency) throw new Error("Tiền tệ không hợp lệ.");
    const extraMinor = parseMajorAmountToMinor(extra || "0", currency.decimal_digits);
    if (extraMinor === null || extraMinor < 0) throw new Error("Số tiền trả thêm không hợp lệ.");

    const { error } = await (supabase as any).from("debt_strategy_plans").upsert({ user_id: userId, currency_code: currencyCode, strategy, extra_monthly_minor: extraMinor }, { onConflict: "user_id,currency_code" });
    if (error) throw error;
    revalidatePath("/debt-strategy");
    revalidatePath("/overview");
    destination = `/debt-strategy?message=${encodeURIComponent("Đã lưu cấu hình chiến lược trả nợ.")}`;
  } catch (error) {
    destination = `/debt-strategy?error=${encodeURIComponent(error instanceof Error ? error.message : "Không thể lưu chiến lược trả nợ.")}`;
  }
  redirect(destination);
}
