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
import { TransactionCopyPanel } from "@/components/transaction-copy-panel";
import { InstantCopyOverlay } from "@/components/instant-copy-overlay";
import { Card, CardContent } from "@/components/ui/card";
import { minorToMajorInput } from "@/features/accounts/money";
import { updateTransactionAction } from "@/features/transactions/actions";
import { isTransactionType } from "@/features/transactions/constants";
import type { CategoryType } from "@/features/categories/constants";
import { currencyDigits, filterTransactions, loadLedger, quickTransactionSuggestions, transactionEntry, type LedgerCurrency, type TransactionView } from "@/features/transactions/data";
import { requireUser } from "@/lib/auth";


export const dynamic = "force-dynamic";
export const metadata = { title: "Giao dịch" };

type SearchParams = Promise<{ page?: string; search?: string; legacy?: string; new?: string; edit?: string; copy?: string; date?: string; return_to?: string; q?: string; type?: string; account?: string; category?: string; from?: string; to?: string; error?: string; message?: string }>;

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
    <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-sky-600">Chỉnh sửa giao dịch</p><h2 className="mt-1 text-lg font-black">Sửa {type === "income" ? "khoản thu" : "khoản chi"}</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Finzaro sẽ hoàn nguyên ledger cũ rồi áp dụng giá trị mới trong một database transaction.</p></div><Link href={returnTo || "/transactions"} className="grid size-9 place-items-center rounded-xl border border-[var(--border)]"><X className="size-4" /></Link></div>
    <form action={updateTransactionAction} className="mt-5 grid min-w-0 gap-4 md:grid-cols-2">
      <input type="hidden" name="transaction_id" value={transaction.id} />
      <input type="hidden" name="return_to" value={returnTo ?? ""} />
      <div className="fin-amount-field md:col-span-2"><span className="fin-amount-label">Số tiền</span><MoneyCalculatorInput name="amount" defaultValue={minorToMajorInput(Math.abs(entry.amount_minor), digits)} decimalDigits={digits} currencyCode={entry.currency_code} required className="fin-amount-input" /></div>
      <label className="md:col-span-2"><span className="field-label">Nội dung</span><input name="title" required maxLength={140} defaultValue={transaction.title} className="fin-input" /></label>
      <label><span className="field-label">Tài khoản</span><select name="account_id" required defaultValue={entry.account_id} className="fin-input">{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currency_code}</option>)}</select></label>
      <label className="md:col-span-2"><span className="field-label">Danh mục</span><TransactionCategorySelect categories={categories} defaultValue={transaction.category_id} /></label>
      <label><span className="field-label">Ngày giao dịch</span><MobileDateInput name="transaction_date" defaultValue={transaction.transaction_date} ariaLabel="Ngày giao dịch" /></label>
      <label className="md:col-span-2"><span className="field-label">Ghi chú</span><textarea name="notes" rows={3} maxLength={500} defaultValue={transaction.notes ?? ""} className="fin-textarea" /></label>
      <div className="flex justify-end gap-2 md:col-span-2"><Link href={returnTo || "/transactions"} className="fin-secondary-btn">Hủy</Link><PendingSubmitButton idleLabel="Cập nhật giao dịch" pendingLabel="Đang cập nhật..." className="fin-primary-btn" /></div>
    </form>
  </CardContent></Card>;
}

export default async function TransactionsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const pageSize = 80;
  const historyPage = Math.min(13, Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1));
  const displayLimit = historyPage * pageSize;
  const hasComplexFilter = Boolean(params.q || params.account || params.legacy === "1" || params.category === "uncategorized");
  // One extra record lets us determine whether a next page exists without
  // eagerly hydrating and rendering hundreds of transaction cards.
  const lookupLimit = hasComplexFilter ? 1000 : Math.min(1000, Math.max(160, displayLimit + 1));
  const { supabase, userId } = await requireUser();
  // Deep-link/no-JavaScript fallback: retrieve only one source record, never the full ledger.
  // Normal Copy clicks are intercepted by InstantCopyOverlay and require zero navigation.
  if (params.copy) {
    const sourceId = params.copy;
    const source = /^[0-9a-f-]{36}$/i.test(sourceId)
      ? (await supabase.from("transactions")
        .select("id, title, transaction_date, transaction_type, transaction_purpose")
        .eq("user_id", userId).eq("id", sourceId).maybeSingle()).data
      : null;
    const eligible = source && ["income", "expense", "transfer"].includes(source.transaction_type)
      && source.transaction_purpose === (source.transaction_type === "transfer" ? "transfer" : "standard");
    return <div className="fin-page-shell mx-auto max-w-3xl px-4 py-6">
      <Link href="/transactions" className="text-sm font-semibold text-[var(--primary)]">← Lịch sử giao dịch</Link>
      {eligible ? <TransactionCopyPanel sourceId={source.id} sourceTitle={source.title} sourceDate={source.transaction_date} type={source.transaction_type} /> : <p role="alert" className="fin-inline-error mt-4">Không tìm thấy giao dịch hợp lệ để sao chép.</p>}
    </div>;
  }
  const newType = params.new && isTransactionType(params.new) ? params.new : null;
  const quickFormOnly = Boolean(newType && !params.edit && !params.copy);
  // Editing a historic record must not depend on it being in the latest 500 rows.
  const selectedId = params.edit;
  const editDate = selectedId
    ? (await supabase.from("transactions").select("transaction_date").eq("id", selectedId).eq("user_id", userId).maybeSingle()).data?.transaction_date
    : null;
  const ledgerOptions = quickFormOnly ? { limit: 24 }
    : editDate ? { fromDate: editDate, toDate: editDate, limit: 1000 }
    : { limit: lookupLimit, ...(params.from ? { fromDate: params.from } : {}), ...(params.to ? { toDate: params.to } : {}), ...(params.legacy === "1" ? {} : { type: params.type, categoryId: params.category }) };
  const [{ data: preferences }, ledger] = await Promise.all([
    supabase.from("user_preferences").select("currency_code, timezone").eq("id", userId).maybeSingle(),
    loadLedger(supabase, userId, ledgerOptions)
  ]);
  const timeZone = preferences?.timezone ?? "Asia/Ho_Chi_Minh";
  const activeAccounts = ledger.accounts.filter((account) => !account.is_archived && ["bank", "cash", "ewallet"].includes(account.account_type)).map((account) => ({
    ...account,
    decimal_digits: currencyDigits(ledger.currencies, account.currency_code)
  }));
  const incomeCategories = ledger.categories.filter((category) => category.category_type === "income" && !category.is_archived);
  const expenseCategories = ledger.categories.filter((category) => category.category_type === "expense" && !category.is_archived);
  const filterCategories = ledger.categories.filter((category) => !category.is_archived);
  const today = (() => {
    try {
      const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
      const value = (kind: string) => parts.find((part) => part.type === kind)?.value ?? "";
      return `${value("year")}-${value("month")}-${value("day")}`;
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  })();
  const requestedDate = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : today;
  const returnTo = params.return_to?.startsWith("/reports/calendar") && !params.return_to.startsWith("//") ? params.return_to : "";
  const expenseSuggestions = quickTransactionSuggestions(ledger.transactions, ledger.currencies, "expense");
  const incomeSuggestions = quickTransactionSuggestions(ledger.transactions, ledger.currencies, "income");
  const validTransferRows = ledger.transactions.filter((tx) => tx.transaction_type === "transfer" && tx.transaction_purpose === "transfer" && tx.entries.some(e => e.entry_role === "transfer_in") && tx.entries.some(e => e.entry_role === "transfer_out"));
  const transferSuggestions = quickTransactionSuggestions(validTransferRows.filter(tx => tx.entries.every(e => ["cash", "bank", "ewallet"].includes(e.account?.account_type ?? ""))), ledger.currencies, "transfer");
  const editing = params.edit ? ledger.transactions.find((tx) => tx.id === params.edit && tx.transaction_purpose === "standard" && (tx.transaction_type === "income" || tx.transaction_type === "expense")) ?? null : null;
  const launcher = <InstantTransactionLauncher
    initialType={newType}
    expense={<TransactionEntryForm type="expense" accounts={activeAccounts} categories={expenseCategories} today={requestedDate} returnTo={returnTo} suggestions={expenseSuggestions} />}
    income={<TransactionEntryForm type="income" accounts={activeAccounts} categories={incomeCategories} today={requestedDate} returnTo={returnTo} suggestions={incomeSuggestions} />}
    transfer={<TransactionEntryForm type="transfer" accounts={activeAccounts} categories={[]} today={requestedDate} returnTo={returnTo} suggestions={transferSuggestions} />}
  />;
  if (quickFormOnly) return <div className="fin-page-shell mx-auto max-w-3xl px-4 py-6">
    <Link href={returnTo || "/transactions"} className="text-sm font-semibold text-[var(--primary)]">← Lịch sử giao dịch</Link>
    <h1 className="mt-3 text-xl font-extrabold">Ghi nhận thu – chi</h1>
    <p className="mt-1 text-sm text-[var(--muted-foreground)]">Thu tiền, chi tiền hoặc chuyển giữa các tài khoản.</p>
    <div className="mt-4">{launcher}</div>
  </div>;

  const visible = params.legacy === "1"
    ? ledger.transactions.filter(tx => tx.transaction_purpose !== "standard" && tx.transaction_type !== "transfer")
    : ledger.transactions.filter(tx => tx.transaction_purpose === "standard" || (tx.transaction_type === "transfer" && tx.entries.some(e=>e.entry_role === "transfer_in") && tx.entries.some(e=>e.entry_role === "transfer_out")));
  const filtered = filterTransactions(visible, { q: params.q, type: params.type, account: params.account, category: params.category, from: params.from, to: params.to });
  const shownTransactions = filtered.slice(0, displayLimit);
  const isAtSearchCap = ledger.transactions.length >= 1000;
  const hasMoreHistory = historyPage < 13 && (filtered.length > displayLimit || (ledger.transactions.length >= lookupLimit && lookupLimit < 1000));
  const nextPageQuery = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key !== "page" && typeof value === "string" && value) nextPageQuery.set(key, value);
  }
  nextPageQuery.set("page", String(historyPage + 1));
  const transferIds = shownTransactions.filter(tx => tx.transaction_type === "transfer").map(tx => tx.id).slice(0, 500);
  const { data: simpleTransferRows } = transferIds.length > 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Historical dynamic Supabase table/RPC adapter; update generated DB types in a schema release.
    ? await (supabase as any).from("simple_transaction_ids_v120").select("transaction_id").eq("user_id", userId).in("transaction_id", transferIds)
    : { data: [] };
  const deletableTransferIds: string[] = (simpleTransferRows ?? []).map((row: { transaction_id: string })=>row.transaction_id);



  return <div className="fin-page-shell mx-auto max-w-[1500px] min-w-0 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold text-[var(--primary)]">Finzaro · Thu chi</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Giao dịch</h1><p className="mt-1 text-sm text-[var(--muted-foreground)]">Thu, Chi, Chuyển tiền · thao tác nhanh, số dư tự cập nhật.</p></div>{launcher}</div>
    <InstantCopyOverlay />
    <AuthMessage error={params.error} message={params.message} />
    {editing && <EditTransactionForm transaction={editing} accounts={activeAccounts} categories={editing.transaction_type === "income" ? incomeCategories : expenseCategories} currencies={ledger.currencies} returnTo={returnTo} />}


    <details open={params.search === "1" || Boolean(params.q || params.type || params.account || params.category || params.from || params.to)} className="fin-filter-panel mt-4"><summary className="flex min-h-11 cursor-pointer items-center gap-2 px-3 font-semibold text-sm"><Filter className="size-4 text-[var(--primary)]"/> Bộ lọc lịch sử <span className="ml-auto text-xs text-[var(--muted-foreground)]">Mở bộ lọc</span></summary><form method="get" className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-[1.25fr_.65fr_.8fr_.8fr_.8fr_.8fr_auto]"><div className="relative"><Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" /><input name="q" defaultValue={params.q ?? ""} placeholder="Tìm nội dung, danh mục, tài khoản..." className="fin-input pl-10" /></div><select name="type" defaultValue={params.type ?? "all"} className="fin-input"><option value="all">Mọi loại</option><option value="income">Thu nhập</option><option value="expense">Chi tiêu</option><option value="transfer">Chuyển tiền</option></select><select name="account" defaultValue={params.account ?? "all"} className="fin-input"><option value="all">Mọi tài khoản</option>{ledger.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select><select name="category" defaultValue={params.category ?? "all"} className="fin-input"><option value="all">Mọi danh mục</option><option value="uncategorized">Chưa phân loại</option>{filterCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><input type="date" name="from" defaultValue={params.from ?? ""} aria-label="Từ ngày" className="fin-input" /><input type="date" name="to" defaultValue={params.to ?? ""} aria-label="Đến ngày" className="fin-input" /><div className="flex gap-2"><button type="submit" className="fin-dark-btn"><Filter className="size-3.5" /> Lọc</button><Link href="/transactions" className="grid size-10 place-items-center rounded-xl border border-[var(--border)]"><X className="size-4" /></Link></div></form></details>

    <Card id="transaction-history" className="mt-4 fin-card"><CardContent className="p-5 sm:p-6"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-bold">{params.legacy === "1" ? "Giao dịch phiên bản cũ" : "Lịch sử thu chi · theo ngày"}</h2><p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{shownTransactions.length} giao dịch đang hiển thị trong {ledger.transactions.length} giao dịch đã tải</p></div><Link className="text-xs font-bold text-[var(--primary)]" href={params.legacy === "1" ? "/transactions" : "/transactions?legacy=1"}>{params.legacy === "1" ? "Về Thu Chi" : "Lịch sử cũ"}</Link></div><TransactionList transactions={shownTransactions} currencies={ledger.currencies} showDelete={params.legacy !== "1"} showEdit={params.legacy !== "1"} showCopy={params.legacy !== "1"} groupByDate deletableTransferIds={deletableTransferIds} />
      {hasMoreHistory && <div className="mt-5 flex justify-center border-t border-[var(--border)] pt-4"><Link href={`/transactions?${nextPageQuery.toString()}#transaction-history`} scroll={false} className="fin-secondary-btn" aria-label={`Xem thêm giao dịch, hiện có ${shownTransactions.length} giao dịch`}>Xem thêm giao dịch</Link></div>}
      {isAtSearchCap && <p className="mt-3 text-center text-xs text-[var(--muted-foreground)]">Danh sách chỉ tra cứu tối đa 1.000 giao dịch gần nhất. Dùng bộ lọc ngày hoặc xuất báo cáo để xem toàn bộ lịch sử trong kỳ.</p>}
    </CardContent></Card>
  </div>;
}
