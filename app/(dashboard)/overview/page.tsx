import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, CalendarDays, Plus, WalletCards, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ReportDataStatus } from "@/components/report-data-status";
import { CashflowChart } from "@/components/cashflow-chart";
import { TransactionList } from "@/components/transaction-list";
import { CategoryIcon, iconColorValue } from "@/features/categories/icons";
import { loadReportLedger } from "@/features/reports/data";
import { monthBounds } from "@/features/reports/experience";
import { compactCalendarAmount } from "@/features/reports/compact-money";
import { currentMonthKey, monthTotals, sixMonthWindow, monthlyCashflowTotals, currencyDigits, expenseCategories } from "@/features/transactions/data";
import { requireUser } from "@/lib/auth";
import { measureServerOperation } from "@/lib/performance";
import { formatMinorMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tổng quan" };

async function OverviewEssentials() {
  const { supabase, userId } = await requireUser();
  const { data: pref } = await supabase.from("user_preferences").select("currency_code, timezone").eq("id", userId).maybeSingle();
  const currency = pref?.currency_code ?? "VND";
  const month = currentMonthKey(pref?.timezone ?? "Asia/Ho_Chi_Minh");
  const ledger = await measureServerOperation("overview.essentials", () => loadReportLedger(supabase, userId, { fromDate: `${month}-01`, toDate: monthBounds(month).to, includeAccounts: true, includeCategories: true }));
  const digits = currencyDigits(ledger.currencies, currency);
  const totals = monthTotals(ledger.transactions, currency, month);
  const accounts = ledger.accounts.filter((account) => !account.is_archived && ["cash", "bank", "ewallet"].includes(account.account_type));
  const balance = accounts.filter((account) => account.currency_code === currency).reduce((sum, account) => sum + account.current_balance_minor, 0);
  const categories = expenseCategories(ledger.transactions, currency, month).slice(0, 5);
  const categoryTotal = categories.reduce((sum, row) => sum + row.value, 0);
  const metrics = [
    { label: "Thu nhập", amount: totals.income, color: "text-emerald-500" },
    { label: "Chi tiêu", amount: totals.expense, color: "text-rose-500" },
    { label: "Ròng", amount: totals.net, color: totals.net < 0 ? "text-rose-500" : "text-sky-500" }
  ];
  return <>
    <span hidden data-fin-startup-ready />
    <ReportDataStatus diagnostics={ledger.diagnostics} />
    <Card className="fin-hero-card"><CardContent className="p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-[11px] font-semibold text-[var(--muted-foreground)]">Tổng số dư · {currency}</p><p className="mt-1 break-words text-[clamp(1.5rem,5.5vw,2.2rem)] font-extrabold leading-tight tabular-nums">{formatMinorMoney(balance, currency, digits)}</p><p className="mt-1 text-[10px] text-[var(--muted-foreground)]">{accounts.length} tài khoản khả dụng</p></div><Link href="/accounts" className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--sidebar-accent)] text-[var(--primary)]" aria-label="Xem các tài khoản"><WalletCards className="size-5" /></Link></div>
      <div className="fin-hero-metrics mt-4 grid grid-cols-3 gap-2 border-t border-[var(--border)] pt-4 sm:gap-3">{metrics.map((item) => <div key={item.label} className="min-w-0 rounded-lg bg-[var(--muted)]/35 px-2 py-2 sm:px-3" title={`${item.label}: ${formatMinorMoney(item.amount, currency, digits)}`}><p className="text-[10px] font-semibold text-[var(--muted-foreground)]">{item.label}</p><p className={`mt-1 whitespace-nowrap text-[clamp(11px,3vw,17px)] font-extrabold tabular-nums ${item.color}`}><span className="sm:hidden">{item.amount < 0 ? "−" : ""}{compactCalendarAmount(Math.abs(item.amount), digits) || "0"}</span><span className="hidden sm:inline">{formatMinorMoney(item.amount, currency, digits)}</span></p></div>)}</div>
    </CardContent></Card>
    <Card className="fin-overview-spend"><CardContent className="p-4 sm:p-5"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold">Chi tiêu tháng này</h2><Link href="/reports" className="text-[11px] font-semibold text-[var(--primary)]">Báo cáo</Link></div>{categories.length ? <div className="space-y-3">{categories.map((item) => <div key={item.label} className="flex min-w-0 items-center gap-2.5"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--muted)]" style={{ color: iconColorValue(item.icon_color) }}><CategoryIcon name={item.icon_name} className="size-4" /></span><div className="min-w-0 flex-1"><div className="flex items-baseline justify-between gap-2"><span className="truncate text-xs font-semibold">{item.label}</span><span className="shrink-0 text-[11px] font-bold tabular-nums">{formatMinorMoney(item.value, currency, digits)}</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--muted)]"><div className="h-full rounded-full" style={{ width: `${categoryTotal ? item.value / categoryTotal * 100 : 0}%`, backgroundColor: iconColorValue(item.icon_color) }} /></div></div></div>)}</div> : <p className="py-4 text-sm text-[var(--muted-foreground)]">Chưa có khoản chi tháng này.</p>}</CardContent></Card>
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
  return <Card className="fin-overview-chart"><CardContent className="p-4 sm:p-5"><div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-bold">Dòng tiền 6 tháng</h2><Link href="/reports/analysis" className="text-[11px] font-semibold text-[var(--primary)]">Phân tích</Link></div><CashflowChart data={series} decimalDigits={digits} /></CardContent></Card>;
}

async function OverviewRecent() {
  const { supabase, userId } = await requireUser();
  const { loadLedger } = await import("@/features/transactions/data");
  const ledger = await measureServerOperation("overview.recent", () => loadLedger(supabase, userId, { limit: 8 }));
  const recent = ledger.transactions.filter((tx) => tx.transaction_purpose === "standard" || (tx.transaction_type === "transfer" && tx.entries.some((entry) => entry.entry_role === "transfer_out") && tx.entries.some((entry) => entry.entry_role === "transfer_in"))).slice(0, 5);
  return <Card className="fin-overview-recent"><CardContent className="p-0"><div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3"><h2 className="text-sm font-bold">Giao dịch gần đây</h2><div className="flex gap-3"><Link href="/reports/calendar" className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--primary)]"><CalendarDays className="size-3.5" /> Lịch</Link><Link href="/transactions" className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--primary)]">Tất cả<ArrowRight className="size-3.5" /></Link></div></div><div className="p-2 sm:p-3"><TransactionList transactions={recent} currencies={ledger.currencies} /></div></CardContent></Card>;
}

function OverviewLoading({ height = "h-36" }: { height?: string }) { return <div aria-label="Đang tải số liệu" className={`${height} animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4`}><div className="h-3 w-28 rounded bg-[var(--muted)]" /><div className="mt-5 h-6 w-40 rounded bg-[var(--muted)]" /><div className="mt-5 h-3 w-4/5 rounded bg-[var(--muted)]" /></div>; }
export default function OverviewPage() {
  return <div className="fin-page-shell mx-auto max-w-[1160px] space-y-3 px-3 py-4 sm:px-5 lg:px-8 lg:py-6">
    <div className="flex items-center justify-between gap-2"><div><p className="text-[11px] font-semibold text-[var(--muted-foreground)]">Tài chính cá nhân</p><h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">Tổng quan</h1></div><div className="flex items-center gap-2"><Link href="/reports/analysis" className="fin-secondary-btn !min-h-9 !px-2 !text-xs sm:!px-3"><BarChart3 className="size-4" /><span className="hidden sm:inline">Báo cáo tài chính</span></Link><Link className="fin-primary-btn !min-h-9 !px-3 !text-xs" href="/transactions?new=expense"><Plus className="size-4" /> Ghi khoản chi</Link></div></div>
    <Suspense fallback={<><OverviewLoading /><OverviewLoading height="h-32" /></>}><OverviewEssentials /></Suspense>
    <Suspense fallback={<OverviewLoading height="h-44" />}><OverviewTrends /></Suspense>
    <Suspense fallback={<OverviewLoading height="h-24" />}><OverviewRecent /></Suspense>
  </div>;
}
