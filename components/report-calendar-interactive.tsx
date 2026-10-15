"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, ChevronRight, CircleDollarSign, Pencil, Trash2, TrendingDown, TrendingUp, X } from "lucide-react";
import { deleteTransactionAction } from "@/features/transactions/actions";
import { CategoryIcon, iconColorValue } from "@/features/categories/icons";
import { cn } from "@/lib/utils";

type CalendarCell = {
  key: string;
  current: boolean;
  day: number;
  date?: string;
  income?: number;
  expense?: number;
};

type CalendarTransaction = {
  id: string;
  transactionType: "income" | "expense" | "transfer" | string;
  transactionPurpose: string;
  date: string;
  title: string;
  notes: string | null;
  categoryName: string;
  iconName: string | null;
  iconColor: string | null;
  amountLabel: string;
  tone: "income" | "expense" | "transfer";
  editable: boolean;
};

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function calendarIntegerMoney(valueMinor: number, sign: "+" | "-", digits: number) {
  const value = Number.isFinite(Number(valueMinor)) ? Math.abs(Number(valueMinor)) : 0;
  const scale = 10 ** Math.max(0, Math.min(6, Number.isInteger(digits) ? digits : 0));
  const whole = Math.round(value / scale);
  return `${sign}${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(whole)}`;
}

function calendarReturnTo(period: string, date: string) {
  return `/reports/calendar?period=${encodeURIComponent(period)}&day=${encodeURIComponent(date)}#calendar-day-detail`;
}

function transactionHref(type: "expense" | "income" | "transfer", date: string, period: string) {
  const query = new URLSearchParams({ new: type, date, return_to: calendarReturnTo(period, date) });
  return `/transactions?${query.toString()}`;
}

function editHref(transactionId: string, date: string, period: string) {
  const query = new URLSearchParams({ edit: transactionId, date, return_to: calendarReturnTo(period, date) });
  return `/transactions?${query.toString()}`;
}

export function ReportCalendarInteractive({
  period,
  initialSelectedDay,
  cells,
  transactions,
  digits,
  summary
}: {
  period: string;
  initialSelectedDay: string;
  cells: CalendarCell[];
  transactions: CalendarTransaction[];
  digits: number;
  summary: { income: string; expense: string; net: string; netNegative: boolean };
}) {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState(initialSelectedDay);
  const [quickDay, setQuickDay] = useState<string | null>(null);
  const lastTap = useRef<{ date: string; at: number }>({ date: "", at: 0 });

  useEffect(() => {
    router.prefetch("/transactions?new=expense");
    router.prefetch("/transactions?new=income");
    router.prefetch("/transactions?new=transfer");
  }, [router]);

  useEffect(() => {
    if (window.location.hash === "#calendar-day-detail") {
      requestAnimationFrame(() => document.getElementById("calendar-day-detail")?.scrollIntoView({ block: "start", behavior: "smooth" }));
    }
  }, []);

  const selectedTransactions = useMemo(
    () => transactions.filter((item) => item.date === selectedDay),
    [transactions, selectedDay]
  );

  function selectDay(date: string) {
    setSelectedDay(date);
    const now = Date.now();
    const previous = lastTap.current;
    if (previous.date === date && now - previous.at <= 360) {
      setQuickDay(date);
      lastTap.current = { date: "", at: 0 };
    } else {
      lastTap.current = { date, at: now };
    }
    const url = new URL(window.location.href);
    url.searchParams.set("period", period);
    url.searchParams.set("day", date);
    url.hash = "";
    window.history.replaceState(window.history.state, "", `${url.pathname}?${url.searchParams.toString()}`);
  }

  return (
    <>
      <div className="-mx-2.5 mt-3 overflow-hidden border-y border-[var(--border)] bg-[var(--card)] sm:mx-0 sm:rounded-2xl sm:border">
        <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--muted)]/35">
          {WEEKDAYS.map((day) => <div key={day} className="py-2 text-center text-[10px] font-black text-[var(--muted-foreground)] sm:text-xs">{day}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-px bg-[var(--border)]">
          {cells.map((cell) => {
            if (!cell.current || !cell.date) {
              return <div key={cell.key} className="min-h-[98px] min-w-0 bg-[var(--background)] px-1 py-2 opacity-30 sm:min-h-[106px]"><p className="text-center text-[10px] font-bold text-[var(--muted-foreground)] sm:text-xs">{cell.day}</p></div>;
            }
            const selected = cell.date === selectedDay;
            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => selectDay(cell.date!)}
                onDoubleClick={() => setQuickDay(cell.date!)}
                className={cn(
                  "min-h-[98px] min-w-0 touch-manipulation overflow-hidden bg-[var(--card)] px-1 py-2 text-left transition active:bg-[var(--muted)]/70 sm:min-h-[106px] sm:px-1.5",
                  selected && "bg-sky-500/12 ring-2 ring-inset ring-sky-500"
                )}
                aria-label={`Ngày ${cell.day}. Chạm để xem giao dịch, chạm hai lần để thêm giao dịch.`}
              >
                <p className={cn("text-center text-[11px] font-black sm:text-xs", selected ? "text-sky-500" : "text-[var(--foreground)]")}>{cell.day}</p>
                <div className="mt-2 space-y-1 text-center tabular-nums sm:mt-2.5">
                  {(cell.income ?? 0) > 0 && <p className="whitespace-nowrap text-[8.5px] font-black leading-3 tracking-[-.055em] text-emerald-500 sm:text-[10px] sm:tracking-[-.03em]">{calendarIntegerMoney(cell.income!, "+", digits)}</p>}
                  {(cell.expense ?? 0) > 0 && <p className="whitespace-nowrap text-[8.5px] font-black leading-3 tracking-[-.055em] text-rose-500 sm:text-[10px] sm:tracking-[-.03em]">{calendarIntegerMoney(cell.expense!, "-", digits)}</p>}
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3 border-t border-[var(--border)] px-3 py-2 text-[9px] font-bold text-[var(--muted-foreground)] sm:text-[10px]">
          <span className="inline-flex items-center gap-1"><span className="size-1.5 rounded-full bg-emerald-500" />Thu</span>
          <span className="inline-flex items-center gap-1"><span className="size-1.5 rounded-full bg-rose-500" />Chi</span>
          <span className="ml-auto">Chạm 2 lần để thêm</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-2">
        <div className="min-w-0 rounded-2xl border border-emerald-500/20 bg-emerald-500/[.035] p-2 sm:p-3"><div className="flex items-center gap-1"><TrendingUp className="size-3 shrink-0 text-emerald-500 sm:size-4" /><p className="truncate text-[8.5px] font-black text-[var(--muted-foreground)] sm:text-xs">Thu nhập</p></div><p className="mt-1.5 truncate text-[9.5px] font-black tracking-[-.035em] tabular-nums text-emerald-500 sm:text-base">{summary.income}</p></div>
        <div className="min-w-0 rounded-2xl border border-rose-500/20 bg-rose-500/[.035] p-2 sm:p-3"><div className="flex items-center gap-1"><TrendingDown className="size-3 shrink-0 text-rose-500 sm:size-4" /><p className="truncate text-[8.5px] font-black text-[var(--muted-foreground)] sm:text-xs">Chi tiêu</p></div><p className="mt-1.5 truncate text-[9.5px] font-black tracking-[-.035em] tabular-nums text-rose-500 sm:text-base">{summary.expense}</p></div>
        <div className="min-w-0 rounded-2xl border border-sky-500/20 bg-sky-500/[.035] p-2 sm:p-3"><div className="flex items-center gap-1"><CircleDollarSign className="size-3 shrink-0 text-sky-500 sm:size-4" /><p className="truncate text-[8.5px] font-black text-[var(--muted-foreground)] sm:text-xs">Ròng</p></div><p className={cn("mt-1.5 truncate text-[9.5px] font-black tracking-[-.035em] tabular-nums sm:text-base", summary.netNegative ? "text-rose-500" : "text-sky-500")}>{summary.net}</p></div>
      </div>

      <section id="calendar-day-detail" className="scroll-mt-24 mt-3 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <div className="border-b border-[var(--border)] p-3.5 sm:p-4">
          <h2 className="text-base font-black sm:text-lg">{selectedDay.split("-").reverse().join("/")}</h2>
          <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">{selectedTransactions.length} giao dịch · vuốt sang trái để Sửa/Xóa</p>
        </div>
        {selectedTransactions.length === 0 ? (
          <div className="p-5 text-sm text-[var(--muted-foreground)]">
            Ngày này chưa có giao dịch. <button type="button" onClick={() => setQuickDay(selectedDay)} className="font-black text-[var(--primary)]">Thêm giao dịch</button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {selectedTransactions.map((transaction) => {
              const returnTo = calendarReturnTo(period, selectedDay);
              return (
                <div key={transaction.id} className="overflow-x-auto overscroll-x-contain snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <div className="grid w-[calc(100%+136px)] snap-start" style={{ gridTemplateColumns: "calc(100% - 136px) 68px 68px" }}>
                    <div className="flex min-w-0 items-center gap-3 p-3.5">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--muted)]" style={{ color: iconColorValue(transaction.iconColor) }}><CategoryIcon name={transaction.iconName} className="size-4" /></span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-black">{transaction.categoryName}</span><span className="mt-0.5 block truncate text-[11px] text-[var(--muted-foreground)]">{transaction.title}{transaction.notes ? ` · ${transaction.notes}` : ""}</span></span>
                      <span className={cn("shrink-0 text-xs font-black", transaction.tone === "income" ? "text-emerald-500" : transaction.tone === "expense" ? "text-rose-500" : "text-sky-500")}>{transaction.amountLabel}</span>
                      <ChevronRight className="size-4 shrink-0 text-[var(--muted-foreground)]" />
                    </div>
                    {transaction.editable ? (
                      <Link href={editHref(transaction.id, selectedDay, period)} className="grid snap-end place-items-center bg-sky-600 text-white" aria-label="Sửa giao dịch"><span className="flex flex-col items-center gap-1 text-[10px] font-black"><Pencil className="size-4" />Sửa</span></Link>
                    ) : (
                      <div className="grid place-items-center bg-slate-600/70 text-white/70" title="Chuyển tiền không sửa trực tiếp để bảo vệ ledger"><span className="flex flex-col items-center gap-1 text-[9px] font-black"><Pencil className="size-4" />Khóa</span></div>
                    )}
                    <form action={deleteTransactionAction} className="h-full" onSubmit={(event) => { if (!window.confirm("Xóa giao dịch này? Finzaro sẽ hoàn nguyên số dư liên quan.")) event.preventDefault(); }}>
                      <input type="hidden" name="transaction_id" value={transaction.id} />
                      <input type="hidden" name="return_to" value={returnTo} />
                      <button type="submit" className="grid h-full w-full place-items-center bg-rose-600 text-white" aria-label="Xóa giao dịch"><span className="flex flex-col items-center gap-1 text-[10px] font-black"><Trash2 className="size-4" />Xóa</span></button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {quickDay && (
        <div className="fixed inset-0 z-[110] flex items-end bg-black/45 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget) setQuickDay(null); }}>
          <div className="w-full rounded-t-[28px] border border-[var(--border)] bg-[var(--card)] p-4 pb-[max(env(safe-area-inset-bottom),16px)] shadow-2xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--border)]" />
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-[var(--primary)]">Thêm giao dịch nhanh</p><h3 className="mt-1 text-lg font-black">{quickDay.split("-").reverse().join("/")}</h3></div><button type="button" onClick={() => setQuickDay(null)} className="grid size-9 place-items-center rounded-xl border border-[var(--border)]"><X className="size-4" /></button></div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Link href={transactionHref("expense", quickDay, period)} className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/[.06] text-xs font-black text-rose-500"><ArrowUpRight className="size-5" />Chi tiền</Link>
              <Link href={transactionHref("income", quickDay, period)} className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/[.06] text-xs font-black text-emerald-500"><ArrowDownLeft className="size-5" />Thu tiền</Link>
              <Link href={transactionHref("transfer", quickDay, period)} className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border border-sky-500/20 bg-sky-500/[.06] text-xs font-black text-sky-500"><ArrowLeftRight className="size-5" />Chuyển</Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
