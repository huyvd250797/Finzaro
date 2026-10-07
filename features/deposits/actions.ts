"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseMajorAmountToMinor } from "@/features/accounts/money";
import { isCategoryIconName } from "@/features/categories/icons";
import { requireUser } from "@/lib/auth";

function text(formData: FormData, key: string) { return String(formData.get(key) ?? "").trim(); }
function destination(kind: "error" | "message", message: string, archived = false) {
  const params = new URLSearchParams({ [kind]: message });
  if (archived) params.set("show", "archived");
  return `/deposits?${params.toString()}`;
}
function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function addMonthsClamped(value: string, months: number) {
  const [year, month, day] = value.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}
function revalidateDeposits() {
  revalidatePath("/deposits");
  revalidatePath("/overview");
  revalidatePath("/reports");
}
function safeMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== "object" || !("message" in error)) return fallback;
  const message = String(error.message);
  const allowed = ["Deposit", "deposit", "Linked", "currency", "Archived", "maturity"];
  return allowed.some((part) => message.toLowerCase().includes(part.toLowerCase())) ? message : fallback;
}

async function depositPayload(formData: FormData, mode: "create" | "update") {
  const name = text(formData, "name");
  const institutionName = text(formData, "institution_name");
  const principalInput = text(formData, "principal");
  const rateInput = text(formData, "annual_rate_percent");
  const termInput = text(formData, "term_months");
  const startDate = text(formData, "start_date");
  const interestMethod = text(formData, "interest_method");
  const linkedAccountId = text(formData, "linked_account_id") || null;
  const iconName = text(formData, "icon_name") || "Landmark";
  const notes = text(formData, "notes");
  const autoRenew = text(formData, "auto_renew") === "on";

  if (name.length < 1 || name.length > 120) throw new Error("Tên tiền gửi phải từ 1 đến 120 ký tự.");
  if (institutionName.length > 120) throw new Error("Tên tổ chức tối đa 120 ký tự.");
  if (!validDate(startDate)) throw new Error("Ngày gửi không hợp lệ.");
  if (!isCategoryIconName(iconName)) throw new Error("Icon tiền gửi không hợp lệ.");
  if (notes.length > 1000) throw new Error("Ghi chú tối đa 1000 ký tự.");
  if (!["simple_maturity", "compound_monthly", "monthly_payout"].includes(interestMethod)) throw new Error("Phương thức tính lãi không hợp lệ.");

  const annualRate = Number(rateInput);
  if (!Number.isFinite(annualRate) || annualRate < 0 || annualRate > 100 || !/^\d+(?:\.\d{1,4})?$/.test(rateInput)) throw new Error("Lãi suất phải từ 0 đến 100% và tối đa 4 chữ số thập phân.");
  const termMonths = Number(termInput);
  if (!Number.isInteger(termMonths) || termMonths < 1 || termMonths > 600) throw new Error("Kỳ hạn phải từ 1 đến 600 tháng.");

  const { supabase, userId } = await requireUser();
  let currencyCode = text(formData, "currency_code").toUpperCase();
  if (mode === "update") {
    const depositId = text(formData, "deposit_id");
    const { data: existing, error } = await supabase.from("deposits").select("currency_code").eq("id", depositId).eq("user_id", userId).maybeSingle();
    if (error || !existing) throw new Error("Không tìm thấy khoản tiền gửi.");
    currencyCode = existing.currency_code;
  }

  const { data: currency, error: currencyError } = await supabase.from("supported_currencies").select("code, decimal_digits").eq("code", currencyCode).eq("is_active", true).maybeSingle();
  if (currencyError || !currency) throw new Error("Tiền tệ không hợp lệ.");
  const principalMinor = parseMajorAmountToMinor(principalInput, currency.decimal_digits);
  if (principalMinor === null || principalMinor <= 0) throw new Error("Số tiền gốc phải lớn hơn 0 và đúng định dạng tiền tệ.");

  if (linkedAccountId) {
    const { data: account, error } = await supabase.from("accounts").select("currency_code, is_archived").eq("id", linkedAccountId).eq("user_id", userId).maybeSingle();
    if (error || !account) throw new Error("Không tìm thấy tài khoản liên kết.");
    if (account.currency_code !== currencyCode) throw new Error("Tiền tệ của tài khoản liên kết phải trùng với tiền gửi.");
    if (account.is_archived) throw new Error("Không thể liên kết tài khoản đã lưu trữ.");
  }

  return {
    supabase, userId,
    payload: {
      name,
      institution_name: institutionName || null,
      currency_code: currencyCode,
      principal_minor: principalMinor,
      annual_rate_percent: annualRate,
      term_months: termMonths,
      start_date: startDate,
      maturity_date: addMonthsClamped(startDate, termMonths),
      interest_method: interestMethod,
      auto_renew: autoRenew,
      linked_account_id: linkedAccountId,
      icon_name: iconName,
      notes: notes || null
    }
  };
}

export async function createDepositAction(formData: FormData) {
  try {
    const { supabase, userId, payload } = await depositPayload(formData, "create");
    const { error } = await supabase.from("deposits").insert({ ...payload, user_id: userId });
    if (error) throw error;
    revalidateDeposits();
    redirect(destination("message", "Đã tạo khoản tiền gửi."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(destination("error", safeMessage(error, error instanceof Error ? error.message : "Không thể tạo khoản tiền gửi.")));
  }
}

export async function updateDepositAction(formData: FormData) {
  const depositId = text(formData, "deposit_id");
  if (!depositId) redirect(destination("error", "Thiếu mã tiền gửi."));
  try {
    const { supabase, userId, payload } = await depositPayload(formData, "update");
    const { currency_code: _lockedCurrency, ...updatePayload } = payload;
    const { data, error } = await supabase.from("deposits").update(updatePayload).eq("id", depositId).eq("user_id", userId).select("id").maybeSingle();
    if (error || !data) throw error ?? new Error("Không tìm thấy khoản tiền gửi.");
    revalidateDeposits();
    redirect(destination("message", "Đã cập nhật khoản tiền gửi."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(destination("error", safeMessage(error, error instanceof Error ? error.message : "Không thể cập nhật khoản tiền gửi.")));
  }
}

export async function setDepositArchivedAction(formData: FormData) {
  const depositId = text(formData, "deposit_id");
  const archived = text(formData, "archived") === "true";
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase.from("deposits").update({ is_archived: archived }).eq("id", depositId).eq("user_id", userId).select("id").maybeSingle();
  if (error || !data) redirect(destination("error", "Không thể thay đổi trạng thái tiền gửi.", archived));
  revalidateDeposits();
  redirect(destination("message", archived ? "Đã lưu trữ khoản tiền gửi." : "Đã khôi phục khoản tiền gửi.", archived));
}

export async function addDepositInterestEntryAction(formData: FormData) {
  const depositId = text(formData, "deposit_id");
  const entryType = text(formData, "entry_type");
  const amountInput = text(formData, "amount");
  const entryDate = text(formData, "entry_date");
  const notes = text(formData, "notes");
  if (!["interest", "tax", "fee", "adjustment"].includes(entryType)) redirect(destination("error", "Loại ghi nhận lãi không hợp lệ."));
  if (!validDate(entryDate)) redirect(destination("error", "Ngày ghi nhận không hợp lệ."));

  try {
    const { supabase, userId } = await requireUser();
    const { data: deposit, error: depositError } = await supabase.from("deposits").select("currency_code, is_archived").eq("id", depositId).eq("user_id", userId).maybeSingle();
    if (depositError || !deposit) throw new Error("Không tìm thấy khoản tiền gửi.");
    if (deposit.is_archived) throw new Error("Khoản tiền gửi đã lưu trữ không thể nhận thêm ghi nhận lãi.");
    const { data: currency } = await supabase.from("supported_currencies").select("decimal_digits").eq("code", deposit.currency_code).maybeSingle();
    const parsed = parseMajorAmountToMinor(amountInput, currency?.decimal_digits ?? 0);
    if (parsed === null || parsed === 0) throw new Error("Số tiền ghi nhận không hợp lệ.");
    let amountMinor = Math.abs(parsed);
    if (entryType === "tax" || entryType === "fee") amountMinor = -amountMinor;
    if (entryType === "adjustment") amountMinor = parsed;
    const { error } = await supabase.from("deposit_interest_entries").insert({ user_id: userId, deposit_id: depositId, entry_type: entryType, amount_minor: amountMinor, entry_date: entryDate, notes: notes || null });
    if (error) throw error;
    revalidateDeposits();
    redirect(destination("message", "Đã ghi nhận lãi/chi phí thực tế."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(destination("error", safeMessage(error, error instanceof Error ? error.message : "Không thể ghi nhận lãi thực tế.")));
  }
}

export async function deleteDepositInterestEntryAction(formData: FormData) {
  const entryId = text(formData, "entry_id");
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("deposit_interest_entries").delete().eq("id", entryId).eq("user_id", userId);
  if (error) redirect(destination("error", "Không thể xóa ghi nhận lãi."));
  revalidateDeposits();
  redirect(destination("message", "Đã xóa ghi nhận lãi/chi phí."));
}
