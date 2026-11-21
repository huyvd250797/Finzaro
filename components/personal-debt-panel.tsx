"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowDownLeft, ArrowUpRight, CalendarClock, ChevronDown, HandCoins, Pencil, Plus, Trash2 } from "lucide-react";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { MoneyCalculatorInput } from "@/components/money-calculator-input";
import { createPersonalDebtAction, deleteUnpostedPersonalDebtAction, repayPersonalDebtAction, updatePersonalDebtAction } from "@/features/debts/actions";
import { debtLifecycle, personalDebtTotals, type CashAccount, type DebtDirection, type DebtEvent, type DebtRow } from "@/features/debts/core";

const fmt=(value:number)=>`${new Intl.NumberFormat("vi-VN",{maximumFractionDigits:0}).format(value)} ₫`;
const field="mt-1.5 h-11 w-full min-w-0 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--primary)]";
const caption="block text-xs font-semibold text-[var(--muted-foreground)]";
const secondary="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 text-xs font-bold transition hover:bg-[var(--muted)]";
function stampKey(event:FormEvent<HTMLFormElement>){
  const field=event.currentTarget.elements.namedItem("request_key");
  if(field instanceof HTMLInputElement && !field.value) field.value=crypto.randomUUID();
}
function RequestKeyInput(){
  const [key,setKey]=useState("");
  useEffect(()=>{setKey(crypto.randomUUID());},[]);
  return <input type="hidden" name="request_key" value={key} readOnly/>;
}
function DateText({value}:{value:string|null}){
  return <>{value?value.split("-").reverse().join("/"):"Không đặt hạn"}</>;
}
function DebtCreate({accounts,today,onCancel}:{accounts:CashAccount[];today:string;onCancel:()=>void}){
  const [direction,setDirection]=useState<DebtDirection>("receivable");
  const [mode,setMode]=useState<"cash"|"existing">("cash");
  return <form action={createPersonalDebtAction} onSubmit={stampKey} className="mt-4 space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
    <RequestKeyInput/>
    <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-black">Tạo khoản công nợ</h3><button type="button" onClick={onCancel} className={secondary}>Đóng</button></div>
    <fieldset><legend className={caption}>Loại công nợ</legend><div className="mt-2 grid grid-cols-2 gap-2">
      <button type="button" onClick={()=>setDirection("receivable")} aria-pressed={direction==="receivable"} className={`min-h-11 rounded-xl border px-2 text-xs font-bold ${direction==="receivable"?"border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]":"border-[var(--border)]"}`}>Người khác nợ tôi</button>
      <button type="button" onClick={()=>setDirection("payable")} aria-pressed={direction==="payable"} className={`min-h-11 rounded-xl border px-2 text-xs font-bold ${direction==="payable"?"border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]":"border-[var(--border)]"}`}>Tôi đang nợ</button>
    </div><input type="hidden" name="direction" value={direction}/></fieldset>
    <div className="grid gap-3 sm:grid-cols-2">
      <label><span className={caption}>{direction==="receivable"?"Tên người vay":"Tên người cho vay"}</span><input className={field} name="party_name" maxLength={120} required placeholder="Ví dụ: Anh Minh"/></label>
      <label><span className={caption}>Tên khoản nợ</span><input className={field} name="title" maxLength={140} required placeholder="Ví dụ: Vay sửa nhà"/></label>
      <label><span className={caption}>Tiền gốc (₫)</span><MoneyCalculatorInput name="principal" decimalDigits={0} required/></label>
      <label><span className={caption}>Ngày phát sinh</span><input type="date" name="started_on" required defaultValue={today} className={field}/></label>
      <label><span className={caption}>Ngày hẹn trả (tùy chọn)</span><input type="date" name="due_on" className={field}/></label>
      <label><span className={caption}>Lãi suất tham khảo (%/năm)</span><input inputMode="decimal" name="annual_interest_rate" placeholder="0" className={field}/></label>
    </div>
    <fieldset><legend className={caption}>Tình trạng dòng tiền</legend><div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
      <button type="button" onClick={()=>setMode("cash")} aria-pressed={mode==="cash"} className={`min-h-11 rounded-xl border px-3 text-left text-xs font-bold ${mode==="cash"?"border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]":"border-[var(--border)]"}`}>Tiền vừa giao / nhận</button>
      <button type="button" onClick={()=>setMode("existing")} aria-pressed={mode==="existing"} className={`min-h-11 rounded-xl border px-3 text-left text-xs font-bold ${mode==="existing"?"border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]":"border-[var(--border)]"}`}>Nợ cũ — chỉ nhập dư nợ</button>
    </div><input type="hidden" name="mode" value={mode}/></fieldset>
    {mode==="cash"?<label><span className={caption}>{direction==="receivable"?"Tài khoản giao tiền":"Tài khoản nhận tiền"}</span><select name="account_id" required defaultValue="" className={field}><option value="" disabled>Chọn tài khoản VND</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name} · {fmt(a.current_balance_minor)}</option>)}</select></label>
      :<p className="rounded-xl bg-[var(--muted)] px-3 py-2.5 text-xs leading-5 text-[var(--muted-foreground)]">Khoản nợ đã tồn tại: Finzaro chỉ ghi nhận số gốc còn nợ, không cộng hoặc trừ số dư ngân hàng lần nữa.</p>}
    <label><span className={caption}>Ghi chú (tùy chọn)</span><textarea name="notes" maxLength={500} rows={2} className={`${field} !h-auto py-2.5`}/></label>
    <PendingSubmitButton idleLabel="Lưu công nợ" pendingLabel="Đang ghi nhận..." className="fin-primary-btn w-full sm:w-auto"/>
  </form>;
}
function DebtCard({debt,events,accounts,today}:{debt:DebtRow;events:DebtEvent[];accounts:CashAccount[];today:string}){
  const [showPay,setShowPay]=useState(false);
  const [showEdit,setShowEdit]=useState(false);
  const lifecycle=debtLifecycle(debt,today);
  const original=debt.original_principal_minor;
  const progress=Math.max(0,Math.min(100,(original-debt.outstanding_minor)/original*100));
  const isReceivable=debt.direction==="receivable";
  const labelStatus={active:"Đang theo dõi",upcoming:"Sắp đến hạn",overdue:"Quá hạn",settled:"Đã tất toán",archived:"Đã lưu trữ"}[lifecycle];
  const interestPaid=events.filter(e=>e.event_type==="repayment").reduce((sum,e)=>sum+e.interest_minor,0);
  const deleteAllowed=events.length===1 && events[0].event_type==="opening_existing";
  return <article className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3.5 sm:p-4">
    <div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="truncate text-sm font-black" title={debt.title}>{debt.title}</h3><p className="mt-1 text-xs text-[var(--muted-foreground)]">{debt.party_name}</p></div>
      <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${lifecycle==="overdue"?"bg-rose-500/10 text-rose-500":lifecycle==="upcoming"?"bg-amber-500/10 text-amber-600":"bg-[var(--muted)] text-[var(--muted-foreground)]"}`}>{labelStatus}</span>
    </div>
    <p className="mt-4 text-[11px] font-semibold text-[var(--muted-foreground)]">{isReceivable?"Còn phải thu":"Còn phải trả"}</p>
    <p className={`mt-1 overflow-x-auto whitespace-nowrap text-xl font-black tabular-nums sm:text-2xl ${isReceivable?"text-[var(--fin-income)]":"text-[var(--fin-expense)]"}`}>{fmt(debt.outstanding_minor)}</p>
    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--muted)]"><div className="h-full rounded-full bg-[var(--primary)]" style={{width:`${progress}%`}}/></div>
    <div className="mt-2 flex justify-between gap-2 text-[11px] text-[var(--muted-foreground)]"><span>Gốc {fmt(original)}</span><span>Đã trả {Math.round(progress)}%</span></div>
    <div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-[var(--muted)]/60 p-2.5"><p className="text-[var(--muted-foreground)]">Hẹn trả</p><p className="mt-1 font-semibold"><DateText value={debt.due_on}/></p></div><div className="rounded-xl bg-[var(--muted)]/60 p-2.5"><p className="text-[var(--muted-foreground)]">Lãi đã ghi nhận</p><p className="mt-1 font-semibold">{fmt(interestPaid)}</p></div></div>
    {!debt.archived&&<div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
      <button type="button" onClick={()=>{setShowPay(v=>!v);setShowEdit(false);}} className="fin-primary-btn text-xs">{isReceivable?"Thu hồi nợ":"Trả nợ"}</button>
      <button type="button" onClick={()=>{setShowEdit(v=>!v);setShowPay(false);}} className={secondary}><Pencil className="size-3.5"/>Sửa</button>
    </div>}
    {showPay&&!debt.archived&&<form action={repayPersonalDebtAction} onSubmit={stampKey} className="mt-3 space-y-3 rounded-xl border border-[var(--border)] p-3">
      <RequestKeyInput/><input type="hidden" name="debt_id" value={debt.id}/>
      <p className="text-xs font-bold">{isReceivable?"Ghi nhận tiền được trả":"Ghi nhận tiền đã trả"}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label><span className={caption}>Tiền gốc (₫)</span><MoneyCalculatorInput name="principal" decimalDigits={0} defaultValue="0" required/></label>
      <label><span className={caption}>Tiền lãi (₫)</span><MoneyCalculatorInput name="interest" decimalDigits={0} defaultValue="0" required/></label></div>
      <label><span className={caption}>{isReceivable?"Tài khoản nhận":"Tài khoản thanh toán"}</span><select name="account_id" required defaultValue="" className={field}><option value="" disabled>Chọn tài khoản VND</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name} · {fmt(a.current_balance_minor)}</option>)}</select></label>
      <label><span className={caption}>Ngày thanh toán</span><input name="event_date" type="date" required defaultValue={today} className={field}/></label>
      <label><span className={caption}>Ghi chú</span><input name="notes" maxLength={500} className={field}/></label>
      <p className="text-[11px] leading-5 text-[var(--muted-foreground)]">Gốc chỉ giảm dư nợ; lãi được ghi vào {isReceivable?"Thu nhập":"Chi tiêu"}. Hai khoản được lưu cùng lúc.</p>
      <PendingSubmitButton idleLabel={isReceivable?"Xác nhận thu hồi":"Xác nhận trả nợ"} pendingLabel="Đang xử lý..." className="fin-primary-btn w-full"/>
    </form>}
    {showEdit&&!debt.archived&&<form action={updatePersonalDebtAction} className="mt-3 grid gap-3 rounded-xl border border-[var(--border)] p-3 sm:grid-cols-2">
      <input type="hidden" name="debt_id" value={debt.id}/><input type="hidden" name="archived" value="0"/>
      <label><span className={caption}>Người liên quan</span><input name="party_name" defaultValue={debt.party_name} required maxLength={120} className={field}/></label>
      <label><span className={caption}>Tên khoản nợ</span><input name="title" defaultValue={debt.title} required maxLength={140} className={field}/></label>
      <label><span className={caption}>Ngày hẹn trả</span><input type="date" name="due_on" defaultValue={debt.due_on??""} className={field}/></label>
      <label><span className={caption}>Lãi suất tham khảo (%/năm)</span><input name="annual_interest_rate" inputMode="decimal" defaultValue={debt.annual_interest_rate??""} className={field}/></label>
      <label className="sm:col-span-2"><span className={caption}>Ghi chú</span><input name="notes" maxLength={500} defaultValue={debt.notes??""} className={field}/></label>
      <div className="sm:col-span-2"><PendingSubmitButton idleLabel="Lưu thay đổi" pendingLabel="Đang lưu..." className="fin-primary-btn w-full"/></div>
    </form>}
    <details className="mt-3 border-t border-[var(--border)] pt-3"><summary className="flex min-h-9 cursor-pointer items-center justify-between text-xs font-bold">Lịch sử công nợ ({events.length})<ChevronDown className="size-4"/></summary>
      <div className="mt-2 space-y-2">{events.map(e=><div key={e.id} className="flex items-start justify-between gap-2 rounded-lg bg-[var(--muted)]/60 px-3 py-2 text-xs"><div className="min-w-0"><p className="font-semibold">{e.event_type==="opening_existing"?"Dư nợ cũ":e.event_type==="opening_cash"?(isReceivable?"Đã giao tiền":"Đã nhận tiền"):"Thanh toán"}</p><p className="text-[11px] text-[var(--muted-foreground)]"><DateText value={e.event_date}/></p></div><div className="text-right tabular-nums"><p>Gốc {fmt(e.principal_minor)}</p>{e.interest_minor>0&&<p className="text-[11px] text-[var(--muted-foreground)]">Lãi {fmt(e.interest_minor)}</p>}</div></div>)}</div>
    </details>
    {debt.outstanding_minor===0&&!debt.archived&&<form action={updatePersonalDebtAction} className="mt-3">
      <input type="hidden" name="debt_id" value={debt.id}/><input type="hidden" name="party_name" value={debt.party_name}/><input type="hidden" name="title" value={debt.title}/><input type="hidden" name="due_on" value={debt.due_on??""}/><input type="hidden" name="annual_interest_rate" value={debt.annual_interest_rate??""}/><input type="hidden" name="notes" value={debt.notes??""}/><input type="hidden" name="archived" value="1"/>
      <PendingSubmitButton idleLabel="Lưu trữ khoản đã tất toán" pendingLabel="Đang lưu trữ..." className={`${secondary} w-full`}/>
    </form>}
    {debt.archived&&<form action={updatePersonalDebtAction} className="mt-3">
      <input type="hidden" name="debt_id" value={debt.id}/><input type="hidden" name="party_name" value={debt.party_name}/><input type="hidden" name="title" value={debt.title}/><input type="hidden" name="due_on" value={debt.due_on??""}/><input type="hidden" name="annual_interest_rate" value={debt.annual_interest_rate??""}/><input type="hidden" name="notes" value={debt.notes??""}/><input type="hidden" name="archived" value="0"/>
      <PendingSubmitButton idleLabel="Khôi phục công nợ" pendingLabel="Đang khôi phục..." className={`${secondary} w-full`}/>
    </form>}
    {deleteAllowed&&<form action={deleteUnpostedPersonalDebtAction} className="mt-2" onSubmit={e=>{if(!window.confirm("Xóa khoản nợ cũ chưa có giao dịch tiền thực tế?"))e.preventDefault();}}><input type="hidden" name="debt_id" value={debt.id}/><button type="submit" className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-500"><Trash2 className="size-3.5"/>Xóa dư nợ cũ chưa phát sinh giao dịch</button></form>}
  </article>;
}
export function PersonalDebtPanel({debts,events,accounts,today,managedBalance,feedbackError,feedbackMessage}:{debts:DebtRow[];events:DebtEvent[];accounts:CashAccount[];today:string;managedBalance:number;feedbackError?:string;feedbackMessage?:string}){
  const [tab,setTab]=useState<DebtDirection>("receivable");
  const [showCreate,setShowCreate]=useState(false);
  const [showArchived,setShowArchived]=useState(false);
  const totals=personalDebtTotals(debts);
  const cards=debts.filter(d=>d.direction===tab&&(showArchived||!d.archived));
  const eventsByDebt=new Map<string,DebtEvent[]>();
  for(const event of events){const list=eventsByDebt.get(event.debt_id)??[];list.push(event);eventsByDebt.set(event.debt_id,list);}
  return <section id="personal-debts" className="mt-5 scroll-mt-24 rounded-[24px] border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.12em] text-[var(--primary)]">CÔNG NỢ CÁ NHÂN</p><h2 className="mt-1 flex items-center gap-2 text-lg font-black"><HandCoins className="size-5"/>Cho vay & Đi vay</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Gốc không tính Thu/Chi. Lãi thực nhận/trả được ghi riêng.</p></div><button type="button" onClick={()=>setShowCreate(v=>!v)} className="fin-secondary-btn"><Plus className="size-4"/>Tạo công nợ</button></div>
    {feedbackError&&<div role="alert" className="mt-3 rounded-xl bg-rose-500/10 p-3 text-sm font-semibold text-rose-500">{feedbackError.slice(0,250)}</div>}
    {feedbackMessage&&<div role="status" className="mt-3 rounded-xl bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400">{feedbackMessage.slice(0,250)}</div>}
    <div className="mt-4 grid grid-cols-2 gap-2"><div className="min-w-0 rounded-xl bg-[var(--muted)]/60 p-3"><p className="flex items-center gap-1 text-[11px] text-[var(--muted-foreground)]"><ArrowDownLeft className="size-3.5 text-[var(--fin-income)]"/>Phải thu</p><p className="mt-2 overflow-x-auto whitespace-nowrap text-lg font-black tabular-nums text-[var(--fin-income)]">{fmt(totals.receivable)}</p></div><div className="min-w-0 rounded-xl bg-[var(--muted)]/60 p-3"><p className="flex items-center gap-1 text-[11px] text-[var(--muted-foreground)]"><ArrowUpRight className="size-3.5 text-[var(--fin-expense)]"/>Phải trả</p><p className="mt-2 overflow-x-auto whitespace-nowrap text-lg font-black tabular-nums text-[var(--fin-expense)]">{fmt(totals.payable)}</p></div></div>
    <div className="mt-2 rounded-xl border border-[var(--border)] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-[var(--muted-foreground)]">Công nợ ròng</span><strong className="text-sm tabular-nums">{totals.net>0?"+":""}{fmt(totals.net)}</strong></div><p className="mt-1 text-[11px] text-[var(--muted-foreground)]">Tiền đang quản lý + công nợ ròng: <strong>{fmt(managedBalance+totals.net)}</strong> (chưa bao gồm vàng, chứng khoán, crypto)</p></div>
    {showCreate&&<DebtCreate accounts={accounts} today={today} onCancel={()=>setShowCreate(false)}/>}
    <div className="mt-4 flex flex-wrap items-center gap-2"><div className="flex flex-1 gap-2" role="tablist" aria-label="Phân loại công nợ"><button type="button" role="tab" aria-selected={tab==="receivable"} onClick={()=>setTab("receivable")} className={`min-h-10 flex-1 rounded-xl px-3 text-xs font-bold ${tab==="receivable"?"bg-[var(--primary)] text-white":"bg-[var(--muted)]"}`}>Người khác nợ tôi</button><button type="button" role="tab" aria-selected={tab==="payable"} onClick={()=>setTab("payable")} className={`min-h-10 flex-1 rounded-xl px-3 text-xs font-bold ${tab==="payable"?"bg-[var(--primary)] text-white":"bg-[var(--muted)]"}`}>Tôi đang nợ</button></div><button type="button" onClick={()=>setShowArchived(v=>!v)} className={secondary}><CalendarClock className="size-3.5"/>{showArchived?"Ẩn lưu trữ":"Xem lưu trữ"}</button></div>
    {cards.length===0?<p className="mt-4 rounded-xl bg-[var(--muted)] p-4 text-center text-xs text-[var(--muted-foreground)]">Chưa có khoản {tab==="receivable"?"phải thu":"phải trả"} trong danh mục.</p>:<div className="mt-3 grid gap-3 lg:grid-cols-2">{cards.map(debt=><DebtCard key={debt.id} debt={debt} events={eventsByDebt.get(debt.id)??[]} accounts={accounts} today={today}/>)}</div>}
  </section>;
}
