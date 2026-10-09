import Link from "next/link";
import { Filter, Search, X } from "lucide-react";
import { AuthMessage } from "@/components/auth-message";
import { InstantTransactionLauncher } from "@/components/instant-transaction-launcher";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { MoneyCalculatorInput } from "@/components/money-calculator-input";
import { MobileDateInput } from "@/components/mobile-date-input";
import { TransactionEntryForm } from "@/components/transaction-entry-form";
import { TransactionCategorySelect } from "@/components/transaction-category-select";
import { TransactionList } from "@/components/transaction-list";
import { Card, CardContent } from "@/components/ui/card";
import { minorToMajorInput } from "@/features/accounts/money";
import { updateTransactionAction } from "@/features/transactions/actions";
import { isTransactionType } from "@/features/transactions/constants";
import { currencyDigits, filterTransactions, loadLedger, monthTotals, currentMonthKey, quickTransactionSuggestions, transactionEntry, type LedgerCurrency, type TransactionView } from "@/features/transactions/data";
import { loadLoans, loanProjections } from "@/features/loans/data";
import { loadCreditCards, projectCreditCards } from "@/features/credit-cards/data";
import { requireUser } from "@/lib/auth";
import { formatMinorMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Giao dịch" };

type SearchParams = Promise<{ new?: string; edit?: string; q?: string; type?: string; account?: string; category?: string; from?: string; to?: string; error?: string; message?: string }>;

function EditTransactionForm({ transaction, accounts, categories, currencies }: {
  transaction: TransactionView;
  accounts: Array<{ id: string; name: string; currency_code: string; institution_name: string | null; decimal_digits?: number }>;
  categories: Array<{ id: string; name: string; icon_name: string; icon_color: string | null; parent_id: string | null }>;
  currencies: LedgerCurrency[];
}) {
  if (transaction.transaction_type !== "income" && transaction.transaction_type !== "expense") return null;
  const type = transaction.transaction_type as "income" | "expense";
  const entry = transactionEntry(transaction, type);
  if (!entry) return null;
  const digits = currencyDigits(currencies, entry.currency_code);
  return <Card className="mt-5 border-sky-500/25 shadow-xl shadow-black/5"><CardContent className="p-5 sm:p-6">
    <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-sky-600">Edit transaction</p><h2 className="mt-1 text-lg font-black">Sửa {type === "income" ? "khoản thu" : "khoản chi"}</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Finzaro sẽ hoàn nguyên ledger cũ rồi áp dụng giá trị mới trong một database transaction.</p></div><Link href="/transactions" className="grid size-9 place-items-center rounded-xl border border-[var(--border)]"><X className="size-4" /></Link></div>
    <form action={updateTransactionAction} className="mt-5 grid min-w-0 gap-4 md:grid-cols-2">
      <input type="hidden" name="transaction_id" value={transaction.id} />
      <label className="md:col-span-2"><span className="field-label">Nội dung</span><input name="title" required maxLength={140} defaultValue={transaction.title} className="fin-input" /></label>
      <label><span className="field-label">Tài khoản</span><select name="account_id" required defaultValue={entry.account_id} className="fin-input">{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currency_code}</option>)}</select></label>
      <label><span className="field-label">Số tiền</span><MoneyCalculatorInput name="amount" defaultValue={minorToMajorInput(Math.abs(entry.amount_minor), digits)} decimalDigits={digits} currencyCode={entry.currency_code} required /></label>
      <label><span className="field-label">Danh mục</span><TransactionCategorySelect categories={categories} defaultValue={transaction.category_id} /></label>
      <label><span className="field-label">Ngày giao dịch</span><MobileDateInput name="transaction_date" defaultValue={transaction.transaction_date} ariaLabel="Ngày giao dịch" /></label>
      <label className="md:col-span-2"><span className="field-label">Ghi chú</span><textarea name="notes" rows={3} maxLength={500} defaultValue={transaction.notes ?? ""} className="fin-textarea" /></label>
      <div className="flex justify-end gap-2 md:col-span-2"><Link href="/transactions" className="fin-secondary-btn">Hủy</Link><PendingSubmitButton idleLabel="Cập nhật giao dịch" pendingLabel="Đang cập nhật..." className="fin-primary-btn" /></div>
    </form>
  </CardContent></Card>;
}

export default async function TransactionsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { supabase, userId } = await requireUser();
  const { data: preferences } = await supabase.from("user_preferences").select("currency_code, timezone").eq("id", userId).maybeSingle();
  const defaultCurrency = preferences?.currency_code ?? "VND";
  const timeZone = preferences?.timezone ?? "Asia/Ho_Chi_Minh";
  const ledger = await loadLedger(supabase, userId, { limit: 500 });
  const activeAccounts = ledger.accounts.filter((account) => !account.is_archived).map((account) => ({
    ...account,
    decimal_digits: currencyDigits(ledger.currencies, account.currency_code)
  }));
  const incomeCategories = ledger.categories.filter((category) => category.category_type === "income" && !category.is_archived);
  const expenseCategories = ledger.categories.filter((category) => category.category_type === "expense" && !category.is_archived);
  const filterCategories = ledger.categories.filter((category) => !category.is_archived);
  const today = (() => {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const value = (kind: string) => parts.find((part) => part.type === kind)?.value ?? "";
    return `${value("year")}-${value("month")}-${value("day")}`;
  })();
  const expenseSuggestions = quickTransactionSuggestions(ledger.transactions, ledger.currencies, "expense");
  const incomeSuggestions = quickTransactionSuggestions(ledger.transactions, ledger.currencies, "income");
  const transferSuggestions = quickTransactionSuggestions(ledger.transactions, ledger.currencies, "transfer");
  const [loanData, creditData] = await Promise.all([loadLoans(supabase, userId, false), loadCreditCards(supabase, userId, false)]);
  const loanRows = loanProjections(loanData.loans, loanData.payments, loanData.accounts, today).filter((loan) => !loan.is_archived && loan.remaining_principal_minor > 0);
  const cardRows = projectCreditCards(creditData.cards, creditData.statements, creditData.payments, creditData.accounts, today).filter((card) => !card.is_archived && card.current_balance_minor > 0);
  const creditCardOptions = cardRows.map((card) => { const cardDigits = currencyDigits(ledger.currencies, card.currency_code); return { id: card.id, name: card.name, bank_name: card.bank_name, last4: card.last4, currency_code: card.currency_code, current_balance_minor: card.current_balance_minor, balance_label: formatMinorMoney(card.current_balance_minor, card.currency_code, cardDigits) }; });
  const loanOptions = loanRows.map((loan) => {
    const loanDigits = currencyDigits(ledger.currencies, loan.currency_code);
    const next = loan.schedule.find((row) => row.remaining_minor < loan.remaining_principal_minor) ?? loan.schedule[0] ?? null;
    const principal = Math.min(loan.remaining_principal_minor, next?.principal_minor ?? loan.remaining_principal_minor);
    const interest = next?.interest_minor ?? 0;
    const fee = 0;
    const toMajor = (minor: number) => minorToMajorInput(minor, loanDigits);
    return { id: loan.id, name: loan.name, lender_name: loan.lender_name, currency_code: loan.currency_code, remaining_principal_minor: loan.remaining_principal_minor, remaining_label: formatMinorMoney(loan.remaining_principal_minor, loan.currency_code, loanDigits), suggested_total: toMajor(principal + interest + fee), suggested_principal: toMajor(principal), suggested_interest: toMajor(interest), suggested_fee: toMajor(fee) };
  });
  const newType = params.new && isTransactionType(params.new) ? params.new : null;
  const editing = params.edit ? ledger.transactions.find((tx) => tx.id === params.edit && (tx.transaction_type === "income" || tx.transaction_type === "expense")) ?? null : null;
  const filtered = filterTransactions(ledger.transactions, { q: params.q, type: params.type, account: params.account, category: params.category, from: params.from, to: params.to });
  const digits = currencyDigits(ledger.currencies, defaultCurrency);
  const totals = monthTotals(ledger.transactions, defaultCurrency, currentMonthKey(timeZone));

  return <div className="mx-auto max-w-[1500px] min-w-0 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-[var(--primary)]">Money · Ledger</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Giao dịch</h1><p className="mt-2 max-w-3xl text-sm text-[var(--muted-foreground)]">Thu tiền, Chi tiền (kể cả trả thẻ/khoản vay) và Chuyển tiền giữa tài khoản với liên kết Goal tự động.</p></div><InstantTransactionLauncher initialType={newType} expense={<TransactionEntryForm type="expense" accounts={activeAccounts} categories={expenseCategories} today={today} suggestions={expenseSuggestions} creditCards={creditCardOptions} loans={loanOptions} />} income={<TransactionEntryForm type="income" accounts={activeAccounts} categories={incomeCategories} today={today} suggestions={incomeSuggestions} />} transfer={<TransactionEntryForm type="transfer" accounts={activeAccounts} categories={[]} today={today} suggestions={transferSuggestions} />} /></div>
    <AuthMessage error={params.error} message={params.message} />
    {editing && <EditTransactionForm transaction={editing} accounts={activeAccounts} categories={editing.transaction_type === "income" ? incomeCategories : expenseCategories} currencies={ledger.currencies} />}

    <div className="mt-5 grid gap-3 sm:grid-cols-3"><Card className="fin-card"><CardContent className="p-4"><p className="fin-stat-label mt-0">Thu nhập tháng · {defaultCurrency}</p><p className="mt-2 text-xl font-black text-emerald-600">{formatMinorMoney(totals.income, defaultCurrency, digits)}</p></CardContent></Card><Card className="fin-card"><CardContent className="p-4"><p className="fin-stat-label mt-0">Chi tiêu tháng · {defaultCurrency}</p><p className="mt-2 text-xl font-black">{formatMinorMoney(totals.expense, defaultCurrency, digits)}</p></CardContent></Card><Card className="fin-card"><CardContent className="p-4"><p className="fin-stat-label mt-0">Dòng tiền ròng · {defaultCurrency}</p><p className={`mt-2 text-xl font-black ${totals.net >= 0 ? "text-emerald-600" : "text-rose-500"}`}>{formatMinorMoney(totals.net, defaultCurrency, digits)}</p></CardContent></Card></div>

    <form method="get" className="mt-4 grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm md:grid-cols-2 xl:grid-cols-[1.25fr_.65fr_.8fr_.8fr_.8fr_.8fr_auto]"><div className="relative"><Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" /><input name="q" defaultValue={params.q ?? ""} placeholder="Tìm nội dung, danh mục, tài khoản..." className="fin-input pl-10" /></div><select name="type" defaultValue={params.type ?? "all"} className="fin-input"><option value="all">Mọi loại</option><option value="income">Thu nhập</option><option value="expense">Chi tiêu</option><option value="transfer">Chuyển tiền</option></select><select name="account" defaultValue={params.account ?? "all"} className="fin-input"><option value="all">Mọi tài khoản</option>{ledger.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select><select name="category" defaultValue={params.category ?? "all"} className="fin-input"><option value="all">Mọi danh mục</option>{filterCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><input type="date" name="from" defaultValue={params.from ?? ""} aria-label="Từ ngày" className="fin-input" /><input type="date" name="to" defaultValue={params.to ?? ""} aria-label="Đến ngày" className="fin-input" /><div className="flex gap-2"><button type="submit" className="fin-dark-btn"><Filter className="size-3.5" /> Lọc</button><Link href="/transactions" className="grid size-10 place-items-center rounded-xl border border-[var(--border)]"><X className="size-4" /></Link></div></form>

    <Card className="mt-4 fin-card"><CardContent className="p-5 sm:p-6"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-bold">Lịch sử giao dịch</h2><p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{filtered.length} / {ledger.transactions.length} giao dịch gần nhất</p></div><span className="fin-badge">Ledger + RLS</span></div><TransactionList transactions={filtered} currencies={ledger.currencies} showDelete showEdit /></CardContent></Card>
  </div>;
}
