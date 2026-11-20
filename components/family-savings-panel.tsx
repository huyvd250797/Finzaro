"use client";

import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, PiggyBank, Plus, SlidersHorizontal } from "lucide-react";
import { createFamilyFundAction, transferFamilyFundAction, updateFamilyFundAction } from "@/features/accounts/family-fund-actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { MoneyCalculatorInput } from "@/components/money-calculator-input";
import { formatMinorMoney } from "@/lib/utils";

export type FamilyFundRow={
  account_id:string;user_id:string;target_amount_minor:number;monthly_contribution_minor:number;
  maturity_date:string|null;annual_interest_rate:number|null;
};
export type FamilyAccountRow={id:string;name:string;account_type:string;institution_name:string|null;currency_code:string;current_balance_minor:number;is_archived:boolean};
const style="fin-input min-h-11 w-full";
const caption="text-xs font-semibold text-[var(--muted-foreground)]";
function FundFields({row}:{row?:FamilyFundRow}){
  return <div className="grid gap-3 sm:grid-cols-2">
    <label className="sm:col-span-2"><span className={caption}>Tên quỹ</span><input name="name" required maxLength={100} defaultValue={row?undefined:"Quỹ tiết kiệm gia đình"} className={style}/></label>
    <label><span className={caption}>Ngân hàng / nơi giữ quỹ</span><input name="institution_name" maxLength={100} placeholder="Tùy chọn" className={style}/></label>
    <label><span className={caption}>Mục tiêu (₫)</span><MoneyCalculatorInput name="target_amount" defaultValue={String(row?.target_amount_minor??0)} decimalDigits={0} required/></label>
    <label><span className={caption}>Dự kiến góp mỗi tháng (₫)</span><MoneyCalculatorInput name="monthly_contribution" defaultValue={String(row?.monthly_contribution_minor??0)} decimalDigits={0} required/></label>
    <label><span className={caption}>Ngày đáo hạn (không bắt buộc)</span><input type="date" name="maturity_date" defaultValue={row?.maturity_date??""} className={style}/></label>
    <label><span className={caption}>Lãi suất tham khảo (%/năm)</span><input inputMode="decimal" name="annual_interest_rate" placeholder="VD: 5,2" defaultValue={row?.annual_interest_rate??""} className={style}/></label>
  </div>;
}

function FundCard({account,detail,regularAccounts,currentDate}:{account:FamilyAccountRow;detail?:FamilyFundRow;regularAccounts:FamilyAccountRow[];currentDate:string}){
  const [mode,setMode]=useState<"deposit"|"withdraw">("deposit");
  const target=Number(detail?.target_amount_minor??0);
  const value=Number(account.current_balance_minor);
  const progress=target>0?Math.min(100,Math.max(0,value/target*100)):0;
  return <article className="rounded-[22px] border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
    <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-emerald-500/10 text-[var(--primary)]"><PiggyBank className="size-5"/></span><div className="min-w-0 flex-1"><h3 className="truncate text-base font-black">{account.name}</h3><p className="text-xs text-[var(--muted-foreground)]">{account.institution_name||"Quỹ dành riêng"} · VND</p></div></div>
    <div className="mt-4 rounded-xl bg-[var(--muted)]/60 p-4"><p className="text-xs text-[var(--muted-foreground)]">Số dư quỹ</p><p className="mt-1 overflow-x-auto whitespace-nowrap text-xl font-black tabular-nums sm:text-2xl">{formatMinorMoney(value,"VND",0)}</p></div>
    {target>0&&<div className="mt-4"><div className="flex items-center justify-between gap-2 text-xs"><span className="text-[var(--muted-foreground)]">Mục tiêu</span><strong>{formatMinorMoney(target,"VND",0)}</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--muted)]"><div className="h-full rounded-full bg-[var(--primary)]" style={{width:`${progress}%`}}/></div><p className="mt-1 text-xs text-[var(--muted-foreground)]">Đạt {progress.toLocaleString("vi-VN",{maximumFractionDigits:1})}%{detail?.monthly_contribution_minor?` · Góp dự kiến ${formatMinorMoney(Number(detail.monthly_contribution_minor),"VND",0)}/tháng`:""}</p></div>}
    {(detail?.maturity_date||(detail?.annual_interest_rate!==null&&detail?.annual_interest_rate!==undefined))&&<p className="mt-2 text-xs text-[var(--muted-foreground)]">{detail?.maturity_date?`Đáo hạn: ${detail.maturity_date.split("-").reverse().join("/")}`:""}{detail?.annual_interest_rate!==null&&detail?.annual_interest_rate!==undefined?` · Lãi suất dự kiến: ${detail.annual_interest_rate}%/năm`:""}</p>}
    <div className="mt-4 grid grid-cols-2 gap-2" role="group" aria-label="Thao tác quỹ">
      <button type="button" onClick={()=>setMode("deposit")} aria-pressed={mode==="deposit"} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold ${mode==="deposit"?"bg-[var(--primary)] text-white":"border border-[var(--border)]"}`}><ArrowDownLeft className="size-4"/>Gửi vào</button>
      <button type="button" onClick={()=>setMode("withdraw")} aria-pressed={mode==="withdraw"} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold ${mode==="withdraw"?"bg-[var(--primary)] text-white":"border border-[var(--border)]"}`}><ArrowUpRight className="size-4"/>Rút ra</button>
    </div>
    <form action={transferFamilyFundAction} key={`${account.id}-${mode}`} className="mt-3 grid gap-3 border-t border-[var(--border)] pt-4 sm:grid-cols-2">
      <input type="hidden" name="fund_account_id" value={account.id}/><input type="hidden" name="mode" value={mode}/>
      <label><span className={caption}>{mode==="deposit"?"Chuyển từ tài khoản":"Chuyển về tài khoản"}</span><select name="regular_account_id" required className={style} defaultValue=""><option value="" disabled>Chọn tài khoản</option>{regularAccounts.map(a=><option key={a.id} value={a.id}>{a.name} · {formatMinorMoney(a.current_balance_minor,"VND",0)}</option>)}</select></label>
      <label><span className={caption}>Số tiền chuyển (₫)</span><MoneyCalculatorInput name="amount" decimalDigits={0} required/></label>
      <label><span className={caption}>Ngày giao dịch</span><input type="date" name="transaction_date" required defaultValue={currentDate} className={style}/></label>
      <label><span className={caption}>Ghi chú</span><input name="notes" maxLength={500} placeholder="Tùy chọn" className={style}/></label>
      <div className="sm:col-span-2"><PendingSubmitButton idleLabel={mode==="deposit"?"Chuyển vào quỹ":"Rút khỏi quỹ"} pendingLabel="Đang xử lý..." className="fin-primary-btn w-full sm:w-auto"/></div>
    </form>
    <details className="mt-4 border-t border-[var(--border)] pt-3"><summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[var(--muted-foreground)]"><SlidersHorizontal className="size-4"/>Sửa thông tin và mục tiêu quỹ</summary>
      <form action={updateFamilyFundAction} className="mt-3 grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="account_id" value={account.id}/>
        <label><span className={caption}>Tên quỹ</span><input name="name" required maxLength={100} defaultValue={account.name} className={style}/></label>
        <label><span className={caption}>Ngân hàng</span><input name="institution_name" maxLength={100} defaultValue={account.institution_name??""} className={style}/></label>
        <label><span className={caption}>Mục tiêu (₫)</span><MoneyCalculatorInput name="target_amount" defaultValue={String(detail?.target_amount_minor??0)} decimalDigits={0} required/></label>
        <label><span className={caption}>Đóng góp/tháng (₫)</span><MoneyCalculatorInput name="monthly_contribution" defaultValue={String(detail?.monthly_contribution_minor??0)} decimalDigits={0} required/></label>
        <label><span className={caption}>Ngày đáo hạn</span><input name="maturity_date" type="date" defaultValue={detail?.maturity_date??""} className={style}/></label>
        <label><span className={caption}>Lãi suất (%/năm)</span><input name="annual_interest_rate" inputMode="decimal" defaultValue={detail?.annual_interest_rate??""} className={style}/></label>
        <div className="sm:col-span-2"><PendingSubmitButton idleLabel="Lưu thông tin quỹ" pendingLabel="Đang lưu..." className="fin-primary-btn w-full sm:w-auto"/></div>
      </form>
    </details>
  </article>;
}

export function FamilySavingsPanel({fundAccounts,regularAccounts,details,currentDate}:{fundAccounts:FamilyAccountRow[];regularAccounts:FamilyAccountRow[];details:FamilyFundRow[];currentDate:string}){
  const [showCreate,setShowCreate]=useState(false);
  const detailMap=new Map(details.map(d=>[d.account_id,d]));
  return <section id="family-savings" className="mt-5 scroll-mt-24 rounded-[24px] border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.12em] text-[var(--primary)]">QUỸ DÀNH RIÊNG</p><h2 className="mt-1 text-lg font-black">Tiết kiệm gia đình</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Tách khỏi số dư chi tiêu, vẫn thuộc tổng tiền quản lý.</p></div><button type="button" onClick={()=>setShowCreate(v=>!v)} aria-expanded={showCreate} className="fin-secondary-btn"><Plus className="size-4"/>Tạo quỹ</button></div>
    {showCreate&&<form action={createFamilyFundAction} className="mt-4 rounded-xl border border-[var(--border)] p-3 sm:p-4"><FundFields/><p className="mt-3 text-xs text-[var(--muted-foreground)]">Quỹ mới bắt đầu từ 0 ₫. Dùng Gửi vào để chuyển tiền nội bộ sau khi tạo.</p><div className="mt-3"><PendingSubmitButton idleLabel="Tạo quỹ tiết kiệm" pendingLabel="Đang tạo..." className="fin-primary-btn w-full sm:w-auto"/></div></form>}
    {fundAccounts.length===0?<p className="mt-4 rounded-xl bg-[var(--muted)] px-3 py-4 text-sm text-[var(--muted-foreground)]">Chưa tạo Quỹ tiết kiệm gia đình.</p>
      :<div className="mt-4 grid gap-3 lg:grid-cols-2">{fundAccounts.map(account=><FundCard key={account.id} account={account} detail={detailMap.get(account.id)} regularAccounts={regularAccounts} currentDate={currentDate}/>)}</div>}
  </section>;
}
