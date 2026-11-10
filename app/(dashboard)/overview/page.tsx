import Link from "next/link";
import { ArrowRight, Plus, WalletCards } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ReportDataStatus } from "@/components/report-data-status";
import { CashflowChart } from "@/components/cashflow-chart";
import { TransactionList } from "@/components/transaction-list";
import { CategoryIcon, iconColorValue } from "@/features/categories/icons";
import { loadReportLedger } from "@/features/reports/data";
import { monthBounds } from "@/features/reports/experience";
import { currentMonthKey, monthTotals, sixMonthWindow, currencyDigits, expenseCategories, transactionEntry } from "@/features/transactions/data";
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
  const ledger = await measureServerOperation("overview.load", () => loadReportLedger(supabase, userId, { fromDate: `${months[0].key}-01`, toDate: monthBounds(currentMonthKey(timeZone)).to, includeAccounts: true, includeCategories: true }));
  const digits = currencyDigits(ledger.currencies, currency);
  const totals = monthTotals(ledger.transactions, currency, currentMonthKey(timeZone));
  const accounts = ledger.accounts.filter(a => !a.is_archived && ["cash", "bank", "ewallet"].includes(a.account_type));
  const legacyAccounts = ledger.accounts.filter(a => !a.is_archived && !["cash", "bank", "ewallet"].includes(a.account_type));
  const balance = accounts.filter(a => a.currency_code === currency).reduce((sum,a) => sum + a.current_balance_minor, 0);
  const series = months.map(m => ({ month: m.label, ...monthTotals(ledger.transactions, currency, m.key) }));
  const categories = expenseCategories(ledger.transactions, currency, currentMonthKey(timeZone)).slice(0, 5);
  const recent = ledger.transactions
    .filter(tx => tx.transaction_purpose === "standard" || (tx.transaction_type === "transfer" && tx.entries.some(entry => entry.entry_role === "transfer_out") && tx.entries.some(entry => entry.entry_role === "transfer_in")))
    .slice(0, 6);
  return <div className="mx-auto max-w-[1200px] px-3 py-5 md:px-6 lg:px-8 lg:py-8">
    <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold text-[var(--primary)]">Finzaro · Thu chi cá nhân</p><h1 className="mt-1 text-2xl font-black">Tổng quan</h1></div><Link className="fin-primary-btn" href="/transactions?new=expense"><Plus className="size-4"/> Ghi khoản chi</Link></div>
    <ReportDataStatus diagnostics={ledger.diagnostics} />
    <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
      {[{label:"Thu nhập",value:totals.income,color:"text-emerald-500"},{label:"Chi tiêu",value:totals.expense,color:"text-rose-500"},{label:"Ròng",value:totals.net,color:totals.net<0?"text-rose-500":"text-sky-500"}].map(item=><Card key={item.label}><CardContent className="p-2.5 sm:p-4"><p className="text-[10px] font-bold text-[var(--muted-foreground)] sm:text-xs">{item.label}</p><p className={`mt-1 break-words text-[11px] font-black tabular-nums sm:text-lg ${item.color}`}>{formatMinorMoney(item.value,currency,digits)}</p></CardContent></Card>)}
    </div>
    <Card className="mt-3"><CardContent className="flex items-center justify-between gap-3 p-4"><div><p className="text-xs font-bold text-[var(--muted-foreground)]">Tổng số dư tài khoản · {currency}</p><p className="mt-1 text-2xl font-black">{formatMinorMoney(balance,currency,digits)}</p><p className="mt-1 text-[11px] text-[var(--muted-foreground)]">{accounts.length} tài khoản tiền mặt, ngân hàng và ví điện tử</p></div><Link href="/accounts" className="grid size-10 place-items-center rounded-xl bg-[var(--sidebar-accent)] text-[var(--primary)]" aria-label="Mở tài khoản"><WalletCards className="size-5" /></Link></CardContent></Card>
    {legacyAccounts.length > 0 && <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-[var(--muted-foreground)]">{legacyAccounts.length} tài khoản thuộc phiên bản cũ vẫn được bảo toàn trong lịch sử, không cộng vào số dư Thu Chi đơn giản. <Link href="/accounts" className="font-bold text-[var(--primary)]">Xem tài khoản</Link></div>}
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <Card><CardHeader><h2 className="font-black">Dòng tiền 6 tháng</h2></CardHeader><CardContent><CashflowChart data={series} decimalDigits={digits}/></CardContent></Card>
      <Card><CardHeader><div className="flex items-center justify-between"><h2 className="font-black">Chi tiêu theo danh mục</h2><Link href="/reports" className="text-xs font-bold text-[var(--primary)]">Chi tiết</Link></div></CardHeader><CardContent className="space-y-3">{categories.length===0?<p className="text-sm text-[var(--muted-foreground)]">Chưa có khoản chi tháng này.</p>:categories.map(row=><div key={row.label} className="flex items-center gap-3"><span style={{color:iconColorValue(row.icon_color)}}><CategoryIcon name={row.icon_name} className="size-5"/></span><span className="min-w-0 flex-1 truncate text-sm">{row.label}</span><span className="text-xs font-bold">{formatMinorMoney(row.value,currency,digits)}</span></div>)}</CardContent></Card>
    </div>
    <Card className="mt-4"><CardHeader><div className="flex items-center justify-between"><h2 className="font-black">Giao dịch gần đây</h2><Link href="/transactions" className="inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)]">Xem tất cả <ArrowRight className="size-3.5"/></Link></div></CardHeader><CardContent><TransactionList transactions={recent} currencies={ledger.currencies}/></CardContent></Card>
  </div>;
}
