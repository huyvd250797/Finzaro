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
import type { CategoryType } from "@/features/categories/constants";
import { currencyDigits, filterTransactions, loadLedger, monthTotals, currentMonthKey, quickTransactionSuggestions, transactionEntry, type LedgerCurrency, type TransactionView } from "@/features/transactions/data";
import { requireUser } from "@/lib/auth";
import { formatMinorMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Giao dịch" };

type SearchParams = Promise<{ legacy?: string; new?: string; edit?: string; date?: string; return_to?: string; q?: string; type?: string; account?: string; category?: string; from?: string; to?: string; error?: string; message?: string }>;

function EditTransactionForm({ transaction, accounts, categories, currencies, returnTo }: {
  transaction: TransactionView;
  accounts: Array<{ id: string; name: string; currency_code: string; institution_name: string | null; decimal_digits?: number }>;
  categories: Array<{ id: string; name: string; icon_name: string; icon_color: string | null; parent_id: string | null; category_type: CategoryType; sort_order: number }>;
  currencies: LedgerCurrency[];
  returnTo?: string;
}) {
  if (transaction.transaction_type !== "income" && transaction.transaction_type !== "expense") return null;
  const type = transaction.transaction_type as "income" | "expense";
  const entry = transactionEntry(transaction, type);
  if (!entry) return null;
  const digits = currencyDigits(currencies, entry.currency_code);
  return <Card className="mt-5 border-sky-500/25 shadow-xl shadow-black/5"><CardContent className="p-5 sm:p-6">
    <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-sky-600">Edit transaction</p><h2 className="mt-1 text-lg font-black">Sửa {type === "income" ? "khoản thu" : "khoản chi"}</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Finzaro sẽ hoàn nguyên ledger cũ rồi áp dụng giá trị mới trong một database transaction.</p></div><Link href={returnTo || "/transactions"} className="grid size-9 place-items-center rounded-xl border border-[var(--border)]"><X className="size-4" /></Link></div>
    <form action={updateTransactionAction} className="mt-5 grid min-w-0 gap-4 md:grid-cols-2">
      <input type="hidden" name="transaction_id" value={transaction.id} />
      <input type="hidden" name="return_to" value={returnTo ?? ""} />
      <label className="md:col-span-2"><span className="field-label">Nội dung</span><input name="title" required maxLength={140} defaultValue={transaction.title} className="fin-input" /></label>
      <label><span className="field-label">Tài khoản</span><select name="account_id" required defaultValue={entry.account_id} className="fin-input">{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currency_code}</option>)}</select></label>
      <label><span className="field-label">Số tiền</span><MoneyCalculatorInput name="amount" defaultValue={minorToMajorInput(Math.abs(entry.amount_minor), digits)} decimalDigits={digits} currencyCode={entry.currency_code} required /></label>
      <label className="md:col-span-2"><span className="field-label">Danh mục</span><TransactionCategorySelect categories={categories} defaultValue={transaction.category_id} /></label>
      <label><span className="field-label">Ngày giao dịch</span><MobileDateInput name="transaction_date" defaultValue={transaction.transaction_date} ariaLabel="Ngày giao dịch" /></label>
      <label className="md:col-span-2"><span className="field-label">Ghi chú</span><textarea name="notes" rows={3} maxLength={500} defaultValue={transaction.notes ?? ""} className="fin-textarea" /></label>
      <div className="flex justify-end gap-2 md:col-span-2"><Link href={returnTo || "/transactions"} className="fin-secondary-btn">Hủy</Link><PendingSubmitButton idleLabel="Cập nhật giao dịch" pendingLabel="Đang cập nhật..." className="fin-primary-btn" /></div>
    </form>
  </CardContent></Card>;
}

export default async function TransactionsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { supabase, userId } = await requireUser();
  const [{ data: preferences }, ledger] = await Promise.all([
    supabase.from("user_preferences").select("currency_code, timezone").eq("id", userId).maybeSingle(),
    loadLedger(supabase, userId, params.edit && params.date ? { limit: 120, fromDate: params.date, toDate: params.date } : params.return_to?.startsWith("/reports/calendar") ? { limit: 180 } : { limit: 500 })
  ]);
  const defaultCurrency = preferences?.currency_code ?? "VND";
  const timeZone = preferences?.timezone ?? "Asia/Ho_Chi_Minh";
  const activeAccounts = ledger.accounts.filter((account) => !account.is_archived && ["bank", "cash", "ewallet"].includes(account.account_type)).map((account) => ({
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
  const requestedDate = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : today;
  const returnTo = params.return_to && params.return_to.startsWith("/") && !params.return_to.startsWith("//") ? params.return_to : "";
  const expenseSuggestions = quickTransactionSuggestions(ledger.transactions, ledger.currencies, "expense");
  const incomeSuggestions = quickTransactionSuggestions(ledger.transactions, ledger.currencies, "income");
  const validTransferRows = ledger.transactions.filter((tx) => tx.transaction_type === "transfer" && tx.transaction_purpose === "transfer" && tx.entries.some(e => e.entry_role === "transfer_in") && tx.entries.some(e => e.entry_role === "transfer_out"));
  const transferSuggestions = quickTransactionSuggestions(validTransferRows.filter(tx => tx.entries.every(e => ["cash", "bank", "ewallet"].includes(e.account?.account_type ?? ""))), ledger.currencies, "transfer");
  const newType = params.new && isTransactionType(params.new) ? params.new : null;
  const editing = params.edit ? ledger.transactions.find((tx) => tx.id === params.edit && tx.transaction_purpose === "standard" && (tx.transaction_type === "income" || tx.transaction_type === "expense")) ?? null : null;
  const visible = params.legacy === "1"
    ? ledger.transactions.filter(tx => tx.transaction_purpose !== "standard" && tx.transaction_type !== "transfer")
    : ledger.transactions.filter(tx => tx.transaction_purpose === "standard" || (tx.transaction_type === "transfer" && tx.entries.some(e=>e.entry_role === "transfer_in") && tx.entries.some(e=>e.entry_role === "transfer_out")));
  const filtered = filterTransactions(visible, { q: params.q, type: params.type, account: params.account, category: params.category, from: params.from, to: params.to });
  const transferIds = filtered.filter(tx => tx.transaction_type === "transfer").map(tx => tx.id).slice(0, 500);
  const { data: simpleTransferRows } = transferIds.length > 0
    ? await (supabase as any).from("simple_transaction_ids_v120").select("transaction_id").eq("user_id", userId).in("transaction_id", transferIds)
    : { data: [] };
  const deletableTransferIds: string[] = (simpleTransferRows ?? []).map((row: { transaction_id: string })=>row.transaction_id);
  const digits = currencyDigits(ledger.currencies, defaultCurrency);
  const totals = monthTotals(ledger.transactions, defaultCurrency, currentMonthKey(timeZone));

  return <div className="mx-auto max-w-[1500px] min-w-0 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-[var(--primary)]">Money · Ledger</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Giao dịch</h1><p className="mt-2 max-w-3xl text-sm text-[var(--muted-foreground)]">Chỉ ghi nhận thu nhập, chi tiêu và chuyển tiền giữa tài khoản/ví. Không quản lý khoản vay, thẻ tín dụng hay tiền gửi.</p></div><InstantTransactionLauncher initialType={newType} expense={<TransactionEntryForm type="expense" accounts={activeAccounts} categories={expenseCategories} today={requestedDate} returnTo={returnTo} suggestions={expenseSuggestions} />} income={<TransactionEntryForm type="income" accounts={activeAccounts} categories={incomeCategories} today={requestedDate} returnTo={returnTo} suggestions={incomeSuggestions} />} transfer={<TransactionEntryForm type="transfer" accounts={activeAccounts} categories={[]} today={requestedDate} returnTo={returnTo} suggestions={transferSuggestions} />} /></div>
    <AuthMessage error={params.error} message={params.message} />
    {editing && <EditTransactionForm transaction={editing} accounts={activeAccounts} categories={editing.transaction_type === "income" ? incomeCategories : expenseCategories} currencies={ledger.currencies} returnTo={returnTo} />}

    <div className="mt-5 grid gap-3 sm:grid-cols-3"><Card className="fin-card"><CardContent className="p-4"><p className="fin-stat-label mt-0">Thu nhập tháng · {defaultCurrency}</p><p className="mt-2 text-xl font-black text-emerald-600">{formatMinorMoney(totals.income, defaultCurrency, digits)}</p></CardContent></Card><Card className="fin-card"><CardContent className="p-4"><p className="fin-stat-label mt-0">Chi tiêu tháng · {defaultCurrency}</p><p className="mt-2 text-xl font-black">{formatMinorMoney(totals.expense, defaultCurrency, digits)}</p></CardContent></Card><Card className="fin-card"><CardContent className="p-4"><p className="fin-stat-label mt-0">Dòng tiền ròng · {defaultCurrency}</p><p className={`mt-2 text-xl font-black ${totals.net >= 0 ? "text-emerald-600" : "text-rose-500"}`}>{formatMinorMoney(totals.net, defaultCurrency, digits)}</p></CardContent></Card></div>

    <form method="get" className="mt-4 grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm md:grid-cols-2 xl:grid-cols-[1.25fr_.65fr_.8fr_.8fr_.8fr_.8fr_auto]"><div className="relative"><Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" /><input name="q" defaultValue={params.q ?? ""} placeholder="Tìm nội dung, danh mục, tài khoản..." className="fin-input pl-10" /></div><select name="type" defaultValue={params.type ?? "all"} className="fin-input"><option value="all">Mọi loại</option><option value="income">Thu nhập</option><option value="expense">Chi tiêu</option><option value="transfer">Chuyển tiền</option></select><select name="account" defaultValue={params.account ?? "all"} className="fin-input"><option value="all">Mọi tài khoản</option>{ledger.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select><select name="category" defaultValue={params.category ?? "all"} className="fin-input"><option value="all">Mọi danh mục</option>{filterCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><input type="date" name="from" defaultValue={params.from ?? ""} aria-label="Từ ngày" className="fin-input" /><input type="date" name="to" defaultValue={params.to ?? ""} aria-label="Đến ngày" className="fin-input" /><div className="flex gap-2"><button type="submit" className="fin-dark-btn"><Filter className="size-3.5" /> Lọc</button><Link href="/transactions" className="grid size-10 place-items-center rounded-xl border border-[var(--border)]"><X className="size-4" /></Link></div></form>

    <Card className="mt-4 fin-card"><CardContent className="p-5 sm:p-6"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-bold">{params.legacy === "1" ? "Giao dịch phiên bản cũ" : "Lịch sử thu chi"}</h2><p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{filtered.length} giao dịch</p></div><Link className="text-xs font-bold text-[var(--primary)]" href={params.legacy === "1" ? "/transactions" : "/transactions?legacy=1"}>{params.legacy === "1" ? "Về Thu Chi" : "Lịch sử cũ"}</Link></div><TransactionList transactions={filtered} currencies={ledger.currencies} showDelete={params.legacy !== "1"} showEdit={params.legacy !== "1"} deletableTransferIds={deletableTransferIds} /></CardContent></Card>
  </div>;
}
