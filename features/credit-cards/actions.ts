"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseMajorAmountToMinor } from "@/features/accounts/money";
import { isCategoryIconColor, isCategoryIconName } from "@/features/categories/icons";
import { minimumPaymentMinor } from "@/features/credit-cards/data";
import { requireUser } from "@/lib/auth";

function text(formData: FormData, key: string) { return String(formData.get(key) ?? "").trim(); }
function destination(kind: "error" | "message", message: string, archived = false) {
  const params = new URLSearchParams({ [kind]: message });
  if (archived) params.set("show", "archived");
  return `/credit-cards?${params.toString()}`;
}
function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
function revalidateCreditCards() {
  revalidatePath("/credit-cards");
  revalidatePath("/overview");
  revalidatePath("/reports");
}
function safeMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== "object" || !("message" in error)) return fallback;
  const message = String(error.message);
  const keywords = ["Credit card", "credit card", "Statement", "statement", "Linked", "currency", "payment", "Payment", "limit", "balance"];
  return keywords.some((keyword) => message.toLowerCase().includes(keyword.toLowerCase())) ? message : fallback;
}

async function cardPayload(formData: FormData, mode: "create" | "update") {
  const name = text(formData, "name");
  const bankName = text(formData, "bank_name");
  const last4 = text(formData, "last4");
  const limitInput = text(formData, "credit_limit");
  const balanceInput = text(formData, "current_balance") || "0";
  const annualRateInput = text(formData, "annual_rate_percent") || "0";
  const statementDayInput = text(formData, "statement_day") || "20";
  const dueDaysInput = text(formData, "due_days_after_statement") || "15";
  const minimumPercentInput = text(formData, "minimum_payment_percent") || "5";
  const minimumFloorInput = text(formData, "minimum_payment_floor") || "0";
  const linkedAccountId = text(formData, "linked_payment_account_id") || null;
  const iconName = text(formData, "icon_name") || "CreditCard";
  const iconColor = text(formData, "icon_color") || "#2563eb";
  const notes = text(formData, "notes");

  if (name.length < 1 || name.length > 120) throw new Error("Tên thẻ phải từ 1 đến 120 ký tự.");
  if (bankName.length > 120) throw new Error("Tên ngân hàng tối đa 120 ký tự.");
  if (last4 && !/^\d{4}$/.test(last4)) throw new Error("4 số cuối thẻ phải gồm đúng 4 chữ số.");
  if (!isCategoryIconName(iconName)) throw new Error("Icon thẻ không hợp lệ.");
  if (!isCategoryIconColor(iconColor)) throw new Error("Màu icon không hợp lệ.");
  if (notes.length > 1000) throw new Error("Ghi chú tối đa 1000 ký tự.");

  const annualRate = Number(annualRateInput);
  const statementDay = Number(statementDayInput);
  const dueDays = Number(dueDaysInput);
  const minimumPercent = Number(minimumPercentInput);
  if (!Number.isFinite(annualRate) || annualRate < 0 || annualRate > 100) throw new Error("Lãi suất phải từ 0 đến 100%.");
  if (!Number.isInteger(statementDay) || statementDay < 1 || statementDay > 28) throw new Error("Ngày chốt sao kê phải từ 1 đến 28.");
  if (!Number.isInteger(dueDays) || dueDays < 1 || dueDays > 60) throw new Error("Số ngày tới hạn thanh toán phải từ 1 đến 60.");
  if (!Number.isFinite(minimumPercent) || minimumPercent < 0 || minimumPercent > 100) throw new Error("Tỷ lệ thanh toán tối thiểu phải từ 0 đến 100%.");

  const { supabase, userId } = await requireUser();
  let currencyCode = text(formData, "currency_code").toUpperCase();
  if (mode === "update") {
    const cardId = text(formData, "card_id");
    const { data: existing, error } = await (supabase as any).from("credit_cards").select("currency_code").eq("id", cardId).eq("user_id", userId).maybeSingle();
    if (error || !existing) throw new Error("Không tìm thấy thẻ tín dụng.");
    currencyCode = existing.currency_code;
  }
  const { data: currency, error: currencyError } = await supabase.from("supported_currencies").select("code, decimal_digits").eq("code", currencyCode).eq("is_active", true).maybeSingle();
  if (currencyError || !currency) throw new Error("Tiền tệ không hợp lệ.");
  const limitMinor = parseMajorAmountToMinor(limitInput, currency.decimal_digits);
  const balanceMinor = parseMajorAmountToMinor(balanceInput, currency.decimal_digits);
  const floorMinor = parseMajorAmountToMinor(minimumFloorInput, currency.decimal_digits);
  if (limitMinor === null || limitMinor <= 0) throw new Error("Hạn mức tín dụng phải lớn hơn 0.");
  if (balanceMinor === null || balanceMinor < 0) throw new Error("Dư nợ hiện tại không hợp lệ.");
  if (floorMinor === null || floorMinor < 0) throw new Error("Mức thanh toán tối thiểu cố định không hợp lệ.");

  if (linkedAccountId) {
    const { data: account, error } = await supabase.from("accounts").select("currency_code, is_archived").eq("id", linkedAccountId).eq("user_id", userId).maybeSingle();
    if (error || !account) throw new Error("Không tìm thấy tài khoản thanh toán liên kết.");
    if (account.currency_code !== currencyCode) throw new Error("Tiền tệ tài khoản thanh toán phải trùng với thẻ.");
    if (account.is_archived) throw new Error("Không thể liên kết tài khoản đã lưu trữ.");
  }

  return { supabase, userId, payload: {
    name, bank_name: bankName || null, last4: last4 || null, currency_code: currencyCode,
    credit_limit_minor: limitMinor, current_balance_minor: balanceMinor, annual_rate_percent: annualRate,
    statement_day: statementDay, due_days_after_statement: dueDays, minimum_payment_percent: minimumPercent,
    minimum_payment_floor_minor: floorMinor, linked_payment_account_id: linkedAccountId,
    icon_name: iconName, icon_color: iconColor, notes: notes || null
  }};
}

export async function createCreditCardAction(formData: FormData) {
  try {
    const { supabase, userId, payload } = await cardPayload(formData, "create");
    const { error } = await (supabase as any).from("credit_cards").insert({ ...payload, user_id: userId });
    if (error) throw error;
    revalidateCreditCards();
    redirect(destination("message", "Đã thêm thẻ tín dụng."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(destination("error", safeMessage(error, error instanceof Error ? error.message : "Không thể tạo thẻ tín dụng.")));
  }
}

export async function updateCreditCardAction(formData: FormData) {
  const cardId = text(formData, "card_id");
  if (!cardId) redirect(destination("error", "Thiếu mã thẻ."));
  try {
    const { supabase, userId, payload } = await cardPayload(formData, "update");
    const { currency_code: _locked, ...updates } = payload;
    const { data, error } = await (supabase as any).from("credit_cards").update(updates).eq("id", cardId).eq("user_id", userId).select("id").maybeSingle();
    if (error || !data) throw error ?? new Error("Không tìm thấy thẻ tín dụng.");
    revalidateCreditCards();
    redirect(destination("message", "Đã cập nhật thẻ tín dụng."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(destination("error", safeMessage(error, error instanceof Error ? error.message : "Không thể cập nhật thẻ tín dụng.")));
  }
}

export async function setCreditCardArchivedAction(formData: FormData) {
  const cardId = text(formData, "card_id");
  const archived = text(formData, "archived") === "true";
  const { supabase, userId } = await requireUser();
  const { data, error } = await (supabase as any).from("credit_cards").update({ is_archived: archived }).eq("id", cardId).eq("user_id", userId).select("id").maybeSingle();
  if (error || !data) redirect(destination("error", "Không thể thay đổi trạng thái thẻ.", archived));
  revalidateCreditCards();
  redirect(destination("message", archived ? "Đã lưu trữ thẻ tín dụng." : "Đã khôi phục thẻ tín dụng.", archived));
}

export async function createCreditCardStatementAction(formData: FormData) {
  try {
    const cardId = text(formData, "card_id");
    const statementDate = text(formData, "statement_date");
    const balanceInput = text(formData, "statement_balance");
    const notes = text(formData, "notes");
    if (!validDate(statementDate)) throw new Error("Ngày sao kê không hợp lệ.");
    const { supabase, userId } = await requireUser();
    const { data: card, error: cardError } = await (supabase as any).from("credit_cards").select("currency_code,due_days_after_statement,minimum_payment_percent,minimum_payment_floor_minor,is_archived").eq("id", cardId).eq("user_id", userId).maybeSingle();
    if (cardError || !card) throw new Error("Không tìm thấy thẻ tín dụng.");
    if (card.is_archived) throw new Error("Thẻ đã lưu trữ không thể tạo sao kê mới.");
    const { data: currency } = await supabase.from("supported_currencies").select("decimal_digits").eq("code", card.currency_code).maybeSingle();
    const balanceMinor = parseMajorAmountToMinor(balanceInput, currency?.decimal_digits ?? 0);
    if (balanceMinor === null || balanceMinor < 0) throw new Error("Số dư sao kê không hợp lệ.");
    const minimum = minimumPaymentMinor(balanceMinor, Number(card.minimum_payment_percent), Number(card.minimum_payment_floor_minor));
    const { error } = await (supabase as any).from("credit_card_statements").insert({
      user_id: userId, credit_card_id: cardId, statement_date: statementDate,
      due_date: addDays(statementDate, Number(card.due_days_after_statement)),
      statement_balance_minor: balanceMinor, minimum_payment_minor: minimum, notes: notes || null
    });
    if (error) throw error;
    revalidateCreditCards();
    redirect(destination("message", "Đã tạo sao kê thẻ."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(destination("error", safeMessage(error, error instanceof Error ? error.message : "Không thể tạo sao kê.")));
  }
}

export async function addCreditCardPaymentAction(formData: FormData) {
  try {
    const cardId = text(formData, "card_id");
    const statementId = text(formData, "statement_id") || null;
    const paymentDate = text(formData, "payment_date");
    const amountInput = text(formData, "amount");
    const transactionId = text(formData, "transaction_id") || null;
    const notes = text(formData, "notes");
    if (!validDate(paymentDate)) throw new Error("Ngày thanh toán không hợp lệ.");
    const { supabase, userId } = await requireUser();
    const { data: card, error: cardError } = await (supabase as any).from("credit_cards").select("currency_code,is_archived").eq("id", cardId).eq("user_id", userId).maybeSingle();
    if (cardError || !card) throw new Error("Không tìm thấy thẻ tín dụng.");
    if (card.is_archived) throw new Error("Thẻ đã lưu trữ không thể nhận thanh toán mới.");
    const { data: currency } = await supabase.from("supported_currencies").select("decimal_digits").eq("code", card.currency_code).maybeSingle();
    const amountMinor = parseMajorAmountToMinor(amountInput, currency?.decimal_digits ?? 0);
    if (amountMinor === null || amountMinor <= 0) throw new Error("Số tiền thanh toán không hợp lệ.");
    const { error } = await (supabase as any).from("credit_card_payments").insert({ user_id: userId, credit_card_id: cardId, statement_id: statementId, payment_date: paymentDate, amount_minor: amountMinor, transaction_id: transactionId, notes: notes || null });
    if (error) throw error;
    revalidateCreditCards();
    redirect(destination("message", "Đã ghi nhận thanh toán thẻ và cập nhật dư nợ."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(destination("error", safeMessage(error, error instanceof Error ? error.message : "Không thể ghi nhận thanh toán.")));
  }
}

export async function deleteCreditCardPaymentAction(formData: FormData) {
  const paymentId = text(formData, "payment_id");
  const { supabase, userId } = await requireUser();
  const { data, error } = await (supabase as any).from("credit_card_payments").delete().eq("id", paymentId).eq("user_id", userId).select("id").maybeSingle();
  if (error || !data) redirect(destination("error", "Không thể xóa thanh toán thẻ."));
  revalidateCreditCards();
  redirect(destination("message", "Đã xóa thanh toán và hoàn lại dư nợ thẻ."));
}
