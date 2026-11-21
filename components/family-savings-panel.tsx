"use client";

import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, PiggyBank, Plus, SlidersHorizontal, Trash2, AlertTriangle, X } from "lucide-react";
import { createFamilyFundAction, transferFamilyFundAction, updateFamilyFundAction, declareFamilyFundOpeningAction, deleteFamilyFundAction } from "@/features/accounts/family-fund-actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { BottomSheet } from "@/components/bottom-sheet";
import { MoneyCalculatorInput } from "@/components/money-calculator-input";
import { formatMinorMoney } from "@/lib/utils";

export type FamilyFundRow={
  account_id:string;user_id:string;target_amount_minor:number;monthly_contribution_minor:number;
  maturity_date:string|null;annual_interest_rate:number|null;
};
export type FamilyAccountRow={id:string;name:string;account_type:string;institution_name:string|null;currency_code:string;current_balance_minor:number;opening_balance_minor:number;is_archived:boolean};
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
  const [mode,setMode]=useState<"deposit"|"withdraw"|null>(null);
  const [editing,setEditing]=useState(false);
  const [opening,setOpening]=useState(false);
  const [confirmDelete,setConfirmDelete]=useState(false);
  const target=Number(detail?.target_amount_minor??0);
  const value=Number(account.current_balance_minor);
  const progress=target>0?Math.min(100,Math.max(0,value/target*100)):0;
  return <article className="rounded-[22px] border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
    <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-emerald-500/10 text-[var(--primary)]"><PiggyBank className="size-5"/></span><div className="min-w-0 flex-1"><h3 className="truncate text-base font-black">{account.name}</h3><p className="text-xs text-[var(--muted-foreground)]">{account.institution_name||"Quỹ dành riêng"} · VND</p></div></div>
    <div className="mt-4 rounded-xl bg-[var(--muted)]/60 p-4"><p className="text-xs text-[var(--muted-foreground)]">Số dư quỹ</p><p className="mt-1 overflow-x-auto whitespace-nowrap text-xl font-black tabular-nums sm:text-2xl">{formatMinorMoney(value,"VND",0)}</p></div>
    {Number(account.opening_balance_minor)>0&&<p className="mt-2 text-xs text-[var(--muted-foreground)]">Số dư khai báo đầu kỳ: <strong className="whitespace-nowrap text-[var(--foreground)]">{formatMinorMoney(Number(account.opening_balance_minor),"VND",0)}</strong></p>}
    {target>0&&<div className="mt-4"><div className="flex items-center justify-between gap-2 text-xs"><span className="text-[var(--muted-foreground)]">Mục tiêu</span><strong>{formatMinorMoney(target,"VND",0)}</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--muted)]"><div className="h-full rounded-full bg-[var(--primary)]" style={{width:`${progress}%`}}/></div><p className="mt-1 text-xs text-[var(--muted-foreground)]">Đạt {progress.toLocaleString("vi-VN",{maximumFractionDigits:1})}%{detail?.monthly_contribution_minor?` · Góp dự kiến ${formatMinorMoney(Number(detail.monthly_contribution_minor),"VND",0)}/tháng`:""}</p></div>}
    {(detail?.maturity_date||(detail?.annual_interest_rate!==null&&detail?.annual_interest_rate!==undefined))&&<p className="mt-2 text-xs text-[var(--muted-foreground)]">{detail?.maturity_date?`Đáo hạn: ${detail.maturity_date.split("-").reverse().join("/")}`:""}{detail?.annual_interest_rate!==null&&detail?.annual_interest_rate!==undefined?` · Lãi suất dự kiến: ${detail.annual_interest_rate}%/năm`:""}</p>}
    <div className="mt-4 grid grid-cols-2 gap-2" role="group" aria-label="Thao tác quỹ">
      <button type="button" onClick={()=>setMode("deposit")} className="fin-primary-btn justify-center text-sm"><ArrowDownLeft className="size-4"/>Gửi vào</button>
      <button type="button" onClick={()=>setMode("withdraw")} className="fin-secondary-btn justify-center text-sm"><ArrowUpRight className="size-4"/>Rút ra</button>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
      <button type="button" onClick={()=>setEditing(true)} className="inline-flex min-h-10 items-center gap-2 text-xs font-bold text-[var(--muted-foreground)]"><SlidersHorizontal className="size-4"/>Sửa thông tin và mục tiêu quỹ</button>
      <button type="button" onClick={()=>setConfirmDelete(true)} className="inline-flex min-h-10 items-center gap-1.5 text-xs font-bold text-rose-500"><Trash2 className="size-4"/>Xóa quỹ</button>
      {value===0&&<button type="button" onClick={()=>setOpening(true)} className="inline-flex min-h-10 items-center gap-1.5 text-xs font-extrabold text-[var(--primary)]"><Plus className="size-4"/>Khai báo số dư đầu kỳ</button>}
    </div>

    {confirmDelete&&<BottomSheet open={confirmDelete} onClose={()=>setConfirmDelete(false)} label={`Xóa quỹ ${account.name}`} panelClassName="fin-fullscreen-sheet !rounded-none sm:!max-w-[600px] sm:!rounded-t-3xl">
      <form action={deleteFamilyFundAction} className="flex min-h-full flex-col gap-4 px-4 pb-[max(env(safe-area-inset-bottom),20px)] pt-2 sm:px-6">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--card)] py-3"><h3 className="text-xl font-black">Xóa quỹ gia đình</h3><button type="button" onClick={()=>setConfirmDelete(false)} aria-label="Đóng xác nhận xóa quỹ" className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--border)]"><X className="size-4"/></button></div>
        <div className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4"><AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-500"/><div className="space-y-2"><p className="font-bold">{account.name}</p><p className="text-sm">Số dư đang quản lý: <strong className="whitespace-nowrap">{formatMinorMoney(value,"VND",0)}</strong></p><p className="text-xs leading-relaxed text-[var(--muted-foreground)]">Quỹ chưa có giao dịch sẽ được xóa vĩnh viễn, bao gồm số dư đầu kỳ đã khai báo. Nếu quỹ đã có lịch sử giao dịch, cần rút hết tiền trước: hệ thống sẽ lưu trữ quỹ, không xóa lịch sử và không làm thay đổi Thu/Chi.</p></div></div>
        <input type="hidden" name="fund_account_id" value={account.id}/>
        <label className="flex items-start gap-3 rounded-xl border border-[var(--border)] p-3 text-sm"><input type="checkbox" name="confirmed" value="yes" required className="mt-1 size-4 accent-rose-500"/><span>Tôi xác nhận muốn xóa quỹ này và đã kiểm tra số dư cùng lịch sử giao dịch.</span></label>
        <div className="sticky bottom-0 mt-auto border-t border-[var(--border)] bg-[var(--card)] py-3"><PendingSubmitButton idleLabel="Xác nhận xóa quỹ" pendingLabel="Đang xử lý..." className="w-full justify-center rounded-xl bg-rose-600 px-4 py-3 font-bold text-white disabled:opacity-60"/></div>
      </form>
    </BottomSheet>}
    {opening&&<BottomSheet open={opening} onClose={()=>setOpening(false)} label="Khai báo số dư đầu kỳ" panelClassName="fin-fullscreen-sheet !rounded-none sm:!max-w-[720px] sm:!rounded-t-3xl">
      <form action={declareFamilyFundOpeningAction} className="flex min-h-full flex-col gap-4 px-4 pb-[max(env(safe-area-inset-bottom),20px)] pt-2 sm:px-6">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--card)] py-3"><div><p className="text-xs font-bold text-[var(--primary)]">{account.name}</p><h3 className="mt-1 text-xl font-black">Số dư có trước khi dùng app</h3></div><button type="button" onClick={()=>setOpening(false)} aria-label="Đóng số dư đầu kỳ" className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--border)]"><X className="size-4"/></button></div>
        <input type="hidden" name="fund_account_id" value={account.id}/>
        <label><span className={caption}>Số dư đầu kỳ thực có (₫)</span><MoneyCalculatorInput name="opening_balance" decimalDigits={0} required/></label>
        <p className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 text-xs leading-relaxed text-[var(--muted-foreground)]">Đây là tiền đã nằm trong quỹ trước khi sử dụng Finzaro. Không tạo giao dịch Thu, Chi hoặc Chuyển. Chỉ được khai báo một lần khi quỹ chưa phát sinh giao dịch.</p>
        <div className="sticky bottom-0 mt-auto border-t border-[var(--border)] bg-[var(--card)] py-3"><PendingSubmitButton idleLabel="Xác nhận số dư đầu kỳ" pendingLabel="Đang ghi nhận..." className="fin-primary-btn w-full"/></div>
      </form>
    </BottomSheet>}
    {mode!==null&&<BottomSheet open={mode!==null} onClose={()=>setMode(null)} label={mode==="deposit"?"Gửi tiền vào quỹ":"Rút tiền khỏi quỹ"} panelClassName="fin-fullscreen-sheet !rounded-none sm:!max-w-[720px] sm:!rounded-t-3xl">
      {mode!==null&&<form action={transferFamilyFundAction} key={`${account.id}-${mode}`} className="flex min-h-full flex-col gap-4 px-4 pb-[max(env(safe-area-inset-bottom),20px)] pt-2 sm:px-6">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--card)] py-3"><div><p className="text-xs font-bold text-[var(--primary)]">{account.name}</p><h3 className="mt-1 text-xl font-black">{mode==="deposit"?"Gửi tiền vào quỹ":"Rút tiền khỏi quỹ"}</h3></div><button type="button" onClick={()=>setMode(null)} aria-label="Đóng chuyển quỹ" className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--border)]"><X className="size-4"/></button></div>
        <input type="hidden" name="fund_account_id" value={account.id}/><input type="hidden" name="mode" value={mode}/>
        <label><span className={caption}>{mode==="deposit"?"Chuyển từ tài khoản":"Chuyển về tài khoản"}</span><select name="regular_account_id" required className={style} defaultValue=""><option value="" disabled>Chọn tài khoản</option>{regularAccounts.map(a=><option key={a.id} value={a.id}>{a.name} · {formatMinorMoney(a.current_balance_minor,"VND",0)}</option>)}</select></label>
        <label><span className={caption}>Số tiền chuyển (₫)</span><MoneyCalculatorInput name="amount" decimalDigits={0} required/></label>
        <label><span className={caption}>Ngày giao dịch</span><input type="date" name="transaction_date" required defaultValue={currentDate} className={style}/></label>
        <label><span className={caption}>Ghi chú</span><input name="notes" maxLength={500} placeholder="Tùy chọn" className={style}/></label>
        <div className="sticky bottom-0 mt-auto border-t border-[var(--border)] bg-[var(--card)] py-3"><PendingSubmitButton idleLabel={mode==="deposit"?"Chuyển vào quỹ":"Rút khỏi quỹ"} pendingLabel="Đang xử lý..." className="fin-primary-btn w-full"/></div>
      </form>}
    </BottomSheet>}
    {editing&&<BottomSheet open={editing} onClose={()=>setEditing(false)} label={`Sửa ${account.name}`} panelClassName="fin-fullscreen-sheet !rounded-none sm:!max-w-[720px] sm:!rounded-t-3xl">
      {editing&&<form action={updateFamilyFundAction} className="flex min-h-full flex-col gap-4 px-4 pb-[max(env(safe-area-inset-bottom),20px)] pt-2 sm:px-6">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--card)] py-3"><h3 className="text-xl font-black">Sửa quỹ gia đình</h3><button type="button" onClick={()=>setEditing(false)} aria-label="Đóng sửa quỹ" className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--border)]"><X className="size-4"/></button></div>
        <input type="hidden" name="account_id" value={account.id}/>
        <label><span className={caption}>Tên quỹ</span><input name="name" required maxLength={100} defaultValue={account.name} className={style}/></label>
        <label><span className={caption}>Ngân hàng</span><input name="institution_name" maxLength={100} defaultValue={account.institution_name??""} className={style}/></label>
        <label><span className={caption}>Mục tiêu (₫)</span><MoneyCalculatorInput name="target_amount" defaultValue={String(detail?.target_amount_minor??0)} decimalDigits={0} required/></label>
        <label><span className={caption}>Đóng góp/tháng (₫)</span><MoneyCalculatorInput name="monthly_contribution" defaultValue={String(detail?.monthly_contribution_minor??0)} decimalDigits={0} required/></label>
        <label><span className={caption}>Ngày đáo hạn</span><input name="maturity_date" type="date" defaultValue={detail?.maturity_date??""} className={style}/></label>
        <label><span className={caption}>Lãi suất (%/năm)</span><input name="annual_interest_rate" inputMode="decimal" defaultValue={detail?.annual_interest_rate??""} className={style}/></label>
        <div className="sticky bottom-0 mt-auto border-t border-[var(--border)] bg-[var(--card)] py-3"><PendingSubmitButton idleLabel="Lưu thông tin quỹ" pendingLabel="Đang lưu..." className="fin-primary-btn w-full"/></div>
      </form>}
    </BottomSheet>}
  </article>;
}

export function FamilySavingsPanel({fundAccounts,regularAccounts,details,currentDate,initialCreate=false}:{fundAccounts:FamilyAccountRow[];regularAccounts:FamilyAccountRow[];details:FamilyFundRow[];currentDate:string;initialCreate?:boolean}){
  const [showCreate,setShowCreate]=useState(initialCreate);
  const detailMap=new Map(details.map(d=>[d.account_id,d]));
  return <section id="family-savings" className="scroll-mt-24 rounded-[24px] border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.12em] text-[var(--primary)]">QUỸ DÀNH RIÊNG</p><h2 className="mt-1 text-lg font-black">Tiết kiệm gia đình</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Tách khỏi số dư chi tiêu, vẫn thuộc tổng tiền quản lý.</p></div><button type="button" onClick={()=>setShowCreate(true)} aria-expanded={showCreate} className="fin-secondary-btn"><Plus className="size-4"/>Tạo quỹ</button></div>
    {showCreate&&<BottomSheet open={showCreate} onClose={()=>setShowCreate(false)} label="Tạo quỹ gia đình" panelClassName="fin-fullscreen-sheet !rounded-none sm:!max-w-[720px] sm:!rounded-t-3xl">
      {showCreate&&<form action={createFamilyFundAction} className="flex min-h-full flex-col gap-4 px-4 pb-[max(env(safe-area-inset-bottom),20px)] pt-2 sm:px-6">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--card)] py-3"><div><p className="text-xs font-bold text-[var(--primary)]">QUỸ DÀNH RIÊNG</p><h3 className="mt-1 text-xl font-black">Tạo quỹ gia đình</h3></div><button type="button" onClick={()=>setShowCreate(false)} aria-label="Đóng tạo quỹ" className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--border)]"><X className="size-4"/></button></div>
        <FundFields/>
        <div className="rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary)]/[.045] p-3.5">
          <label className="block"><span className="text-xs font-black">Số dư đã có trước khi sử dụng Finzaro (₫)</span><span className="mt-1 block text-[11px] text-[var(--muted-foreground)]">Nhập số tiền thật đang có trong quỹ; để 0 nếu đây là quỹ mới mở.</span><div className="mt-2"><MoneyCalculatorInput name="opening_balance" defaultValue="0" decimalDigits={0} required/></div></label>
          <p className="mt-2 text-[11px] leading-relaxed text-[var(--muted-foreground)]">Số dư đầu kỳ không phải thu nhập, không phải chuyển khoản và không trừ tài khoản ngân hàng khác.</p>
        </div>
        <div className="sticky bottom-0 mt-auto border-t border-[var(--border)] bg-[var(--card)] py-3"><PendingSubmitButton idleLabel="Tạo quỹ tiết kiệm" pendingLabel="Đang tạo..." className="fin-primary-btn w-full"/></div>
      </form>}
    </BottomSheet>}
    {fundAccounts.length===0?<p className="mt-4 rounded-xl bg-[var(--muted)] px-3 py-4 text-sm text-[var(--muted-foreground)]">Chưa tạo Quỹ tiết kiệm gia đình.</p>
      :<div className="mt-4 grid gap-3 lg:grid-cols-2">{fundAccounts.map(account=><FundCard key={account.id} account={account} detail={detailMap.get(account.id)} regularAccounts={regularAccounts} currentDate={currentDate}/>)}</div>}
  </section>;
}
