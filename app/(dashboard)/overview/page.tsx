import Link from "next/link";
import { ArrowRight, Banknote, CircleDollarSign, Landmark, PiggyBank, Plus, Smartphone, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import { formatMinorMoney } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { CashflowChart } from "@/components/cashflow-chart";
import { TransactionList } from "@/components/transaction-list";
import { CategoryIcon } from "@/features/categories/icons";
import { requireUser } from "@/lib/auth";
import type { AccountType } from "@/features/accounts/constants";
import { cashflowSeries, currentMonthKey, currencyDigits, expenseCategories, loadLedger, monthTotals, sixMonthWindow } from "@/features/transactions/data";

const accountIcons = { bank: Landmark, cash: Banknote, ewallet: Smartphone, savings: PiggyBank };

function percentChange(current: number, previous: number) {
  if (previous === 0) return undefined;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

export default async function OverviewPage() {
  const { supabase, userId } = await requireUser();
  const { data: preferences } = await supabase.from("user_preferences").select("currency_code, timezone").eq("id", userId).maybeSingle();
  const defaultCurrency = preferences?.currency_code ?? "VND";
  const timeZone = preferences?.timezone ?? "Asia/Ho_Chi_Minh";
  const months = sixMonthWindow(timeZone);
  const ledger = await loadLedger(supabase, userId, { fromDate: `${months[0].key}-01`, limit: 1000 });
  const accounts = ledger.accounts.filter((account) => !account.is_archived);
  const digits = currencyDigits(ledger.currencies, defaultCurrency);
  const totalMinor = accounts.filter((account) => account.currency_code === defaultCurrency).reduce((sum, account) => sum + account.current_balance_minor, 0);
  const currentMonth = currentMonthKey(timeZone);
  const current = monthTotals(ledger.transactions, defaultCurrency, currentMonth);
  const previous = monthTotals(ledger.transactions, defaultCurrency, months.at(-2)?.key ?? currentMonth);
  const series = cashflowSeries(ledger.transactions, defaultCurrency, timeZone);
  const categories = expenseCategories(ledger.transactions, defaultCurrency, currentMonth);
  const today = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric", timeZone }).format(new Date());

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-semibold capitalize text-[var(--primary)]">{today}</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Tổng quan tài chính</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">Dashboard dùng Account + Transaction ledger thật và Category Engine có icon. Transfer không được tính thành thu nhập hoặc chi tiêu.</p></div>
        <div className="flex flex-wrap gap-2"><Link href="/accounts?new=1" className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-bold"><Plus className="size-4" /> Tài khoản</Link><Link href="/transactions?new=expense" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white"><Plus className="size-4" /> Giao dịch</Link></div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={`Tổng số dư · ${defaultCurrency}`} formattedValue={formatMinorMoney(totalMinor, defaultCurrency, digits)} icon={WalletCards} />
        <StatCard label={`Thu nhập tháng · ${defaultCurrency}`} formattedValue={formatMinorMoney(current.income, defaultCurrency, digits)} delta={percentChange(current.income, previous.income)} icon={TrendingUp} tone="positive" />
        <StatCard label={`Chi tiêu tháng · ${defaultCurrency}`} formattedValue={formatMinorMoney(current.expense, defaultCurrency, digits)} delta={percentChange(current.expense, previous.expense)} icon={TrendingDown} tone="negative" />
        <StatCard label={`Dòng tiền ròng · ${defaultCurrency}`} formattedValue={formatMinorMoney(current.net, defaultCurrency, digits)} delta={percentChange(current.net, previous.net)} icon={CircleDollarSign} tone={current.net >= 0 ? "positive" : "negative"} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.45fr_.8fr]">
        <Card><CardHeader><div><h2 className="font-bold">Dòng tiền 6 tháng</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Income / Expense thật theo {defaultCurrency}; transfer được loại khỏi cash-flow spending.</p></div><span className="rounded-lg bg-[var(--muted)] px-2.5 py-1.5 text-xs font-semibold">6 tháng</span></CardHeader><CardContent><CashflowChart data={series} decimalDigits={digits} /></CardContent></Card>
        <Card><CardHeader><div><h2 className="font-bold">Chi tiêu theo nhóm</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Top category tháng hiện tại · {defaultCurrency}</p></div></CardHeader><CardContent className="space-y-4">{categories.length === 0 ? <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center"><p className="text-sm font-semibold">Chưa có chi tiêu tháng này</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">Danh mục sẽ xuất hiện khi bạn ghi nhận Expense.</p></div> : categories.map((item)=><div key={item.label}><div className="mb-1.5 flex items-center justify-between gap-3 text-sm"><span className="flex min-w-0 items-center gap-2 font-medium"><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[var(--sidebar-accent)] text-[var(--primary)]"><CategoryIcon name={item.icon_name} className="size-3.5" /></span><span className="truncate">{item.label}</span></span><span className="text-xs font-semibold text-[var(--muted-foreground)]">{formatMinorMoney(item.value, defaultCurrency, digits)}</span></div><div className="h-2 rounded-full bg-[var(--muted)]"><div className="h-2 rounded-full bg-[var(--primary)]" style={{width:`${item.percent}%`}} /></div></div>)}</CardContent></Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[.8fr_1.45fr]">
        <Card>
          <CardHeader><div><h2 className="font-bold">Tài khoản</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">{accounts.length} tài khoản đang hoạt động</p></div><Link href="/accounts" className="text-xs font-bold text-[var(--primary)]">Xem tất cả</Link></CardHeader>
          <CardContent className="space-y-3">
            {accounts.length === 0 ? <div className="rounded-xl border border-dashed border-[var(--border)] p-5 text-center"><p className="text-sm font-semibold">Chưa có tài khoản</p><p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">Tạo tài khoản đầu tiên trước khi ghi giao dịch.</p><Link href="/accounts?new=1" className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--primary)] px-3 text-xs font-bold text-white"><Plus className="size-3.5" /> Thêm tài khoản</Link></div> : accounts.slice(0, 4).map((account) => {
              const type = account.account_type as AccountType;
              const Icon = accountIcons[type] ?? Landmark;
              const accountDigits = currencyDigits(ledger.currencies, account.currency_code);
              return <div key={account.id} className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3"><div className="grid size-10 place-items-center rounded-xl bg-[var(--muted)] text-[var(--primary)]"><Icon className="size-4.5" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{account.name}</p><p className="truncate text-xs text-[var(--muted-foreground)]">{account.institution_name || account.currency_code}</p></div><div className="text-right text-sm font-bold">{formatMinorMoney(account.current_balance_minor, account.currency_code, accountDigits)}</div></div>;
            })}
          </CardContent>
        </Card>
        <Card><CardHeader><div><h2 className="font-bold">Giao dịch gần đây</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Dữ liệu ledger thật từ Supabase</p></div><Link href="/transactions" className="inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)]">Xem tất cả <ArrowRight className="size-3.5" /></Link></CardHeader><CardContent><TransactionList transactions={ledger.transactions} currencies={ledger.currencies} limit={5} /></CardContent></Card>
      </div>
    </div>
  );
}
