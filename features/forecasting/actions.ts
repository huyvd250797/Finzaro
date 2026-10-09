"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

function text(formData: FormData, key: string) { return String(formData.get(key) ?? "").trim(); }
function integer(formData: FormData, key: string) {
  const value = Number(text(formData, key) || "0");
  return Number.isSafeInteger(value) ? value : null;
}
function destination(kind: "error" | "message", message: string) {
  return `/forecast?${new URLSearchParams({ [kind]: message }).toString()}`;
}

export async function saveForecastScenarioAction(formData: FormData) {
  try {
    const name = text(formData, "name");
    const currencyCode = text(formData, "currency_code").toUpperCase();
    const horizonDays = Number(text(formData, "horizon_days"));
    const incomeAdjust = Number(text(formData, "income_adjust_percent").replace(/,/g, "."));
    const expenseAdjust = Number(text(formData, "expense_adjust_percent").replace(/,/g, "."));
    const extraIncome = integer(formData, "extra_income_minor");
    const extraExpense = integer(formData, "extra_expense_minor");
    const extraDebt = integer(formData, "extra_debt_payment_minor");
    const reserve = integer(formData, "monthly_savings_reserve_minor");

    if (name.length < 1 || name.length > 120) throw new Error("Tên kịch bản phải từ 1 đến 120 ký tự.");
    if (![30, 90, 180, 365].includes(horizonDays)) throw new Error("Khoảng dự báo không hợp lệ.");
    if (!Number.isFinite(incomeAdjust) || incomeAdjust < -90 || incomeAdjust > 300) throw new Error("Điều chỉnh thu nhập không hợp lệ.");
    if (!Number.isFinite(expenseAdjust) || expenseAdjust < -90 || expenseAdjust > 300) throw new Error("Điều chỉnh chi tiêu không hợp lệ.");
    if ([extraIncome, extraExpense, extraDebt, reserve].some((value) => value === null || value! < 0)) throw new Error("Giá trị kịch bản không hợp lệ.");

    const { supabase, userId } = await requireUser();
    const { data: currency } = await supabase.from("supported_currencies").select("code").eq("code", currencyCode).eq("is_active", true).maybeSingle();
    if (!currency) throw new Error("Tiền tệ không hợp lệ.");

    const { error } = await (supabase as any).from("forecast_scenarios").insert({
      user_id: userId,
      name,
      currency_code: currencyCode,
      horizon_days: horizonDays,
      income_adjust_percent: Math.round(incomeAdjust * 10) / 10,
      expense_adjust_percent: Math.round(expenseAdjust * 10) / 10,
      extra_income_minor: extraIncome,
      extra_expense_minor: extraExpense,
      extra_debt_payment_minor: extraDebt,
      monthly_savings_reserve_minor: reserve
    });
    if (error) throw error;
    revalidatePath("/forecast");
    redirect(destination("message", "Đã lưu kịch bản dự báo."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(destination("error", error instanceof Error ? error.message : "Không thể lưu kịch bản."));
  }
}

export async function deleteForecastScenarioAction(formData: FormData) {
  const scenarioId = text(formData, "scenario_id");
  if (!scenarioId) redirect(destination("error", "Thiếu mã kịch bản."));
  const { supabase, userId } = await requireUser();
  const { error } = await (supabase as any).from("forecast_scenarios").delete().eq("id", scenarioId).eq("user_id", userId);
  if (error) redirect(destination("error", "Không thể xóa kịch bản."));
  revalidatePath("/forecast");
  redirect(destination("message", "Đã xóa kịch bản."));
}
