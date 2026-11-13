import Link from "next/link";
import { Suspense } from "react";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, BarChart3, CalendarDays, ChevronRight, CircleDollarSign, Plus, Sparkles, WalletCards } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ReportDataStatus } from "@/components/report-data-status";
import { CashflowChart } from "@/components/cashflow-chart";
import { TransactionList } from "@/components/transaction-list";
import { CategoryIcon, iconColorValue } from "@/features/categories/icons";
import { loadReportLedger } from "@/features/reports/data";
import { monthBounds } from "@/features/reports/experience";
import { compactCalendarAmount } from "@/features/reports/compact-money";
import { currentDateKey, currentMonthKey, monthTotals, sixMonthWindow, monthlyCashflowTotals, currencyDigits, expenseCategories, transactionEntry } from "@/features/transactions/data";
import { requireUser } from "@/lib/auth";
import { measureServerOperation } from "@/lib/performance";
import { formatMinorMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tổng quan" };

async function OverviewEssentials() {
  const { supabase, userId } = await requireUser();
  const { data: pref } = await supabase.from("user_preferences").select("currency_code, timezone").eq("id", userId).maybeSingle();
  const currency = pref?.currency_code ?? "VND";
  const timeZone = pref?.timezone ?? "Asia/Ho_Chi_Minh";
  const month = currentMonthKey(timeZone);
  const today = currentDateKey(timeZone);
  const ledger = await measureServerOperation("overview.essentials", () => loadReportLedger(supabase, userId, { fromDate: `${month}-01`, toDate: monthBounds(month).to, includeAccounts: true, includeCategories: true }));
  const digits = currencyDigits(ledger.currencies, currency);
  const totals = monthTotals(ledger.transactions, currency, month);
  const accounts = ledger.accounts.filter((account) => !account.is_archived && ["cash", "bank", "ewallet"].includes(account.account_type));
  const matchingAccounts = accounts.filter((account) => account.currency_code === currency);
  const balance = matchingAccounts.reduce((sum, account) => sum + account.current_balance_minor, 0);
  const categories = expenseCategories(ledger.transactions, currency, month).slice(0, 5);
  // Percentages are calculated against ALL category spending by expenseCategories, before Top 5.
  // Never re-normalize to the visible cards.
  // Reuse the month ledger: today is a strict date filter, never a second query.
  // Exclude transfers, archived/legacy purposes and other currencies from spending.
  const todayExpenses = ledger.transactions.flatMap((tx) => {
    if (tx.transaction_date !== today || tx.transaction_type !== "expense" || tx.transaction_purpose !== "standard") return [];
    const entry = transactionEntry(tx, "expense");
    return entry?.currency_code === currency ? [{ tx, amount: Math.abs(entry.amount_minor) }] : [];
  });
  const todayTotal = todayExpenses.reduce((sum, item) => sum + item.amount, 0);
  const todayCategories = expenseCategories(ledger.transactions, currency, today).slice(0, 5);
  // Same full-day denominator is already used in each item.percent.
  const todayTransactionsHref = `/transactions?type=expense&from=${today}&to=${today}`;
  const metrics = [
    { label: "Thu nhập", amount: totals.income, tone: "income", icon: ArrowDownLeft, prefix: "+" },
    { label: "Chi tiêu", amount: totals.expense, tone: "expense", icon: ArrowUpRight, prefix: "−" },
    { label: "Dòng tiền ròng", amount: totals.net, tone: "net", icon: CircleDollarSign, prefix: "" }
  ];
  return <>
    <span hidden data-fin-startup-ready />
    <ReportDataStatus diagnostics={ledger.diagnostics} />
    <Card className="fin-hero-card fin-dashboard-hero overflow-hidden"><CardContent className="relative p-4 sm:p-6 lg:p-7">
      <div className="fin-hero-glow pointer-events-none absolute -right-20 -top-24 size-64 rounded-full" aria-hidden="true" />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1"><p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--fin-hero-muted)]"><WalletCards className="size-4" />Số dư khả dụng · {currency}</p><p className="fin-hero-balance mt-2 break-words text-[clamp(1.65rem,6vw,2.75rem)] font-extrabold leading-tight tracking-[-.045em] tabular-nums">{formatMinorMoney(balance, currency, digits)}</p><p className="mt-2 text-xs text-[var(--fin-hero-muted)]">Tổng hợp {matchingAccounts.length} tài khoản {currency} đang hoạt động</p></div>
        <Link href="/accounts" className="fin-hero-accounts inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold" aria-label="Xem tài khoản và số dư">Tài khoản <ChevronRight className="size-4"/></Link>
      </div>
      <div className="fin-hero-metrics relative mt-5 grid grid-cols-3 gap-2 border-t pt-4 sm:mt-6 sm:gap-3">
        {metrics.map((item) => { const Icon = item.icon; return <div key={item.label} className="fin-hero-metric min-w-0 rounded-xl px-2.5 py-3 sm:px-4" data-tone={item.tone} title={`${item.label}: ${formatMinorMoney(item.amount, currency, digits)}`}>
          <div className="flex items-center gap-1.5"><Icon className="size-3.5 shrink-0" aria-hidden="true"/><span className="truncate text-[10px] font-semibold sm:text-xs">{item.label}</span></div>
          <p className="mt-2 whitespace-nowrap text-[clamp(.75rem,2.9vw,1.25rem)] font-extrabold tracking-[-.025em] tabular-nums"><span className="sm:hidden">{item.amount < 0 ? "−" : item.prefix}{compactCalendarAmount(Math.abs(item.amount), digits) || "0"}</span><span className="hidden sm:inline">{formatMinorMoney(item.amount, currency, digits)}</span></p>
        </div>; })}
      </div>
    </CardContent></Card>
    <Card className="fin-overview-today fin-dashboard-card"><CardContent className="p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div><p className="fin-section-eyebrow">CHI TIÊU TRONG NGÀY</p><h2 className="mt-1 text-base font-extrabold">Chi tiêu hôm nay</h2>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">{today.split("-").reverse().join("/")} · {todayExpenses.length} khoản chi</p>
        </div>
        <Link href={todayTransactionsHref} className="fin-text-action shrink-0">Xem tất cả <ArrowRight className="size-3.5"/></Link>
      </div>
      <p className="mb-4 text-[clamp(1.5rem,5.3vw,2rem)] font-extrabold tracking-tight tabular-nums text-[var(--fin-expense)]" aria-label={`Tổng chi hôm nay ${formatMinorMoney(todayTotal, currency, digits)}`}>
        {formatMinorMoney(todayTotal, currency, digits)}
      </p>
      {todayExpenses.length ? <>
        <p className="mb-3 text-xs font-bold text-[var(--muted-foreground)]">Theo danh mục</p>
        <div className="space-y-3">{todayCategories.map((item) => <div key={item.label} className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--muted)]" style={{ color: iconColorValue(item.icon_color) }}><CategoryIcon name={item.icon_name} className="size-4.5"/></span>
          <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-bold">{item.label}</span><span className="shrink-0 text-xs font-extrabold tabular-nums">{formatMinorMoney(item.value, currency, digits)}</span></div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--muted)]"><div className="h-full rounded-full" style={{ width: `${item.percent}%`, backgroundColor: iconColorValue(item.icon_color) }}/></div>
          </div>
        </div>)}</div>
        <details className="fin-today-expense-details group mt-4 border-t border-[var(--border)] pt-3">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-2 py-2 text-xs font-bold text-[var(--foreground)] hover:bg-[var(--muted)]/60 focus-visible:outline-2 focus-visible:outline-[var(--primary)] [&::-webkit-details-marker]:hidden" aria-label="Mở hoặc thu gọn các khoản đã chi hôm nay">
            <span>Các khoản đã chi ({todayExpenses.length})</span><ChevronRight className="size-4 text-[var(--muted-foreground)] transition-transform group-open:rotate-90"/>
          </summary>
          <div className="space-y-0">{todayExpenses.slice(0, 5).map(({ tx, amount }) => <div key={tx.id} className="fin-today-expense-row flex min-w-0 items-center justify-between gap-3 py-2.5">
            <div className="min-w-0"><p className="truncate text-sm font-semibold" title={tx.title}>{tx.title}</p><p className="truncate text-[11px] text-[var(--muted-foreground)]">{tx.category?.name ?? tx.category_label ?? "Chưa phân loại"}</p></div>
            <span className="shrink-0 text-xs font-extrabold tabular-nums">−{formatMinorMoney(amount, currency, digits)}</span>
          </div>)}</div>
          {todayExpenses.length > 5 && <Link href={todayTransactionsHref} className="fin-text-action mt-2">Xem thêm {todayExpenses.length - 5} khoản chi <ArrowRight className="size-3.5"/></Link>}
        </details>
      </> : <div className="fin-empty-card"><Sparkles className="mb-2 size-5 text-[var(--primary)]"/><p className="text-sm font-semibold">Hôm nay chưa có khoản chi</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">Giao dịch chi tiêu hôm nay sẽ xuất hiện tại đây.</p></div>}
    </CardContent></Card>
    <Card className="fin-overview-spend fin-dashboard-card"><CardContent className="p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2"><div><p className="fin-section-eyebrow">PHÂN BỔ NGÂN SÁCH</p><h2 className="mt-1 text-base font-extrabold">Chi tiêu tháng này</h2></div><Link href="/reports?type=expense" className="fin-text-action">Xem báo cáo <ArrowRight className="size-3.5"/></Link></div>
      {categories.length ? <div className="space-y-4">{categories.map((item) => <div key={item.label} className="flex min-w-0 items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--muted)]" style={{ color: iconColorValue(item.icon_color) }}><CategoryIcon name={item.icon_name} className="size-5" /></span>
        <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-bold">{item.label}</span><span className="shrink-0 text-xs font-extrabold tabular-nums">{formatMinorMoney(item.value, currency, digits)}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--muted)]"><div className="fin-bar-progress h-full rounded-full" style={{ width: `${item.percent}%`, backgroundColor: iconColorValue(item.icon_color) }} /></div></div>
      </div>)}</div> : <div className="fin-empty-card"><Sparkles className="mb-2 size-5 text-[var(--primary)]"/><p className="text-sm font-semibold">Chưa có khoản chi tháng này</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">Các danh mục sẽ xuất hiện khi có giao dịch.</p></div>}
    </CardContent></Card>
  </>;
}

async function OverviewTrends() {
  const { supabase, userId } = await requireUser();
  const { data: pref } = await supabase.from("user_preferences").select("currency_code, timezone").eq("id", userId).maybeSingle();
  const currency = pref?.currency_code ?? "VND";
  const months = sixMonthWindow(pref?.timezone ?? "Asia/Ho_Chi_Minh");
  const ledger = await measureServerOperation("overview.trends", () => loadReportLedger(supabase, userId, { fromDate: `${months[0].key}-01`, toDate: monthBounds(months[5].key).to }));
  const digits = currencyDigits(ledger.currencies, currency);
  const grouped = monthlyCashflowTotals(ledger.transactions, currency, months.map((month) => month.key));
  const series = months.map((month) => ({ month: month.label, ...(grouped.get(month.key) ?? { income: 0, expense: 0, net: 0 }) }));
  return <Card className="fin-overview-chart fin-dashboard-card"><CardContent className="p-4 sm:p-5">
    <div className="mb-4 flex items-start justify-between gap-2"><div><p className="fin-section-eyebrow">XU HƯỚNG TÀI CHÍNH</p><h2 className="mt-1 text-base font-extrabold">Dòng tiền 6 tháng</h2></div><Link href="/reports/analysis" className="fin-text-action">Phân tích <ArrowRight className="size-3.5"/></Link></div>
    <CashflowChart data={series} decimalDigits={digits} currency={currency}/>
  </CardContent></Card>;
}

async function OverviewRecent() {
  const { supabase, userId } = await requireUser();
  const { loadLedger } = await import("@/features/transactions/data");
  const ledger = await measureServerOperation("overview.recent", () => loadLedger(supabase, userId, { limit: 8 }));
  const recent = ledger.transactions.filter((tx) => tx.transaction_purpose === "standard" || (tx.transaction_type === "transfer" && tx.entries.some((entry) => entry.entry_role === "transfer_out") && tx.entries.some((entry) => entry.entry_role === "transfer_in"))).slice(0, 5);
  return <Card className="fin-overview-recent fin-dashboard-card"><CardContent className="p-0">
    <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-4 sm:px-5"><div><p className="fin-section-eyebrow">HOẠT ĐỘNG GẦN ĐÂY</p><h2 className="mt-1 text-base font-extrabold">Giao dịch mới nhất</h2></div><Link href="/transactions" className="fin-text-action">Tất cả <ArrowRight className="size-3.5"/></Link></div>
    {recent.length ? <div className="px-2 py-2 sm:p-3"><TransactionList transactions={recent} currencies={ledger.currencies} /></div> : <div className="fin-empty-card mx-4 my-4"><p className="text-sm font-semibold">Chưa có giao dịch</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">Bắt đầu ghi nhận Thu/Chi để theo dõi tài chính.</p></div>}
  </CardContent></Card>;
}

function OverviewLoading({ height = "h-36" }: { height?: string }) { return <div aria-label="Đang tải số liệu" className={`fin-skeleton-card ${height} rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4`}><div className="fin-skeleton h-3 w-28 rounded" /><div className="fin-skeleton mt-5 h-6 w-40 rounded" /><div className="fin-skeleton mt-5 h-3 w-4/5 rounded" /></div>; }

export default function OverviewPage() {
  return <div className="fin-page-shell fin-dashboard-page mx-auto max-w-[1160px] space-y-4 px-3 py-4 sm:px-5 lg:px-8 lg:py-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="fin-section-eyebrow">FINZARO / PERSONAL FINANCE</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Tổng quan tài chính</h1><p className="mt-1 text-xs text-[var(--muted-foreground)]">Theo dõi số dư, thu chi và hoạt động gần nhất.</p></div><div className="flex items-center gap-2"><Link href="/reports/analysis" className="fin-secondary-btn !min-h-10 !px-3 !text-xs"><BarChart3 className="size-4"/><span className="hidden sm:inline">Phân tích</span></Link><Link className="fin-primary-btn !min-h-10 !px-3 !text-xs" href="/transactions?new=expense"><Plus className="size-4"/> Thêm giao dịch</Link></div></header>
    <Suspense fallback={<><OverviewLoading height="h-48" /><OverviewLoading height="h-52" /></>}><OverviewEssentials /></Suspense>
    <Suspense fallback={<OverviewLoading height="h-64" />}><OverviewTrends /></Suspense>
    <Suspense fallback={<OverviewLoading height="h-48" />}><OverviewRecent /></Suspense>
    <nav className="flex items-center justify-center gap-4 pb-2 text-xs font-semibold text-[var(--muted-foreground)]" aria-label="Lối tắt tài chính"><Link href="/reports/calendar" className="inline-flex min-h-10 items-center gap-1.5 hover:text-[var(--primary)]"><CalendarDays className="size-4"/> Xem lịch tài chính</Link><Link href="/accounts" className="inline-flex min-h-10 items-center gap-1.5 hover:text-[var(--primary)]"><WalletCards className="size-4"/> Tài khoản và ví</Link></nav>
  </div>;
}
