import Link from "next/link";
import { CalendarDays, Filter, Plus, Search, Shapes, X } from "lucide-react";
import { AuthMessage } from "@/components/auth-message";
import { InstantTransactionLauncher } from "@/components/instant-transaction-launcher";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { TransactionCategorySelect } from "@/components/transaction-category-select";
import { TransactionList } from "@/components/transaction-list";
import { Card, CardContent } from "@/components/ui/card";
import { createTransactionAction } from "@/features/transactions/actions";
import { isTransactionType, TRANSACTION_TYPE_LABELS, type TransactionType } from "@/features/transactions/constants";
import { currencyDigits, filterTransactions, loadLedger, monthTotals, currentMonthKey } from "@/features/transactions/data";
import { requireUser } from "@/lib/auth";
import { formatMinorMoney } from "@/lib/utils";

export const metadata = { title: "Giao dịch" };

type SearchParams = Promise<{
  new?: string;
  q?: string;
  type?: string;
  account?: string;
  category?: string;
  from?: string;
  to?: string;
  error?: string;
  message?: string;
}>;

function todayInTimeZone(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function TransactionForm({
  type,
  accounts,
  categories,
  timeZone
}: {
  type: TransactionType;
  accounts: Array<{ id: string; name: string; currency_code: string; institution_name: string | null }>;
  categories: Array<{ id: string; name: string; icon_name: string; parent_id: string | null }>;
  timeZone: string;
}) {
  const isTransfer = type === "transfer";
  const canSubmit = accounts.length > 0 && (isTransfer || categories.length > 0);

  return (
    <Card className="mt-5 border-emerald-500/25">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--primary)]">New transaction</p>
            <h2 className="mt-1 text-lg font-black">{TRANSACTION_TYPE_LABELS[type]}</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">V0.0.5 dùng category có cấu trúc; ledger và số dư vẫn cập nhật atomic trong PostgreSQL.</p>
          </div>
          <button type="button" data-instant-close aria-label="Đóng form" className="grid size-9 place-items-center rounded-xl border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]"><X className="size-4" /></button>
        </div>


        {accounts.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-[var(--border)] p-5 text-center">
            <p className="text-sm font-bold">Cần ít nhất một tài khoản đang hoạt động</p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">Chuyển tiền cần ít nhất hai tài khoản khác nhau.</p>
            <Link href="/accounts?new=1" className="mt-3 inline-flex h-9 items-center rounded-xl bg-[var(--primary)] px-3 text-xs font-bold text-white">Tạo tài khoản</Link>
          </div>
        ) : !isTransfer && categories.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-[var(--border)] p-5 text-center">
            <p className="text-sm font-bold">Chưa có danh mục {type === "income" ? "thu nhập" : "chi tiêu"} hoạt động</p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">Category Engine yêu cầu chọn danh mục cho Income và Expense.</p>
            <Link href={`/categories?new=${type}`} className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--primary)] px-3 text-xs font-bold text-white"><Plus className="size-3.5" /> Tạo danh mục</Link>
          </div>
        ) : (
          <form action={createTransactionAction} className="mt-5 grid gap-4 md:grid-cols-2">
            <input type="hidden" name="transaction_type" value={type} />

            <label className="block md:col-span-2">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Nội dung</span>
              <input name="title" required maxLength={140} placeholder={type === "income" ? "VD: Lương tháng 10" : type === "expense" ? "VD: Siêu thị cuối tuần" : "VD: Chuyển quỹ dự phòng"} className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]" />
            </label>

            {(type === "expense" || type === "transfer") && (
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Tài khoản nguồn</span>
                <select name="from_account_id" required className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm">
                  <option value="">Chọn tài khoản</option>
                  {accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currency_code}</option>)}
                </select>
              </label>
            )}

            {(type === "income" || type === "transfer") && (
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">{type === "income" ? "Tài khoản nhận" : "Tài khoản đích"}</span>
                <select name="to_account_id" required className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm">
                  <option value="">Chọn tài khoản</option>
                  {accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currency_code}</option>)}
                </select>
              </label>
            )}

            {(type === "expense" || type === "transfer") && (
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">{type === "transfer" ? "Số tiền gửi" : "Số tiền"}</span>
                <input name="from_amount" inputMode="decimal" required placeholder="0" className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]" />
              </label>
            )}

            {(type === "income" || type === "transfer") && (
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">{type === "transfer" ? "Số tiền nhận" : "Số tiền"}</span>
                <input name="to_amount" inputMode="decimal" required={type === "income"} placeholder={type === "transfer" ? "Để trống nếu cùng tiền tệ" : "0"} className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]" />
                {isTransfer && <span className="mt-1.5 block text-[11px] leading-4 text-[var(--muted-foreground)]">Nếu hai tài khoản cùng tiền tệ, có thể để trống. Nếu khác tiền tệ, nhập số tiền thực nhận để Finzaro không tự suy đoán tỷ giá.</span>}
              </label>
            )}

            {!isTransfer && (
              <label className="block">
                <span className="mb-2 flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]"><span>Danh mục</span><Link href="/categories" className="normal-case tracking-normal text-[var(--primary)]">Quản lý danh mục</Link></span>
                <TransactionCategorySelect categories={categories} />
              </label>
            )}

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Ngày giao dịch</span>
              <div className="relative"><CalendarDays className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" /><input type="date" name="transaction_date" required defaultValue={todayInTimeZone(timeZone)} className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-10 pr-3 text-sm" /></div>
            </label>

            <label className="block md:col-span-2">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Ghi chú <span className="font-medium normal-case">(không bắt buộc)</span></span>
              <textarea name="notes" maxLength={500} rows={3} placeholder="Thông tin thêm cho giao dịch..." className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]" />
            </label>

            <div className="flex justify-end gap-2 md:col-span-2">
              <button type="button" data-instant-close className="inline-flex h-10 items-center rounded-xl border border-[var(--border)] px-4 text-sm font-bold hover:bg-[var(--muted)]">Hủy</button>
              <PendingSubmitButton idleLabel="Lưu giao dịch" pendingLabel="Đang lưu giao dịch..." disabled={!canSubmit} className="h-10 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white" />
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default async function TransactionsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { supabase, userId } = await requireUser();
  const [{ data: preferences }, ledger] = await Promise.all([
    supabase.from("user_preferences").select("currency_code, timezone").eq("id", userId).maybeSingle(),
    loadLedger(supabase, userId, { limit: 500 })
  ]);

  const defaultCurrency = preferences?.currency_code ?? "VND";
  const timeZone = preferences?.timezone ?? "Asia/Ho_Chi_Minh";
  const activeAccounts = ledger.accounts.filter((account) => !account.is_archived);
  const newType = params.new && isTransactionType(params.new) ? params.new : null;
  const expenseCategories = ledger.categories.filter((category) => !category.is_archived && category.category_type === "expense").map(({ id, name, icon_name, parent_id }) => ({ id, name, icon_name, parent_id }));
  const incomeCategories = ledger.categories.filter((category) => !category.is_archived && category.category_type === "income").map(({ id, name, icon_name, parent_id }) => ({ id, name, icon_name, parent_id }));
  const filtered = filterTransactions(ledger.transactions, params);
  const currentMonth = currentMonthKey(timeZone);
  const totals = monthTotals(ledger.transactions, defaultCurrency, currentMonth);
  const digits = currencyDigits(ledger.currencies, defaultCurrency);
  const filterCategories = ledger.categories.filter((category) => !category.is_archived);

  return (
    <div className="mx-auto max-w-[1300px] px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--primary)]">Money · Ledger</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Giao dịch</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">Income và Expense đã liên kết Category Engine; Transfer vẫn trung lập với thống kê thu/chi.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/categories" className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3.5 text-sm font-bold"><Shapes className="size-4 text-[var(--primary)]" /> Danh mục</Link>
          <InstantTransactionLauncher
            initialType={newType}
            expense={<TransactionForm type="expense" accounts={activeAccounts} categories={expenseCategories} timeZone={timeZone} />}
            income={<TransactionForm type="income" accounts={activeAccounts} categories={incomeCategories} timeZone={timeZone} />}
            transfer={<TransactionForm type="transfer" accounts={activeAccounts} categories={[]} timeZone={timeZone} />}
          />
        </div>
      </div>

      <AuthMessage error={params.error} message={params.message} />
      

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Thu nhập tháng · {defaultCurrency}</p><p className="mt-2 text-xl font-black text-emerald-600 dark:text-emerald-400">{formatMinorMoney(totals.income, defaultCurrency, digits)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Chi tiêu tháng · {defaultCurrency}</p><p className="mt-2 text-xl font-black">{formatMinorMoney(totals.expense, defaultCurrency, digits)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Dòng tiền ròng · {defaultCurrency}</p><p className={`mt-2 text-xl font-black ${totals.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>{formatMinorMoney(totals.net, defaultCurrency, digits)}</p></CardContent></Card>
      </div>

      <form method="get" className="mt-4 grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 md:grid-cols-2 xl:grid-cols-[1.25fr_.65fr_.8fr_.8fr_.8fr_.8fr_auto]">
        <div className="relative"><Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" /><input name="q" defaultValue={params.q ?? ""} placeholder="Tìm nội dung, danh mục, tài khoản..." className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-10 pr-3 text-sm outline-none focus:border-[var(--primary)]" /></div>
        <select name="type" defaultValue={params.type ?? "all"} className="h-10 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm"><option value="all">Mọi loại</option><option value="income">Thu nhập</option><option value="expense">Chi tiêu</option><option value="transfer">Chuyển tiền</option></select>
        <select name="account" defaultValue={params.account ?? "all"} className="h-10 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm"><option value="all">Mọi tài khoản</option>{ledger.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select>
        <select name="category" defaultValue={params.category ?? "all"} className="h-10 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm"><option value="all">Mọi danh mục</option>{filterCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
        <input type="date" name="from" defaultValue={params.from ?? ""} aria-label="Từ ngày" className="h-10 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm" />
        <input type="date" name="to" defaultValue={params.to ?? ""} aria-label="Đến ngày" className="h-10 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm" />
        <div className="flex gap-2"><button type="submit" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--foreground)] px-3 text-xs font-bold text-[var(--background)]"><Filter className="size-3.5" /> Lọc</button><Link href="/transactions" aria-label="Xóa bộ lọc" className="grid size-10 place-items-center rounded-xl border border-[var(--border)]"><X className="size-4" /></Link></div>
      </form>

      <Card className="mt-4">
        <CardContent className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-bold">Lịch sử giao dịch</h2><p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{filtered.length} / {ledger.transactions.length} giao dịch trong tối đa 500 bản ghi gần nhất</p></div><span className="rounded-lg bg-[var(--muted)] px-2.5 py-1.5 text-xs font-semibold">Category + RLS</span></div>
          <TransactionList transactions={filtered} currencies={ledger.currencies} showDelete />
        </CardContent>
      </Card>
    </div>
  );
}
