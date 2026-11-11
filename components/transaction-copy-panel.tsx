"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { CalendarPlus, Check, ChevronLeft, ChevronRight, Copy, X } from "lucide-react";
import { copyTransactionDatesAction, type CopyTransactionState } from "@/features/transactions/actions";

const EMPTY: CopyTransactionState = { error: "", copiedDates: [] };
function monthKey(y: number, m: number) { return `${y}-${String(m).padStart(2, "0")}`; }
function displayDay(date: string) { const [y, m, d] = date.split("-"); return `${d}/${m}/${y}`; }

export function TransactionCopyPanel({ sourceId, sourceTitle, sourceDate, type }: { sourceId: string; sourceTitle: string; sourceDate: string; type: string }) {
  const now = new Date();
  const [month, setMonth] = useState(monthKey(now.getFullYear(), now.getMonth() + 1));
  const [dates, setDates] = useState<string[]>([]);
  const [manual, setManual] = useState("");
  const [state, action, pending] = useActionState(copyTransactionDatesAction, EMPTY);
  const copied = new Set(state.copiedDates);
  const pendingDates = dates.filter((date) => !copied.has(date));

  const cells = useMemo(() => {
    const [year, monthNumber] = month.split("-").map(Number);
    const first = (new Date(year, monthNumber - 1, 1).getDay() + 6) % 7;
    const total = new Date(year, monthNumber, 0).getDate();
    return Array.from({ length: Math.ceil((first + total) / 7) * 7 }, (_, i) => {
      const day = i - first + 1;
      return day > 0 && day <= total ? `${month}-${String(day).padStart(2, "0")}` : null;
    });
  }, [month]);

  function toggle(date: string) {
    if (pending || copied.has(date)) return;
    setDates((current) => current.includes(date) ? current.filter((value) => value !== date) : current.length >= 20 ? current : [...current, date].sort());
  }
  function shift(offset: number) {
    const [y, m] = month.split("-").map(Number);
    const date = new Date(y, m - 1 + offset, 1);
    setMonth(monthKey(date.getFullYear(), date.getMonth() + 1));
  }
  function addManual() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(manual) || (Number.isNaN(new Date(`${manual}T00:00:00Z`).getTime()) || new Date(`${manual}T00:00:00Z`).toISOString().slice(0, 10) !== manual)) return;
    toggle(manual);
    setMonth(manual.slice(0, 7));
    setManual("");
  }
  return <section className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm sm:p-5" aria-label="Sao chép giao dịch sang ngày khác">
    <div className="flex items-start justify-between gap-3">
      <div><p className="flex items-center gap-1.5 text-xs font-black text-sky-600"><Copy className="size-4" /> Sao chép giao dịch</p><h2 className="mt-1 text-lg font-black">{sourceTitle}</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">{type === "income" ? "Khoản thu" : type === "expense" ? "Khoản chi" : "Chuyển tiền"} · ngày gốc {displayDay(sourceDate)}</p></div>
      <Link href="/transactions" className="grid size-9 shrink-0 place-items-center rounded-xl border border-[var(--border)]" title="Đóng" aria-label="Đóng"><X className="size-4" /></Link>
    </div>
    <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">Chạm các ngày muốn sao chép đến. Mỗi ngày tạo một giao dịch mới với cùng số tiền, danh mục và tài khoản. Giao dịch gốc không thay đổi.</p>
    <div className="mt-3 flex items-center justify-between rounded-xl bg-[var(--muted)]/55 px-3 py-2">
      <button type="button" onClick={() => shift(-1)} aria-label="Tháng trước" className="grid size-9 place-items-center rounded-lg"><ChevronLeft className="size-4" /></button>
      <p className="font-black">Tháng {Number(month.slice(5))}/{month.slice(0, 4)}</p>
      <button type="button" onClick={() => shift(1)} aria-label="Tháng sau" className="grid size-9 place-items-center rounded-lg"><ChevronRight className="size-4" /></button>
    </div>
    <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-[var(--muted-foreground)]">{["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => <div key={day} className="py-1">{day}</div>)}</div>
    <div className="grid grid-cols-7 gap-1">{cells.map((date, index) => date ? <button key={date} type="button" disabled={pending || copied.has(date)} onClick={() => toggle(date)} aria-label={`Chọn ngày ${displayDay(date)}`} aria-pressed={dates.includes(date)} className={`relative grid min-h-10 place-items-center rounded-xl text-sm font-bold transition ${copied.has(date) ? "bg-emerald-500/15 text-emerald-600" : dates.includes(date) ? "bg-sky-600 text-white" : "bg-[var(--muted)]/55 active:bg-sky-500/20"}`}>{Number(date.slice(8))}{copied.has(date) && <Check className="absolute right-0 top-0 size-3" />}</button> : <span key={`empty-${index}`} />)}</div>
    <div className="mt-3 flex flex-wrap items-end gap-2"><label className="flex-1"><span className="field-label">Chọn thêm ngày bất kỳ</span><input type="date" value={manual} onChange={(event) => setManual(event.target.value)} className="fin-input" /></label><button type="button" onClick={addManual} disabled={!manual || pending} className="fin-secondary-btn"><CalendarPlus className="size-4" />Thêm ngày</button></div>
    <div className="mt-3 flex flex-wrap gap-1.5" aria-live="polite">{dates.length === 0 ? <p className="text-xs text-[var(--muted-foreground)]">Chưa chọn ngày đích (tối đa 20 ngày).</p> : dates.map((date) => <button type="button" key={date} disabled={pending || copied.has(date)} onClick={() => toggle(date)} className={`inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold ${copied.has(date) ? "bg-emerald-500/15 text-emerald-600" : "bg-sky-500/10 text-sky-600"}`}>{displayDay(date)}{copied.has(date) ? <Check className="size-3" /> : <X className="size-3" />}</button>)}</div>
    {state.error && <p role="alert" className="fin-inline-error mt-3">{state.error}</p>}
    {copied.size > 0 && <p role="status" className="mt-3 text-sm font-semibold text-emerald-600">Đã sao chép thành công {copied.size} ngày. Những ngày này sẽ không được tạo lại khi thử lại.</p>}
    <form action={action} className="mt-4 flex flex-wrap gap-2">
      <input type="hidden" name="source_id" value={sourceId} />
      <input type="hidden" name="dates" value={JSON.stringify(dates)} />
      <button type="submit" disabled={pending || pendingDates.length === 0} className="fin-primary-btn flex-1 disabled:opacity-50"><Copy className="size-4" />{pending ? "Đang sao chép..." : `Sao chép đến ${pendingDates.length} ngày`}</button>
      <Link href="/transactions" className="fin-secondary-btn">Về lịch sử</Link>
    </form>
  </section>;
}
