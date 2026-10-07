import Link from "next/link";
import { Archive, ArchiveRestore, Banknote, Landmark, Pencil, PiggyBank, Plus, Smartphone, WalletCards, X } from "lucide-react";
import { AuthMessage } from "@/components/auth-message";
import { InstantReveal } from "@/components/instant-reveal";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { Card, CardContent } from "@/components/ui/card";
import { ACCOUNT_TYPE_LABELS, type AccountType } from "@/features/accounts/constants";
import { createAccountAction, setAccountArchivedAction, updateAccountAction } from "@/features/accounts/actions";
import { requireUser } from "@/lib/auth";
import { formatMinorMoney } from "@/lib/utils";

const iconMap = {
  bank: Landmark,
  cash: Banknote,
  ewallet: Smartphone,
  savings: PiggyBank
};

type SearchParams = Promise<{ new?: string; edit?: string; archived?: string; error?: string; message?: string }>;

type Currency = { code: string; name: string; symbol: string; decimal_digits: number };
type Account = {
  id: string;
  name: string;
  account_type: string;
  currency_code: string;
  institution_name: string | null;
  opening_balance_minor: number;
  current_balance_minor: number;
  is_archived: boolean;
};

function currencyMeta(currencies: Currency[], code: string) {
  return currencies.find((item) => item.code === code) ?? { code, name: code, symbol: code, decimal_digits: 0 };
}

function AccountForm({ currencies, account }: { currencies: Currency[]; account?: Account }) {
  const editing = Boolean(account);
  const action = editing ? updateAccountAction : createAccountAction;

  return (
    <Card className="mt-5 border-emerald-500/25">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--primary)]">{editing ? "Edit account" : "New account"}</p>
            <h2 className="mt-1 text-lg font-black">{editing ? "Cập nhật tài khoản" : "Thêm tài khoản tài chính"}</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">V0.0.4 khóa tiền tệ và số dư khi chỉnh sửa; mọi biến động số dư đi qua Transaction Core.</p>
          </div>
          <Link href="/accounts" data-instant-close aria-label="Đóng form" className="grid size-9 place-items-center rounded-xl border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]"><X className="size-4" /></Link>
        </div>

        <form action={action} className="mt-5 grid gap-4 md:grid-cols-2">
          {account && <input type="hidden" name="account_id" value={account.id} />}
          <label className="block md:col-span-2">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Tên tài khoản</span>
            <input name="name" defaultValue={account?.name ?? ""} required maxLength={100} placeholder="VD: Vietcombank, Tiền mặt, MoMo..." className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]" />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Loại tài khoản</span>
            <select name="account_type" defaultValue={account?.account_type ?? "bank"} className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm">
              {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Tiền tệ</span>
            {editing ? <div className="flex h-11 items-center rounded-xl border border-[var(--border)] bg-[var(--muted)] px-4 text-sm font-semibold">{account?.currency_code}<span className="ml-2 text-xs font-normal text-[var(--muted-foreground)]">· khóa sau khi tạo</span></div> : <select name="currency_code" defaultValue="VND" className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm">{currencies.map((item) => <option key={item.code} value={item.code}>{item.code} · {item.name} ({item.symbol})</option>)}</select>}
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Ngân hàng / tổ chức</span>
            <input name="institution_name" defaultValue={account?.institution_name ?? ""} maxLength={100} placeholder="Tùy chọn" className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]" />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">{editing ? "Số dư hiện tại" : "Số dư ban đầu"}</span>
            {editing ? <div className="flex h-11 items-center rounded-xl border border-[var(--border)] bg-[var(--muted)] px-4 text-sm font-bold">{account ? formatMinorMoney(account.current_balance_minor, account.currency_code, currencyMeta(currencies, account.currency_code).decimal_digits) : "—"}</div> : <input name="balance" inputMode="decimal" defaultValue="0" required placeholder="0" className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]" />}
            <span className="mt-1.5 block text-[11px] leading-5 text-[var(--muted-foreground)]">{editing ? "Không sửa số dư trực tiếp để tránh phá ledger. Hãy tạo giao dịch Income / Expense / Transfer." : "Opening balance chỉ đặt khi tạo tài khoản; sau đó Transaction Core sẽ duy trì current balance."}</span>
          </label>

          <div className="flex flex-wrap items-center gap-2 md:col-span-2">
            <PendingSubmitButton idleLabel={editing ? "Lưu thay đổi" : "Tạo tài khoản"} pendingLabel={editing ? "Đang lưu..." : "Đang tạo tài khoản..."} className="h-10 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white" />
            <Link href="/accounts" data-instant-close className="inline-flex h-10 items-center rounded-xl border border-[var(--border)] px-4 text-sm font-bold">Hủy</Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default async function AccountsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { supabase, userId } = await requireUser();
  const [{ data: accountsData, error: accountsError }, { data: currenciesData }, { data: preferences }] = await Promise.all([
    supabase.from("accounts").select("id, name, account_type, currency_code, institution_name, opening_balance_minor, current_balance_minor, is_archived").eq("user_id", userId).order("is_archived").order("created_at", { ascending: false }),
    supabase.from("supported_currencies").select("code, name, symbol, decimal_digits").eq("is_active", true).order("code"),
    supabase.from("user_preferences").select("currency_code").eq("id", userId).maybeSingle()
  ]);

  const accounts = (accountsData ?? []) as Account[];
  const currencies = (currenciesData ?? []) as Currency[];
  const showArchived = params.archived === "1";
  const visibleAccounts = accounts.filter((item) => item.is_archived === showArchived);
  const editAccount = params.edit ? accounts.find((item) => item.id === params.edit && !item.is_archived) : undefined;
  const defaultCurrency = preferences?.currency_code ?? "VND";
  const defaultMeta = currencyMeta(currencies, defaultCurrency);
  const activeAccounts = accounts.filter((item) => !item.is_archived);
  const totalDefaultMinor = activeAccounts.filter((item) => item.currency_code === defaultCurrency).reduce((sum, item) => sum + item.current_balance_minor, 0);
  const totalsByCurrency = activeAccounts.reduce<Record<string, number>>((result, item) => {
    result[item.currency_code] = (result[item.currency_code] ?? 0) + item.current_balance_minor;
    return result;
  }, {});

  return (
    <div className="mx-auto max-w-[1300px] px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--primary)]">Money · Account + Ledger</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Tài khoản & ví</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">Số dư hiện tại được Transaction Core duy trì từ Income, Expense và Transfer; dữ liệu vẫn tách riêng theo user bằng RLS.</p>
        </div>
        <InstantReveal label="Thêm tài khoản" initialOpen={params.new === "1"}><AccountForm currencies={currencies} /></InstantReveal>
      </div>

      <AuthMessage error={params.error ?? (accountsError ? "Không thể tải dữ liệu tài khoản." : undefined)} message={params.message} />

      {editAccount && <AccountForm currencies={currencies} account={editAccount} />}

      <Card className="mt-6 overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-800 text-white">
        <CardContent className="p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100">Tổng số dư · {defaultCurrency}</p>
              <p className="mt-3 text-3xl font-black sm:text-4xl">{formatMinorMoney(totalDefaultMinor, defaultCurrency, defaultMeta.decimal_digits)}</p>
              <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-100/85">Chỉ cộng các tài khoản cùng tiền tệ mặc định để tránh cộng sai nhiều loại tiền. Quy đổi ngoại tệ sẽ được bổ sung ở module tỷ giá sau.</p>
            </div>
            <div className="grid size-12 place-items-center rounded-2xl bg-white/12"><WalletCards className="size-6" /></div>
          </div>
          {Object.keys(totalsByCurrency).length > 0 && <div className="mt-5 flex flex-wrap gap-2">{Object.entries(totalsByCurrency).map(([code, value]) => { const meta = currencyMeta(currencies, code); return <span key={code} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">{code}: {formatMinorMoney(value, code, meta.decimal_digits)}</span>; })}</div>}
        </CardContent>
      </Card>

      <div className="mt-5 flex items-center gap-2">
        <Link href="/accounts" className={`rounded-xl px-3 py-2 text-xs font-bold ${!showArchived ? "bg-[var(--primary)] text-white" : "border border-[var(--border)] bg-[var(--card)]"}`}>Đang hoạt động ({activeAccounts.length})</Link>
        <Link href="/accounts?archived=1" className={`rounded-xl px-3 py-2 text-xs font-bold ${showArchived ? "bg-[var(--primary)] text-white" : "border border-[var(--border)] bg-[var(--card)]"}`}>Đã lưu trữ ({accounts.length - activeAccounts.length})</Link>
      </div>

      {visibleAccounts.length === 0 ? (
        <Card className="mt-4"><CardContent className="grid min-h-56 place-items-center p-8 text-center"><div><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[var(--muted)] text-[var(--primary)]"><WalletCards className="size-5" /></div><h2 className="mt-4 font-bold">{showArchived ? "Chưa có tài khoản lưu trữ" : "Chưa có tài khoản tài chính"}</h2><p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted-foreground)]">{showArchived ? "Các tài khoản bạn lưu trữ sẽ xuất hiện ở đây." : "Tạo tài khoản đầu tiên để Finzaro bắt đầu tính tổng số dư thật trên Dashboard."}</p>{!showArchived && <Link href="/accounts?new=1" className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white"><Plus className="size-4" /> Tạo tài khoản đầu tiên</Link>}</div></CardContent></Card>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {visibleAccounts.map((account) => {
            const type = account.account_type as AccountType;
            const Icon = iconMap[type] ?? WalletCards;
            const meta = currencyMeta(currencies, account.currency_code);
            return (
              <Card key={account.id} className={account.is_archived ? "opacity-75" : undefined}>
                <CardContent>
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid size-11 place-items-center rounded-2xl bg-[var(--muted)] text-[var(--primary)]"><Icon className="size-5" /></div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${account.is_archived ? "bg-[var(--muted)] text-[var(--muted-foreground)]" : "bg-emerald-500/10 text-emerald-600"}`}>{account.is_archived ? "Archived" : "Active"}</span>
                  </div>
                  <p className="mt-5 text-xs font-semibold text-[var(--muted-foreground)]">{ACCOUNT_TYPE_LABELS[type] ?? account.account_type} · {account.currency_code}</p>
                  <h2 className="mt-1 truncate font-bold">{account.name}</h2>
                  <p className="mt-1 truncate text-xs text-[var(--muted-foreground)]">{account.institution_name || "Không có tổ chức"}</p>
                  <p className="mt-4 text-2xl font-black tracking-tight">{formatMinorMoney(account.current_balance_minor, account.currency_code, meta.decimal_digits)}</p>
                  <div className="mt-5 flex items-center gap-2 border-t border-[var(--border)] pt-4">
                    {!account.is_archived && <Link href={`/accounts?edit=${account.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 text-xs font-bold hover:bg-[var(--muted)]"><Pencil className="size-3.5" /> Sửa</Link>}
                    <form action={setAccountArchivedAction} className="ml-auto">
                      <input type="hidden" name="account_id" value={account.id} />
                      <input type="hidden" name="archived" value={account.is_archived ? "false" : "true"} />
                      <button type="submit" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 text-xs font-bold hover:bg-[var(--muted)]">{account.is_archived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}{account.is_archived ? "Khôi phục" : "Lưu trữ"}</button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
