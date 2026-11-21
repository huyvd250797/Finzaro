"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { parseMajorAmountToMinor } from "@/features/accounts/money";

function field(form: FormData, key: string) { return String(form.get(key) ?? "").trim(); }
function minor(form: FormData, key: string) {
  const parsed = parseMajorAmountToMinor(field(form, key) || "0", 0);
  if (parsed === null || parsed < 0) throw new Error(`Số tiền ${key} không hợp lệ.`);
  return parsed;
}
function dateText(text: string) {
  if (!text) return null;
  const date = new Date(`${text}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(date.getTime()) || date.toISOString().slice(0,10)!==text) throw new Error("Ngày không hợp lệ.");
  return text;
}
function uuid(value: string) {
  if (!/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(value)) throw new Error("Mã tài khoản không hợp lệ.");
  return value;
}
function interest(form: FormData) {
  const value = field(form,"annual_interest_rate").replace(",",".");
  if (!value) return null;
  if (!/^\d{1,3}(?:\.\d{1,4})?$/.test(value)) throw new Error("Lãi suất không hợp lệ.");
  const rate=Number(value);
  if (rate>100) throw new Error("Lãi suất không được vượt 100%.");
  return rate;
}
function finish(kind: "error"|"message", value: string) {
  redirect(`/funds?${new URLSearchParams({[kind]:value}).toString()}`);
}
async function mutate(work:()=>Promise<string>) {
  try {
    const response=await work();
    for (const path of ["/accounts","/funds","/overview","/transactions","/reports"]) revalidatePath(path);
    finish("message",response);
  } catch(error) {
    if (error && typeof error==="object" && "digest" in error) throw error;
    finish("error",error instanceof Error?error.message:"Không thể cập nhật quỹ gia đình.");
  }
}

export async function createFamilyFundAction(form: FormData) {
  await mutate(async()=>{
    const {supabase}=await requireUser();
    const name=field(form,"name");
    if(name.length<1||name.length>100) throw new Error("Tên quỹ phải từ 1 đến 100 ký tự.");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- New opening-balance RPC after migration V4.6.11.
    const {error}=await (supabase as any).rpc("family_fund_create_v4611",{
      p_name:name,p_institution_name:field(form,"institution_name"),
      p_opening_balance_minor:minor(form,"opening_balance"),
      p_target_amount_minor:minor(form,"target_amount"),
      p_monthly_contribution_minor:minor(form,"monthly_contribution"),
      p_maturity_date:dateText(field(form,"maturity_date")),p_annual_interest_rate:interest(form)
    });
    if(error) throw new Error(error.message);
    return "Đã tạo quỹ với số dư đầu kỳ được khai báo. Không phát sinh giao dịch Thu/Chi/Chuyển.";
  });
}
/** Declare opening balance only on a pre-existing zero-activity fund. No ledger transaction is fabricated. */
export async function declareFamilyFundOpeningAction(form: FormData) {
  await mutate(async()=>{
    const {supabase}=await requireUser();
    const amount=minor(form,"opening_balance");
    if (amount<=0) throw new Error("Số dư đầu kỳ phải lớn hơn 0 ₫.");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- V4.6.11 versioned RPC, owner scoped.
    const {error}=await (supabase as any).rpc("family_fund_declare_opening_v4611",{
      p_account_id:uuid(field(form,"fund_account_id")),p_opening_balance_minor:amount
    });
    if(error) throw new Error(error.message);
    return "Đã ghi nhận số dư quỹ đầu kỳ, không tạo giao dịch giả.";
  });
}
export async function updateFamilyFundAction(form: FormData) {
  await mutate(async()=>{
    const {supabase}=await requireUser();
    const name=field(form,"name");
    if(name.length<1||name.length>100) throw new Error("Tên quỹ phải từ 1 đến 100 ký tự.");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- New versioned RPC after migration V4.6.6.
    const {error}=await (supabase as any).rpc("family_fund_update_v466",{
      p_account_id:uuid(field(form,"account_id")),p_name:name,
      p_institution_name:field(form,"institution_name"),
      p_target_amount_minor:minor(form,"target_amount"),
      p_monthly_contribution_minor:minor(form,"monthly_contribution"),
      p_maturity_date:dateText(field(form,"maturity_date")),p_annual_interest_rate:interest(form)
    });
    if(error) throw new Error(error.message);
    return "Đã cập nhật thông tin Quỹ tiết kiệm gia đình.";
  });
}
export async function transferFamilyFundAction(form: FormData) {
  await mutate(async()=>{
    const {supabase}=await requireUser();
    const amount=minor(form,"amount");
    if(amount<=0) throw new Error("Số tiền chuyển phải lớn hơn 0 ₫.");
    const mode=field(form,"mode");
    if(mode!=="deposit"&&mode!=="withdraw") throw new Error("Loại giao dịch quỹ không hợp lệ.");
    const fundId=uuid(field(form,"fund_account_id"));
    const regularId=uuid(field(form,"regular_account_id"));
    if(fundId===regularId) throw new Error("Tài khoản nguồn và đích không được trùng.");
    const transactionDate=dateText(field(form,"transaction_date"));
    if(!transactionDate) throw new Error("Chọn ngày giao dịch.");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- New versioned RPC after migration V4.6.6.
    const {error}=await (supabase as any).rpc("family_fund_transfer_v466",{
      p_from_account_id:mode==="deposit"?regularId:fundId,
      p_to_account_id:mode==="deposit"?fundId:regularId,
      p_amount_minor:amount,p_transaction_date:transactionDate,
      p_notes:field(form,"notes")||null
    });
    if(error) throw new Error(error.message);
    return mode==="deposit"?"Đã gửi tiền vào quỹ. Đây là chuyển khoản nội bộ, không phải chi tiêu.":"Đã rút tiền từ quỹ về tài khoản sử dụng.";
  });
}

/** Delete an untouched fund; archive an empty fund with ledger history. RPC validates ownership and blocks funded historical accounts. */
export async function deleteFamilyFundAction(form: FormData) {
  await mutate(async () => {
    if (field(form,"confirmed") !== "yes") throw new Error("Cần xác nhận trước khi xóa quỹ.");
    const { supabase } = await requireUser();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Versioned authenticated RPC added in V4.6.12.
    const { data, error } = await (supabase as any).rpc("family_fund_delete_v4612", {
      p_account_id: uuid(field(form,"fund_account_id"))
    });
    if (error) throw new Error(error.message);
    return data === "archived"
      ? "Quỹ đã được lưu trữ an toàn. Lịch sử giao dịch được giữ nguyên."
      : "Đã xóa quỹ chưa phát sinh giao dịch. Không tạo giao dịch Thu/Chi.";
  });
}
