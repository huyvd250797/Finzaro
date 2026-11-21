"use server";

/* eslint-disable @typescript-eslint/no-explicit-any -- V4.6.7 new RLS tables/RPCs need regenerated Supabase types after migration. */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { parseMajorAmountToMinor } from "@/features/accounts/money";

const read=(form:FormData,key:string)=>String(form.get(key)??"").trim();
function amount(form:FormData,key:string,required=true){
  const raw=read(form,key);
  const parsed=parseMajorAmountToMinor(raw||"0",0);
  if(parsed===null || parsed<0 || (required && parsed===0)) throw new Error(`Số tiền ${key} không hợp lệ.`);
  return parsed;
}
function uuid(input:string){
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input)) throw new Error("Mã xác thực không hợp lệ.");
  return input;
}
function date(input:string,required=false){
  if(!input && !required) return null;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(input) || Number.isNaN(Date.parse(`${input}T00:00:00Z`)) || new Date(`${input}T00:00:00Z`).toISOString().slice(0,10)!==input){
    throw new Error("Ngày không hợp lệ.");
  }
  return input;
}
function rate(form:FormData){
  const raw=read(form,"annual_interest_rate").replace(",",".");
  if(!raw) return null;
  if(!/^\d{1,3}(?:\.\d{1,4})?$/.test(raw) || Number(raw)>100) throw new Error("Lãi suất phải nằm từ 0 đến 100%/năm.");
  return Number(raw);
}
function destination(type:"error"|"message",message:string){
  return `/accounts?${new URLSearchParams({[type==="error"?"debt_error":"debt_message"]:message}).toString()}#personal-debts`;
}
async function mutate(work:()=>Promise<string>){
  try{
    const message=await work();
    for(const path of ["/accounts","/overview","/transactions","/reports"]) revalidatePath(path);
    redirect(destination("message",message));
  }catch(error){
    if(error && typeof error==="object" && "digest" in error) throw error;
    redirect(destination("error",error instanceof Error?error.message:"Không thể xử lý công nợ."));
  }
}
export async function createPersonalDebtAction(form:FormData){
  await mutate(async()=>{
    const {supabase}=await requireUser();
    const direction=read(form,"direction");
    const mode=read(form,"mode");
    const party=read(form,"party_name");
    const title=read(form,"title");
    const notes=read(form,"notes");
    const started=date(read(form,"started_on"),true);
    const due=date(read(form,"due_on"));
    if(!["receivable","payable"].includes(direction)||!["cash","existing"].includes(mode)) throw new Error("Loại công nợ không hợp lệ.");
    if(!party || party.length>120 || !title || title.length>140 || notes.length>500) throw new Error("Tên người, tên khoản nợ hoặc ghi chú không hợp lệ.");
    if(due&&started&&due<started) throw new Error("Ngày trả dự kiến không thể trước ngày bắt đầu.");
    const {error}=await (supabase as any).rpc("personal_debt_create_v467",{
      p_request_key:uuid(read(form,"request_key")),
      p_direction:direction,p_party_name:party,p_title:title,p_principal_minor:amount(form,"principal"),
      p_started_on:started,p_due_on:due,p_annual_interest_rate:rate(form),p_notes:notes||null,
      p_mode:mode,p_account_id:mode==="cash"?uuid(read(form,"account_id")):null
    });
    if(error) throw new Error(error.message);
    return mode==="existing"?"Đã ghi nhận dư nợ cũ, không làm thay đổi số dư tài khoản.":
      direction==="receivable"?"Đã ghi nhận khoản cho vay và trừ tiền khỏi tài khoản.":"Đã ghi nhận khoản vay và cộng tiền vào tài khoản.";
  });
}
export async function repayPersonalDebtAction(form:FormData){
  await mutate(async()=>{
    const {supabase}=await requireUser();
    const principal=amount(form,"principal",false);
    const interestAmount=amount(form,"interest",false);
    if(principal===0&&interestAmount===0) throw new Error("Cần nhập số tiền gốc hoặc lãi lớn hơn 0 ₫.");
    const notes=read(form,"notes");
    if(notes.length>500) throw new Error("Ghi chú không vượt quá 500 ký tự.");
    const {error}=await (supabase as any).rpc("personal_debt_repay_v467",{
      p_request_key:uuid(read(form,"request_key")),p_debt_id:uuid(read(form,"debt_id")),
      p_account_id:uuid(read(form,"account_id")),p_principal_minor:principal,p_interest_minor:interestAmount,
      p_event_date:date(read(form,"event_date"),true),p_notes:notes||null
    });
    if(error) throw new Error(error.message);
    return "Đã ghi nhận thanh toán. Gốc được trừ khỏi dư nợ; lãi được ghi đúng Thu/Chi.";
  });
}
export async function updatePersonalDebtAction(form:FormData){
  await mutate(async()=>{
    const {supabase}=await requireUser();
    const party=read(form,"party_name"),title=read(form,"title"),notes=read(form,"notes");
    if(!party || party.length>120 || !title || title.length>140 || notes.length>500) throw new Error("Thông tin chỉnh sửa không hợp lệ.");
    const {error}=await (supabase as any).rpc("personal_debt_update_v467",{
      p_debt_id:uuid(read(form,"debt_id")),p_party_name:party,p_title:title,
      p_due_on:date(read(form,"due_on")),p_annual_interest_rate:rate(form),p_notes:notes||null,
      p_archived:read(form,"archived")==="1"
    });
    if(error) throw new Error(error.message);
    return read(form,"archived")==="1"?"Đã lưu trữ công nợ đã tất toán.":"Đã cập nhật thông tin công nợ.";
  });
}
export async function deleteUnpostedPersonalDebtAction(form:FormData){
  await mutate(async()=>{
    const {supabase}=await requireUser();
    const {error}=await (supabase as any).rpc("personal_debt_delete_unposted_v467",{p_debt_id:uuid(read(form,"debt_id"))});
    if(error) throw new Error(error.message);
    return "Đã xóa công nợ chưa phát sinh giao dịch tiền thật.";
  });
}
