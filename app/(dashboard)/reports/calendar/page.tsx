import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AuthMessage } from "@/components/auth-message";
import { ReportCalendarInteractive } from "@/components/report-calendar-interactive";
import { ReportNavigation } from "@/components/report-navigation";
import { Card, CardContent } from "@/components/ui/card";
import {
  currentYearMonth,
  dailyFlowTotals,
  monthBounds,
  periodFlowTotals,
  shiftMonthKey,
  validMonthKey
} from "@/features/reports/experience";
import { loadReportLedger } from "@/features/reports/data";
import { currencyDigits, loadLedger, transactionEntry } from "@/features/transactions/data";
import { requireUser } from "@/lib/auth";
import { formatMinorMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Lịch thu chi" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

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
  const currency = (preferences?.currency_code ?? "VND").toUpperCase();
  const timeZone = preferences?.timezone ?? "Asia/Ho_Chi_Minh";
  const now = currentYearMonth(timeZone);
  const currentMonth = `${now.year}-${String(now.month).padStart(2, "0")}`;
  const period = validMonthKey(params.period, currentMonth);
  const bounds = monthBounds(period);
  const fallbackDay = period === currentMonth ? now.day : 1;
  const selectedDay = validSelectedDay(params.day, period, bounds.days, fallbackDay);

  // Fast path: one canonical month-ledger load uses embedded entries/categories and
  // parallel metadata queries. The hardened Reports loader remains the compatibility
  // fallback for older Supabase schemas. Day changes are client-side after this.
  const ledger = await loadLedger(supabase, userId, { fromDate: bounds.from, toDate: bounds.to, fetchAll: true })
    .catch(() => loadReportLedger(supabase, userId, { fromDate: bounds.from, toDate: bounds.to }));
  const digits = currencyDigits(ledger.currencies, currency);
  const totals = periodFlowTotals(ledger.transactions, currency);
  const daily = dailyFlowTotals(ledger.transactions, currency, period);

  const firstWeekday = new Date(`${period}-01T00:00:00Z`).getUTCDay();
  const leading = firstWeekday === 0 ? 6 : firstWeekday - 1;
  const previousPeriod = shiftMonthKey(period, -1);
  const previousDays = monthBounds(previousPeriod).days;
  const cells = Array.from({ length: 42 }, (_, index) => {
    const dayOffset = index - leading + 1;
    if (dayOffset < 1) return { current: false, day: previousDays + dayOffset, key: `prev-${index}` };
    if (dayOffset > bounds.days) return { current: false, day: dayOffset - bounds.days, key: `next-${index}` };
    const date = isoDay(period, dayOffset);
    const values = daily.get(date) ?? { income: 0, expense: 0 };
    return { current: true, day: dayOffset, date, key: date, income: values.income, expense: values.expense };
  });

  const calendarTransactions = ledger.transactions.map((transaction) => {
    const income = transactionEntry(transaction, "income");
    const expense = transactionEntry(transaction, "expense");
    const transferOut = transactionEntry(transaction, "transfer_out");
    if (income && income.currency_code === currency) {
      const standardIncome = transaction.transaction_purpose === "standard";
      return {
        id: transaction.id,
        transactionType: transaction.transaction_type,
        transactionPurpose: transaction.transaction_purpose,
        date: transaction.transaction_date,
        title: transaction.title,
        notes: transaction.notes,
        categoryName: standardIncome ? (transaction.category?.name ?? transaction.category_label ?? "Thu nhập") : "Nguồn vay / ứng tiền",
        iconName: transaction.category?.icon_name ?? (standardIncome ? "ArrowDownLeft" : "Landmark"),
        iconColor: transaction.category?.icon_color ?? (standardIncome ? "#10b981" : "#0ea5e9"),
        amountLabel: standardIncome ? signedMoney(Math.abs(Number(income.amount_minor)), "+", currency, digits) : `↗ ${formatMinorMoney(Math.abs(Number(income.amount_minor)), currency, digits)}`,
        tone: standardIncome ? "income" as const : "transfer" as const,
        editable: transaction.transaction_type === "income" && standardIncome
      };
    }
    if (expense && expense.currency_code === currency) {
      return {
        id: transaction.id,
        transactionType: transaction.transaction_type,
        transactionPurpose: transaction.transaction_purpose,
        date: transaction.transaction_date,
        title: transaction.title,
        notes: transaction.notes,
        categoryName: transaction.category?.name ?? transaction.category_label ?? "Chi tiêu",
        iconName: transaction.category?.icon_name ?? "ArrowUpRight",
        iconColor: transaction.category?.icon_color ?? "#f43f5e",
        amountLabel: signedMoney(Math.abs(Number(expense.amount_minor)), "-", currency, digits),
        tone: "expense" as const,
        editable: transaction.transaction_type === "expense" && transaction.transaction_purpose === "standard"
      };
    }
    if (transferOut && transferOut.currency_code === currency) {
      return {
        id: transaction.id,
        transactionType: transaction.transaction_type,
        transactionPurpose: transaction.transaction_purpose,
        date: transaction.transaction_date,
        title: transaction.title,
        notes: transaction.notes,
        categoryName: "Chuyển tiền",
        iconName: "ArrowLeftRight",
        iconColor: "#0ea5e9",
        amountLabel: `↔ ${formatMinorMoney(Math.abs(Number(transferOut.amount_minor)), currency, digits)}`,
        tone: "transfer" as const,
        editable: false
      };
    }
    return null;
  }).filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <div className="mx-auto max-w-[1180px] px-2.5 py-4 sm:px-4 md:px-6 lg:px-8 lg:py-7">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Báo cáo</h1>
        <p className="mt-1 hidden text-xs text-[var(--muted-foreground)] sm:block">Chạm ngày để xem ngay · chạm 2 lần để thêm giao dịch.</p>
      </div>
      <div className="mx-auto mt-3 max-w-3xl"><ReportNavigation active="calendar" /></div>
      <AuthMessage error={params.error} message={params.message} />

      <Card className="mx-auto mt-3 max-w-3xl">
        <CardContent className="flex items-center gap-2 p-2">
          <Link prefetch href={`/reports/calendar?period=${previousPeriod}`} aria-label="Tháng trước" className="grid size-8 shrink-0 place-items-center rounded-lg hover:bg-[var(--muted)]"><ChevronLeft className="size-4" /></Link>
          <div className="min-w-0 flex-1 text-center"><p className="text-sm font-black sm:text-base">Tháng {bounds.month}/{bounds.year}</p></div>
          <Link prefetch href={`/reports/calendar?period=${shiftMonthKey(period, 1)}`} aria-label="Tháng sau" className="grid size-8 shrink-0 place-items-center rounded-lg hover:bg-[var(--muted)]"><ChevronRight className="size-4" /></Link>
        </CardContent>
      </Card>

      <ReportCalendarInteractive
        period={period}
        initialSelectedDay={selectedDay}
        cells={cells}
        transactions={calendarTransactions}
        digits={digits}
        summary={{
          income: formatMinorMoney(totals.income, currency, digits),
          expense: formatMinorMoney(totals.expense, currency, digits),
          net: formatMinorMoney(totals.net, currency, digits),
          netNegative: totals.net < 0
        }}
      />
    </div>
  );
}
