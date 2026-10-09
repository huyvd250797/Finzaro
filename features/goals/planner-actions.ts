"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseMajorAmountToMinor } from "@/features/accounts/money";
import { requireUser } from "@/lib/auth";

function text(formData: FormData, key: string) { return String(formData.get(key) ?? "").trim(); }
function destination(kind: "error" | "message", message: string) {
  return `/goal-planner?${new URLSearchParams({ [kind]: message }).toString()}`;
}

export async function saveFinancialGoalPlanAction(formData: FormData) {
  try {
    const currencyCode = text(formData, "currency_code").toUpperCase();
    const strategy = text(formData, "strategy");
    const notes = text(formData, "notes");
    if (!currencyCode) throw new Error("Thiếu tiền tệ kế hoạch.");
    if (!['priority', 'balanced'].includes(strategy)) throw new Error("Chiến lược phân bổ không hợp lệ.");
    if (notes.length > 1000) throw new Error("Ghi chú tối đa 1000 ký tự.");

    const { supabase } = await requireUser();
    const { data: currency, error: currencyError } = await supabase
      .from("supported_currencies")
      .select("decimal_digits")
      .eq("code", currencyCode)
      .eq("is_active", true)
      .maybeSingle();
    if (currencyError || !currency) throw new Error("Tiền tệ không hợp lệ.");

    const monthlyAvailable = parseMajorAmountToMinor(text(formData, "monthly_available") || "0", currency.decimal_digits);
    if (monthlyAvailable === null || monthlyAvailable < 0) throw new Error("Nguồn tiền phân bổ hàng tháng không hợp lệ.");

    const goalIds = formData.getAll("goal_id").map((value) => String(value));
    const allocations = goalIds.map((goalId) => {
      const amount = parseMajorAmountToMinor(text(formData, `allocation_${goalId}`) || "0", currency.decimal_digits);
      const priority = Number(text(formData, `priority_${goalId}`) || "999");
      if (amount === null || amount < 0) throw new Error("Số tiền phân bổ mục tiêu không hợp lệ.");
      if (!Number.isInteger(priority) || priority < 1 || priority > 999) throw new Error("Độ ưu tiên mục tiêu không hợp lệ.");
      return { goal_id: goalId, priority, monthly_allocation_minor: amount };
    });

    const total = allocations.reduce((sum, row) => sum + row.monthly_allocation_minor, 0);
    if (total > monthlyAvailable) throw new Error("Tổng phân bổ không thể lớn hơn nguồn tiền khả dụng hàng tháng.");

    const { error } = await (supabase as any).rpc("save_financial_goal_plan_v050", {
      p_currency_code: currencyCode,
      p_monthly_available_minor: monthlyAvailable,
      p_strategy: strategy,
      p_notes: notes || null,
      p_allocations: allocations
    });
    if (error) throw error;

    revalidatePath("/goal-planner");
    revalidatePath("/goals");
    revalidatePath("/overview");
    revalidatePath("/cash-flow");
    redirect(destination("message", "Đã lưu kế hoạch phân bổ mục tiêu tài chính."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(destination("error", error instanceof Error ? error.message : "Không thể lưu kế hoạch mục tiêu."));
  }
}

export async function deleteFinancialGoalPlanAction(formData: FormData) {
  const currencyCode = text(formData, "currency_code").toUpperCase();
  if (!currencyCode) redirect(destination("error", "Thiếu tiền tệ kế hoạch."));
  const { supabase, userId } = await requireUser();
  const { error } = await (supabase as any)
    .from("financial_goal_plans")
    .delete()
    .eq("user_id", userId)
    .eq("currency_code", currencyCode);
  if (error) redirect(destination("error", "Không thể xóa kế hoạch mục tiêu."));
  revalidatePath("/goal-planner");
  redirect(destination("message", "Đã xóa kế hoạch phân bổ và quay về gợi ý tự động."));
}
