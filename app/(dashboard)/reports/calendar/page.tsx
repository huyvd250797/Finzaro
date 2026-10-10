import Link from "next/link";
import { ChevronLeft, ChevronRight, CircleDollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ReportNavigation } from "@/components/report-navigation";
import { CategoryIcon, iconColorValue } from "@/features/categories/icons";
import {
  currentYearMonth,
  dailyFlowTotals,
  flowAmount,
  monthBounds,
  periodFlowTotals,
  shiftMonthKey,
  validMonthKey
} from "@/features/reports/experience";
import { currencyDigits, loadLedger } from "@/features/transactions/data";
import { requireUser } from "@/lib/auth";
import { cn, formatMinorMoney } from "@/lib/utils";

export const metadata = { title: "Lịch thu chi" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isoDay(monthKey: string, day: number) {
  return `${monthKey}-${String(day).padStart(2, "0")}`;
}

function validSelectedDay(value: string | undefined, monthKey: string, days: number, fallbackDay: number) {
  if (value && value.startsWith(`${monthKey}-`)) {
    const day = Number(value.slice(8, 10));
    if (Number.isInteger(day) && day >= 1 && day <= days) return value;
  }
  return isoDay(monthKey, Math.min(Math.max(1, fallbackDay), days));
}

function signedMoney(value: number, sign: "+" | "-", currency: string, digits: number) {
  return `${sign}${formatMinorMoney(value, currency, digits).replace(/^[-+]/, "")}`;
}

export default async function ReportCalendarPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const params = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, one(value)])) as Record<string, string | undefined>;
  const { supabase, userId } = await requireUser();
  const { data: preferences } = await supabase.from("user_preferences").select("currency_code, timezone").eq("id", userId).maybeSingle();
  const currency = preferences?.currency_code ?? "VND";
  const timeZone = preferences?.timezone ?? "Asia/Ho_Chi_Minh";
  const now = currentYearMonth(timeZone);
  const currentMonth = `${now.year}-${String(now.month).padStart(2, "0")}`;
  const period = validMonthKey(params.period, currentMonth);
  const bounds = monthBounds(period);
  const fallbackDay = period === currentMonth ? now.day : 1;
  const selectedDay = validSelectedDay(params.day, period, bounds.days, fallbackDay);

  const ledger = await loadLedger(supabase, userId, { fromDate: bounds.from, toDate: bounds.to, limit: 10000 });
  const digits = currencyDigits(ledger.currencies, currency);
  const totals = periodFlowTotals(ledger.transactions, currency);
  const daily = dailyFlowTotals(ledger.transactions, currency, period);
  const selectedTransactions = ledger.transactions.filter((item) => item.transaction_date === selectedDay && (flowAmount(item, currency, "income") > 0 || flowAmount(item, currency, "expense") > 0));

  const firstWeekday = new Date(`${period}-01T00:00:00Z`).getUTCDay();
  const leading = firstWeekday === 0 ? 6 : firstWeekday - 1;
  const previousPeriod = shiftMonthKey(period, -1);
  const previousDays = monthBounds(previousPeriod).days;
  const cells = Array.from({ length: 42 }, (_, index) => {
    const dayOffset = index - leading + 1;
    if (dayOffset < 1) return { current: false, day: previousDays + dayOffset, key: `prev-${index}` };
    if (dayOffset > bounds.days) return { current: false, day: dayOffset - bounds.days, key: `next-${index}` };
    const date = isoDay(period, dayOffset);
    return { current: true, day: dayOffset, date, key: date };
  });

  return (
    <div className="mx-auto max-w-[1180px] px-3 py-5 sm:px-4 md:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-3xl text-center"><h1 className="text-2xl font-black tracking-tight sm:text-3xl">Báo cáo</h1><p className="mt-1 text-xs text-[var(--muted-foreground)]">Thu và chi hiển thị trực tiếp theo từng ngày; giá trị 0 không hiển thị.</p></div>
      <div className="mx-auto mt-5 max-w-3xl"><ReportNavigation active="calendar" /></div>

      <Card className="mx-auto mt-4 max-w-3xl"><CardContent className="flex items-center gap-3 p-2 sm:p-3">
        <Link href={`/reports/calendar?period=${previousPeriod}`} aria-label="Tháng trước" className="grid size-11 shrink-0 place-items-center rounded-xl hover:bg-[var(--muted)]"><ChevronLeft className="size-5" /></Link>
        <div className="min-w-0 flex-1 text-center"><p className="text-base font-black sm:text-lg">Tháng {bounds.month}/{bounds.year}</p><p className="mt-0.5 text-[10px] font-bold text-[var(--muted-foreground)]">{bounds.from} → {bounds.to}</p></div>
        <Link href={`/reports/calendar?period=${shiftMonthKey(period, 1)}`} aria-label="Tháng sau" className="grid size-11 shrink-0 place-items-center rounded-xl hover:bg-[var(--muted)]"><ChevronRight className="size-5" /></Link>
      </CardContent></Card>

      <Card className="mt-4 overflow-hidden"><CardContent className="p-2 sm:p-4">
        <div className="grid grid-cols-7">{WEEKDAYS.map((day) => <div key={day} className="py-2 text-center text-[10px] font-black text-[var(--muted-foreground)] sm:text-xs">{day}</div>)}</div>
        <div className="grid grid-cols-7 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--border)] gap-px">
          {cells.map((cell) => {
            if (!cell.current || !cell.date) return <div key={cell.key} className="min-h-[78px] bg-[var(--background)] p-1.5 opacity-35 sm:min-h-[96px] sm:p-2"><p className="text-center text-[11px] font-bold text-[var(--muted-foreground)] sm:text-xs">{cell.day}</p></div>;
            const values = daily.get(cell.date) ?? { income: 0, expense: 0 };
            const selected = cell.date === selectedDay;
            return <Link key={cell.key} href={`/reports/calendar?period=${period}&day=${cell.date}`} className={cn("min-h-[78px] min-w-0 bg-[var(--card)] p-1.5 transition active:opacity-75 sm:min-h-[96px] sm:p-2", selected && "bg-sky-500/15 ring-2 ring-inset ring-sky-500")}>
              <p className={cn("text-center text-[11px] font-black sm:text-xs", selected ? "text-sky-500" : "text-[var(--foreground)]")}>{cell.day}</p>
              <div className="mt-2 space-y-1 text-right">
                {values.income > 0 && <p className="truncate text-[9px] font-black leading-3 text-emerald-500 sm:text-[11px]">{signedMoney(values.income, "+", currency, digits)}</p>}
                {values.expense > 0 && <p className="truncate text-[9px] font-black leading-3 text-rose-500 sm:text-[11px]">{signedMoney(values.expense, "-", currency, digits)}</p>}
              </div>
            </Link>;
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] font-bold text-[var(--muted-foreground)]"><span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-500" />Thu nhập</span><span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-rose-500" />Chi tiêu</span><span className="ml-auto">0đ được ẩn</span></div>
      </CardContent></Card>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Card className="border-emerald-500/20 bg-emerald-500/[.035]"><CardContent className="p-4"><TrendingUp className="size-5 text-emerald-500" /><p className="mt-3 text-xs font-bold text-[var(--muted-foreground)]">Thu nhập</p><p className="mt-1 break-words text-xl font-black text-emerald-500">{formatMinorMoney(totals.income, currency, digits)}</p></CardContent></Card>
        <Card className="border-rose-500/20 bg-rose-500/[.035]"><CardContent className="p-4"><TrendingDown className="size-5 text-rose-500" /><p className="mt-3 text-xs font-bold text-[var(--muted-foreground)]">Chi tiêu</p><p className="mt-1 break-words text-xl font-black text-rose-500">{formatMinorMoney(totals.expense, currency, digits)}</p></CardContent></Card>
        <Card className="border-sky-500/20 bg-sky-500/[.035]"><CardContent className="p-4"><CircleDollarSign className="size-5 text-sky-500" /><p className="mt-3 text-xs font-bold text-[var(--muted-foreground)]">Ròng</p><p className={cn("mt-1 break-words text-xl font-black", totals.net < 0 ? "text-rose-500" : "text-sky-500")}>{formatMinorMoney(totals.net, currency, digits)}</p></CardContent></Card>
      </div>

      <Card className="mt-4 overflow-hidden">
        <CardContent className="p-0">
          <div className="border-b border-[var(--border)] p-4"><h2 className="text-lg font-black">{selectedDay.split("-").reverse().join("/")}</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">{selectedTransactions.length} giao dịch thu/chi</p></div>
          {selectedTransactions.length === 0 ? <p className="p-6 text-sm text-[var(--muted-foreground)]">Ngày này chưa có giao dịch thu/chi.</p> : <div className="divide-y divide-[var(--border)]">{selectedTransactions.map((transaction) => {
            const income = flowAmount(transaction, currency, "income");
            const expense = flowAmount(transaction, currency, "expense");
            const isIncome = income > 0;
            const amount = isIncome ? income : expense;
            return <Link key={transaction.id} href={`/transactions?q=${encodeURIComponent(transaction.title)}`} className="flex min-w-0 items-center gap-3 p-4 active:bg-[var(--muted)]"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--muted)]" style={{ color: iconColorValue(transaction.category?.icon_color) }}><CategoryIcon name={transaction.category?.icon_name} className="size-[18px]" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-black">{transaction.category?.name ?? transaction.category_label ?? transaction.title}</span><span className="mt-0.5 block truncate text-xs text-[var(--muted-foreground)]">{transaction.title}{transaction.notes ? ` · ${transaction.notes}` : ""}</span></span><span className={cn("shrink-0 text-sm font-black", isIncome ? "text-emerald-500" : "text-rose-500")}>{signedMoney(amount, isIncome ? "+" : "-", currency, digits)}</span><ChevronRight className="size-4 shrink-0 text-[var(--muted-foreground)]" /></Link>;
          })}</div>}
        </CardContent>
      </Card>
    </div>
  );
}
