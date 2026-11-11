"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { ArrowLeftRight, CalendarDays, ChevronDown, Sparkles, X } from "lucide-react";
import { createTransactionStateAction } from "@/features/transactions/actions";
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
  const typeTone = type === "expense" ? "text-rose-500" : type === "income" ? "text-emerald-500" : "text-sky-500";
  // Use the latest actual choice as a default; do not auto-create or modify a transaction.
  const lastUsed = useMemo(() => suggestions.find((item) => item.kind === "recent") ?? suggestions[0], [suggestions]);
  const activeIds = useMemo(() => new Set(accounts.map((account) => account.id)), [accounts]);
  const orderedCategories = useMemo(() => [...categories].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "vi")), [categories]);
  const initialFrom = lastUsed?.from_account_id && activeIds.has(lastUsed.from_account_id) ? lastUsed.from_account_id : accounts[0]?.id ?? "";
  const initialTo = lastUsed?.to_account_id && activeIds.has(lastUsed.to_account_id) && (!isTransfer || lastUsed.to_account_id !== initialFrom)
    ? lastUsed.to_account_id : accounts.find((account) => !isTransfer || account.id !== initialFrom)?.id ?? "";
  const initialCategory = lastUsed?.category_id && orderedCategories.some((category) => category.id === lastUsed.category_id)
    ? lastUsed.category_id : orderedCategories[0]?.id ?? "";
  const [title, setTitle] = useState(isTransfer ? "Chuyển tiền" : orderedCategories.find((category) => category.id === initialCategory)?.name ?? "");
  const [autoTitle, setAutoTitle] = useState(!isTransfer);
  const [fromAccountId, setFromAccountId] = useState(initialFrom);
  const [toAccountId, setToAccountId] = useState(initialTo);
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [categoryId, setCategoryId] = useState(initialCategory);
  const [notes, setNotes] = useState("");
  const [selectedSuggestion, setSelectedSuggestion] = useState("");
  const [state, formAction] = useActionState(createTransactionStateAction, { error: "" });
  const fromAccount = accounts.find((account) => account.id === fromAccountId);
  const toAccount = accounts.find((account) => account.id === toAccountId);
  const differentCurrency = isTransfer && Boolean(fromAccount && toAccount && fromAccount.currency_code !== toAccount.currency_code);
  const categoryIds = useMemo(() => new Set(categories.map((category) => category.id)), [categories]);
  const primaryAccount = type === "income" ? toAccount : fromAccount;

  function chooseCategory(next: string) {
    setCategoryId(next);
    if (autoTitle) setTitle(orderedCategories.find((category) => category.id === next)?.name ?? "");
  }
  function applySuggestion(suggestion: QuickTransactionSuggestion) {
    setTitle(suggestion.title);
    setAutoTitle(false);
    if (suggestion.from_account_id && activeIds.has(suggestion.from_account_id)) setFromAccountId(suggestion.from_account_id);
    if (suggestion.to_account_id && activeIds.has(suggestion.to_account_id)) setToAccountId(suggestion.to_account_id);
    setFromAmount(suggestion.from_amount);
    setToAmount(suggestion.to_amount);
    if (!isTransfer && suggestion.category_id && categoryIds.has(suggestion.category_id)) setCategoryId(suggestion.category_id);
    setNotes(suggestion.notes);
    setSelectedSuggestion(suggestion.id);
  }

  return <Card className="fin-transaction-card overflow-hidden shadow-2xl"><CardContent className="p-4 sm:p-6">
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0"><p className={`text-[11px] font-semibold ${typeTone}`}>Giao dịch mới</p><h2 className={`mt-0.5 text-xl font-extrabold tracking-tight ${typeTone}`}>{type === "expense" ? "Chi tiền" : type === "income" ? "Thu tiền" : "Chuyển tiền"}</h2></div>
      <button type="button" data-instant-close aria-label="Đóng" className="fin-icon-button"><X className="size-4" /></button>
    </div>
    {accounts.length < (isTransfer ? 2 : 1) ? <div className="mt-5 rounded-xl border border-dashed border-[var(--border)] p-5 text-sm">{isTransfer ? "Cần ít nhất hai tài khoản hoạt động để chuyển tiền." : "Cần ít nhất một tài khoản hoạt động."} <Link href="/accounts?new=1" className="font-bold text-[var(--primary)]">Thêm tài khoản</Link></div> : <>
      {suggestions.length > 0 && <div className="mt-3"><p className="mb-2 flex items-center gap-1 text-[11px] font-bold text-[var(--muted-foreground)]"><Sparkles className="size-3.5" /> Dùng lại giao dịch gần đây</p><div className="flex snap-x gap-2 overflow-x-auto pb-1.5">{suggestions.slice(0, 5).map((suggestion) => <button key={suggestion.id} type="button" onClick={() => applySuggestion(suggestion)} aria-pressed={selectedSuggestion === suggestion.id} className={`fin-suggestion-chip min-w-[132px] max-w-[170px] shrink-0 snap-start ${selectedSuggestion === suggestion.id ? "is-selected" : ""}`}><span className="flex items-center gap-1.5 truncate text-xs font-semibold"><span style={{ color: iconColorValue(suggestion.category_icon_color) }}>{suggestion.category_icon_name ? <CategoryIcon name={suggestion.category_icon_name} className="size-4" /> : <ArrowLeftRight className="size-4" />}</span><span className="truncate">{suggestion.title}</span></span><span className="mt-1 block truncate text-[11px] font-bold tabular-nums">{suggestion.amount_label}</span></button>)}</div></div>}
      <form action={formAction} className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
        <input name="transaction_type" type="hidden" value={type} /><input name="transaction_purpose" type="hidden" value={isTransfer ? "transfer" : "standard"} /><input name="return_to" type="hidden" value={returnTo} />
        {state.error && <p role="alert" className="fin-inline-error sm:col-span-2">{state.error}</p>}
        <div className="fin-amount-field sm:col-span-2">
          <span className={`fin-amount-label ${typeTone}`}>{isTransfer ? "Số tiền chuyển" : type === "income" ? "Số tiền thu" : "Số tiền chi"}</span>
          <MoneyCalculatorInput name={type === "income" ? "to_amount" : "from_amount"} value={type === "income" ? toAmount : fromAmount} onValueChange={type === "income" ? setToAmount : setFromAmount} decimalDigits={primaryAccount?.decimal_digits ?? 0} currencyCode={primaryAccount?.currency_code} required placeholder="0" className="fin-amount-input" />
          <p className="mt-1.5 text-[11px] text-[var(--muted-foreground)]">Chạm vào số tiền để mở máy tính</p>
        </div>
        {!isTransfer && <div className="sm:col-span-2"><div className="mb-1 flex items-center justify-between"><span className="field-label mb-0">Danh mục</span><Link href="/categories" className="text-xs font-semibold text-[var(--primary)]">Quản lý</Link></div><TransactionCategorySelect categories={categories} value={categoryId} onValueChange={chooseCategory} /></div>}
        {type !== "income" && <label><span className="field-label">{isTransfer ? "Từ tài khoản" : "Chi từ tài khoản"}</span><select name="from_account_id" value={fromAccountId} onChange={(event) => { const next = event.target.value; setFromAccountId(next); if (isTransfer && next === toAccountId) setToAccountId(accounts.find((account) => account.id !== next)?.id ?? ""); }} className="fin-input" required>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currency_code}</option>)}</select></label>}
        {type !== "expense" && <label><span className="field-label">{isTransfer ? "Đến tài khoản" : "Thu vào tài khoản"}</span><select name="to_account_id" value={toAccountId} onChange={(event) => setToAccountId(event.target.value)} className="fin-input" required>{accounts.filter((account) => !isTransfer || account.id !== fromAccountId).map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currency_code}</option>)}</select></label>}
        {differentCurrency && <label className="sm:col-span-2"><span className="field-label">Số tiền thực nhận · {toAccount?.currency_code}</span><MoneyCalculatorInput name="to_amount" value={toAmount} onValueChange={setToAmount} decimalDigits={toAccount?.decimal_digits ?? 0} currencyCode={toAccount?.currency_code} required /></label>}
        {isTransfer && !differentCurrency && <input name="to_amount" type="hidden" value="" />}
        <label className="sm:col-span-2"><span className="field-label">Nội dung giao dịch</span><input name="title" className="fin-input" required maxLength={140} placeholder="Nhập nội dung" value={title} onChange={(event) => { setTitle(event.target.value); setAutoTitle(false); }} /></label>
        <details className="fin-transaction-details sm:col-span-2"><summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[var(--muted-foreground)]"><CalendarDays className="size-4" /> Ngày {today.split("-").reverse().join("/")} · Ghi chú <ChevronDown className="ml-auto size-4" /></summary><div className="mt-3 grid gap-3 sm:grid-cols-2"><label><span className="field-label">Ngày giao dịch</span><MobileDateInput name="transaction_date" defaultValue={today} ariaLabel="Ngày giao dịch" /></label><label><span className="field-label">Ghi chú (tùy chọn)</span><textarea name="notes" rows={2} maxLength={500} className="fin-textarea" value={notes} onChange={(event) => setNotes(event.target.value)} /></label></div></details>
        <div className="fin-form-footer flex gap-2 sm:col-span-2"><button type="button" data-instant-close className="fin-secondary-btn">Hủy</button><PendingSubmitButton idleLabel="Lưu giao dịch" pendingLabel="Đang lưu…" className="fin-primary-btn flex-1" /></div>
      </form>
    </>}
  </CardContent></Card>;
}
