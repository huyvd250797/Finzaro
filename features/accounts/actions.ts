"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isAccountType } from "@/features/accounts/constants";
import { parseMajorAmountToMinor } from "@/features/accounts/money";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function destination(kind: "error" | "message", message: string) {
  return `/accounts?${new URLSearchParams({ [kind]: message }).toString()}`;
}

function metadataPayload(formData: FormData) {
  const name = text(formData, "name");
  const accountType = text(formData, "account_type");
  const institutionName = text(formData, "institution_name");

  if (name.length < 1 || name.length > 100) throw new Error("Tên tài khoản phải từ 1 đến 100 ký tự.");
  if (!isAccountType(accountType)) throw new Error("Loại tài khoản không hợp lệ.");
  if (institutionName.length > 100) throw new Error("Tên tổ chức tối đa 100 ký tự.");

  return {
    name,
    account_type: accountType,
    institution_name: institutionName || null
  };
}

async function createPayload(formData: FormData) {
  const metadata = metadataPayload(formData);
  const currencyCode = text(formData, "currency_code").toUpperCase();
  const balanceInput = text(formData, "balance");
  const { supabase } = await requireUser();
  const { data: currency, error } = await supabase
    .from("supported_currencies")
    .select("code, decimal_digits")
    .eq("code", currencyCode)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !currency) throw new Error("Tiền tệ không hợp lệ.");
  const balanceMinor = parseMajorAmountToMinor(balanceInput || "0", currency.decimal_digits);
  if (balanceMinor === null) throw new Error(`Số dư không hợp lệ. ${currencyCode} hỗ trợ tối đa ${currency.decimal_digits} chữ số thập phân.`);

  return {
    ...metadata,
    currency_code: currencyCode,
    opening_balance_minor: balanceMinor,
    current_balance_minor: balanceMinor
  };
}

export async function createAccountAction(formData: FormData) {
  try {
    const { supabase, userId } = await requireUser();
    const payload = await createPayload(formData);
    const { error } = await supabase.from("accounts").insert({ ...payload, user_id: userId });
    if (error) throw error;

    revalidatePath("/accounts");
    revalidatePath("/overview");
    redirect(destination("message", "Đã tạo tài khoản tài chính."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    const message = error instanceof Error ? error.message : "Không thể tạo tài khoản.";
    redirect(destination("error", message));
  }
}

export async function updateAccountAction(formData: FormData) {
  const accountId = text(formData, "account_id");
  if (!accountId) redirect(destination("error", "Thiếu mã tài khoản."));

  try {
    const { supabase, userId } = await requireUser();
    const payload = metadataPayload(formData);
    const { data, error } = await supabase
      .from("accounts")
      .update(payload)
      .eq("id", accountId)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();
    if (error || !data) throw new Error("Không tìm thấy tài khoản để cập nhật.");

    revalidatePath("/accounts");
    revalidatePath("/overview");
    revalidatePath("/transactions");
    redirect(destination("message", "Đã cập nhật thông tin tài khoản. Số dư được quản lý bởi Transaction Core."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    const message = error instanceof Error ? error.message : "Không thể cập nhật tài khoản.";
    redirect(destination("error", message));
  }
}

export async function setAccountArchivedAction(formData: FormData) {
  const accountId = text(formData, "account_id");
  const archived = text(formData, "archived") === "true";
  if (!accountId) redirect(destination("error", "Thiếu mã tài khoản."));

  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase.from("accounts").update({ is_archived: archived }).eq("id", accountId).eq("user_id", userId).select("id").maybeSingle();

  if (error || !data) redirect(destination("error", "Không thể thay đổi trạng thái tài khoản."));
  revalidatePath("/accounts");
  revalidatePath("/overview");
  revalidatePath("/transactions");
  redirect(destination("message", archived ? "Đã lưu trữ tài khoản. Lịch sử giao dịch vẫn được giữ nguyên." : "Đã khôi phục tài khoản."));
}
