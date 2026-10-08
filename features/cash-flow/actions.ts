"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseMajorAmountToMinor } from "@/features/accounts/money";
import { requireUser } from "@/lib/auth";

function text(formData: FormData, key: string) { return String(formData.get(key) ?? "").trim(); }
function destination(kind: "error" | "message", message: string) {
  return `/cash-flow?${new URLSearchParams({ [kind]: message }).toString()}`;
}
function monthStart(value: string) {
  return /^\d{4}-\d{2}-01$/.test(value) ? value : null;
}

export async function saveCashFlowPlanAction(formData: FormData) {
  try {
    const month = monthStart(text(formData, "month_start"));
    const currencyCode = text(formData, "currency_code").toUpperCase();
    const notes = text(formData, "notes");
    if (!month) throw new Error("Tháng kế hoạch không hợp lệ.");
    if (notes.length > 1000) throw new Error("Ghi chú tối đa 1000 ký tự.");

    const { supabase, userId } = await requireUser();
    const { data: currency, error: currencyError } = await supabase
      .from("supported_currencies")
      .select("code, decimal_digits")
      .eq("code", currencyCode)
      .eq("is_active", true)
      .maybeSingle();
    if (currencyError || !currency) throw new Error("Tiền tệ không hợp lệ.");

    const parse = (key: string) => parseMajorAmountToMinor(text(formData, key) || "0", currency.decimal_digits);
    const plannedIncome = parse("planned_income");
    const discretionary = parse("discretionary_limit");
    const savingsReserve = parse("savings_reserve");
    const extraDebt = parse("extra_debt_payment");
    const cashBuffer = parse("minimum_cash_buffer");
    const values = [plannedIncome, discretionary, savingsReserve, extraDebt, cashBuffer];
    if (values.some((value) => value === null || value! < 0)) throw new Error("Các giá trị kế hoạch phải là số tiền hợp lệ và không âm.");

    const { error } = await (supabase as any).from("cash_flow_plans").upsert({
      user_id: userId,
      month_start: month,
      currency_code: currencyCode,
      planned_income_minor: plannedIncome,
      discretionary_limit_minor: discretionary,
      savings_reserve_minor: savingsReserve,
      extra_debt_payment_minor: extraDebt,
      minimum_cash_buffer_minor: cashBuffer,
      notes: notes || null
    }, { onConflict: "user_id,month_start,currency_code" });
    if (error) throw error;

    revalidatePath("/cash-flow");
    revalidatePath("/forecast");
    revalidatePath("/overview");
    redirect(destination("message", "Đã lưu kế hoạch dòng tiền tháng."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(destination("error", error instanceof Error ? error.message : "Không thể lưu kế hoạch dòng tiền."));
  }
}

export async function deleteCashFlowPlanAction(formData: FormData) {
  const planId = text(formData, "plan_id");
  if (!planId) redirect(destination("error", "Thiếu mã kế hoạch."));
  const { supabase, userId } = await requireUser();
  const { error } = await (supabase as any).from("cash_flow_plans").delete().eq("id", planId).eq("user_id", userId);
  if (error) redirect(destination("error", "Không thể xóa kế hoạch dòng tiền."));
  revalidatePath("/cash-flow");
  redirect(destination("message", "Đã xóa kế hoạch và quay về baseline dự báo."));
}
