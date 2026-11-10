import Link from "next/link";
import { ArrowRight, Plus, WalletCards, CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ReportDataStatus } from "@/components/report-data-status";
import { CashflowChart } from "@/components/cashflow-chart";
import { TransactionList } from "@/components/transaction-list";
import { CategoryIcon, iconColorValue } from "@/features/categories/icons";
import { loadReportLedger } from "@/features/reports/data";
import { monthBounds } from "@/features/reports/experience";
import { compactCalendarAmount } from "@/features/reports/compact-money";
import { currentMonthKey, monthTotals, sixMonthWindow, currencyDigits, expenseCategories } from "@/features/transactions/data";
import { requireUser } from "@/lib/auth";
import { measureServerOperation } from "@/lib/performance";
import { formatMinorMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tổng quan" };

export default async function OverviewPage() {
  const { supabase, userId } = await requireUser();
  const { data: pref } = await supabase.from("user_preferences").select("currency_code, timezone").eq("id", userId).maybeSingle();
  const currency = pref?.currency_code ?? "VND";
  const timeZone = pref?.timezone ?? "Asia/Ho_Chi_Minh";
  const months = sixMonthWindow(timeZone);
  const currentMonth = currentMonthKey(timeZone);
  const ledger = await measureServerOperation("overview.load", () => loadReportLedger(supabase, userId, {
    fromDate: `${months[0].key}-01`, toDate: monthBounds(currentMonth).to, includeAccounts: true, includeCategories: true
  }));
  const digits = currencyDigits(ledger.currencies, currency);
  const totals = monthTotals(ledger.transactions, currency, currentMonth);
  const accounts = ledger.accounts.filter((account) => !account.is_archived && ["cash", "bank", "ewallet"].includes(account.account_type));
  const legacyCount = ledger.accounts.filter((account) => !account.is_archived && !["cash", "bank", "ewallet"].includes(account.account_type)).length;
  const balance = accounts.filter((account) => account.currency_code === currency).reduce((sum, account) => sum + account.current_balance_minor, 0);
  const series = months.map((month) => ({ month: month.label, ...monthTotals(ledger.transactions, currency, month.key) }));
  const categories = expenseCategories(ledger.transactions, currency, currentMonth).slice(0, 5);
  const categoryTotal = categories.reduce((sum, item) => sum + item.value, 0);
  const recent = ledger.transactions.filter((tx) => tx.transaction_purpose === "standard" ||
    (tx.transaction_type === "transfer" && tx.entries.some((entry) => entry.entry_role === "transfer_out") && tx.entries.some((entry) => entry.entry_role === "transfer_in"))).slice(0, 5);
  const metrics = [
    { label: "Thu nhập", value: totals.income, color: "text-emerald-500" },
    { label: "Chi tiêu", value: totals.expense, color: "text-rose-500" },
    { label: "Ròng", value: totals.net, color: totals.net < 0 ? "text-rose-500" : "text-sky-500" }
  ];

  return (
    <div className="mx-auto max-w-[1160px] space-y-3 px-3 py-4 sm:px-5 lg:px-8 lg:py-6">
      <div className="flex items-center justify-between gap-2">
        <div><p className="text-[11px] font-semibold text-[var(--muted-foreground)]">Tài chính cá nhân</p><h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">Tổng quan</h1></div>
        <Link className="fin-primary-btn !min-h-9 !px-3 !text-xs" href="/transactions?new=expense"><Plus className="size-4"/> Ghi khoản chi</Link>
      </div>
      <ReportDataStatus diagnostics={ledger.diagnostics} />

      <Card className="overflow-hidden border-[var(--border)]">
        <CardContent className="p-3.5 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0"><p className="text-[11px] font-semibold text-[var(--muted-foreground)]">Tổng số dư · {currency}</p>
              <p className="mt-1 break-words text-[clamp(1.5rem,5.5vw,2.2rem)] font-extrabold leading-tight tabular-nums">{formatMinorMoney(balance, currency, digits)}</p>
              <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">{accounts.length} tài khoản khả dụng</p>
            </div>
            <Link href="/accounts" className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--sidebar-accent)] text-[var(--primary)]" aria-label="Xem các tài khoản"><WalletCards className="size-5" /></Link>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1.5 border-t border-[var(--border)] pt-3 sm:gap-3">
            {metrics.map((item) => <div key={item.label} className="min-w-0 rounded-lg bg-[var(--muted)]/35 px-2 py-2 sm:px-3" title={`${item.label}: ${formatMinorMoney(item.value, currency, digits)}`}>
              <p className="text-[10px] font-semibold text-[var(--muted-foreground)]">{item.label}</p>
              <p className={`mt-1 whitespace-nowrap text-[clamp(11px,3vw,17px)] font-extrabold tabular-nums ${item.color}`}><span className="sm:hidden">{item.value < 0 ? "-" : ""}{compactCalendarAmount(Math.abs(item.value), digits) || "0"}</span><span className="hidden sm:inline">{formatMinorMoney(item.value, currency, digits)}</span></p>
            </div>)}
          </div>
        </CardContent>
      </Card>

      {legacyCount > 0 && <p className="px-1 text-[11px] text-[var(--muted-foreground)]">{legacyCount} tài khoản cũ được bảo toàn nhưng không cộng vào số dư thông thường.</p>}

      <div className="grid gap-3 lg:grid-cols-2">
        <Card><CardContent className="p-3.5 sm:p-4">
          <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-bold">Dòng tiền 6 tháng</h2><Link href="/reports/analysis" className="text-[11px] font-semibold text-[var(--primary)]">Phân tích</Link></div>
          <CashflowChart data={series} decimalDigits={digits} />
        </CardContent></Card>
        <Card><CardContent className="p-3.5 sm:p-4">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold">Chi tiêu theo danh mục</h2><Link href="/reports" className="text-[11px] font-semibold text-[var(--primary)]">Báo cáo</Link></div>
          {categories.length === 0 ? <p className="py-5 text-sm text-[var(--muted-foreground)]">Chưa có khoản chi tháng này.</p> : <div className="space-y-3">
            {categories.map((item) => <div key={item.label} className="flex min-w-0 items-center gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--muted)]" style={{ color: iconColorValue(item.icon_color) }}><CategoryIcon name={item.icon_name} className="size-4" /></span>
              <div className="min-w-0 flex-1"><div className="flex items-baseline justify-between gap-2"><span className="truncate text-xs font-semibold">{item.label}</span><span className="shrink-0 text-[11px] font-bold tabular-nums">{formatMinorMoney(item.value, currency, digits)}</span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--muted)]"><div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, categoryTotal ? item.value / categoryTotal * 100 : 0))}%`, backgroundColor: iconColorValue(item.icon_color) }} /></div>
              </div>
            </div>)}
          </div>}
        </CardContent></Card>
      </div>

      <Card><CardContent className="p-0">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3"><h2 className="text-sm font-bold">Giao dịch gần đây</h2><div className="flex gap-3"><Link href="/reports/calendar" className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--primary)]"><CalendarDays className="size-3.5" /> Lịch</Link><Link href="/transactions" className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--primary)]">Tất cả<ArrowRight className="size-3.5" /></Link></div></div>
        <div className="p-2 sm:p-3"><TransactionList transactions={recent} currencies={ledger.currencies} /></div>
      </CardContent></Card>
    </div>
  );
}
