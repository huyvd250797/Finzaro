"use client";

import Link from "next/link";
import { useRef, useState, useTransition, type TouchEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Copy, MoreHorizontal, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { CategoryIcon, iconColorValue } from "@/features/categories/icons";
import { deleteTransactionInlineAction } from "@/features/transactions/actions";
import { currencyDigits, transactionEntry, type LedgerCurrency, type TransactionView } from "@/features/transactions/data";
import { formatMinorMoney } from "@/lib/utils";

export function TransactionSwipeRow({tx,currencies,showDelete,showEdit,showCopy,simpleTransfer}:{
  tx:TransactionView; currencies:LedgerCurrency[];showDelete:boolean;showEdit:boolean;showCopy:boolean;simpleTransfer:boolean;
}){
  const [revealed,setRevealed]=useState(false);
  const [menu,setMenu]=useState(false);
  const [deletePending,startDelete]=useTransition();
  const router=useRouter();
  async function remove(){
    if(deletePending||!window.confirm(`Xóa giao dịch ${tx.title}? Số dư sẽ được hoàn nguyên.`)) return;
    startDelete(async()=>{
      window.dispatchEvent(new CustomEvent("finzaro:transaction-feedback",{detail:{kind:"pending",message:"Đang xóa giao dịch..."}}));
      try {
        const result=await deleteTransactionInlineAction(tx.id);
        window.dispatchEvent(new CustomEvent("finzaro:transaction-feedback",{detail:{kind:result.ok?"success":"error",message:result.ok?"Đã xóa giao dịch và cập nhật số dư.":result.error}}));
        if(result.ok)router.refresh();
      } catch {
        window.dispatchEvent(new CustomEvent("finzaro:transaction-feedback",{detail:{kind:"error",message:"Không thể kết nối để xóa giao dịch. Vui lòng thử lại."}}));
      }
    });
  }
  const touch=useRef<{x:number;y:number}|null>(null);
  const primary=tx.transaction_type==="income"?transactionEntry(tx,"income"):tx.transaction_type==="expense"?transactionEntry(tx,"expense"):transactionEntry(tx,"transfer_out");
  const destination=tx.transaction_type==="transfer"?transactionEntry(tx,"transfer_in"):null;
  const digits=primary?currencyDigits(currencies,primary.currency_code):0;
  const destinationDigits=destination?currencyDigits(currencies,destination.currency_code):0;
  const sourceName=primary?.account?.name??"Tài khoản";
  const destinationName=destination?.account?.name??"Tài khoản nhận";
  const differentCurrency=Boolean(destination&&primary&&destination.currency_code!==primary.currency_code);
  const category=tx.category?.name??tx.category_label??(tx.transaction_type==="transfer"?"Chuyển tiền":"Chưa phân loại");
  const normal=tx.transaction_purpose==="standard"&&["income","expense"].includes(tx.transaction_type);
  const canCopy=normal||(tx.transaction_type==="transfer"&&simpleTransfer);
  const editable=showEdit&&normal;
  const deletable=showDelete&&(normal||simpleTransfer);
  const canSwipe=editable||deletable;
  function onTouchStart(event:TouchEvent){const point=event.touches[0];if(point)touch.current={x:point.clientX,y:point.clientY};}
  function onTouchEnd(event:TouchEvent){
    if(!canSwipe||!touch.current)return;
    const point=event.changedTouches[0];if(!point)return;
    const dx=point.clientX-touch.current.x,dy=point.clientY-touch.current.y;
    touch.current=null;
    if(Math.abs(dx)<32||Math.abs(dx)<Math.abs(dy)*1.25)return;
    if(dx<0)setRevealed(true);
    if(dx>0)setRevealed(false);
  }
  return <div data-fin-transaction-row className="fin-transaction-row fin-transaction-swipe relative max-w-full overflow-hidden touch-pan-y" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
    {canSwipe&&<div className="absolute inset-y-0 right-0 flex w-[146px] items-center justify-end gap-1.5 p-1.5" aria-hidden={!revealed}>
      {editable&&<Link href={`/transactions?edit=${encodeURIComponent(tx.id)}`} tabIndex={revealed?0:-1} title="Sửa giao dịch" className="flex h-full max-h-16 flex-1 flex-col items-center justify-center gap-1 rounded-xl bg-sky-600 px-2 text-[11px] font-bold text-white"><Pencil className="size-4"/>Sửa</Link>}
      {deletable&&<button type="button" onClick={remove} disabled={deletePending} tabIndex={revealed?0:-1} className="flex h-full max-h-16 flex-1 flex-col items-center justify-center gap-1 rounded-xl bg-rose-600 px-2 text-[11px] font-bold text-white disabled:opacity-60"><Trash2 className="size-4"/>{deletePending?"Đang xóa":"Xóa"}</button>}
    </div>}
    <div className="relative flex min-w-0 items-start gap-2.5 bg-[var(--card)] py-3 transition-transform duration-200 ease-out sm:gap-3 sm:py-4" style={{transform:revealed&&canSwipe?"translateX(-146px)":"translateX(0)"}}>
      <div className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl sm:size-10 ${tx.transaction_type==="transfer"?"bg-sky-500/10 text-sky-600":"bg-[var(--muted)]"}`} style={tx.transaction_type==="transfer"?undefined:{color:iconColorValue(tx.category?.icon_color)}}>
        {tx.transaction_type==="transfer"?<ArrowLeftRight className="size-4"/>:<CategoryIcon name={tx.category?.icon_name} className="size-4"/>}
      </div>
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{tx.title}</p><p className="mt-0.5 line-clamp-2 text-xs text-[var(--muted-foreground)]">{category} · {tx.transaction_type==="transfer"?`${sourceName} → ${destinationName}`:sourceName}</p>{tx.notes&&<p className="mt-1 line-clamp-1 text-xs text-[var(--muted-foreground)]">{tx.notes}</p>}</div>
      <div className="flex min-w-0 shrink-0 flex-col items-end gap-1.5"><div className={`text-right text-xs font-black sm:text-sm ${tx.transaction_type==="income"?"text-emerald-600":tx.transaction_type==="transfer"?"text-sky-600":"text-rose-600"}`}>
        {primary?<><div className="whitespace-nowrap">{tx.transaction_type==="income"?"+":tx.transaction_type==="expense"?"−":""}{formatMinorMoney(Math.abs(primary.amount_minor),primary.currency_code,digits)}</div>{differentCurrency&&destination&&<div className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">→ {formatMinorMoney(destination.amount_minor,destination.currency_code,destinationDigits)}</div>}</>:"—"}
      </div></div>
      {(canSwipe||(showCopy&&canCopy))&&<button type="button" onClick={()=>setMenu(v=>!v)} aria-expanded={menu} aria-label={`Mở thao tác ${tx.title}`} title="Thao tác giao dịch" className="grid size-8 shrink-0 place-items-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--muted)]"><MoreHorizontal className="size-4"/></button>}
    </div>
    {menu&&<div className="relative z-10 mx-2 mb-2 flex flex-wrap gap-2 rounded-xl border border-[var(--border)] bg-[var(--muted)] p-2">
      {editable&&<Link className="inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-xs font-bold" href={`/transactions?edit=${encodeURIComponent(tx.id)}`}><Pencil className="size-4"/>Sửa</Link>}
      {deletable&&<button type="button" onClick={remove} disabled={deletePending} className="inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-xs font-bold text-rose-500"><Trash2 className="size-4"/>{deletePending?"Đang xóa...":"Xóa"}</button>}
      {showCopy&&canCopy&&<><Link className="inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-xs font-bold" href={`/transactions?duplicate=${encodeURIComponent(tx.id)}`}><RotateCcw className="size-4"/>Nhân bản</Link><Link className="inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-xs font-bold" href={`/transactions?copy=${encodeURIComponent(tx.id)}`} data-fin-copy-id={tx.id} data-fin-copy-title={tx.title} data-fin-copy-date={tx.transaction_date} data-fin-copy-type={tx.transaction_type}><Copy className="size-4"/>Sao chép ngày</Link></>}
    </div>}
  </div>;
}
