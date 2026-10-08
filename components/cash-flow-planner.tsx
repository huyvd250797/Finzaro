"use client";

import { AlertTriangle, CheckCircle2, PiggyBank, ShieldCheck, Trash2, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MoneyCalculatorInput } from "@/components/money-calculator-input";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { deleteCashFlowPlanAction, saveCashFlowPlanAction } from "@/features/cash-flow/actions";
import type { CashFlowMonth } from "@/features/cash-flow/data";
import { minorToMajorInput, parseMajorAmountToMinor } from "@/features/accounts/money";
import { formatMinorMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";

function majorToMinor(value: string, digits: number) {
  return parseMajorAmountToMinor(value || "0", digits) ?? 0;
}

function monthTitle(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function CashFlowPlanner({ months, currencyCode, decimalDigits }: { months: CashFlowMonth[]; currencyCode: string; decimalDigits: number }) {
  const [selectedKey, setSelectedKey] = useState(months[0]?.key ?? "");
  const selected = months.find((month) => month.key === selectedKey) ?? months[0];
  const [plannedIncome, setPlannedIncome] = useState("");
  const [discretionary, setDiscretionary] = useState("");
  const [reserve, setReserve] = useState("");
  const [extraDebt, setExtraDebt] = useState("");
  const [cashBuffer, setCashBuffer] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!selected) return;
    const plan = selected.saved_plan;
    setPlannedIncome(minorToMajorInput(plan?.planned_income_minor ?? selected.income_minor, decimalDigits));
    setDiscretionary(minorToMajorInput(plan?.discretionary_limit_minor ?? selected.baseline_discretionary_minor, decimalDigits));
    setReserve(minorToMajorInput(plan?.savings_reserve_minor ?? 0, decimalDigits));
    setExtraDebt(minorToMajorInput(plan?.extra_debt_payment_minor ?? 0, decimalDigits));
    setCashBuffer(minorToMajorInput(plan?.minimum_cash_buffer_minor ?? 0, decimalDigits));
    setNotes(plan?.notes ?? "");
  }, [selectedKey, selected, decimalDigits]);

  const calculations = useMemo(() => {
    if (!selected) return null;
    const income = majorToMinor(plannedIncome, decimalDigits);
    const spending = majorToMinor(discretionary, decimalDigits);
    const savings = majorToMinor(reserve, decimalDigits);
    const debt = majorToMinor(extraDebt, decimalDigits);
    const buffer = majorToMinor(cashBuffer, decimalDigits);
    const fixed = selected.fixed_obligations_minor;
    const freeCashFromIncome = Math.max(0, income - fixed - savings - debt);
    const safeToSpend = Math.max(0, selected.opening_balance_minor + income - fixed - savings - debt - buffer);
    const projectedClosing = selected.opening_balance_minor + income - fixed - spending - savings - debt;
    const baselineClosing = selected.closing_balance_minor;
    const variance = projectedClosing - baselineClosing;
    const status = projectedClosing < 0 ? "shortfall" : projectedClosing < buffer ? "buffer" : spending > safeToSpend ? "overspend" : "healthy";
    return { income, spending, savings, debt, buffer, fixed, freeCashFromIncome, safeToSpend, projectedClosing, baselineClosing, variance, status };
  }, [selected, plannedIncome, discretionary, reserve, extraDebt, cashBuffer, decimalDigits]);

  if (!selected || !calculations) return <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted-foreground)]">Chưa có dữ liệu forecast để lập kế hoạch.</div>;
  const money = (value: number) => formatMinorMoney(value, currencyCode, decimalDigits);
  const statusMeta = calculations.status === "healthy"
    ? { label: "Kế hoạch an toàn", Icon: CheckCircle2, tone: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" }
    : calculations.status === "shortfall"
      ? { label: "Có nguy cơ thiếu hụt", Icon: AlertTriangle, tone: "text-rose-500 bg-rose-500/10 border-rose-500/20" }
      : calculations.status === "buffer"
        ? { label: "Dưới mức đệm", Icon: ShieldCheck, tone: "text-amber-600 bg-amber-500/10 border-amber-500/20" }
        : { label: "Chi vượt Safe to Spend", Icon: AlertTriangle, tone: "text-amber-600 bg-amber-500/10 border-amber-500/20" };
  const StatusIcon = statusMeta.Icon;

  return <div className="space-y-4">
    <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {months.map((month) => <button key={month.key} type="button" onClick={() => setSelectedKey(month.key)} className={cn("min-w-[116px] snap-start rounded-2xl border px-3 py-3 text-left transition", selectedKey === month.key ? "border-[var(--primary)] bg-[var(--sidebar-accent)] text-[var(--primary)] ring-2 ring-[var(--ring)]" : "border-[var(--border)] bg-[var(--card)]")}><p className="text-[10px] font-black uppercase tracking-wide">{month.label}</p><p className="mt-1 text-[11px] font-bold text-[var(--muted-foreground)]">{month.saved_plan ? "Đã lập kế hoạch" : "Baseline"}</p></button>)}
    </div>

    <div className="grid gap-4 xl:grid-cols-[1.05fr_.95fr]">
      <section className="fin-card rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.12em] text-[var(--primary)]">Monthly cash plan</p><h2 className="mt-1 text-lg font-black capitalize">{monthTitle(selected.key)}</h2><p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">Điều chỉnh kế hoạch tháng. Không tạo giao dịch thật cho đến khi bạn ghi nhận ở Transaction Core.</p></div><span className="fin-badge">{currencyCode}</span></div>

        <form action={saveCashFlowPlanAction} className="mt-5 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="month_start" value={selected.month_start} />
          <input type="hidden" name="currency_code" value={currencyCode} />
          <label><span className="field-label">Thu nhập dự kiến</span><MoneyCalculatorInput name="planned_income" value={plannedIncome} onValueChange={setPlannedIncome} decimalDigits={decimalDigits} currencyCode={currencyCode} required /></label>
          <label><span className="field-label">Chi linh hoạt dự kiến</span><MoneyCalculatorInput name="discretionary_limit" value={discretionary} onValueChange={setDiscretionary} decimalDigits={decimalDigits} currencyCode={currencyCode} required /></label>
          <label><span className="field-label">Reserve tiết kiệm</span><MoneyCalculatorInput name="savings_reserve" value={reserve} onValueChange={setReserve} decimalDigits={decimalDigits} currencyCode={currencyCode} /></label>
          <label><span className="field-label">Trả nợ thêm</span><MoneyCalculatorInput name="extra_debt_payment" value={extraDebt} onValueChange={setExtraDebt} decimalDigits={decimalDigits} currencyCode={currencyCode} /></label>
          <label className="sm:col-span-2"><span className="field-label">Mức đệm tiền mặt tối thiểu</span><MoneyCalculatorInput name="minimum_cash_buffer" value={cashBuffer} onValueChange={setCashBuffer} decimalDigits={decimalDigits} currencyCode={currencyCode} /></label>
          <label className="sm:col-span-2"><span className="field-label">Ghi chú kế hoạch</span><textarea name="notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} maxLength={1000} className="fin-textarea" placeholder="VD: Giữ tiền cho bảo hiểm, giảm ăn ngoài, ưu tiên trả nợ..." /></label>
          <div className="flex flex-wrap gap-2 sm:col-span-2"><PendingSubmitButton idleLabel={selected.saved_plan ? "Cập nhật kế hoạch" : "Lưu kế hoạch tháng"} pendingLabel="Đang lưu..." className="fin-primary-btn" /></div>
        </form>
        {selected.saved_plan && <form action={deleteCashFlowPlanAction} className="mt-2"><input type="hidden" name="plan_id" value={selected.saved_plan.id} /><PendingSubmitButton idleLabel="Xóa kế hoạch" pendingLabel="Đang xóa..." className="fin-secondary-btn text-rose-500" /></form>}
      </section>

      <section className="fin-card rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.12em] text-[var(--primary)]">Smart allocation</p><h2 className="mt-1 text-lg font-black">Safe to Spend</h2></div><span className={cn("inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[10px] font-black", statusMeta.tone)}><StatusIcon className="size-3.5" /> {statusMeta.label}</span></div>
        <p className="mt-4 text-3xl font-black tracking-tight text-[var(--primary)]">{money(calculations.safeToSpend)}</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">Số tiền có thể chi thêm mà vẫn giữ nghĩa vụ, reserve, trả nợ thêm và cash buffer.</p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <div className="fin-mini-card"><p className="fin-mini-label">Số dư đầu tháng</p><p className="fin-mini-value">{money(selected.opening_balance_minor)}</p></div>
          <div className="fin-mini-card"><p className="fin-mini-label">Nghĩa vụ cố định</p><p className="fin-mini-value text-rose-500">-{money(calculations.fixed)}</p></div>
          <div className="fin-mini-card"><p className="fin-mini-label">Free cash từ thu nhập</p><p className="fin-mini-value text-emerald-600">{money(calculations.freeCashFromIncome)}</p></div>
          <div className="fin-mini-card"><p className="fin-mini-label">Projected closing</p><p className={cn("fin-mini-value", calculations.projectedClosing >= 0 ? "text-emerald-600" : "text-rose-500")}>{money(calculations.projectedClosing)}</p></div>
        </div>

        <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
          <div className="flex items-center justify-between text-xs"><span className="font-bold text-[var(--muted-foreground)]">So với Forecast baseline</span><span className={cn("font-black", calculations.variance >= 0 ? "text-emerald-600" : "text-rose-500")}>{calculations.variance >= 0 ? "+" : ""}{money(calculations.variance)}</span></div>
          <div className="mt-3 space-y-2 text-[11px] text-[var(--muted-foreground)]"><p>• Thu nhập kế hoạch: <strong className="text-[var(--foreground)]">{money(calculations.income)}</strong></p><p>• Chi linh hoạt: <strong className="text-[var(--foreground)]">{money(calculations.spending)}</strong></p><p>• Reserve + trả nợ thêm: <strong className="text-[var(--foreground)]">{money(calculations.savings + calculations.debt)}</strong></p><p>• Cash buffer cần giữ: <strong className="text-[var(--foreground)]">{money(calculations.buffer)}</strong></p></div>
        </div>
      </section>
    </div>
  </div>;
}
