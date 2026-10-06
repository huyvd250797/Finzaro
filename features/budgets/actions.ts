"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseMajorAmountToMinor } from "@/features/accounts/money";
import { monthStartFromKey, shiftMonthKey } from "@/features/budgets/data";
import { requireUser } from "@/lib/auth";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function destination(month: string, kind: "error" | "message", message: string) {
  const query = new URLSearchParams();
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) query.set("month", month);
  query.set(kind, message);
  return `/budgets?${query.toString()}`;
}

function validMonth(value: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function safeMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== "object") return fallback;
  const message = "message" in error ? String(error.message) : "";
  if (/budgets_user_category_month_currency_key|duplicate key/i.test(message)) return "Danh mục này đã có ngân sách cho tháng và tiền tệ đã chọn.";
  if (/overlap|ancestor|descendant|chồng lấp/i.test(message)) return "Không thể tạo ngân sách chồng lấp giữa danh mục cha và danh mục con trong cùng tháng/tiền tệ.";
  if (/expense category/i.test(message)) return "Ngân sách chỉ áp dụng cho danh mục chi tiêu đang hoạt động.";
  return fallback;
}

async function validatedBudgetPayload(formData: FormData) {
  const categoryId = text(formData, "category_id");
  const month = text(formData, "month");
  const currencyCode = text(formData, "currency_code").toUpperCase();
  const amountInput = text(formData, "amount");
  if (!categoryId) throw new Error("Hãy chọn danh mục chi tiêu.");
  if (!validMonth(month)) throw new Error("Tháng ngân sách không hợp lệ.");

  const { supabase, userId } = await requireUser();
  const [{ data: category, error: categoryError }, { data: currency, error: currencyError }] = await Promise.all([
    supabase.from("categories").select("id, category_type, is_archived").eq("id", categoryId).eq("user_id", userId).maybeSingle(),
    supabase.from("supported_currencies").select("code, decimal_digits").eq("code", currencyCode).eq("is_active", true).maybeSingle()
  ]);

  if (categoryError || !category || category.category_type !== "expense" || category.is_archived) throw new Error("Danh mục chi tiêu không hợp lệ hoặc đã lưu trữ.");
  if (currencyError || !currency) throw new Error("Tiền tệ không hợp lệ.");

  const amountMinor = parseMajorAmountToMinor(amountInput, currency.decimal_digits);
  if (amountMinor === null || amountMinor <= 0) throw new Error(`Ngân sách phải lớn hơn 0 và đúng định dạng ${currencyCode}.`);

  return {
    supabase,
    userId,
    month,
    payload: {
      category_id: categoryId,
      month_start: monthStartFromKey(month),
      currency_code: currencyCode,
      amount_minor: amountMinor
    }
  };
}

export async function createBudgetAction(formData: FormData) {
  const monthFallback = text(formData, "month") || "";
  try {
    const { supabase, userId, month, payload } = await validatedBudgetPayload(formData);
    const { error } = await supabase.from("budgets").insert({ ...payload, user_id: userId });
    if (error) throw new Error(safeMessage(error, "Không thể tạo ngân sách."));

    revalidatePath("/budgets");
    revalidatePath("/overview");
    redirect(destination(month, "message", "Đã tạo ngân sách tháng."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(destination(validMonth(monthFallback) ? monthFallback : "", "error", error instanceof Error ? error.message : "Không thể tạo ngân sách."));
  }
}

export async function updateBudgetAction(formData: FormData) {
  const budgetId = text(formData, "budget_id");
  const month = text(formData, "month");
  if (!budgetId || !validMonth(month)) redirect(destination(month, "error", "Thiếu thông tin ngân sách."));

  try {
    const amountInput = text(formData, "amount");
    const { supabase, userId } = await requireUser();
    const { data: budget, error: budgetError } = await supabase
      .from("budgets")
      .select("id, currency_code")
      .eq("id", budgetId)
      .eq("user_id", userId)
      .maybeSingle();
    if (budgetError || !budget) throw new Error("Không tìm thấy ngân sách.");

    const { data: currency, error: currencyError } = await supabase
      .from("supported_currencies")
      .select("code, decimal_digits")
      .eq("code", budget.currency_code)
      .eq("is_active", true)
      .maybeSingle();
    if (currencyError || !currency) throw new Error("Tiền tệ ngân sách không hợp lệ.");

    const amountMinor = parseMajorAmountToMinor(amountInput, currency.decimal_digits);
    if (amountMinor === null || amountMinor <= 0) throw new Error(`Ngân sách phải lớn hơn 0 và đúng định dạng ${currency.code}.`);

    const { data, error } = await supabase
      .from("budgets")
      .update({ amount_minor: amountMinor })
      .eq("id", budgetId)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();
    if (error || !data) throw new Error("Không thể cập nhật ngân sách.");

    revalidatePath("/budgets");
    revalidatePath("/overview");
    redirect(destination(month, "message", "Đã cập nhật hạn mức ngân sách."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(destination(month, "error", error instanceof Error ? error.message : "Không thể cập nhật ngân sách."));
  }
}

export async function setBudgetArchivedAction(formData: FormData) {
  const budgetId = text(formData, "budget_id");
  const month = text(formData, "month");
  const archived = text(formData, "archived") === "true";
  if (!budgetId || !validMonth(month)) redirect(destination(month, "error", "Thiếu thông tin ngân sách."));

  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("budgets")
    .update({ is_archived: archived })
    .eq("id", budgetId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();
  if (error || !data) redirect(destination(month, "error", "Không thể thay đổi trạng thái ngân sách."));

  revalidatePath("/budgets");
  revalidatePath("/overview");
  redirect(destination(month, "message", archived ? "Đã lưu trữ ngân sách." : "Đã khôi phục ngân sách."));
}

export async function copyPreviousMonthBudgetsAction(formData: FormData) {
  const month = text(formData, "month");
  if (!validMonth(month)) redirect(destination(month, "error", "Tháng ngân sách không hợp lệ."));

  try {
    const { supabase, userId } = await requireUser();
    const targetStart = monthStartFromKey(month);
    const previousStart = monthStartFromKey(shiftMonthKey(month, -1));

    const [{ count: targetCount, error: targetError }, { data: previous, error: previousError }] = await Promise.all([
      supabase.from("budgets").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("month_start", targetStart).eq("is_archived", false),
      supabase.from("budgets").select("category_id, currency_code, amount_minor").eq("user_id", userId).eq("month_start", previousStart).eq("is_archived", false)
    ]);

    if (targetError || previousError) throw new Error("Không thể đọc dữ liệu ngân sách.");
    if ((targetCount ?? 0) > 0) throw new Error("Tháng này đã có ngân sách. Chỉ có thể sao chép vào một tháng chưa được thiết lập.");
    if (!previous || previous.length === 0) throw new Error("Tháng trước chưa có ngân sách để sao chép.");

    const { error } = await supabase.from("budgets").insert(previous.map((item: { category_id: string; currency_code: string; amount_minor: number }) => ({ ...item, user_id: userId, month_start: targetStart })));
    if (error) throw new Error(safeMessage(error, "Không thể sao chép ngân sách tháng trước."));

    revalidatePath("/budgets");
    revalidatePath("/overview");
    redirect(destination(month, "message", `Đã sao chép ${previous.length} ngân sách từ tháng trước.`));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(destination(month, "error", error instanceof Error ? error.message : "Không thể sao chép ngân sách."));
  }
}
