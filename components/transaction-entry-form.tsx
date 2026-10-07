"use client";

import Link from "next/link";
import { CalendarDays, Clock3, Repeat2, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { createTransactionAction } from "@/features/transactions/actions";
import type { TransactionType } from "@/features/transactions/constants";
import { TRANSACTION_TYPE_LABELS } from "@/features/transactions/constants";
import type { QuickTransactionSuggestion } from "@/features/transactions/data";
import { CategoryIcon, iconColorValue } from "@/features/categories/icons";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { TransactionCategorySelect } from "@/components/transaction-category-select";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AccountOption = { id: string; name: string; currency_code: string; institution_name: string | null };
type CategoryOption = { id: string; name: string; icon_name: string; icon_color: string | null; parent_id: string | null };

export function TransactionEntryForm({
  type,
  accounts,
  categories,
  today,
  suggestions
}: {
  type: TransactionType;
  accounts: AccountOption[];
  categories: CategoryOption[];
  today: string;
  suggestions: QuickTransactionSuggestion[];
}) {
  const isTransfer = type === "transfer";
  const [title, setTitle] = useState("");
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
  const accountIds = useMemo(() => new Set(accounts.map((account) => account.id)), [accounts]);
  const categoryIds = useMemo(() => new Set(categories.map((category) => category.id)), [categories]);

  function applySuggestion(suggestion: QuickTransactionSuggestion) {
    setTitle(suggestion.title);
    setFromAccountId(suggestion.from_account_id && accountIds.has(suggestion.from_account_id) ? suggestion.from_account_id : "");
    setToAccountId(suggestion.to_account_id && accountIds.has(suggestion.to_account_id) ? suggestion.to_account_id : "");
    setFromAmount(suggestion.from_amount);
    setToAmount(suggestion.to_amount);
    if (!isTransfer && suggestion.category_id && categoryIds.has(suggestion.category_id)) setCategoryId(suggestion.category_id);
    setNotes(suggestion.notes);
    setSelectedSuggestion(suggestion.id);
  }

  return (
    <Card className="border-emerald-500/25 shadow-xl shadow-black/5">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--primary)]">New transaction</p>
            <h2 className="mt-1 text-lg font-black">{TRANSACTION_TYPE_LABELS[type]}</h2>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">Chọn giao dịch gần đây/nhập nhiều để tự điền, chỉnh nếu cần rồi lưu.</p>
          </div>
          <button type="button" data-instant-close aria-label="Đóng" className="grid size-9 shrink-0 place-items-center rounded-xl border border-[var(--border)]"><X className="size-4" /></button>
        </div>

        {accounts.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-[var(--border)] p-5 text-center"><p className="text-sm font-bold">Cần ít nhất một tài khoản đang hoạt động</p><Link href="/accounts?new=1" className="mt-3 fin-primary-btn">Tạo tài khoản</Link></div>
        ) : !isTransfer && categories.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-[var(--border)] p-5 text-center"><p className="text-sm font-bold">Chưa có danh mục phù hợp</p><Link href={`/categories?new=${type}`} className="mt-3 fin-primary-btn">Tạo danh mục</Link></div>
        ) : (
          <>
            {suggestions.length > 0 && (
              <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/55 p-3 sm:p-4">
                <div className="flex items-center justify-between gap-3"><div><div className="flex items-center gap-1.5 text-xs font-black"><Sparkles className="size-3.5 text-[var(--primary)]" /> Gợi ý chọn nhanh</div><p className="mt-1 text-[11px] text-[var(--muted-foreground)]">Ưu tiên mẫu nhập nhiều, sau đó là giao dịch gần đây.</p></div>{selectedSuggestion && <span className="fin-badge">Đã tự điền</span>}</div>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {suggestions.map((suggestion) => {
                    const selected = selectedSuggestion === suggestion.id;
                    return <button key={suggestion.id} type="button" onClick={() => applySuggestion(suggestion)} className={cn("min-w-[180px] max-w-[220px] rounded-2xl border bg-[var(--card)] p-3 text-left transition active:scale-[.98]", selected ? "border-[var(--primary)] ring-2 ring-[var(--ring)]" : "border-[var(--border)] hover:border-[var(--primary)]/45")}>
                      <div className="flex items-center gap-2"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--sidebar-accent)]" style={{ color: iconColorValue(suggestion.category_icon_color) }}>{suggestion.category_icon_name ? <CategoryIcon name={suggestion.category_icon_name} className="size-3.5" /> : suggestion.kind === "frequent" ? <Repeat2 className="size-3.5" /> : <Clock3 className="size-3.5" />}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-black">{suggestion.title}</span><span className="mt-0.5 block text-[10px] font-bold text-[var(--muted-foreground)]">{suggestion.kind === "frequent" ? `Đã nhập ${suggestion.usage_count} lần` : "Gần đây"}</span></span></div>
                      <div className="mt-2 flex items-center justify-between gap-2"><span className="truncate text-[10px] text-[var(--muted-foreground)]">{suggestion.category_name ?? (type === "transfer" ? "Chuyển tiền" : "Chưa phân loại")}</span><span className="shrink-0 text-[11px] font-black">{suggestion.amount_label}</span></div>
                    </button>;
                  })}
                </div>
              </div>
            )}

            <form action={createTransactionAction} className="mt-5 grid min-w-0 gap-4 md:grid-cols-2">
              <input type="hidden" name="transaction_type" value={type} />
              <label className="md:col-span-2"><span className="field-label">Nội dung</span><input name="title" value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={140} placeholder={type === "income" ? "VD: Lương tháng 10" : type === "expense" ? "VD: Siêu thị cuối tuần" : "VD: Chuyển quỹ dự phòng"} className="fin-input" /></label>
              {(type === "expense" || type === "transfer") && <label><span className="field-label">Tài khoản nguồn</span><select name="from_account_id" value={fromAccountId} onChange={(event) => setFromAccountId(event.target.value)} required className="fin-input"><option value="">Chọn tài khoản</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currency_code}</option>)}</select></label>}
              {(type === "income" || type === "transfer") && <label><span className="field-label">{type === "income" ? "Tài khoản nhận" : "Tài khoản đích"}</span><select name="to_account_id" value={toAccountId} onChange={(event) => setToAccountId(event.target.value)} required className="fin-input"><option value="">Chọn tài khoản</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currency_code}</option>)}</select></label>}
              {(type === "expense" || type === "transfer") && <label><span className="field-label">{type === "transfer" ? "Số tiền gửi" : "Số tiền"}</span><input name="from_amount" value={fromAmount} onChange={(event) => setFromAmount(event.target.value)} inputMode="decimal" required placeholder="0" className="fin-input" /></label>}
              {(type === "income" || type === "transfer") && <label><span className="field-label">{type === "transfer" ? "Số tiền nhận" : "Số tiền"}</span><input name="to_amount" value={toAmount} onChange={(event) => setToAmount(event.target.value)} inputMode="decimal" required={type === "income"} placeholder={type === "transfer" ? "Để trống nếu cùng tiền tệ" : "0"} className="fin-input" />{isTransfer && <span className="mt-1 block text-[11px] text-[var(--muted-foreground)]">Khác tiền tệ: nhập số tiền thực nhận.</span>}</label>}
              {!isTransfer && <label><span className="field-label flex items-center justify-between"><span>Danh mục</span><Link href="/categories" className="normal-case tracking-normal text-[var(--primary)]">Quản lý</Link></span><TransactionCategorySelect categories={categories} value={categoryId} onValueChange={setCategoryId} /></label>}
              <label><span className="field-label">Ngày giao dịch</span><div className="relative"><CalendarDays className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" /><input type="date" name="transaction_date" required defaultValue={today} className="fin-input pl-10" /></div></label>
              <label className="md:col-span-2"><span className="field-label">Ghi chú</span><textarea name="notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} rows={3} className="fin-textarea" placeholder="Thông tin thêm..." /></label>
              {selectedSuggestion && <div className="md:col-span-2 rounded-xl bg-emerald-500/[.065] px-3 py-2 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">Mẫu đã được tự động điền. Bạn có thể sửa bất kỳ trường nào hoặc bấm lưu ngay.</div>}
              <div className="flex justify-end gap-2 md:col-span-2"><button type="button" data-instant-close className="fin-secondary-btn">Hủy</button><PendingSubmitButton idleLabel="Lưu giao dịch" pendingLabel="Đang lưu giao dịch..." className="fin-primary-btn" /></div>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}
