import { BarChart3, LockKeyhole, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CashflowChart } from "@/components/cashflow-chart";
import { requireUser } from "@/lib/auth";
import { cashflowSeries, currentMonthKey, currencyDigits, loadLedger, monthTotals, sixMonthWindow } from "@/features/transactions/data";
import { formatMinorMoney } from "@/lib/utils";

export default async function ReportsPage() {
  const { supabase, userId } = await requireUser();
  const { data: preferences } = await supabase.from("user_preferences").select("currency_code, timezone").eq("id", userId).maybeSingle();
  const defaultCurrency = preferences?.currency_code ?? "VND";
  const timeZone = preferences?.timezone ?? "Asia/Ho_Chi_Minh";
  const months = sixMonthWindow(timeZone);
  const ledger = await loadLedger(supabase, userId, { fromDate: `${months[0].key}-01`, limit: 1000 });
  const digits = currencyDigits(ledger.currencies, defaultCurrency);
  const current = monthTotals(ledger.transactions, defaultCurrency, currentMonthKey(timeZone));
  const savingsRate = current.income > 0 ? Math.round((current.net / current.income) * 1000) / 10 : null;
  const series = cashflowSeries(ledger.transactions, defaultCurrency, timeZone);

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <div><p className="text-sm font-semibold text-[var(--primary)]">Analytics · Ledger Snapshot</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Báo cáo</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">V0.0.4 đã dùng dữ liệu giao dịch thật cho cash flow cơ bản; báo cáo nâng cao vẫn nằm trong roadmap.</p></div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_.8fr]">
        <Card><CardContent><div className="mb-5 flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-[var(--muted)] text-[var(--primary)]"><BarChart3 className="size-5" /></div><div><h2 className="font-bold">Xu hướng dòng tiền · {defaultCurrency}</h2><p className="text-xs text-[var(--muted-foreground)]">6 tháng từ Transaction Core</p></div></div><CashflowChart data={series} decimalDigits={digits} /></CardContent></Card>
        <div className="grid gap-4">
          <Card><CardContent><TrendingUp className="size-5 text-[var(--primary)]" /><p className="mt-4 text-sm text-[var(--muted-foreground)]">Savings rate tháng này</p><p className="mt-1 text-3xl font-black">{savingsRate === null ? "—" : `${savingsRate}%`}</p><p className="mt-2 text-xs text-[var(--muted-foreground)]">Net cash flow: {formatMinorMoney(current.net, defaultCurrency, digits)}</p></CardContent></Card>
          <Card><CardContent><LockKeyhole className="size-5 text-[var(--primary)]" /><h2 className="mt-4 font-bold">Advanced reports</h2><p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">Net worth, forecast, credit utilization và debt overview sẽ được triển khai ở các release sau.</p></CardContent></Card>
        </div>
      </div>
    </div>
  );
}
