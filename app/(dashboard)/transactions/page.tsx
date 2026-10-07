import Link from "next/link";
import { CalendarDays, Filter, Plus, Search, X } from "lucide-react";
import { AuthMessage } from "@/components/auth-message";
import { InstantTransactionLauncher } from "@/components/instant-transaction-launcher";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { TransactionCategorySelect } from "@/components/transaction-category-select";
import { TransactionList } from "@/components/transaction-list";
import { Card, CardContent } from "@/components/ui/card";
import { minorToMajorInput } from "@/features/accounts/money";
import { createTransactionAction, updateTransactionAction } from "@/features/transactions/actions";
import { isTransactionType, TRANSACTION_TYPE_LABELS, type TransactionType } from "@/features/transactions/constants";
import { currencyDigits, filterTransactions, loadLedger, monthTotals, currentMonthKey, transactionEntry, type LedgerCurrency, type TransactionView } from "@/features/transactions/data";
import { requireUser } from "@/lib/auth";
import { formatMinorMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Giao dịch" };

type SearchParams = Promise<{ new?: string; edit?: string; q?: string; type?: string; account?: string; category?: string; from?: string; to?: string; error?: string; message?: string }>;

function todayInTimeZone(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function TransactionForm({ type, accounts, categories, timeZone }: {
  type: TransactionType;
  accounts: Array<{ id: string; name: string; currency_code: string; institution_name: string | null }>;
  categories: Array<{ id: string; name: string; icon_name: string; icon_color: string | null; parent_id: string | null }>;
  timeZone: string;
}) {
  const isTransfer = type === "transfer";
  return <Card className="border-emerald-500/25 shadow-xl shadow-black/5"><CardContent className="p-5 sm:p-6">
    <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--primary)]">New transaction</p><h2 className="mt-1 text-lg font-black">{TRANSACTION_TYPE_LABELS[type]}</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Ledger và số dư được cập nhật atomic trong PostgreSQL.</p></div><button type="button" data-instant-close aria-label="Đóng" className="grid size-9 shrink-0 place-items-center rounded-xl border border-[var(--border)]"><X className="size-4" /></button></div>
    {accounts.length === 0 ? <div className="mt-5 rounded-xl border border-dashed border-[var(--border)] p-5 text-center"><p className="text-sm font-bold">Cần ít nhất một tài khoản đang hoạt động</p><Link href="/accounts?new=1" className="mt-3 fin-primary-btn">Tạo tài khoản</Link></div> : !isTransfer && categories.length === 0 ? <div className="mt-5 rounded-xl border border-dashed border-[var(--border)] p-5 text-center"><p className="text-sm font-bold">Chưa có danh mục phù hợp</p><Link href={`/categories?new=${type}`} className="mt-3 fin-primary-btn"><Plus className="size-3.5" /> Tạo danh mục</Link></div> : <form action={createTransactionAction} className="mt-5 grid min-w-0 gap-4 md:grid-cols-2">
      <input type="hidden" name="transaction_type" value={type} />
      <label className="md:col-span-2"><span className="field-label">Nội dung</span><input name="title" required maxLength={140} placeholder={type === "income" ? "VD: Lương tháng 10" : type === "expense" ? "VD: Siêu thị cuối tuần" : "VD: Chuyển quỹ dự phòng"} className="fin-input" /></label>
      {(type === "expense" || type === "transfer") && <label><span className="field-label">Tài khoản nguồn</span><select name="from_account_id" required className="fin-input"><option value="">Chọn tài khoản</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currency_code}</option>)}</select></label>}
      {(type === "income" || type === "transfer") && <label><span className="field-label">{type === "income" ? "Tài khoản nhận" : "Tài khoản đích"}</span><select name="to_account_id" required className="fin-input"><option value="">Chọn tài khoản</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currency_code}</option>)}</select></label>}
      {(type === "expense" || type === "transfer") && <label><span className="field-label">{type === "transfer" ? "Số tiền gửi" : "Số tiền"}</span><input name="from_amount" inputMode="decimal" required placeholder="0" className="fin-input" /></label>}
      {(type === "income" || type === "transfer") && <label><span className="field-label">{type === "transfer" ? "Số tiền nhận" : "Số tiền"}</span><input name="to_amount" inputMode="decimal" required={type === "income"} placeholder={type === "transfer" ? "Để trống nếu cùng tiền tệ" : "0"} className="fin-input" />{isTransfer && <span className="mt-1 block text-[11px] text-[var(--muted-foreground)]">Khác tiền tệ: nhập số tiền thực nhận.</span>}</label>}
      {!isTransfer && <label><span className="field-label flex items-center justify-between"><span>Danh mục</span><Link href="/categories" className="normal-case tracking-normal text-[var(--primary)]">Quản lý</Link></span><TransactionCategorySelect categories={categories} /></label>}
      <label><span className="field-label">Ngày giao dịch</span><div className="relative"><CalendarDays className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" /><input type="date" name="transaction_date" required defaultValue={todayInTimeZone(timeZone)} className="fin-input pl-10" /></div></label>
      <label className="md:col-span-2"><span className="field-label">Ghi chú</span><textarea name="notes" maxLength={500} rows={3} className="fin-textarea" placeholder="Thông tin thêm..." /></label>
      <div className="flex justify-end gap-2 md:col-span-2"><button type="button" data-instant-close className="fin-secondary-btn">Hủy</button><PendingSubmitButton idleLabel="Lưu giao dịch" pendingLabel="Đang lưu giao dịch..." className="fin-primary-btn" /></div>
    </form>}
  </CardContent></Card>;
}

function EditTransactionForm({ transaction, accounts, categories, currencies }: {
  transaction: TransactionView;
  accounts: Array<{ id: string; name: string; currency_code: string; institution_name: string | null }>;
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
      <label><span className="field-label">Số tiền</span><input name="amount" inputMode="decimal" required defaultValue={minorToMajorInput(Math.abs(entry.amount_minor), digits)} className="fin-input" /></label>
      <label><span className="field-label">Danh mục</span><TransactionCategorySelect categories={categories} defaultValue={transaction.category_id} /></label>
      <label><span className="field-label">Ngày giao dịch</span><input name="transaction_date" type="date" required defaultValue={transaction.transaction_date} className="fin-input" /></label>
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
  const activeAccounts = ledger.accounts.filter((account) => !account.is_archived);
  const incomeCategories = ledger.categories.filter((category) => category.category_type === "income" && !category.is_archived);
  const expenseCategories = ledger.categories.filter((category) => category.category_type === "expense" && !category.is_archived);
  const filterCategories = ledger.categories.filter((category) => !category.is_archived);
  const newType = params.new && isTransactionType(params.new) ? params.new : null;
  const editing = params.edit ? ledger.transactions.find((tx) => tx.id === params.edit && (tx.transaction_type === "income" || tx.transaction_type === "expense")) ?? null : null;
  const filtered = filterTransactions(ledger.transactions, { q: params.q, type: params.type, account: params.account, category: params.category, from: params.from, to: params.to });
  const digits = currencyDigits(ledger.currencies, defaultCurrency);
  const totals = monthTotals(ledger.transactions, defaultCurrency, currentMonthKey(timeZone));

  return <div className="mx-auto max-w-[1500px] min-w-0 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-[var(--primary)]">Money · Ledger</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Giao dịch</h1><p className="mt-2 max-w-3xl text-sm text-[var(--muted-foreground)]">Thu nhập, chi tiêu, chuyển tiền và chỉnh sửa các khoản thu/chi đã nhập với số dư được tái tính atomic.</p></div><InstantTransactionLauncher initialType={newType} expense={<TransactionForm type="expense" accounts={activeAccounts} categories={expenseCategories} timeZone={timeZone} />} income={<TransactionForm type="income" accounts={activeAccounts} categories={incomeCategories} timeZone={timeZone} />} transfer={<TransactionForm type="transfer" accounts={activeAccounts} categories={[]} timeZone={timeZone} />} /></div>
    <AuthMessage error={params.error} message={params.message} />
    {editing && <EditTransactionForm transaction={editing} accounts={activeAccounts} categories={editing.transaction_type === "income" ? incomeCategories : expenseCategories} currencies={ledger.currencies} />}

    <div className="mt-5 grid gap-3 sm:grid-cols-3"><Card className="fin-card"><CardContent className="p-4"><p className="fin-stat-label mt-0">Thu nhập tháng · {defaultCurrency}</p><p className="mt-2 text-xl font-black text-emerald-600">{formatMinorMoney(totals.income, defaultCurrency, digits)}</p></CardContent></Card><Card className="fin-card"><CardContent className="p-4"><p className="fin-stat-label mt-0">Chi tiêu tháng · {defaultCurrency}</p><p className="mt-2 text-xl font-black">{formatMinorMoney(totals.expense, defaultCurrency, digits)}</p></CardContent></Card><Card className="fin-card"><CardContent className="p-4"><p className="fin-stat-label mt-0">Dòng tiền ròng · {defaultCurrency}</p><p className={`mt-2 text-xl font-black ${totals.net >= 0 ? "text-emerald-600" : "text-rose-500"}`}>{formatMinorMoney(totals.net, defaultCurrency, digits)}</p></CardContent></Card></div>

    <form method="get" className="mt-4 grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm md:grid-cols-2 xl:grid-cols-[1.25fr_.65fr_.8fr_.8fr_.8fr_.8fr_auto]"><div className="relative"><Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" /><input name="q" defaultValue={params.q ?? ""} placeholder="Tìm nội dung, danh mục, tài khoản..." className="fin-input pl-10" /></div><select name="type" defaultValue={params.type ?? "all"} className="fin-input"><option value="all">Mọi loại</option><option value="income">Thu nhập</option><option value="expense">Chi tiêu</option><option value="transfer">Chuyển tiền</option></select><select name="account" defaultValue={params.account ?? "all"} className="fin-input"><option value="all">Mọi tài khoản</option>{ledger.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select><select name="category" defaultValue={params.category ?? "all"} className="fin-input"><option value="all">Mọi danh mục</option>{filterCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><input type="date" name="from" defaultValue={params.from ?? ""} aria-label="Từ ngày" className="fin-input" /><input type="date" name="to" defaultValue={params.to ?? ""} aria-label="Đến ngày" className="fin-input" /><div className="flex gap-2"><button type="submit" className="fin-dark-btn"><Filter className="size-3.5" /> Lọc</button><Link href="/transactions" className="grid size-10 place-items-center rounded-xl border border-[var(--border)]"><X className="size-4" /></Link></div></form>

    <Card className="mt-4 fin-card"><CardContent className="p-5 sm:p-6"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-bold">Lịch sử giao dịch</h2><p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{filtered.length} / {ledger.transactions.length} giao dịch gần nhất</p></div><span className="fin-badge">Ledger + RLS</span></div><TransactionList transactions={filtered} currencies={ledger.currencies} showDelete showEdit /></CardContent></Card>
  </div>;
}
