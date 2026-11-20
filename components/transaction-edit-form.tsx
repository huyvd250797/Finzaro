"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, type FormEvent } from "react";
import { LoaderCircle, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MoneyCalculatorInput } from "@/components/money-calculator-input";
import { MobileDateInput } from "@/components/mobile-date-input";
import { TransactionCategorySelect } from "@/components/transaction-category-select";
import { TransactionFormFooterSlot } from "@/components/transaction-form-footer-slot";
import { updateTransactionStateAction } from "@/features/transactions/actions";
import { minorToMajorInput } from "@/features/accounts/money";
import type { CategoryType } from "@/features/categories/constants";
import { currencyDigits, transactionEntry, type LedgerCurrency, type TransactionView } from "@/features/transactions/data";

export function EditTransactionForm({transaction,accounts,categories,currencies,returnTo}: {
  transaction:TransactionView;
  accounts:Array<{id:string;name:string;currency_code:string;institution_name:string|null;decimal_digits?:number}>;
  categories:Array<{id:string;name:string;icon_name:string;icon_color:string|null;parent_id:string|null;category_type:CategoryType;sort_order:number}>;
  currencies:LedgerCurrency[];returnTo?:string;
}){
  const [state,formAction,pending]=useActionState(updateTransactionStateAction,{error:""});
  const formId=`fin-edit-transaction-${transaction.id}`;
  const submitLock=useRef(false);
  useEffect(()=>{if(!pending)submitLock.current=false;},[pending,state]);
  function preventDoubleSubmit(event:FormEvent<HTMLFormElement>){
    if(submitLock.current){event.preventDefault();return;}
    submitLock.current=true;
  }
  if(transaction.transaction_type!=="income"&&transaction.transaction_type!=="expense")return null;
  const type=transaction.transaction_type as "income"|"expense";
  const entry=transactionEntry(transaction,type);
  if(!entry)return <p role="alert" className="p-5 text-rose-500">Không tìm thấy bút toán gốc để sửa khoản {type==="income"?"thu":"chi"}.</p>;
  const digits=currencyDigits(currencies,entry.currency_code);
  return <Card className="mt-5 border-sky-500/25 shadow-xl shadow-black/5"><CardContent className="p-5 sm:p-6">
    <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-sky-600">Chỉnh sửa giao dịch</p><h2 className="mt-1 text-lg font-black">Sửa {type==="income"?"khoản thu":"khoản chi"}</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Cập nhật số tiền và tài khoản bằng giao dịch đối soát nguyên tử.</p></div><Link href={returnTo||"/transactions"} className="grid size-9 place-items-center rounded-xl border border-[var(--border)]" aria-label="Đóng"><X className="size-4"/></Link></div>
    {state.error&&<div role="alert" className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-3 text-sm text-rose-500"><strong>Không lưu được khoản {type==="income"?"thu":"chi"}.</strong><p className="mt-1">{state.error}</p></div>}
    <form id={formId} action={formAction} onSubmit={preventDoubleSubmit} className="mt-5 grid min-w-0 gap-4 md:grid-cols-2" aria-busy={pending}>
      <input type="hidden" name="transaction_id" value={transaction.id}/><input type="hidden" name="return_to" value={returnTo??""}/>
      <div className="fin-amount-field md:col-span-2"><span className="fin-amount-label">Số tiền</span><MoneyCalculatorInput name="amount" defaultValue={minorToMajorInput(Math.abs(entry.amount_minor),digits)} decimalDigits={digits} currencyCode={entry.currency_code} required className="fin-amount-input"/></div>
      <label className="md:col-span-2"><span className="field-label">Nội dung</span><input name="title" required maxLength={140} defaultValue={transaction.title} className="fin-input"/></label>
      <label><span className="field-label">Tài khoản</span><select name="account_id" required defaultValue={entry.account_id} className="fin-input">{accounts.map(a=><option key={a.id} value={a.id}>{a.name} · {a.currency_code}</option>)}</select></label>
      <label className="md:col-span-2"><span className="field-label">Danh mục</span><TransactionCategorySelect categories={categories} defaultValue={transaction.category_id}/></label>
      <label><span className="field-label">Ngày giao dịch</span><MobileDateInput name="transaction_date" defaultValue={transaction.transaction_date} ariaLabel="Ngày giao dịch"/></label>
      <label className="md:col-span-2"><span className="field-label">Ghi chú</span><textarea name="notes" rows={3} maxLength={500} defaultValue={transaction.notes??""} className="fin-textarea"/></label>
      <div className="md:col-span-2"><TransactionFormFooterSlot><Link href={returnTo||"/transactions"} className="fin-secondary-btn">Hủy</Link><button type="submit" form={formId} disabled={pending} aria-busy={pending} className="fin-primary-btn disabled:opacity-50">{pending&&<LoaderCircle className="size-4 animate-spin"/>}{pending?"Đang cập nhật...":"Cập nhật giao dịch"}</button></TransactionFormFooterSlot></div>
    </form>
  </CardContent></Card>;
}
