"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseMajorAmountToMinor } from "@/features/accounts/money";
import { isCategoryIconColor, isCategoryIconName } from "@/features/categories/icons";
import { requireUser } from "@/lib/auth";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function destination(kind: "error" | "message", message: string, showArchived = false) {
  const query = new URLSearchParams({ [kind]: message });
  if (showArchived) query.set("show", "archived");
  return `/goals?${query.toString()}`;
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function safeMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== "object" || !("message" in error)) return fallback;
  const message = String(error.message);
  if (/transaction_unique|duplicate key/i.test(message)) return "Giao dịch này đã được liên kết với một lần đóng góp/rút tiền khác.";
  const allowed = ["Savings goal", "Linked savings account", "savings account", "currency", "Archived", "ledger amount", "transaction"];
  return allowed.some((part) => message.toLowerCase().includes(part.toLowerCase())) ? message : fallback;
}

async function validateGoalMetadata(formData: FormData, mode: "create" | "update") {
  const name = text(formData, "name");
  const description = text(formData, "description");
  const targetAmountInput = text(formData, "target_amount");
  const targetDate = text(formData, "target_date") || null;
  const linkedAccountId = text(formData, "linked_account_id") || null;
  const iconName = text(formData, "icon_name") || "PiggyBank";
  const iconColor = text(formData, "icon_color") || "#0d8b66";

  if (name.length < 1 || name.length > 120) throw new Error("Tên mục tiêu phải từ 1 đến 120 ký tự.");
  if (description.length > 500) throw new Error("Mô tả tối đa 500 ký tự.");
  if (targetDate && !validDate(targetDate)) throw new Error("Ngày mục tiêu không hợp lệ.");
  if (!isCategoryIconName(iconName)) throw new Error("Icon mục tiêu không hợp lệ.");
  if (!isCategoryIconColor(iconColor)) throw new Error("Màu icon mục tiêu không hợp lệ.");

  const { supabase, userId } = await requireUser();
  let currencyCode = text(formData, "currency_code").toUpperCase();

  if (mode === "update") {
    const goalId = text(formData, "goal_id");
    const { data: existing, error } = await supabase.from("savings_goals").select("currency_code").eq("id", goalId).eq("user_id", userId).maybeSingle();
    if (error || !existing) throw new Error("Không tìm thấy mục tiêu tiết kiệm.");
    currencyCode = existing.currency_code;
  }

  const { data: currency, error: currencyError } = await supabase.from("supported_currencies").select("code, decimal_digits").eq("code", currencyCode).eq("is_active", true).maybeSingle();
  if (currencyError || !currency) throw new Error("Tiền tệ không hợp lệ.");
  const targetAmountMinor = parseMajorAmountToMinor(targetAmountInput, currency.decimal_digits);
  if (targetAmountMinor === null || targetAmountMinor <= 0) throw new Error(`Số tiền mục tiêu không hợp lệ cho ${currencyCode}.`);

  if (linkedAccountId) {
    const { data: account, error: accountError } = await supabase.from("accounts").select("id, currency_code, is_archived, account_type").eq("id", linkedAccountId).eq("user_id", userId).maybeSingle();
    if (accountError || !account) throw new Error("Không tìm thấy tài khoản liên kết.");
    if (account.currency_code !== currencyCode) throw new Error("Tiền tệ mục tiêu phải trùng với tài khoản liên kết.");
    if (account.account_type !== "savings") throw new Error("Mục tiêu chỉ có thể liên kết với tài khoản tiết kiệm.");
    if (account.is_archived) throw new Error("Không thể liên kết tài khoản đã lưu trữ.");
  }

  return {
    supabase,
    userId,
    payload: {
      name,
      description: description || null,
      currency_code: currencyCode,
      target_amount_minor: targetAmountMinor,
      target_date: targetDate,
      linked_account_id: linkedAccountId,
      icon_name: iconName,
      icon_color: iconColor
    }
  };
}

export async function createSavingsGoalAction(formData: FormData) {
  try {
    const { supabase, userId, payload } = await validateGoalMetadata(formData, "create");
    const { error } = await (supabase as any).from("savings_goals").insert({ ...payload, user_id: userId });
    if (error) throw new Error(safeMessage(error, "Không thể tạo mục tiêu tiết kiệm."));
    revalidatePath("/goals");
    revalidatePath("/overview");
    redirect(destination("message", "Đã tạo mục tiêu tiết kiệm."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(destination("error", error instanceof Error ? error.message : "Không thể tạo mục tiêu tiết kiệm."));
  }
}

export async function updateSavingsGoalAction(formData: FormData) {
  const goalId = text(formData, "goal_id");
  if (!goalId) redirect(destination("error", "Thiếu mã mục tiêu."));
  try {
    const { supabase, userId, payload } = await validateGoalMetadata(formData, "update");
    const { currency_code: _currency, ...updatePayload } = payload;
    const { data, error } = await (supabase as any).from("savings_goals").update(updatePayload).eq("id", goalId).eq("user_id", userId).select("id").maybeSingle();
    if (error || !data) throw new Error(safeMessage(error, "Không thể cập nhật mục tiêu."));
    revalidatePath("/goals");
    revalidatePath("/overview");
    redirect(destination("message", "Đã cập nhật mục tiêu tiết kiệm."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(destination("error", error instanceof Error ? error.message : "Không thể cập nhật mục tiêu."));
  }
}

export async function setSavingsGoalArchivedAction(formData: FormData) {
  const goalId = text(formData, "goal_id");
  const archived = text(formData, "archived") === "true";
  if (!goalId) redirect(destination("error", "Thiếu mã mục tiêu."));
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase.from("savings_goals").update({ is_archived: archived }).eq("id", goalId).eq("user_id", userId).select("id").maybeSingle();
  if (error || !data) redirect(destination("error", safeMessage(error, "Không thể thay đổi trạng thái mục tiêu."), archived));
  revalidatePath("/goals");
  revalidatePath("/overview");
  redirect(destination("message", archived ? "Đã lưu trữ mục tiêu. Lịch sử đóng góp vẫn được giữ nguyên." : "Đã khôi phục mục tiêu.", archived));
}

export async function addSavingsGoalEntryAction(formData: FormData) {
  const goalId = text(formData, "goal_id");
  const entryType = text(formData, "entry_type");
  const amountInput = text(formData, "amount");
  const entryDate = text(formData, "entry_date");
  const transactionId = text(formData, "transaction_id") || null;
  const notes = text(formData, "notes");

  try {
    if (!goalId) throw new Error("Thiếu mã mục tiêu.");
    if (!["contribution", "withdrawal", "adjustment"].includes(entryType)) throw new Error("Loại cập nhật tiến độ không hợp lệ.");
    if (!validDate(entryDate)) throw new Error("Ngày ghi nhận không hợp lệ.");
    if (notes.length > 500) throw new Error("Ghi chú tối đa 500 ký tự.");
    if (entryType === "adjustment" && transactionId) throw new Error("Điều chỉnh thủ công không thể liên kết Transaction.");

    const { supabase, userId } = await requireUser();
    const { data: goal, error: goalError } = await supabase.from("savings_goals").select("currency_code, is_archived, linked_account_id").eq("id", goalId).eq("user_id", userId).maybeSingle();
    if (goalError || !goal) throw new Error("Không tìm thấy mục tiêu tiết kiệm.");
    if (goal.is_archived) throw new Error("Mục tiêu đã lưu trữ không thể nhận cập nhật mới.");
    if ((goal as any).linked_account_id && entryType !== "adjustment" && !transactionId) throw new Error("Mục tiêu này đang liên kết tài khoản tiết kiệm. Hãy dùng Chuyển tiền để tiến độ tự đồng bộ, tránh ghi trùng.");
    const { data: currency, error: currencyError } = await supabase.from("supported_currencies").select("decimal_digits").eq("code", goal.currency_code).eq("is_active", true).maybeSingle();
    if (currencyError || !currency) throw new Error("Không thể đọc cấu hình tiền tệ mục tiêu.");

    let amountMinor = parseMajorAmountToMinor(amountInput, currency.decimal_digits);
    if (amountMinor === null || amountMinor === 0) throw new Error(`Số tiền không hợp lệ cho ${goal.currency_code}.`);
    if (entryType === "contribution") {
      if (amountMinor < 0) amountMinor = Math.abs(amountMinor);
    } else if (entryType === "withdrawal") {
      amountMinor = -Math.abs(amountMinor);
    }

    const { error } = await supabase.from("savings_goal_entries").insert({
      user_id: userId,
      goal_id: goalId,
      entry_type: entryType,
      amount_minor: amountMinor,
      entry_date: entryDate,
      transaction_id: transactionId,
      notes: notes || null
    });
    if (error) throw new Error(safeMessage(error, "Không thể ghi nhận tiến độ mục tiêu."));

    revalidatePath("/goals");
    revalidatePath("/overview");
    redirect(destination("message", entryType === "withdrawal" ? "Đã ghi nhận khoản rút khỏi mục tiêu." : entryType === "adjustment" ? "Đã điều chỉnh tiến độ mục tiêu." : "Đã ghi nhận khoản đóng góp."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(destination("error", error instanceof Error ? error.message : "Không thể ghi nhận tiến độ mục tiêu."));
  }
}

export async function deleteSavingsGoalEntryAction(formData: FormData) {
  const entryId = text(formData, "entry_id");
  if (!entryId) redirect(destination("error", "Thiếu mã lịch sử mục tiêu."));
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase.from("savings_goal_entries").delete().eq("id", entryId).eq("user_id", userId).select("id").maybeSingle();
  if (error || !data) redirect(destination("error", "Không thể xóa mục lịch sử này."));
  revalidatePath("/goals");
  revalidatePath("/overview");
  redirect(destination("message", "Đã xóa mục lịch sử và tính lại tiến độ."));
}
