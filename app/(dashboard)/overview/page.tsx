import Link from "next/link";
import { cache, Suspense } from "react";
import { ArrowDownLeft, ArrowUpRight, CalendarDays, ChevronRight, CircleDollarSign, Plus, WalletCards } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CashflowChart } from "@/components/cashflow-chart";
import { SpendingPeriodCard } from "@/components/spending-period-card";
import { TransactionList } from "@/components/transaction-list";
import { loadDashboardSnapshot } from "@/features/dashboard/snapshot";
import { loadLedger } from "@/features/transactions/data";
import { requireUser } from "@/lib/auth";
import { measureServerOperation } from "@/lib/performance";
import { formatMinorMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tổng quan" };

// React request cache deduplicates the auth/preference round trips shared by
// streamed Dashboard and Recent sections; no cross-user persistent caching.
const overviewContext = cache(async () => {
  const { supabase, userId } = await requireUser();
  const { data: preference, error } = await supabase.from("user_preferences")
    .select("currency_code, timezone").eq("id", userId).maybeSingle();
  if (error) throw error;
  return { supabase, userId, currency: (preference?.currency_code ?? "VND").toUpperCase(),
    timeZone: preference?.timezone ?? "Asia/Ho_Chi_Minh" };
});

async function OverviewDashboard() {
  // Catch only data-loading failures. React creates/commits JSX outside the
  // try block; render errors belong to the route error boundary, not here.
  let snapshot: Awaited<ReturnType<typeof loadDashboardSnapshot>> | undefined;
  let currency = "VND";
  try {
    const context = await overviewContext();
    currency = context.currency;
    snapshot = await loadDashboardSnapshot(context.supabase, context.userId, currency, context.timeZone);
  } catch (error) {
    console.error("[Finzaro Dashboard] aggregate unavailable", error);
  }
  if (!snapshot) {
    return <div role="alert" className="rounded-xl border border-rose-500/30 p-4 text-sm text-rose-600">Không tải được dữ liệu tài chính để đối soát. Vui lòng thử tải lại trang.</div>;
  }
  const money = (amount: number) => formatMinorMoney(amount, snapshot.currency, snapshot.digits);
  const metrics = [
    { label: "Thu nhập", amount: snapshot.monthTotals.income, tone: "income", icon: ArrowDownLeft },
    { label: "Chi tiêu", amount: snapshot.monthTotals.expense, tone: "expense", icon: ArrowUpRight },
    { label: "Dòng tiền ròng", amount: snapshot.monthTotals.net, tone: "net", icon: CircleDollarSign }
  ];
  return <>
      <span hidden data-fin-startup-ready />
      <Card className="fin-hero-card fin-dashboard-hero overflow-hidden"><CardContent className="relative p-4 sm:p-6 lg:p-7">
        <div className="fin-hero-glow pointer-events-none absolute -right-20 -top-24 size-64 rounded-full" aria-hidden="true"/>
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1"><p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--fin-hero-muted)]"><WalletCards className="size-4"/> Số dư khả dụng · {currency}</p>
            <p className="fin-hero-balance mt-2 break-words text-[clamp(1.65rem,6vw,2.75rem)] font-extrabold leading-tight tracking-[-.045em] tabular-nums">{money(snapshot.balance)}</p>
            <p className="mt-2 text-xs text-[var(--fin-hero-muted)]">Tổng tiền mặt, ngân hàng và ví đang hoạt động</p>
          </div>
          <Link href="/accounts" className="fin-hero-accounts inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold">Tài khoản <ChevronRight className="size-4"/></Link>
        </div>
        <div className="fin-hero-metrics relative mt-5 grid grid-cols-3 gap-2 border-t pt-4 sm:mt-6 sm:gap-3">
          {metrics.map((item) => { const Icon = item.icon; return <div key={item.label} className="fin-hero-metric min-w-0 rounded-xl px-2.5 py-3 sm:px-4" data-tone={item.tone} title={`${item.label}: ${money(item.amount)}`}>
            <div className="flex items-center gap-1.5"><Icon className="size-3.5 shrink-0"/><span className="truncate text-[10px] font-semibold sm:text-xs">{item.label}</span></div>
            <p className="mt-2 break-words text-[clamp(.75rem,2.9vw,1.25rem)] font-extrabold tracking-[-.025em] tabular-nums">{money(item.amount)}</p>
          </div>; })}
        </div>
      </CardContent></Card>
      <div className="grid gap-3 lg:grid-cols-3">
        {(["today", "month", "year"] as const).map((period) => <SpendingPeriodCard key={period} period={period}
          summary={snapshot.spending[period]} today={snapshot.today} currency={currency} digits={snapshot.digits}/>)}
      </div>
      <Card className="fin-overview-chart fin-dashboard-card"><CardContent className="p-4 sm:p-5">
        <div className="mb-4"><p className="fin-section-eyebrow">XU HƯỚNG TÀI CHÍNH</p><h2 className="mt-1 text-base font-extrabold">Thu · Chi · Tài sản ròng</h2></div>
        <CashflowChart daily={snapshot.daily} today={snapshot.today} closingBalance={snapshot.closingBalance}
          decimalDigits={snapshot.digits} currency={currency}/>
      </CardContent></Card>
  </>;
}

async function OverviewRecent() {
  const { supabase, userId } = await overviewContext();
  const ledger = await measureServerOperation("dashboard.v420.recent", () => loadLedger(supabase, userId, { limit: 8 }));
  const recent = ledger.transactions.filter((tx) => tx.transaction_purpose === "standard" ||
    (tx.transaction_type === "transfer" && tx.entries.some((entry) => entry.entry_role === "transfer_out") && tx.entries.some((entry) => entry.entry_role === "transfer_in"))).slice(0, 5);
  return <Card className="fin-overview-recent fin-dashboard-card"><CardContent className="p-0">
    <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-4 sm:px-5"><div><p className="fin-section-eyebrow">HOẠT ĐỘNG GẦN ĐÂY</p><h2 className="mt-1 text-base font-extrabold">Giao dịch mới nhất</h2></div><Link href="/transactions" className="fin-text-action">Tất cả</Link></div>
    {recent.length ? <div className="px-2 py-2 sm:p-3"><TransactionList transactions={recent} currencies={ledger.currencies}/></div>
      : <div className="fin-empty-card mx-4 my-4"><p className="text-sm font-semibold">Chưa có giao dịch</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">Bắt đầu ghi nhận Thu/Chi để theo dõi tài chính.</p></div>}
  </CardContent></Card>;
}

function Loading({ height = "h-36" }: { height?: string }) { return <div aria-label="Đang tải số liệu" className={`fin-skeleton-card ${height} rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4`}><div className="fin-skeleton h-3 w-28 rounded"/><div className="fin-skeleton mt-5 h-6 w-40 rounded"/><div className="fin-skeleton mt-5 h-3 w-4/5 rounded"/></div>; }

export default function OverviewPage() {
  return <div className="fin-page-shell fin-dashboard-page mx-auto max-w-[1160px] space-y-4 px-3 py-4 sm:px-5 lg:px-8 lg:py-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="fin-section-eyebrow">FINZARO / PERSONAL FINANCE</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Tổng quan tài chính</h1><p className="mt-1 text-xs text-[var(--muted-foreground)]">Theo dõi số dư, thu chi và hoạt động gần nhất.</p></div>
      <Link className="fin-primary-btn !min-h-10 !px-3 !text-xs" href="/transactions?new=expense"><Plus className="size-4"/> Thêm giao dịch</Link></header>
    <Suspense fallback={<><Loading height="h-48"/><div className="grid gap-3 lg:grid-cols-3"><Loading height="h-52"/><Loading height="h-52"/><Loading height="h-52"/></div><Loading height="h-64"/></>}><OverviewDashboard/></Suspense>
    <Suspense fallback={<Loading height="h-48"/>}><OverviewRecent/></Suspense>
    <nav className="flex items-center justify-center gap-4 pb-2 text-xs font-semibold text-[var(--muted-foreground)]" aria-label="Lối tắt tài chính"><Link href="/reports/calendar" className="inline-flex min-h-10 items-center gap-1.5 hover:text-[var(--primary)]"><CalendarDays className="size-4"/> Xem lịch tài chính</Link><Link href="/accounts" className="inline-flex min-h-10 items-center gap-1.5 hover:text-[var(--primary)]"><WalletCards className="size-4"/> Tài khoản và ví</Link></nav>
  </div>;
}
