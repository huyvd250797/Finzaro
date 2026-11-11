"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { Archive, ArchiveRestore, ArrowUpRight, Banknote, Landmark, Pencil, PiggyBank, Search, Smartphone, WalletCards, X } from "lucide-react";
import { setAccountArchivedAction } from "@/features/accounts/actions";
import { ACCOUNT_TYPE_LABELS, type AccountType } from "@/features/accounts/constants";
import { formatMinorMoney } from "@/lib/utils";

export type AccountCardData = {
  id: string;
  name: string;
  account_type: string;
  currency_code: string;
  institution_name: string | null;
  current_balance_minor: number;
  is_archived: boolean;
};

type CurrencyMeta = { code: string; decimal_digits: number };
type AccountFilter = "all" | "bank" | "cash" | "ewallet";
type AccountSort = "name" | "balance";

const icons = { bank: Landmark, cash: Banknote, ewallet: Smartphone, savings: PiggyBank };
const filters: { id: AccountFilter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "bank", label: "Ngân hàng" },
  { id: "cash", label: "Tiền mặt" },
  { id: "ewallet", label: "Ví điện tử" }
];

export function AccountCollection({ accounts, currencies, archived }: { accounts: AccountCardData[]; currencies: CurrencyMeta[]; archived: boolean }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AccountFilter>("all");
  const [sort, setSort] = useState<AccountSort>("name");
  const deferredQuery = useDeferredValue(query);
  const digits = useMemo(() => new Map(currencies.map((currency) => [currency.code, currency.decimal_digits])), [currencies]);
  const counts = useMemo(() => filters.map((option) => ({
    ...option,
    count: accounts.filter((account) => option.id === "all" || account.account_type === option.id).length
  })), [accounts]);
  const visible = useMemo(() => {
    const needle = deferredQuery.trim().toLocaleLowerCase("vi");
    return accounts.filter((account) => {
      if (filter !== "all" && account.account_type !== filter) return false;
      if (!needle) return true;
      return `${account.name} ${account.institution_name ?? ""} ${account.currency_code} ${ACCOUNT_TYPE_LABELS[account.account_type as AccountType] ?? ""}`.toLocaleLowerCase("vi").includes(needle);
    }).sort((a, b) => sort === "balance"
      ? Math.abs(b.current_balance_minor) - Math.abs(a.current_balance_minor) || a.name.localeCompare(b.name, "vi")
      : a.name.localeCompare(b.name, "vi"));
  }, [accounts, deferredQuery, filter, sort]);

  if (accounts.length === 0) return (
    <div className="fin-card mt-4 rounded-2xl border border-dashed border-[var(--border)] p-8 text-center">
      <WalletCards className="mx-auto size-9 text-[var(--primary)]" />
      <h2 className="mt-3 text-base font-bold">{archived ? "Chưa có tài khoản lưu trữ" : "Chưa có tài khoản hoặc ví"}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--muted-foreground)]">{archived ? "Những tài khoản đã lưu trữ sẽ hiển thị tại đây." : "Tạo tài khoản để bắt đầu ghi nhận thu, chi và chuyển tiền."}</p>
      {!archived && <Link href="/accounts?new=1" className="fin-primary-btn mt-4 inline-flex items-center px-4">Thêm tài khoản</Link>}
    </div>
  );

  return <section className="mt-4" aria-label="Danh sách tài khoản và ví">
    <div className="fin-filter-panel flex flex-col gap-3 rounded-2xl p-3 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative min-w-0 flex-1">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Tìm tài khoản hoặc ví" placeholder="Tìm tên tài khoản, ngân hàng, ví..." className="fin-input w-full pl-10 pr-9" />
          {query && <button type="button" onClick={() => setQuery("")} aria-label="Xóa tìm kiếm" className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg"><X className="size-4" /></button>}
        </label>
        <label className="flex shrink-0 items-center gap-2 text-xs font-semibold text-[var(--muted-foreground)]">
          <span>Sắp xếp</span>
          <select aria-label="Sắp xếp tài khoản" value={sort} onChange={(event) => setSort(event.target.value as AccountSort)} className="fin-input min-w-32 flex-1 text-sm sm:flex-none">
            <option value="name">Theo tên</option><option value="balance">Số dư lớn</option>
          </select>
        </label>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Lọc loại tài khoản">
        {counts.map((option) => <button key={option.id} type="button" aria-pressed={filter === option.id} onClick={() => setFilter(option.id)} className={`min-h-10 shrink-0 rounded-xl border px-3 text-xs font-bold transition-colors ${filter === option.id ? "border-[var(--primary)] bg-[var(--sidebar-accent)] text-[var(--primary)]" : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)]"}`}>
          {option.label} <span className="ml-1 opacity-70">{option.count}</span>
        </button>)}
      </div>
    </div>
    <div aria-live="polite" className="mt-3 text-xs font-semibold text-[var(--muted-foreground)]">Hiển thị {visible.length}/{accounts.length} tài khoản</div>
    {visible.length === 0 ? <div className="mt-3 rounded-2xl border border-dashed border-[var(--border)] p-7 text-center text-sm text-[var(--muted-foreground)]">Không có tài khoản phù hợp với bộ lọc. <button type="button" onClick={() => { setFilter("all"); setQuery(""); }} className="font-bold text-[var(--primary)] underline underline-offset-4">Xóa bộ lọc</button></div>
    : <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {visible.map((account) => {
        const kind = account.account_type as AccountType;
        const Icon = icons[kind] ?? WalletCards;
        const normal = ["bank", "cash", "ewallet"].includes(account.account_type);
        const formattedBalance = formatMinorMoney(account.current_balance_minor, account.currency_code, digits.get(account.currency_code) ?? 0);
        return <article key={account.id} className="fin-card fin-account-card group flex min-w-0 flex-col rounded-[22px] border border-[var(--border)] p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--sidebar-accent)] text-[var(--primary)]"><Icon className="size-5" aria-hidden="true" /></span>
            <div className="min-w-0 flex-1"><h3 className="truncate text-base font-extrabold" title={account.name}>{account.name}</h3><p className="mt-0.5 truncate text-xs text-[var(--muted-foreground)]">{account.institution_name || ACCOUNT_TYPE_LABELS[kind] || "Tài khoản lịch sử"} · {account.currency_code}</p></div>
            <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${account.is_archived ? "bg-[var(--muted)] text-[var(--muted-foreground)]" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"}`}>{account.is_archived ? "Đã lưu trữ" : "Hoạt động"}</span>
          </div>
          <div className="mt-4 min-w-0"><p className="text-xs font-semibold text-[var(--muted-foreground)]">Số dư hiện tại</p><p className="mt-1 break-words text-[clamp(1.2rem,2.6vw,1.65rem)] font-black leading-tight tracking-tight tabular-nums" title={formattedBalance}>{formattedBalance}</p></div>
          <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3" style={{ marginTop: "1.1rem" }}>
            {normal && <Link href={`/transactions?account=${encodeURIComponent(account.id)}`} className="inline-flex min-h-10 items-center gap-1 rounded-xl px-2 text-xs font-bold text-[var(--primary)] hover:bg-[var(--sidebar-accent)]">Lịch sử <ArrowUpRight className="size-3.5" /></Link>}
            {normal && !account.is_archived && <Link href={`/accounts?edit=${encodeURIComponent(account.id)}`} aria-label={`Sửa ${account.name}`} className="ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-xl px-2 text-xs font-semibold hover:bg-[var(--muted)]"><Pencil className="size-3.5" /> Sửa</Link>}
            {normal && <form action={setAccountArchivedAction} className={account.is_archived ? "ml-auto" : ""}>
              <input type="hidden" name="account_id" value={account.id} /><input type="hidden" name="archived" value={account.is_archived ? "false" : "true"} />
              <button type="submit" aria-label={`${account.is_archived ? "Khôi phục" : "Lưu trữ"} ${account.name}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-2 text-xs font-semibold hover:bg-[var(--muted)]">{account.is_archived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />} {account.is_archived ? "Khôi phục" : "Lưu trữ"}</button>
            </form>}
            {!normal && <span className="ml-auto text-xs font-semibold text-[var(--muted-foreground)]">Dữ liệu cũ · chỉ xem</span>}
          </div>
        </article>;
      })}
    </div>}
  </section>;
}
