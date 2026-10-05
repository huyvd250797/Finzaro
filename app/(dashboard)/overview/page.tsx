import Link from "next/link";
import { ArrowRight, CircleDollarSign, Landmark, Plus, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import { accounts, categorySpending } from "@/lib/demo-data";
import { formatMoney } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { CashflowChart } from "@/components/cashflow-chart";
import { TransactionList } from "@/components/transaction-list";

export default function OverviewPage() {
  const total = accounts.reduce((sum, account) => sum + account.balance, 0);
  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-semibold text-[var(--primary)]">Thứ Hai, 05/10/2026</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Tổng quan tài chính</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">Một ảnh chụp nhanh về dòng tiền và tài khoản của bạn.</p></div>
        <Link href="/transactions?new=1" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white"><Plus className="size-4" /> Thêm giao dịch</Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tổng số dư" value={total} delta={4.8} icon={WalletCards} />
        <StatCard label="Thu nhập tháng" value={35_000_000} delta={9.4} icon={TrendingUp} tone="positive" />
        <StatCard label="Chi tiêu tháng" value={12_500_000} delta={-7.2} icon={TrendingDown} tone="negative" />
        <StatCard label="Dòng tiền ròng" value={22_500_000} delta={18.1} icon={CircleDollarSign} tone="positive" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.45fr_.8fr]">
        <Card><CardHeader><div><h2 className="font-bold">Dòng tiền 6 tháng</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Đơn vị: triệu đồng</p></div><span className="rounded-lg bg-[var(--muted)] px-2.5 py-1.5 text-xs font-semibold">6 tháng</span></CardHeader><CardContent><CashflowChart /></CardContent></Card>
        <Card><CardHeader><div><h2 className="font-bold">Chi tiêu theo nhóm</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Tháng 10/2026</p></div></CardHeader><CardContent className="space-y-4">{categorySpending.map((item)=><div key={item.label}><div className="mb-1.5 flex items-center justify-between gap-3 text-sm"><span className="font-medium">{item.label}</span><span className="text-xs font-semibold text-[var(--muted-foreground)]">{formatMoney(item.value)}</span></div><div className="h-2 rounded-full bg-[var(--muted)]"><div className="h-2 rounded-full bg-[var(--primary)]" style={{width:`${item.percent}%`}} /></div></div>)}</CardContent></Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[.8fr_1.45fr]">
        <Card><CardHeader><div><h2 className="font-bold">Tài khoản</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">4 nguồn tiền đang theo dõi</p></div><Link href="/accounts" className="text-xs font-bold text-[var(--primary)]">Xem tất cả</Link></CardHeader><CardContent className="space-y-3">{accounts.map((account)=><div key={account.id} className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3"><div className="grid size-10 place-items-center rounded-xl bg-[var(--muted)] text-[var(--primary)]"><Landmark className="size-4.5" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{account.name}</p><p className="truncate text-xs text-[var(--muted-foreground)]">{account.institution}</p></div><div className="text-right text-sm font-bold">{formatMoney(account.balance)}</div></div>)}</CardContent></Card>
        <Card><CardHeader><div><h2 className="font-bold">Giao dịch gần đây</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Các biến động mới nhất</p></div><Link href="/transactions" className="inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)]">Xem tất cả <ArrowRight className="size-3.5" /></Link></CardHeader><CardContent><TransactionList limit={5} /></CardContent></Card>
      </div>
    </div>
  );
}
