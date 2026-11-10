"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Repeat2, Sparkles, X } from "lucide-react";
import { createTransactionAction } from "@/features/transactions/actions";
import type { TransactionType } from "@/features/transactions/constants";
import type { CategoryType } from "@/features/categories/constants";
import type { QuickTransactionSuggestion } from "@/features/transactions/data";
import { CategoryIcon, iconColorValue } from "@/features/categories/icons";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { TransactionCategorySelect } from "@/components/transaction-category-select";
import { Card, CardContent } from "@/components/ui/card";
import { MobileDateInput } from "@/components/mobile-date-input";
import { MoneyCalculatorInput } from "@/components/money-calculator-input";

export type SimpleAccountOption = { id: string; name: string; currency_code: string; institution_name: string | null; account_type: string; decimal_digits?: number };
export type SimpleCategoryOption = { id: string; name: string; icon_name: string; icon_color: string | null; parent_id: string | null; category_type: CategoryType; sort_order: number };

export function TransactionEntryForm({ type, accounts, categories, today, suggestions, returnTo = "" }: {
  type: TransactionType;
  accounts: SimpleAccountOption[];
  categories: SimpleCategoryOption[];
  today: string;
  suggestions: QuickTransactionSuggestion[];
  returnTo?: string;
}) {
  const isTransfer = type === "transfer";
  const [title, setTitle] = useState("");
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [selectedSuggestion, setSelectedSuggestion] = useState("");
  const accountIds = useMemo(() => new Set(accounts.map((a) => a.id)), [accounts]);
  const categoryIds = useMemo(() => new Set(categories.map((c) => c.id)), [categories]);
  const fromAccount = accounts.find((a) => a.id === fromAccountId);
  const toAccount = accounts.find((a) => a.id === toAccountId);

  function applySuggestion(s: QuickTransactionSuggestion) {
    setTitle(s.title);
    setFromAccountId(s.from_account_id && accountIds.has(s.from_account_id) ? s.from_account_id : "");
    setToAccountId(s.to_account_id && accountIds.has(s.to_account_id) ? s.to_account_id : "");
    setFromAmount(s.from_amount);
    setToAmount(s.to_amount);
    if (!isTransfer && s.category_id && categoryIds.has(s.category_id)) setCategoryId(s.category_id);
    setNotes(s.notes);
    setSelectedSuggestion(s.id);
  }

  return <Card className="border-emerald-500/25 shadow-xl shadow-black/5"><CardContent className="p-4 sm:p-6">
    <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold text-[var(--primary)]">GIAO DỊCH MỚI</p><h2 className="mt-1 text-lg font-black">{type === "expense" ? "Chi tiền" : type === "income" ? "Thu tiền" : "Chuyển tiền"}</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">{isTransfer ? "Chuyển giữa hai tài khoản; không tính vào thu/chi." : "Chỉ ghi nhận thu hoặc chi thông thường."}</p></div><button type="button" data-instant-close aria-label="Đóng" className="grid size-9 place-items-center rounded-xl border border-[var(--border)]"><X className="size-4" /></button></div>
    {accounts.length === 0 ? <div className="mt-5 rounded-xl border border-dashed border-[var(--border)] p-5 text-center text-sm">Cần ít nhất một tài khoản hoạt động. <Link className="font-bold text-[var(--primary)]" href="/accounts?new=1">Thêm tài khoản</Link></div> : <>
      {suggestions.length > 0 && <div className="mt-4"><p className="mb-2 text-xs font-black"><Sparkles className="mr-1 inline size-3.5 text-[var(--primary)]"/>Chọn nhanh giao dịch thường dùng</p><div className="flex snap-x gap-2 overflow-x-auto pb-2">{suggestions.slice(0, 6).map((s) => <button key={s.id} type="button" onClick={() => applySuggestion(s)} className={`min-w-32 snap-start rounded-xl border p-3 text-left ${selectedSuggestion === s.id ? "border-[var(--primary)]" : "border-[var(--border)]"}`}><span className="flex items-center gap-2"><span style={{color:iconColorValue(s.category_icon_color)}}>{s.category_icon_name ? <CategoryIcon name={s.category_icon_name} className="size-4"/> : <Repeat2 className="size-4"/>}</span><span className="truncate text-xs font-bold">{s.title}</span></span><span className="mt-1 block text-xs font-black">{s.amount_label}</span></button>)}</div></div>}
      <form action={createTransactionAction} className="mt-4 grid min-w-0 gap-3 md:grid-cols-2">
        <input name="transaction_type" type="hidden" value={type}/><input name="transaction_purpose" type="hidden" value={isTransfer ? "transfer" : "standard"}/><input name="return_to" type="hidden" value={returnTo}/>
        <label className="md:col-span-2"><span className="field-label">Nội dung</span><input name="title" className="fin-input" required maxLength={140} placeholder={type === "income" ? "Ví dụ: Lương tháng này" : type === "expense" ? "Ví dụ: Ăn trưa" : "Ví dụ: Chuyển sang ví điện tử"} value={title} onChange={e=>setTitle(e.target.value)}/></label>
        {type !== "income" && <label><span className="field-label">Tài khoản nguồn</span><select name="from_account_id" value={fromAccountId} onChange={e=>setFromAccountId(e.target.value)} className="fin-input" required><option value="">Chọn tài khoản</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name} · {a.currency_code}</option>)}</select></label>}
        {type !== "expense" && <label><span className="field-label">Tài khoản nhận</span><select name="to_account_id" value={toAccountId} onChange={e=>setToAccountId(e.target.value)} className="fin-input" required><option value="">Chọn tài khoản</option>{accounts.filter(a=>!isTransfer || a.id!==fromAccountId).map(a=><option key={a.id} value={a.id}>{a.name} · {a.currency_code}</option>)}</select></label>}
        {type !== "income" && <label><span className="field-label">{isTransfer ? "Số tiền gửi" : "Số tiền chi"}</span><MoneyCalculatorInput name="from_amount" value={fromAmount} onValueChange={setFromAmount} decimalDigits={fromAccount?.decimal_digits ?? 0} currencyCode={fromAccount?.currency_code} required placeholder="0"/></label>}
        {type !== "expense" && <label><span className="field-label">{isTransfer ? "Số tiền nhận" : "Số tiền thu"}</span><MoneyCalculatorInput name="to_amount" value={toAmount} onValueChange={setToAmount} decimalDigits={toAccount?.decimal_digits ?? 0} currencyCode={toAccount?.currency_code} allowEmpty={isTransfer} required={!isTransfer} placeholder={isTransfer ? "Để trống nếu cùng tiền tệ" : "0"}/>{isTransfer && <span className="mt-1 block text-[11px] text-[var(--muted-foreground)]">Khác loại tiền: nhập giá trị thực nhận.</span>}</label>}
        {!isTransfer && <label className="md:col-span-2"><span className="field-label flex items-center justify-between">Danh mục <Link className="text-[var(--primary)]" href="/categories">Quản lý</Link></span><TransactionCategorySelect categories={categories} value={categoryId} onValueChange={setCategoryId}/></label>}
        <label><span className="field-label">Ngày giao dịch</span><MobileDateInput name="transaction_date" defaultValue={today} ariaLabel="Ngày giao dịch"/></label>
        <label className="md:col-span-2"><span className="field-label">Ghi chú</span><textarea name="notes" rows={2} maxLength={500} className="fin-textarea" value={notes} onChange={e=>setNotes(e.target.value)}/></label>
        <div className="flex justify-end gap-2 md:col-span-2"><button type="button" data-instant-close className="fin-secondary-btn">Hủy</button><PendingSubmitButton idleLabel="Lưu giao dịch" pendingLabel="Đang lưu..." className="fin-primary-btn"/></div>
      </form>
    </>}
  </CardContent></Card>;
}
