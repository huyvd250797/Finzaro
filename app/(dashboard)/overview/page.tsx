import Link from "next/link";
import { ArrowRight, Banknote, CircleDollarSign, Landmark, PiggyBank, Plus, Smartphone, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import { categorySpending } from "@/lib/demo-data";
import { formatMinorMoney, formatMoney } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { CashflowChart } from "@/components/cashflow-chart";
import { TransactionList } from "@/components/transaction-list";
import { requireUser } from "@/lib/auth";
import type { AccountType } from "@/features/accounts/constants";

const accountIcons = { bank: Landmark, cash: Banknote, ewallet: Smartphone, savings: PiggyBank };

type Currency = { code: string; decimal_digits: number };

export default async function OverviewPage() {
  const { supabase, userId } = await requireUser();
  const [{ data: accountsData }, { data: preferences }, { data: currenciesData }] = await Promise.all([
    supabase.from("accounts").select("id, name, account_type, currency_code, institution_name, current_balance_minor").eq("user_id", userId).eq("is_archived", false).order("created_at", { ascending: false }),
    supabase.from("user_preferences").select("currency_code").eq("id", userId).maybeSingle(),
    supabase.from("supported_currencies").select("code, decimal_digits").eq("is_active", true)
  ]);

  const accounts = accountsData ?? [];
  const currencies = (currenciesData ?? []) as Currency[];
  const defaultCurrency = preferences?.currency_code ?? "VND";
  const digits = currencies.find((item) => item.code === defaultCurrency)?.decimal_digits ?? 0;
  const totalMinor = accounts.filter((item) => item.currency_code === defaultCurrency).reduce((sum, item) => sum + item.current_balance_minor, 0);
  const today = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-semibold capitalize text-[var(--primary)]">{today}</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Tổng quan tài chính</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">Số dư tài khoản đã lấy từ Supabase. Giao dịch vẫn là demo cho tới V0.0.4.</p></div>
        <Link href="/accounts?new=1" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white"><Plus className="size-4" /> Thêm tài khoản</Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={`Tổng số dư · ${defaultCurrency}`} formattedValue={formatMinorMoney(totalMinor, defaultCurrency, digits)} icon={WalletCards} />
        <StatCard label="Thu nhập tháng" value={35_000_000} delta={9.4} icon={TrendingUp} tone="positive" />
        <StatCard label="Chi tiêu tháng" value={12_500_000} delta={-7.2} icon={TrendingDown} tone="negative" />
        <StatCard label="Dòng tiền ròng" value={22_500_000} delta={18.1} icon={CircleDollarSign} tone="positive" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.45fr_.8fr]">
        <Card><CardHeader><div><h2 className="font-bold">Dòng tiền 6 tháng</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Dữ liệu demo · Transaction Core ở V0.0.4</p></div><span className="rounded-lg bg-[var(--muted)] px-2.5 py-1.5 text-xs font-semibold">6 tháng</span></CardHeader><CardContent><CashflowChart /></CardContent></Card>
        <Card><CardHeader><div><h2 className="font-bold">Chi tiêu theo nhóm</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Dữ liệu demo cho tới V0.0.4</p></div></CardHeader><CardContent className="space-y-4">{categorySpending.map((item)=><div key={item.label}><div className="mb-1.5 flex items-center justify-between gap-3 text-sm"><span className="font-medium">{item.label}</span><span className="text-xs font-semibold text-[var(--muted-foreground)]">{formatMoney(item.value)}</span></div><div className="h-2 rounded-full bg-[var(--muted)]"><div className="h-2 rounded-full bg-[var(--primary)]" style={{width:`${item.percent}%`}} /></div></div>)}</CardContent></Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[.8fr_1.45fr]">
        <Card>
          <CardHeader><div><h2 className="font-bold">Tài khoản</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">{accounts.length} tài khoản thật đang hoạt động</p></div><Link href="/accounts" className="text-xs font-bold text-[var(--primary)]">Xem tất cả</Link></CardHeader>
          <CardContent className="space-y-3">
            {accounts.length === 0 ? <div className="rounded-xl border border-dashed border-[var(--border)] p-5 text-center"><p className="text-sm font-semibold">Chưa có tài khoản</p><p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">Tạo tài khoản đầu tiên để Dashboard có số dư thật.</p><Link href="/accounts?new=1" className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--primary)] px-3 text-xs font-bold text-white"><Plus className="size-3.5" /> Thêm tài khoản</Link></div> : accounts.slice(0, 4).map((account) => {
              const type = account.account_type as AccountType;
              const Icon = accountIcons[type] ?? Landmark;
              const accountDigits = currencies.find((item) => item.code === account.currency_code)?.decimal_digits ?? 0;
              return <div key={account.id} className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3"><div className="grid size-10 place-items-center rounded-xl bg-[var(--muted)] text-[var(--primary)]"><Icon className="size-4.5" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{account.name}</p><p className="truncate text-xs text-[var(--muted-foreground)]">{account.institution_name || account.currency_code}</p></div><div className="text-right text-sm font-bold">{formatMinorMoney(account.current_balance_minor, account.currency_code, accountDigits)}</div></div>;
            })}
          </CardContent>
        </Card>
        <Card><CardHeader><div><h2 className="font-bold">Giao dịch gần đây</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Demo · sẽ kết nối Account Core ở V0.0.4</p></div><Link href="/transactions" className="inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)]">Xem tất cả <ArrowRight className="size-3.5" /></Link></CardHeader><CardContent><TransactionList limit={5} /></CardContent></Card>
      </div>
    </div>
  );
}
