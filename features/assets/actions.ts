"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseMajorAmountToMinor } from "@/features/accounts/money";
import { isCategoryIconColor, isCategoryIconName } from "@/features/categories/icons";
import { ASSET_TYPE_LABELS, type InvestmentAssetType } from "@/features/assets/data";
import { requireUser } from "@/lib/auth";

function text(formData: FormData, key: string) { return String(formData.get(key) ?? "").trim(); }
function destination(kind: "error" | "message", message: string, archived = false) { const q = new URLSearchParams({ [kind]: message }); if (archived) q.set("show", "archived"); return `/assets?${q.toString()}`; }
function validDate(value: string) { if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const d = new Date(`${value}T00:00:00Z`); return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value; }
function revalidateAssets() { revalidatePath("/assets"); revalidatePath("/overview"); revalidatePath("/net-worth"); revalidatePath("/health"); }

async function assetPayload(formData: FormData, mode: "create" | "update") {
  const name = text(formData, "name");
  const assetType = text(formData, "asset_type") as InvestmentAssetType;
  const quantityInput = text(formData, "quantity");
  const costInput = text(formData, "cost_basis");
  const valueInput = text(formData, "current_value");
  const institutionName = text(formData, "institution_name");
  const purchaseDate = text(formData, "purchase_date") || null;
  const valuationDate = text(formData, "valuation_date");
  const linkedAccountId = text(formData, "linked_account_id") || null;
  const iconName = text(formData, "icon_name") || "Coins";
  const iconColor = text(formData, "icon_color") || "#7c3aed";
  const notes = text(formData, "notes");
  if (name.length < 1 || name.length > 120) throw new Error("Tên tài sản phải từ 1 đến 120 ký tự.");
  if (!(assetType in ASSET_TYPE_LABELS)) throw new Error("Loại tài sản không hợp lệ.");
  if (purchaseDate && !validDate(purchaseDate)) throw new Error("Ngày mua không hợp lệ.");
  if (!validDate(valuationDate)) throw new Error("Ngày định giá không hợp lệ.");
  if (!isCategoryIconName(iconName)) throw new Error("Icon tài sản không hợp lệ.");
  if (!isCategoryIconColor(iconColor)) throw new Error("Màu icon không hợp lệ.");
  if (notes.length > 1000) throw new Error("Ghi chú tối đa 1000 ký tự.");
  const quantity = quantityInput ? Number(quantityInput.replace(",", ".")) : null;
  if (quantity !== null && (!Number.isFinite(quantity) || quantity < 0)) throw new Error("Số lượng tài sản không hợp lệ.");

  const { supabase, userId } = await requireUser();
  let currencyCode = text(formData, "currency_code").toUpperCase();
  if (mode === "update") {
    const assetId = text(formData, "asset_id");
    const { data: existing, error } = await (supabase as any).from("investment_assets").select("currency_code").eq("id", assetId).eq("user_id", userId).maybeSingle();
    if (error || !existing) throw new Error("Không tìm thấy tài sản.");
    currencyCode = existing.currency_code;
  }
  const { data: currency, error: currencyError } = await supabase.from("supported_currencies").select("decimal_digits").eq("code", currencyCode).eq("is_active", true).maybeSingle();
  if (currencyError || !currency) throw new Error("Tiền tệ không hợp lệ.");
  const costBasisMinor = parseMajorAmountToMinor(costInput || "0", currency.decimal_digits);
  const currentValueMinor = parseMajorAmountToMinor(valueInput || "0", currency.decimal_digits);
  if (costBasisMinor === null || costBasisMinor < 0) throw new Error("Giá vốn không hợp lệ.");
  if (currentValueMinor === null || currentValueMinor < 0) throw new Error("Giá trị hiện tại không hợp lệ.");
  if (linkedAccountId) {
    const { data: account, error } = await supabase.from("accounts").select("currency_code,is_archived").eq("id", linkedAccountId).eq("user_id", userId).maybeSingle();
    if (error || !account) throw new Error("Không tìm thấy tài khoản liên kết.");
    if (account.currency_code !== currencyCode) throw new Error("Tiền tệ tài sản phải trùng tài khoản liên kết.");
    if (account.is_archived) throw new Error("Không thể liên kết tài khoản đã lưu trữ.");
  }
  return { supabase, userId, payload: { name, asset_type: assetType, currency_code: currencyCode, quantity, cost_basis_minor: costBasisMinor, current_value_minor: currentValueMinor, institution_name: institutionName || null, purchase_date: purchaseDate, valuation_date: valuationDate, linked_account_id: linkedAccountId, icon_name: iconName, icon_color: iconColor, notes: notes || null } };
}

export async function createInvestmentAssetAction(formData: FormData) {
  try {
    const { supabase, userId, payload } = await assetPayload(formData, "create");
    const { error } = await (supabase as any).from("investment_assets").insert({ ...payload, user_id: userId });
    if (error) throw error;
    revalidateAssets();
    redirect(destination("message", "Đã thêm tài sản và ghi nhận định giá ban đầu."));
  } catch (error) { if (error && typeof error === "object" && "digest" in error) throw error; redirect(destination("error", error instanceof Error ? error.message : "Không thể tạo tài sản.")); }
}

export async function updateInvestmentAssetAction(formData: FormData) {
  const assetId = text(formData, "asset_id");
  if (!assetId) redirect(destination("error", "Thiếu mã tài sản."));
  try {
    const { supabase, userId, payload } = await assetPayload(formData, "update");
    const { currency_code: _currency, ...updates } = payload;
    const { data, error } = await (supabase as any).from("investment_assets").update(updates).eq("id", assetId).eq("user_id", userId).select("id").maybeSingle();
    if (error || !data) throw error ?? new Error("Không tìm thấy tài sản.");
    revalidateAssets();
    redirect(destination("message", "Đã cập nhật tài sản; lịch sử định giá được ghi tự động khi giá trị thay đổi."));
  } catch (error) { if (error && typeof error === "object" && "digest" in error) throw error; redirect(destination("error", error instanceof Error ? error.message : "Không thể cập nhật tài sản.")); }
}

export async function setInvestmentAssetArchivedAction(formData: FormData) {
  const assetId = text(formData, "asset_id");
  const archived = text(formData, "archived") === "true";
  const { supabase, userId } = await requireUser();
  const { data, error } = await (supabase as any).from("investment_assets").update({ is_archived: archived }).eq("id", assetId).eq("user_id", userId).select("id").maybeSingle();
  if (error || !data) redirect(destination("error", "Không thể thay đổi trạng thái tài sản.", archived));
  revalidateAssets();
  redirect(destination("message", archived ? "Đã lưu trữ tài sản." : "Đã khôi phục tài sản.", archived));
}
