"use client";

import Link from "next/link";
import { Clock3, CreditCard, Landmark, Repeat2, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { createTransactionAction } from "@/features/transactions/actions";
import type { TransactionType } from "@/features/transactions/constants";
import { TRANSACTION_TYPE_LABELS } from "@/features/transactions/constants";
import type { QuickTransactionSuggestion } from "@/features/transactions/data";
import { CategoryIcon, iconColorValue } from "@/features/categories/icons";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { TransactionCategorySelect } from "@/components/transaction-category-select";
import { Card, CardContent } from "@/components/ui/card";
import { MobileDateInput } from "@/components/mobile-date-input";
import { MoneyCalculatorInput } from "@/components/money-calculator-input";
import { cn } from "@/lib/utils";

type AccountOption = { id: string; name: string; currency_code: string; institution_name: string | null; account_type: string; decimal_digits?: number };
type CategoryOption = { id: string; name: string; icon_name: string; icon_color: string | null; parent_id: string | null };
export type CreditCardPaymentOption = { id: string; name: string; bank_name: string | null; last4: string | null; currency_code: string; current_balance_minor: number; balance_label: string };
export type LoanPaymentOption = { id: string; name: string; lender_name: string | null; currency_code: string; remaining_principal_minor: number; remaining_label: string; suggested_total: string; suggested_principal: string; suggested_interest: string; suggested_fee: string };
type ExpensePurpose = "standard" | "credit_card_payment" | "loan_payment";

export function TransactionEntryForm({
  type,
  accounts,
  categories,
  today,
  suggestions,
  creditCards = [],
  loans = []
}: {
  type: TransactionType;
  accounts: AccountOption[];
  categories: CategoryOption[];
  today: string;
  suggestions: QuickTransactionSuggestion[];
  creditCards?: CreditCardPaymentOption[];
  loans?: LoanPaymentOption[];
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
  const [expensePurpose, setExpensePurpose] = useState<ExpensePurpose>("standard");
  const [creditCardId, setCreditCardId] = useState("");
  const [loanId, setLoanId] = useState("");
  const [loanPrincipal, setLoanPrincipal] = useState("");
  const [loanInterest, setLoanInterest] = useState("");
  const [loanFee, setLoanFee] = useState("");

  const accountIds = useMemo(() => new Set(accounts.map((account) => account.id)), [accounts]);
  const categoryIds = useMemo(() => new Set(categories.map((category) => category.id)), [categories]);
  const fromAccount = accounts.find((account) => account.id === fromAccountId) ?? null;
  const toAccount = accounts.find((account) => account.id === toAccountId) ?? null;
  const visibleSuggestions = suggestions.slice(0, 10);
  const selectedCard = creditCards.find((card) => card.id === creditCardId) ?? null;
  const selectedLoan = loans.find((loan) => loan.id === loanId) ?? null;

  function applySuggestion(suggestion: QuickTransactionSuggestion) {
    setExpensePurpose("standard");
    setTitle(suggestion.title);
    setFromAccountId(suggestion.from_account_id && accountIds.has(suggestion.from_account_id) ? suggestion.from_account_id : "");
    setToAccountId(suggestion.to_account_id && accountIds.has(suggestion.to_account_id) ? suggestion.to_account_id : "");
    setFromAmount(suggestion.from_amount);
    setToAmount(suggestion.to_amount);
    if (!isTransfer && suggestion.category_id && categoryIds.has(suggestion.category_id)) setCategoryId(suggestion.category_id);
    setNotes(suggestion.notes);
    setSelectedSuggestion(suggestion.id);
  }

  function chooseLoan(nextId: string) {
    setLoanId(nextId);
    const loan = loans.find((item) => item.id === nextId);
    if (!loan) return;
    setFromAmount(loan.suggested_total);
    setLoanPrincipal(loan.suggested_principal);
    setLoanInterest(loan.suggested_interest);
    setLoanFee(loan.suggested_fee);
    if (!title) setTitle(`Thanh toán ${loan.name}`);
  }

  function chooseCard(nextId: string) {
    setCreditCardId(nextId);
    const card = creditCards.find((item) => item.id === nextId);
    if (card && !title) setTitle(`Thanh toán ${card.name}`);
  }

  return (
    <Card className="border-emerald-500/25 shadow-xl shadow-black/5">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--primary)]">New transaction</p>
            <h2 className="mt-1 text-lg font-black">{TRANSACTION_TYPE_LABELS[type]}</h2>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">{type === "expense" ? "Chi tiêu thông thường hoặc thanh toán trực tiếp dư nợ thẻ/khoản vay." : type === "transfer" ? "Chuyển giữa tài khoản; Savings Goal liên kết sẽ tự đồng bộ tiến độ." : "Ghi nhận tiền đi vào tài khoản."}</p>
          </div>
          <button type="button" data-instant-close aria-label="Đóng" className="grid size-9 shrink-0 place-items-center rounded-xl border border-[var(--border)]"><X className="size-4" /></button>
        </div>

        {accounts.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-[var(--border)] p-5 text-center"><p className="text-sm font-bold">Cần ít nhất một tài khoản đang hoạt động</p><Link href="/accounts?new=1" className="mt-3 fin-primary-btn">Tạo tài khoản</Link></div>
        ) : !isTransfer && type !== "expense" && categories.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-[var(--border)] p-5 text-center"><p className="text-sm font-bold">Chưa có danh mục phù hợp</p><Link href={`/categories?new=${type}`} className="mt-3 fin-primary-btn">Tạo danh mục</Link></div>
        ) : (
          <>
            {suggestions.length > 0 && (
              <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/55 p-3 sm:p-4">
                <div className="flex items-center justify-between gap-3"><div><div className="flex items-center gap-1.5 text-xs font-black"><Sparkles className="size-3.5 text-[var(--primary)]" /> Gợi ý chọn nhanh</div><p className="mt-1 text-[11px] text-[var(--muted-foreground)]">2 mẫu/lần · vuốt ngang · tối đa 10 giao dịch thông thường.</p></div>{selectedSuggestion && <span className="fin-badge">Đã tự điền</span>}</div>
                <div className="mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {visibleSuggestions.map((suggestion) => {
                    const selected = selectedSuggestion === suggestion.id;
                    return <button key={suggestion.id} type="button" onClick={() => applySuggestion(suggestion)} className={cn("quick-suggestion-card w-[calc(50%_-_4px)] min-w-[calc(50%_-_4px)] flex-[0_0_calc(50%_-_4px)] snap-start rounded-2xl border bg-[var(--card)] p-3 text-left transition active:scale-[.98]", selected ? "border-[var(--primary)] ring-2 ring-[var(--ring)]" : "border-[var(--border)] hover:border-[var(--primary)]/45")}>
                      <div className="flex min-w-0 items-start gap-2.5"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--sidebar-accent)]" style={{ color: iconColorValue(suggestion.category_icon_color) }}>{suggestion.category_icon_name ? <CategoryIcon name={suggestion.category_icon_name} className="size-4" /> : suggestion.kind === "frequent" ? <Repeat2 className="size-4" /> : <Clock3 className="size-4" />}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-black">{suggestion.title}</span><span className="mt-0.5 block truncate text-[10px] font-bold text-[var(--muted-foreground)]">{suggestion.kind === "frequent" ? `${suggestion.usage_count} lần · nhập nhiều` : "Giao dịch gần đây"}</span></span></div>
                      <div className="mt-3 min-w-0"><span className="block truncate text-[10px] text-[var(--muted-foreground)]">{suggestion.category_name ?? (type === "transfer" ? "Chuyển tiền" : "Chưa phân loại")}</span><span className="mt-1 block truncate text-sm font-black tracking-tight">{suggestion.amount_label}</span></div>
                    </button>;
                  })}
                </div>
              </div>
            )}

            <form action={createTransactionAction} className="mt-5 grid min-w-0 gap-4 md:grid-cols-2">
              <input type="hidden" name="transaction_type" value={type} />
              {type === "expense" && <label className="md:col-span-2"><span className="field-label">Mục đích Chi tiền</span><select name="transaction_purpose" value={expensePurpose} onChange={(event) => { setExpensePurpose(event.target.value as ExpensePurpose); setSelectedSuggestion(null); }} className="fin-input"><option value="standard">Chi tiêu thông thường</option><option value="credit_card_payment">Thanh toán thẻ tín dụng</option><option value="loan_payment">Thanh toán khoản vay</option></select><span className="mt-1.5 block text-[11px] leading-4 text-[var(--muted-foreground)]">Thanh toán thẻ/khoản vay sẽ tự giảm dư nợ đang quản lý trong Finzaro.</span></label>}
              {type !== "expense" && <input type="hidden" name="transaction_purpose" value={isTransfer ? "transfer" : "standard"} />}

              <label className="md:col-span-2"><span className="field-label">Nội dung</span><input name="title" value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={140} placeholder={type === "income" ? "VD: Lương tháng 10" : type === "expense" ? expensePurpose === "credit_card_payment" ? "VD: Thanh toán Visa VCB" : expensePurpose === "loan_payment" ? "VD: Trả khoản vay mua xe" : "VD: Siêu thị cuối tuần" : "VD: Chuyển quỹ dự phòng"} className="fin-input" /></label>
              {(type === "expense" || type === "transfer") && <label><span className="field-label">Tài khoản nguồn</span><select name="from_account_id" value={fromAccountId} onChange={(event) => setFromAccountId(event.target.value)} required className="fin-input"><option value="">Chọn tài khoản</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currency_code}</option>)}</select></label>}
              {(type === "income" || type === "transfer") && <label><span className="field-label">{type === "income" ? "Tài khoản nhận" : "Tài khoản đích"}</span><select name="to_account_id" value={toAccountId} onChange={(event) => setToAccountId(event.target.value)} required className="fin-input"><option value="">Chọn tài khoản</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currency_code}</option>)}</select>{isTransfer && toAccount?.account_type === "savings" && <span className="mt-1.5 block text-[11px] text-[var(--primary)]">Nếu tài khoản tiết kiệm này liên kết Savings Goal, tiến độ Goal sẽ tự tăng.</span>}</label>}

              {type === "expense" && expensePurpose === "credit_card_payment" && <label><span className="field-label flex items-center gap-1.5"><CreditCard className="size-3.5" /> Thẻ tín dụng</span><select name="credit_card_id" value={creditCardId} onChange={(event) => chooseCard(event.target.value)} required className="fin-input"><option value="">Chọn thẻ cần thanh toán</option>{creditCards.map((card) => <option key={card.id} value={card.id} disabled={Boolean(fromAccount && fromAccount.currency_code !== card.currency_code)}>{card.name}{card.last4 ? ` · •••• ${card.last4}` : ""} · dư nợ {card.balance_label}</option>)}</select>{selectedCard && <span className="mt-1.5 block text-[11px] text-[var(--muted-foreground)]">Dư nợ hiện tại: {selectedCard.balance_label}</span>}</label>}
              {type === "expense" && expensePurpose === "loan_payment" && <label><span className="field-label flex items-center gap-1.5"><Landmark className="size-3.5" /> Khoản vay</span><select name="loan_id" value={loanId} onChange={(event) => chooseLoan(event.target.value)} required className="fin-input"><option value="">Chọn khoản vay</option>{loans.map((loan) => <option key={loan.id} value={loan.id} disabled={Boolean(fromAccount && fromAccount.currency_code !== loan.currency_code)}>{loan.name} · còn {loan.remaining_label}</option>)}</select>{selectedLoan && <span className="mt-1.5 block text-[11px] text-[var(--muted-foreground)]">Finzaro đã gợi ý gốc/lãi theo kỳ kế tiếp; có thể chỉnh lại trước khi lưu.</span>}</label>}

              {(type === "expense" || type === "transfer") && <label><span className="field-label">{type === "transfer" ? "Số tiền gửi" : "Số tiền"}</span><MoneyCalculatorInput name="from_amount" value={fromAmount} onValueChange={setFromAmount} decimalDigits={fromAccount?.decimal_digits ?? 0} currencyCode={fromAccount?.currency_code} required placeholder="0" /></label>}
              {(type === "income" || type === "transfer") && <label><span className="field-label">{type === "transfer" ? "Số tiền nhận" : "Số tiền"}</span><MoneyCalculatorInput name="to_amount" value={toAmount} onValueChange={setToAmount} decimalDigits={toAccount?.decimal_digits ?? 0} currencyCode={toAccount?.currency_code} required={type === "income"} allowEmpty={type === "transfer"} placeholder={type === "transfer" ? "Để trống nếu cùng tiền tệ" : "0"} />{isTransfer && <span className="mt-1 block text-[11px] text-[var(--muted-foreground)]">Khác tiền tệ: nhập số tiền thực nhận.</span>}</label>}

              {type === "expense" && expensePurpose === "loan_payment" && <div className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/45 p-3 md:col-span-2 md:grid-cols-3"><label><span className="field-label">Tiền gốc</span><MoneyCalculatorInput name="loan_principal" value={loanPrincipal} onValueChange={setLoanPrincipal} decimalDigits={fromAccount?.decimal_digits ?? 0} currencyCode={fromAccount?.currency_code} required /></label><label><span className="field-label">Tiền lãi</span><MoneyCalculatorInput name="loan_interest" value={loanInterest} onValueChange={setLoanInterest} decimalDigits={fromAccount?.decimal_digits ?? 0} currencyCode={fromAccount?.currency_code} required /></label><label><span className="field-label">Phí</span><MoneyCalculatorInput name="loan_fee" value={loanFee} onValueChange={setLoanFee} decimalDigits={fromAccount?.decimal_digits ?? 0} currencyCode={fromAccount?.currency_code} required /></label><p className="text-[11px] leading-4 text-[var(--muted-foreground)] md:col-span-3">Tổng Gốc + Lãi + Phí phải bằng Số tiền Chi tiền. Chỉ phần Gốc làm giảm dư nợ khoản vay.</p></div>}

              {type !== "transfer" && (type !== "expense" || expensePurpose === "standard") && <label><span className="field-label flex items-center justify-between"><span>Danh mục</span><Link href="/categories" className="normal-case tracking-normal text-[var(--primary)]">Quản lý</Link></span><TransactionCategorySelect categories={categories} value={categoryId} onValueChange={setCategoryId} /></label>}
              <label><span className="field-label">Ngày giao dịch</span><MobileDateInput name="transaction_date" defaultValue={today} ariaLabel="Ngày giao dịch" /></label>
              <label className="md:col-span-2"><span className="field-label">Ghi chú</span><textarea name="notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} rows={3} className="fin-textarea" placeholder="Thông tin thêm..." /></label>
              {selectedSuggestion && <div className="md:col-span-2 rounded-xl bg-emerald-500/[.065] px-3 py-2 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">Mẫu đã được tự động điền. Bạn có thể sửa bất kỳ trường nào hoặc bấm lưu ngay.</div>}
              {type === "expense" && expensePurpose !== "standard" && <div className="md:col-span-2 rounded-xl border border-sky-500/20 bg-sky-500/[.06] px-3 py-2 text-[11px] leading-5 text-sky-700 dark:text-sky-300">Đây là dòng tiền trả nợ. Finzaro sẽ giảm số dư tài khoản nguồn và cập nhật dư nợ Credit Card/Loan trong cùng một thao tác database.</div>}
              <div className="flex justify-end gap-2 md:col-span-2"><button type="button" data-instant-close className="fin-secondary-btn">Hủy</button><PendingSubmitButton idleLabel="Lưu giao dịch" pendingLabel="Đang lưu giao dịch..." className="fin-primary-btn" /></div>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}
