import Link from "next/link";
import { ArrowLeft, HandCoins } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { PersonalDebtPanel } from "@/components/personal-debt-panel";
import { type DebtRow, type DebtEvent } from "@/features/debts/core";

export const dynamic = "force-dynamic";
export const metadata = { title: "Công nợ cá nhân" };
type Search = Promise<{debt_error?:string;debt_message?:string;new?:string}>;
export default async function DebtsPage({searchParams}:{searchParams:Search}){
  const params=await searchParams;
  const {supabase,userId}=await requireUser();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Tables introduced by V4.6.7; regenerate linked Supabase types after migration.
  const db=supabase as any;
  const [debtsResult,eventsResult,accountsResult]=await Promise.all([
    db.from("personal_debts_v467").select("id,user_id,direction,party_name,title,original_principal_minor,outstanding_minor,started_on,due_on,annual_interest_rate,notes,archived,created_at").eq("user_id",userId).order("created_at",{ascending:false}).limit(201),
    db.from("personal_debt_events_v467").select("id,debt_id,event_type,principal_minor,interest_minor,account_id,event_date,notes,created_at").eq("user_id",userId).order("created_at",{ascending:false}).limit(1001),
    supabase.from("accounts").select("id,name,account_type,currency_code,current_balance_minor,is_archived").eq("user_id",userId).eq("is_archived",false)
  ]);
  const debts=(debtsResult.data??[]) as DebtRow[];
  const events=(eventsResult.data??[]) as DebtEvent[];
  const accounts=(accountsResult.data??[]).filter(a=>["bank","cash","ewallet"].includes(a.account_type)&&a.currency_code==="VND").map(a=>({id:a.id,name:a.name,current_balance_minor:a.current_balance_minor,account_type:a.account_type,currency_code:a.currency_code}));
  const totalManaged=(accountsResult.data??[]).filter(a=>["bank","cash","ewallet","family_savings"].includes(a.account_type)&&a.currency_code==="VND").reduce((sum,a)=>sum+a.current_balance_minor,0);
  const tooMany=debts.length>200||events.length>1000;
  const error=debtsResult.error??eventsResult.error??accountsResult.error;
  const dateParts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Ho_Chi_Minh",day:"2-digit",month:"2-digit",year:"numeric"}).formatToParts(new Date());
  const day=(t:string)=>dateParts.find(p=>p.type===t)?.value??"";
  const today=`${day("year")}-${day("month")}-${day("day")}`;
  return <div className="fin-page-shell mx-auto max-w-[1180px] px-3 py-5 sm:px-5 lg:px-8 lg:py-8">
    <header className="mb-4 flex items-center gap-3"><Link href="/accounts" aria-label="Về Tài khoản và ví" className="grid size-10 place-items-center rounded-xl border border-[var(--border)]"><ArrowLeft className="size-4"/></Link>
      <div><p className="text-xs font-bold text-[var(--primary)]">QUẢN LÝ TÀI CHÍNH</p><h1 className="mt-1 flex items-center gap-2 text-2xl font-black"><HandCoins className="size-6 text-[var(--primary)]"/> Công nợ</h1></div></header>
    {error||tooMany?<div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-500">{error?.message??"Dữ liệu công nợ vượt giới hạn tải. Cần phân trang trước khi tiếp tục."} Kiểm tra migration V4.6.7 và quyền RLS.</div>:
    <PersonalDebtPanel debts={debts} events={events} accounts={accounts} today={today} managedBalance={totalManaged} feedbackError={params.debt_error} feedbackMessage={params.debt_message} initialCreate={params.new==="1"}/>}
  </div>;
}
