"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseMajorAmountToMinor } from "@/features/accounts/money";
import { isCategoryIconColor, isCategoryIconName } from "@/features/categories/icons";
import type { LoanInterestMethod } from "@/features/loans/data";
import { requireUser } from "@/lib/auth";

function text(formData: FormData, key: string) { return String(formData.get(key) ?? "").trim(); }
function destination(kind: "error" | "message", message: string, archived = false) {
  const params = new URLSearchParams({ [kind]: message });
  if (archived) params.set("show", "archived");
  return `/loans?${params.toString()}`;
}
function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function revalidateLoans() {
  revalidatePath("/loans");
  revalidatePath("/overview");
  revalidatePath("/reports");
}
function safeMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== "object" || !("message" in error)) return fallback;
  const message = String(error.message);
  const allowed = ["Loan", "loan", "Linked", "currency", "Archived", "principal", "payment"];
  return allowed.some((part) => message.toLowerCase().includes(part.toLowerCase())) ? message : fallback;
}

async function loanPayload(formData: FormData, mode: "create" | "update") {
  const name = text(formData, "name");
  const lenderName = text(formData, "lender_name");
  const principalInput = text(formData, "original_principal");
  const annualRateInput = text(formData, "annual_rate_percent").replace(/,/g, ".");
  const termInput = text(formData, "term_months");
  const startDate = text(formData, "start_date");
  const firstPaymentDate = text(formData, "first_payment_date");
  const interestMethod = text(formData, "interest_method") as LoanInterestMethod;
  const paymentFrequency = text(formData, "payment_frequency") || "monthly";
  const linkedAccountId = text(formData, "linked_account_id") || null;
  const feeInput = text(formData, "upfront_fee") || "0";
  const iconName = text(formData, "icon_name") || "CreditCard";
  const iconColor = text(formData, "icon_color") || "#2563eb";
  const notes = text(formData, "notes");

  if (name.length < 1 || name.length > 120) throw new Error("Tên khoản vay phải từ 1 đến 120 ký tự.");
  if (lenderName.length > 120) throw new Error("Tên bên cho vay tối đa 120 ký tự.");
  if (!validDate(startDate) || !validDate(firstPaymentDate) || firstPaymentDate < startDate) throw new Error("Ngày bắt đầu hoặc ngày trả kỳ đầu không hợp lệ.");
  if (!isCategoryIconName(iconName)) throw new Error("Icon khoản vay không hợp lệ.");
  if (!isCategoryIconColor(iconColor)) throw new Error("Màu icon khoản vay không hợp lệ.");
  if (notes.length > 1000) throw new Error("Ghi chú tối đa 1000 ký tự.");
  if (!["annuity", "equal_principal", "interest_only"].includes(interestMethod)) throw new Error("Phương thức trả nợ không hợp lệ.");
  if (!["monthly", "biweekly", "weekly"].includes(paymentFrequency)) throw new Error("Tần suất thanh toán không hợp lệ.");

  const annualRate = Number(annualRateInput);
  if (!Number.isFinite(annualRate) || annualRate < 0 || annualRate > 100 || !/^\d+(?:\.\d{1,4})?$/.test(annualRateInput)) throw new Error("Lãi suất phải từ 0 đến 100% và tối đa 4 chữ số thập phân.");
  const termMonths = Number(termInput);
  if (!Number.isInteger(termMonths) || termMonths < 1 || termMonths > 600) throw new Error("Thời hạn phải từ 1 đến 600 tháng.");

  const { supabase, userId } = await requireUser();
  let currencyCode = text(formData, "currency_code").toUpperCase();
  if (mode === "update") {
    const loanId = text(formData, "loan_id");
    const { data: existing, error } = await (supabase as any).from("loans").select("currency_code").eq("id", loanId).eq("user_id", userId).maybeSingle();
    if (error || !existing) throw new Error("Không tìm thấy khoản vay.");
    currencyCode = existing.currency_code;
  }

  const { data: currency, error: currencyError } = await supabase.from("supported_currencies").select("code, decimal_digits").eq("code", currencyCode).eq("is_active", true).maybeSingle();
  if (currencyError || !currency) throw new Error("Tiền tệ không hợp lệ.");
  const principalMinor = parseMajorAmountToMinor(principalInput, currency.decimal_digits);
  const upfrontFeeMinor = parseMajorAmountToMinor(feeInput, currency.decimal_digits);
  if (principalMinor === null || principalMinor <= 0) throw new Error("Số tiền vay phải lớn hơn 0 và đúng định dạng tiền tệ.");
  if (upfrontFeeMinor === null || upfrontFeeMinor < 0) throw new Error("Phí ban đầu không hợp lệ.");

  if (linkedAccountId) {
    const { data: account, error } = await supabase.from("accounts").select("currency_code, is_archived").eq("id", linkedAccountId).eq("user_id", userId).maybeSingle();
    if (error || !account) throw new Error("Không tìm thấy tài khoản liên kết.");
    if (account.currency_code !== currencyCode) throw new Error("Tiền tệ của tài khoản liên kết phải trùng với khoản vay.");
    if (account.is_archived) throw new Error("Không thể liên kết tài khoản đã lưu trữ.");
  }

  return {
    supabase,
    userId,
    payload: {
      name,
      lender_name: lenderName || null,
      currency_code: currencyCode,
      original_principal_minor: principalMinor,
      annual_rate_percent: annualRate,
      term_months: termMonths,
      start_date: startDate,
      first_payment_date: firstPaymentDate,
      interest_method: interestMethod,
      payment_frequency: paymentFrequency,
      upfront_fee_minor: upfrontFeeMinor,
      linked_account_id: linkedAccountId,
      icon_name: iconName,
      icon_color: iconColor,
      notes: notes || null
    }
  };
}

export async function createLoanAction(formData: FormData) {
  try {
    const { supabase, userId, payload } = await loanPayload(formData, "create");
    const { error } = await (supabase as any).from("loans").insert({ ...payload, user_id: userId });
    if (error) throw error;
    revalidateLoans();
    redirect(destination("message", "Đã tạo khoản vay."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(destination("error", safeMessage(error, error instanceof Error ? error.message : "Không thể tạo khoản vay.")));
  }
}

export async function updateLoanAction(formData: FormData) {
  const loanId = text(formData, "loan_id");
  if (!loanId) redirect(destination("error", "Thiếu mã khoản vay."));
  try {
    const { supabase, userId, payload } = await loanPayload(formData, "update");
    const { currency_code: _lockedCurrency, ...updatePayload } = payload;
    const { data, error } = await (supabase as any).from("loans").update(updatePayload).eq("id", loanId).eq("user_id", userId).select("id").maybeSingle();
    if (error || !data) throw error ?? new Error("Không tìm thấy khoản vay.");
    revalidateLoans();
    redirect(destination("message", "Đã cập nhật khoản vay."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(destination("error", safeMessage(error, error instanceof Error ? error.message : "Không thể cập nhật khoản vay.")));
  }
}

export async function setLoanArchivedAction(formData: FormData) {
  const loanId = text(formData, "loan_id");
  const archived = text(formData, "archived") === "true";
  const { supabase, userId } = await requireUser();
  const { data, error } = await (supabase as any).from("loans").update({ is_archived: archived }).eq("id", loanId).eq("user_id", userId).select("id").maybeSingle();
  if (error || !data) redirect(destination("error", "Không thể thay đổi trạng thái khoản vay.", archived));
  revalidateLoans();
  redirect(destination("message", archived ? "Đã lưu trữ khoản vay." : "Đã khôi phục khoản vay.", archived));
}

export async function addLoanPaymentAction(formData: FormData) {
  const loanId = text(formData, "loan_id");
  const paymentDate = text(formData, "payment_date");
  const principalInput = text(formData, "principal") || "0";
  const interestInput = text(formData, "interest") || "0";
  const feeInput = text(formData, "fee") || "0";
  const transactionId = text(formData, "transaction_id") || null;
  const notes = text(formData, "notes");

  try {
    if (!validDate(paymentDate)) throw new Error("Ngày thanh toán không hợp lệ.");
    if (notes.length > 500) throw new Error("Ghi chú tối đa 500 ký tự.");
    const { supabase, userId } = await requireUser();
    const { data: loan, error: loanError } = await (supabase as any).from("loans").select("currency_code, is_archived").eq("id", loanId).eq("user_id", userId).maybeSingle();
    if (loanError || !loan) throw new Error("Không tìm thấy khoản vay.");
    if (loan.is_archived) throw new Error("Khoản vay đã lưu trữ không thể nhận thanh toán mới.");
    const { data: currency } = await supabase.from("supported_currencies").select("decimal_digits").eq("code", loan.currency_code).maybeSingle();
    const digits = currency?.decimal_digits ?? 0;
    const principalMinor = parseMajorAmountToMinor(principalInput, digits);
    const interestMinor = parseMajorAmountToMinor(interestInput, digits);
    const feeMinor = parseMajorAmountToMinor(feeInput, digits);
    if (principalMinor === null || interestMinor === null || feeMinor === null || principalMinor < 0 || interestMinor < 0 || feeMinor < 0 || principalMinor + interestMinor + feeMinor <= 0) throw new Error("Số tiền thanh toán không hợp lệ.");

    const { error } = await (supabase as any).from("loan_payments").insert({
      user_id: userId,
      loan_id: loanId,
      payment_date: paymentDate,
      principal_minor: principalMinor,
      interest_minor: interestMinor,
      fee_minor: feeMinor,
      transaction_id: transactionId,
      notes: notes || null
    });
    if (error) throw error;
    revalidateLoans();
    redirect(destination("message", "Đã ghi nhận thanh toán khoản vay."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(destination("error", safeMessage(error, error instanceof Error ? error.message : "Không thể ghi nhận thanh toán.")));
  }
}

export async function deleteLoanPaymentAction(formData: FormData) {
  const paymentId = text(formData, "payment_id");
  const { supabase, userId } = await requireUser();
  const { data, error } = await (supabase as any).from("loan_payments").delete().eq("id", paymentId).eq("user_id", userId).select("id").maybeSingle();
  if (error || !data) redirect(destination("error", "Không thể xóa lịch sử thanh toán."));
  revalidateLoans();
  redirect(destination("message", "Đã xóa lịch sử thanh toán và tính lại dư nợ."));
}
