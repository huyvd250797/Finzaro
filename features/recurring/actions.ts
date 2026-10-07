"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { parseMajorAmountToMinor } from "@/features/accounts/money";
import { requireUser } from "@/lib/auth";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function destination(kind: "error" | "message", message: string) {
  return `/recurring?${new URLSearchParams({ [kind]: message }).toString()}`;
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function safeMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== "object" || !("message" in error)) return fallback;
  const message = String(error.message);
  const known = ["Recurring", "Archived", "account", "category", "Authentication", "already completed", "outside the rule schedule"];
  return known.some((part) => message.toLowerCase().includes(part.toLowerCase())) ? message : fallback;
}

export async function createRecurringRuleAction(formData: FormData) {
  try {
    const transactionType = text(formData, "transaction_type");
    const title = text(formData, "title");
    const categoryId = text(formData, "category_id") || null;
    const fromAccountId = text(formData, "from_account_id") || null;
    const toAccountId = text(formData, "to_account_id") || null;
    const fromAmountInput = text(formData, "from_amount");
    const toAmountInput = text(formData, "to_amount");
    const notes = text(formData, "notes");
    const frequency = text(formData, "frequency");
    const intervalCount = Number(text(formData, "interval_count") || "1");
    const startDate = text(formData, "start_date");
    const endDate = text(formData, "end_date") || null;

    if (!["income", "expense", "transfer"].includes(transactionType)) throw new Error("Loại giao dịch định kỳ không hợp lệ.");
    if (title.length < 1 || title.length > 140) throw new Error("Tên giao dịch định kỳ phải từ 1 đến 140 ký tự.");
    if (!["weekly", "monthly", "yearly"].includes(frequency)) throw new Error("Chu kỳ không hợp lệ.");
    if (!Number.isInteger(intervalCount) || intervalCount < 1 || intervalCount > 52) throw new Error("Khoảng lặp phải từ 1 đến 52.");
    if (!validDate(startDate) || (endDate && !validDate(endDate))) throw new Error("Ngày bắt đầu/kết thúc không hợp lệ.");
    if (endDate && endDate < startDate) throw new Error("Ngày kết thúc phải sau ngày bắt đầu.");
    if (notes.length > 500) throw new Error("Ghi chú tối đa 500 ký tự.");

    const { supabase, userId } = await requireUser();
    const accountIds = Array.from(new Set([fromAccountId, toAccountId].filter((value): value is string => Boolean(value))));
    const [{ data: accounts, error: accountError }, { data: currencies, error: currencyError }] = await Promise.all([
      accountIds.length ? supabase.from("accounts").select("id, currency_code, is_archived").eq("user_id", userId).in("id", accountIds) : Promise.resolve({ data: [], error: null }),
      supabase.from("supported_currencies").select("code, decimal_digits").eq("is_active", true)
    ]);
    if (accountError || !accounts || accounts.length !== accountIds.length) throw new Error("Không tìm thấy tài khoản hợp lệ.");
    if (currencyError || !currencies) throw new Error("Không thể đọc cấu hình tiền tệ.");
    const accountById = new Map((accounts as Array<{ id: string; currency_code: string; is_archived: boolean }>).map((account) => [account.id, account]));
    const digitsByCode = new Map((currencies as Array<{ code: string; decimal_digits: number }>).map((currency) => [currency.code, currency.decimal_digits]));

    let fromAmountMinor: number | null = null;
    let toAmountMinor: number | null = null;
    if (transactionType === "expense" || transactionType === "transfer") {
      if (!fromAccountId) throw new Error("Vui lòng chọn tài khoản nguồn.");
      const account = accountById.get(fromAccountId);
      if (!account || account.is_archived) throw new Error("Tài khoản nguồn không hợp lệ hoặc đã lưu trữ.");
      fromAmountMinor = parseMajorAmountToMinor(fromAmountInput, digitsByCode.get(account.currency_code) ?? 0);
      if (fromAmountMinor === null || fromAmountMinor <= 0) throw new Error(`Số tiền nguồn không hợp lệ cho ${account.currency_code}.`);
    }
    if (transactionType === "income" || transactionType === "transfer") {
      if (!toAccountId) throw new Error("Vui lòng chọn tài khoản nhận.");
      const account = accountById.get(toAccountId);
      if (!account || account.is_archived) throw new Error("Tài khoản nhận không hợp lệ hoặc đã lưu trữ.");
      const effectiveInput = transactionType === "transfer" && !toAmountInput && fromAccountId && accountById.get(fromAccountId)?.currency_code === account.currency_code ? fromAmountInput : toAmountInput;
      toAmountMinor = parseMajorAmountToMinor(effectiveInput, digitsByCode.get(account.currency_code) ?? 0);
      if (toAmountMinor === null || toAmountMinor <= 0) throw new Error(`Số tiền nhận không hợp lệ cho ${account.currency_code}.`);
    }
    if (transactionType !== "transfer" && !categoryId) throw new Error("Vui lòng chọn danh mục.");
    if (transactionType === "transfer" && fromAccountId === toAccountId) throw new Error("Chuyển tiền định kỳ cần hai tài khoản khác nhau.");

    const { error } = await supabase.from("recurring_rules").insert({
      user_id: userId,
      transaction_type: transactionType,
      title,
      category_id: transactionType === "transfer" ? null : categoryId,
      from_account_id: transactionType === "income" ? null : fromAccountId,
      to_account_id: transactionType === "expense" ? null : toAccountId,
      from_amount_minor: transactionType === "income" ? null : fromAmountMinor,
      to_amount_minor: transactionType === "expense" ? null : toAmountMinor,
      notes: notes || null,
      frequency,
      interval_count: intervalCount,
      start_date: startDate,
      end_date: endDate
    });
    if (error) throw new Error(safeMessage(error, "Không thể tạo giao dịch định kỳ."));

    revalidatePath("/recurring");
    revalidatePath("/overview");
    redirect(destination("message", "Đã tạo lịch giao dịch định kỳ."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(destination("error", error instanceof Error ? error.message : "Không thể tạo giao dịch định kỳ."));
  }
}

export async function setRecurringRuleActiveAction(formData: FormData) {
  const ruleId = text(formData, "rule_id");
  const active = text(formData, "active") === "true";
  if (!ruleId) redirect(destination("error", "Thiếu mã lịch định kỳ."));
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase.from("recurring_rules").update({ is_active: active }).eq("id", ruleId).eq("user_id", userId).select("id").maybeSingle();
  if (error || !data) redirect(destination("error", "Không thể thay đổi trạng thái lịch định kỳ."));
  revalidatePath("/recurring");
  revalidatePath("/overview");
  redirect(destination("message", active ? "Đã kích hoạt lại lịch định kỳ." : "Đã tạm dừng lịch định kỳ."));
}

export async function postRecurringOccurrenceAction(formData: FormData) {
  const ruleId = text(formData, "rule_id");
  const dueDate = text(formData, "due_date");
  const status = text(formData, "status");
  if (!ruleId || !validDate(dueDate) || !["paid", "skipped"].includes(status)) redirect(destination("error", "Dữ liệu kỳ định kỳ không hợp lệ."));
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase.rpc("post_recurring_occurrence_v007", { p_rule_id: ruleId, p_due_date: dueDate, p_status: status });
    if (error) throw new Error(safeMessage(error, "Không thể cập nhật kỳ định kỳ."));
    revalidatePath("/recurring");
    revalidatePath("/overview");
    revalidatePath("/transactions");
    revalidatePath("/accounts");
    revalidatePath("/budgets");
    redirect(destination("message", status === "paid" ? "Đã ghi nhận kỳ này và tạo Transaction thật." : "Đã bỏ qua kỳ này."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(destination("error", error instanceof Error ? error.message : "Không thể cập nhật kỳ định kỳ."));
  }
}

export async function undoRecurringOccurrenceAction(formData: FormData) {
  const occurrenceId = text(formData, "occurrence_id");
  if (!occurrenceId) redirect(destination("error", "Thiếu mã kỳ định kỳ."));
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase.rpc("undo_recurring_occurrence_v007", { p_occurrence_id: occurrenceId });
    if (error) throw new Error(safeMessage(error, "Không thể hoàn tác kỳ định kỳ."));
    revalidatePath("/recurring");
    revalidatePath("/overview");
    revalidatePath("/transactions");
    revalidatePath("/accounts");
    revalidatePath("/budgets");
    redirect(destination("message", "Đã hoàn tác trạng thái kỳ định kỳ."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(destination("error", error instanceof Error ? error.message : "Không thể hoàn tác kỳ định kỳ."));
  }
}
