"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, BookmarkPlus, PiggyBank, Scale, Trash2, WalletCards } from "lucide-react";
import { deleteForecastScenarioAction, saveForecastScenarioAction } from "@/features/forecasting/actions";
import type { ForecastMonthPoint, ForecastScenario } from "@/features/forecasting/data";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { cn } from "@/lib/utils";

type ScenarioState = {
  horizonDays: 30 | 90 | 180 | 365;
  incomeAdjustPercent: number;
  expenseAdjustPercent: number;
  extraIncomeMajor: string;
  extraExpenseMajor: string;
  extraDebtMajor: string;
  savingsReserveMajor: string;
};

const HORIZON_TO_MONTHS: Record<ScenarioState["horizonDays"], number> = { 30: 1, 90: 3, 180: 6, 365: 12 };

function numberOrZero(value: string) {
  const normalized = value.replace(/,/g, ".").replace(/\s/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function formatMoney(minor: number, currency: string, digits: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency, maximumFractionDigits: digits }).format(minor / 10 ** digits);
}

function majorFromMinor(minor: number, digits: number) {
  const value = minor / 10 ** digits;
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

function scenarioMinor(major: string, digits: number) {
  return Math.round(numberOrZero(major) * 10 ** digits);
}

export function ScenarioPlanner({
  points,
  currentBalanceMinor,
  currencyCode,
  decimalDigits,
  savedScenarios
}: {
  points: ForecastMonthPoint[];
  currentBalanceMinor: number;
  currencyCode: string;
  decimalDigits: number;
  savedScenarios: ForecastScenario[];
}) {
  const [scenario, setScenario] = useState<ScenarioState>({
    horizonDays: 90,
    incomeAdjustPercent: 0,
    expenseAdjustPercent: 0,
    extraIncomeMajor: "",
    extraExpenseMajor: "",
    extraDebtMajor: "",
    savingsReserveMajor: ""
  });

  const projection = useMemo(() => {
    const months = HORIZON_TO_MONTHS[scenario.horizonDays];
    const selected = points.slice(0, months);
    const extraIncome = scenarioMinor(scenario.extraIncomeMajor, decimalDigits);
    const extraExpense = scenarioMinor(scenario.extraExpenseMajor, decimalDigits);
    const extraDebt = scenarioMinor(scenario.extraDebtMajor, decimalDigits);
    const reserve = scenarioMinor(scenario.savingsReserveMajor, decimalDigits);
    let balance = currentBalanceMinor;
    return selected.map((point) => {
      const income = Math.max(0, Math.round(point.variable_income_minor * (1 + scenario.incomeAdjustPercent / 100))) + point.recurring_income_minor + point.deposit_maturity_minor + extraIncome;
      const expense = Math.max(0, Math.round(point.variable_expense_minor * (1 + scenario.expenseAdjustPercent / 100))) + point.recurring_expense_minor + point.loan_payment_minor + point.credit_card_due_minor + extraExpense + extraDebt + reserve;
      const net = income - expense;
      balance += net;
      return { ...point, income, expense, net, balance };
    });
  }, [scenario, points, currentBalanceMinor, decimalDigits]);

  const baselineMonths = HORIZON_TO_MONTHS[scenario.horizonDays];
  const baselineEnd = points[Math.min(points.length, baselineMonths) - 1]?.closing_balance_minor ?? currentBalanceMinor;
  const scenarioEnd = projection.at(-1)?.balance ?? currentBalanceMinor;
  const difference = scenarioEnd - baselineEnd;
  const shortfall = projection.find((point) => point.balance < 0)?.key ?? null;
  const maxAbs = Math.max(1, ...projection.map((point) => Math.abs(point.balance)), Math.abs(currentBalanceMinor));

  function applySaved(item: ForecastScenario) {
    setScenario({
      horizonDays: item.horizon_days,
      incomeAdjustPercent: Number(item.income_adjust_percent),
      expenseAdjustPercent: Number(item.expense_adjust_percent),
      extraIncomeMajor: majorFromMinor(item.extra_income_minor, decimalDigits),
      extraExpenseMajor: majorFromMinor(item.extra_expense_minor, decimalDigits),
      extraDebtMajor: majorFromMinor(item.extra_debt_payment_minor, decimalDigits),
      savingsReserveMajor: majorFromMinor(item.monthly_savings_reserve_minor, decimalDigits)
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[.9fr_1.1fr]">
        <section className="fin-card rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-xs font-black uppercase tracking-[.12em] text-[var(--primary)]">Scenario controls</p><h2 className="mt-1 text-lg font-black">Mô phỏng kịch bản</h2><p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">Thay đổi giả định và xem Cash Position phản ứng ngay lập tức. Không ghi Transaction thật.</p></div>
            <button type="button" onClick={() => setScenario({ horizonDays: 90, incomeAdjustPercent: 0, expenseAdjustPercent: 0, extraIncomeMajor: "", extraExpenseMajor: "", extraDebtMajor: "", savingsReserveMajor: "" })} className="fin-secondary-btn h-9 px-3 text-xs">Đặt lại</button>
          </div>

          <div className="mt-5">
            <p className="field-label">Khoảng dự báo</p>
            <div className="grid grid-cols-4 gap-2">
              {([30, 90, 180, 365] as const).map((days) => <button key={days} type="button" onClick={() => setScenario((prev) => ({ ...prev, horizonDays: days }))} className={cn("h-10 rounded-xl border text-xs font-black transition", scenario.horizonDays === days ? "border-[var(--primary)] bg-[var(--sidebar-accent)] text-[var(--primary)]" : "border-[var(--border)] bg-[var(--background)]")}>{days === 365 ? "12 tháng" : `${days} ngày`}</button>)}
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label><span className="field-label">Điều chỉnh thu nhập (%)</span><input type="number" min={-90} max={300} step="1" value={scenario.incomeAdjustPercent} onChange={(e) => setScenario((prev) => ({ ...prev, incomeAdjustPercent: Number(e.target.value) }))} className="fin-input" /></label>
            <label><span className="field-label">Điều chỉnh chi tiêu (%)</span><input type="number" min={-90} max={300} step="1" value={scenario.expenseAdjustPercent} onChange={(e) => setScenario((prev) => ({ ...prev, expenseAdjustPercent: Number(e.target.value) }))} className="fin-input" /></label>
            <label><span className="field-label">Thu nhập thêm / tháng</span><input inputMode="decimal" value={scenario.extraIncomeMajor} onChange={(e) => setScenario((prev) => ({ ...prev, extraIncomeMajor: e.target.value }))} placeholder="0" className="fin-input" /></label>
            <label><span className="field-label">Chi thêm / tháng</span><input inputMode="decimal" value={scenario.extraExpenseMajor} onChange={(e) => setScenario((prev) => ({ ...prev, extraExpenseMajor: e.target.value }))} placeholder="0" className="fin-input" /></label>
            <label><span className="field-label">Trả nợ thêm / tháng</span><input inputMode="decimal" value={scenario.extraDebtMajor} onChange={(e) => setScenario((prev) => ({ ...prev, extraDebtMajor: e.target.value }))} placeholder="0" className="fin-input" /></label>
            <label><span className="field-label">Reserve tiết kiệm / tháng</span><input inputMode="decimal" value={scenario.savingsReserveMajor} onChange={(e) => setScenario((prev) => ({ ...prev, savingsReserveMajor: e.target.value }))} placeholder="0" className="fin-input" /></label>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setScenario((prev) => ({ ...prev, expenseAdjustPercent: -10 }))} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-left"><ArrowDownRight className="size-4 text-emerald-600" /><p className="mt-2 text-xs font-black">Giảm chi 10%</p></button>
            <button type="button" onClick={() => setScenario((prev) => ({ ...prev, incomeAdjustPercent: 10 }))} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-left"><ArrowUpRight className="size-4 text-sky-600" /><p className="mt-2 text-xs font-black">Tăng thu 10%</p></button>
          </div>
        </section>

        <section className="fin-card rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.12em] text-[var(--primary)]">Scenario result</p><h2 className="mt-1 text-lg font-black">Projected Cash Position</h2></div><span className="fin-badge">{currencyCode}</span></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="fin-mini-card"><WalletCards className="size-4 text-[var(--primary)]" /><p className="fin-mini-label mt-3">Cuối kỳ</p><p className="fin-mini-value text-base">{formatMoney(scenarioEnd, currencyCode, decimalDigits)}</p></div>
            <div className="fin-mini-card"><Scale className="size-4 text-sky-600" /><p className="fin-mini-label mt-3">So baseline</p><p className={cn("fin-mini-value text-base", difference >= 0 ? "text-emerald-600" : "text-rose-500")}>{difference >= 0 ? "+" : ""}{formatMoney(difference, currencyCode, decimalDigits)}</p></div>
            <div className="fin-mini-card"><PiggyBank className="size-4 text-violet-600" /><p className="fin-mini-label mt-3">Shortfall</p><p className={cn("fin-mini-value text-base", shortfall ? "text-rose-500" : "text-emerald-600")}>{shortfall ? shortfall.split("-").reverse().join("/") : "Không phát hiện"}</p></div>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3">
            <div className="mb-3 flex items-center justify-between text-[10px] font-bold text-[var(--muted-foreground)]"><span>Current</span><span>Projected</span></div>
            <div className="flex h-48 items-end gap-2 overflow-x-auto pb-2">
              {projection.map((point) => {
                const height = Math.max(8, Math.round((Math.abs(point.balance) / maxAbs) * 150));
                return <div key={point.key} className="flex min-w-12 flex-1 flex-col items-center justify-end gap-2"><span className={cn("text-[9px] font-black", point.balance >= 0 ? "text-emerald-600" : "text-rose-500")}>{Math.round(point.balance / 10 ** decimalDigits / 1_000_000 * 10) / 10}M</span><div className={cn("w-full max-w-12 rounded-t-lg", point.balance >= 0 ? "bg-emerald-500" : "bg-rose-500")} style={{ height }} /><span className="text-[9px] text-[var(--muted-foreground)]">{point.label}</span></div>;
              })}
            </div>
          </div>

          <form action={saveForecastScenarioAction} className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/55 p-4">
            <div className="flex items-center gap-2"><BookmarkPlus className="size-4 text-[var(--primary)]" /><p className="text-xs font-black">Lưu kịch bản</p></div>
            <input name="name" required maxLength={120} placeholder="VD: Giảm chi 10% + trả nợ thêm" className="fin-input mt-3" />
            <input type="hidden" name="currency_code" value={currencyCode} />
            <input type="hidden" name="horizon_days" value={scenario.horizonDays} />
            <input type="hidden" name="income_adjust_percent" value={scenario.incomeAdjustPercent} />
            <input type="hidden" name="expense_adjust_percent" value={scenario.expenseAdjustPercent} />
            <input type="hidden" name="extra_income_minor" value={scenarioMinor(scenario.extraIncomeMajor, decimalDigits)} />
            <input type="hidden" name="extra_expense_minor" value={scenarioMinor(scenario.extraExpenseMajor, decimalDigits)} />
            <input type="hidden" name="extra_debt_payment_minor" value={scenarioMinor(scenario.extraDebtMajor, decimalDigits)} />
            <input type="hidden" name="monthly_savings_reserve_minor" value={scenarioMinor(scenario.savingsReserveMajor, decimalDigits)} />
            <PendingSubmitButton idleLabel="Lưu kịch bản" pendingLabel="Đang lưu..." className="fin-primary-btn mt-3 w-full" />
          </form>
        </section>
      </div>

      {savedScenarios.length > 0 && <section className="fin-card rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
        <div><h2 className="font-black">Kịch bản đã lưu</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Áp dụng lại nhanh mà không phải nhập thông số từ đầu.</p></div>
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {savedScenarios.map((item) => <div key={item.id} className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-black">{item.name}</p><p className="mt-1 text-[11px] text-[var(--muted-foreground)]">{item.horizon_days === 365 ? "12 tháng" : `${item.horizon_days} ngày`} · Thu {Number(item.income_adjust_percent) >= 0 ? "+" : ""}{Number(item.income_adjust_percent)}% · Chi {Number(item.expense_adjust_percent) >= 0 ? "+" : ""}{Number(item.expense_adjust_percent)}%</p></div><form action={deleteForecastScenarioAction}><input type="hidden" name="scenario_id" value={item.id} /><button type="submit" aria-label="Xóa kịch bản" className="grid size-8 place-items-center rounded-lg border border-[var(--border)] text-[var(--muted-foreground)]"><Trash2 className="size-3.5" /></button></form></div><button type="button" onClick={() => applySaved(item)} className="mt-3 fin-secondary-btn h-9 w-full text-xs">Áp dụng kịch bản</button></div>)}
        </div>
      </section>}
    </div>
  );
}
