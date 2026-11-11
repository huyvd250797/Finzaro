"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { CalendarPlus, Check, ChevronLeft, ChevronRight, Copy, X } from "lucide-react";
import { copyTransactionDatesAction, type CopyTransactionState } from "@/features/transactions/actions";

const EMPTY: CopyTransactionState = { error: "", copiedDates: [] };
function monthKey(y: number, m: number) { return `${y}-${String(m).padStart(2, "0")}`; }
function displayDay(date: string) { const [y, m, d] = date.split("-"); return `${d}/${m}/${y}`; }

export function TransactionCopyPanel({ sourceId, sourceTitle, sourceDate, type, embedded = false, onClose }: { sourceId: string; sourceTitle: string; sourceDate: string; type: string; embedded?: boolean; onClose?: () => void }) {
  const [month, setMonth] = useState(sourceDate.slice(0, 7));
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
  return <section className={`${embedded ? "" : "mt-4 border shadow-sm"} rounded-2xl border-[var(--border)] bg-[var(--card)] p-4 sm:p-5`} aria-label="Sao chép giao dịch sang ngày khác">
    <div className="flex items-start justify-between gap-3">
      <div><p className="flex items-center gap-1.5 text-xs font-black text-sky-600"><Copy className="size-4" /> Sao chép giao dịch</p><h2 className="mt-1 text-lg font-black">{sourceTitle}</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">{type === "income" ? "Khoản thu" : type === "expense" ? "Khoản chi" : "Chuyển tiền"} · ngày gốc {displayDay(sourceDate)}</p></div>
      {embedded ? <button type="button" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-xl border border-[var(--border)]" aria-label="Đóng"><X className="size-4" /></button> : <Link href="/transactions" className="grid size-9 shrink-0 place-items-center rounded-xl border border-[var(--border)]" title="Đóng" aria-label="Đóng"><X className="size-4" /></Link>}
    </div>
    <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">Chạm các ngày muốn sao chép đến. Mỗi ngày tạo một giao dịch mới với cùng số tiền, danh mục và tài khoản. Giao dịch gốc không thay đổi.</p>
    <div className="mt-3 flex items-center justify-between rounded-xl bg-[var(--muted)]/55 px-3 py-2">
      <button type="button" onClick={() => shift(-1)} aria-label="Tháng trước" className="grid size-9 place-items-center rounded-lg"><ChevronLeft className="size-4" /></button>
      <p className="font-black">Tháng {Number(month.slice(5))}/{month.slice(0, 4)}</p>
      <button type="button" onClick={() => shift(1)} aria-label="Tháng sau" className="grid size-9 place-items-center rounded-lg"><ChevronRight className="size-4" /></button>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold" aria-label="Chú giải màu ngày sao chép">
      <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded bg-violet-500" /> Ngày gốc</span>
      <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded bg-sky-600" /> Ngày đích đã chọn</span>
      <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded bg-emerald-500" /> Đã sao chép</span>
    </div>
    <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-[var(--muted-foreground)]">{["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => <div key={day} className="py-1">{day}</div>)}</div>
    <div className="grid grid-cols-7 gap-1">{cells.map((date, index) => {
      if (!date) return <span key={`empty-${index}`} />;
      const isSource = date === sourceDate;
      const isCopied = copied.has(date);
      const isSelected = dates.includes(date);
      return <button
        key={date}
        type="button"
        disabled={pending || isCopied}
        onClick={() => toggle(date)}
        aria-label={isSource ? `Ngày gốc ${displayDay(date)}${isSelected ? ", đã chọn làm ngày đích" : ", có thể chọn làm ngày đích"}` : `Chọn ngày đích ${displayDay(date)}${isCopied ? ", đã sao chép" : ""}`}
        aria-pressed={isSelected}
        aria-current={isSource ? "date" : undefined}
        title={isSource ? `Ngày giao dịch gốc: ${displayDay(date)}` : undefined}
        className={`relative grid min-h-10 place-items-center rounded-xl border text-sm font-bold transition ${isSource && isSelected ? "border-violet-600 bg-sky-600 text-white ring-2 ring-violet-500" : isSource ? "border-violet-600 bg-violet-500/20 text-violet-700 ring-1 ring-violet-500/40 dark:text-violet-300" : isCopied ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-600" : isSelected ? "border-sky-600 bg-sky-600 text-white" : "border-transparent bg-[var(--muted)]/55 active:bg-sky-500/20"}`}
      >{Number(date.slice(8))}{isSource && <span className="absolute bottom-0.5 text-[7px] leading-none font-black">Gốc</span>}{isCopied && <Check className="absolute right-0.5 top-0.5 size-3" />}</button>;
    })}</div>
    <div className="mt-3 flex flex-wrap items-end gap-2"><label className="flex-1"><span className="field-label">Chọn thêm ngày bất kỳ</span><input type="date" value={manual} onChange={(event) => setManual(event.target.value)} className="fin-input" /></label><button type="button" onClick={addManual} disabled={!manual || pending} className="fin-secondary-btn"><CalendarPlus className="size-4" />Thêm ngày</button></div>
    <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">Viền tím biểu thị ngày gốc; có thể chuyển tháng bằng mũi tên để chọn ngày đích khác.</p>
    <div className="mt-3 flex flex-wrap gap-1.5" aria-live="polite">{dates.length === 0 ? <p className="text-xs text-[var(--muted-foreground)]">Chưa chọn ngày đích (tối đa 20 ngày).</p> : dates.map((date) => <button type="button" key={date} disabled={pending || copied.has(date)} onClick={() => toggle(date)} className={`inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold ${copied.has(date) ? "bg-emerald-500/15 text-emerald-600" : "bg-sky-500/10 text-sky-600"}`}>{displayDay(date)}{copied.has(date) ? <Check className="size-3" /> : <X className="size-3" />}</button>)}</div>
    {state.error && <p role="alert" className="fin-inline-error mt-3">{state.error}</p>}
    {copied.size > 0 && <p role="status" className="mt-3 text-sm font-semibold text-emerald-600">Đã sao chép thành công {copied.size} ngày. Những ngày này sẽ không được tạo lại khi thử lại.</p>}
    <form action={action} className="mt-4 flex flex-wrap gap-2">
      <input type="hidden" name="source_id" value={sourceId} />
      <input type="hidden" name="dates" value={JSON.stringify(dates)} />
      <button type="submit" disabled={pending || pendingDates.length === 0} className="fin-primary-btn flex-1 disabled:opacity-50"><Copy className="size-4" />{pending ? "Đang sao chép..." : `Sao chép đến ${pendingDates.length} ngày`}</button>
      {embedded ? <button type="button" className="fin-secondary-btn" onClick={onClose}>Đóng</button> : <Link href="/transactions" className="fin-secondary-btn">Về lịch sử</Link>}
    </form>
  </section>;
}
