import Link from "next/link";
import { ArrowLeft, PiggyBank } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { FamilySavingsPanel, type FamilyFundRow, type FamilyAccountRow } from "@/components/family-savings-panel";

export const dynamic = "force-dynamic";
export const metadata={title:"Quỹ tiết kiệm gia đình"};
type Search=Promise<{error?:string;message?:string;new?:string}>;
export default async function FamilyFundsPage({searchParams}:{searchParams:Search}){
  const params=await searchParams;
  const {supabase,userId}=await requireUser();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Table added in V4.6.6; regenerate linked DB types after migration.
  const db=supabase as any;
  const [accountsResult,fundsResult]=await Promise.all([
    supabase.from("accounts").select("id,name,account_type,institution_name,currency_code,current_balance_minor,is_archived").eq("user_id",userId).eq("is_archived",false),
    db.from("family_savings_funds_v466").select("account_id,user_id,target_amount_minor,monthly_contribution_minor,maturity_date,annual_interest_rate").eq("user_id",userId)
  ]);
  const accounts=(accountsResult.data??[]) as FamilyAccountRow[];
  const regular=accounts.filter(a=>["bank","cash","ewallet"].includes(a.account_type)&&a.currency_code==="VND");
  const family=accounts.filter(a=>a.account_type==="family_savings"&&a.currency_code==="VND");
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Ho_Chi_Minh",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const datePart=(key:string)=>parts.find(p=>p.type===key)?.value??"";
  const today=`${datePart("year")}-${datePart("month")}-${datePart("day")}`;
  const error=accountsResult.error??fundsResult.error;
  return <div className="fin-page-shell mx-auto max-w-[1180px] px-3 py-5 sm:px-5 lg:px-8 lg:py-8">
    <header className="mb-4 flex items-center gap-3"><Link href="/accounts" aria-label="Về Tài khoản và ví" className="grid size-10 place-items-center rounded-xl border border-[var(--border)]"><ArrowLeft className="size-4"/></Link>
      <div><p className="text-xs font-bold text-[var(--primary)]">TÀI KHOẢN DÀNH RIÊNG</p><h1 className="mt-1 flex items-center gap-2 text-2xl font-black"><PiggyBank className="size-6 text-[var(--primary)]"/> Quỹ gia đình</h1></div></header>
    {params.error&&<p role="alert" className="mb-3 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-500">{params.error.slice(0,250)}</p>}
    {params.message&&<p role="status" className="mb-3 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-500">{params.message.slice(0,250)}</p>}
    {error?<div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-500">{error.message} Kiểm tra migration V4.6.6 và quyền RLS.</div>:
    <FamilySavingsPanel fundAccounts={family} regularAccounts={regular} details={(fundsResult.data??[]) as FamilyFundRow[]} currentDate={today} initialCreate={params.new==="1"}/>}
  </div>;
}
