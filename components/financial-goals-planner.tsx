"use client";

import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, Scale, PiggyBank, Sparkles, Target } from "lucide-react";
import { useMemo, useState } from "react";
import { MoneyCalculatorInput } from "@/components/money-calculator-input";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { CategoryIcon, iconColorValue } from "@/features/categories/icons";
import { deleteFinancialGoalPlanAction, saveFinancialGoalPlanAction } from "@/features/goals/planner-actions";
import { minorToMajorInput, parseMajorAmountToMinor } from "@/features/accounts/money";
import { formatMinorMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";

export type PlannerGoal = {
  id: string;
  name: string;
  icon_name: string;
  icon_color: string | null;
  remaining_minor: number;
  monthly_needed_minor: number | null;
  target_date: string | null;
  status: string;
};

export type SavedAllocation = {
  goal_id: string;
  priority: number;
  monthly_allocation_minor: number;
};

function addMonthsIso(today: string, months: number) {
  const [year, month, day] = today.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, Math.min(day, 28)));
  date.setUTCMonth(date.getUTCMonth() + Math.max(0, months));
  return date.toISOString().slice(0, 10);
}

function viDate(value: string | null) {
  if (!value) return "Không giới hạn";
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}

function suggested(goal: PlannerGoal) {
  if (goal.remaining_minor <= 0) return 0;
  if (goal.monthly_needed_minor && goal.monthly_needed_minor > 0) return Math.min(goal.remaining_minor, goal.monthly_needed_minor);
  return Math.ceil(goal.remaining_minor / 12);
}

function allocateByPriority(goals: PlannerGoal[], priorities: Record<string, number>, pool: number) {
  const result: Record<string, number> = {};
  let remainingPool = Math.max(0, pool);
  const ordered = [...goals].sort((a, b) => (priorities[a.id] ?? 999) - (priorities[b.id] ?? 999) || (a.target_date ?? "9999").localeCompare(b.target_date ?? "9999"));
  for (const goal of ordered) {
    const wanted = suggested(goal);
    const amount = Math.min(wanted, remainingPool, goal.remaining_minor);
    result[goal.id] = Math.max(0, amount);
    remainingPool -= amount;
  }
  if (remainingPool > 0) {
    for (const goal of ordered) {
      if (remainingPool <= 0) break;
      const current = result[goal.id] ?? 0;
      const extraCapacity = Math.max(0, goal.remaining_minor - current);
      const extra = Math.min(extraCapacity, remainingPool);
      result[goal.id] = current + extra;
      remainingPool -= extra;
    }
  }
  return result;
}

function allocateBalanced(goals: PlannerGoal[], pool: number) {
  const result: Record<string, number> = {};
  const needs = goals.map((goal) => ({ goal, need: Math.max(1, suggested(goal)) }));
  const totalNeed = needs.reduce((sum, item) => sum + item.need, 0);
  let used = 0;
  needs.forEach((item, index) => {
    const amount = index === needs.length - 1
      ? Math.max(0, pool - used)
      : Math.min(item.goal.remaining_minor, Math.floor(pool * (item.need / totalNeed)));
    result[item.goal.id] = amount;
    used += amount;
  });
  return result;
}

export function FinancialGoalsPlanner({
  goals,
  currencyCode,
  decimalDigits,
  today,
  defaultMonthlyAvailableMinor,
  savedPlan,
  savedAllocations
}: {
  goals: PlannerGoal[];
  currencyCode: string;
  decimalDigits: number;
  today: string;
  defaultMonthlyAvailableMinor: number;
  savedPlan: { monthly_available_minor: number; strategy: "priority" | "balanced"; notes: string | null } | null;
  savedAllocations: SavedAllocation[];
}) {
  const savedByGoal = useMemo(() => new Map(savedAllocations.map((row) => [row.goal_id, row])), [savedAllocations]);
  const initialPriorities = Object.fromEntries(goals.map((goal, index) => [goal.id, savedByGoal.get(goal.id)?.priority ?? index + 1]));
  const [strategy, setStrategy] = useState<"priority" | "balanced">(savedPlan?.strategy ?? "priority");
  const [monthlyAvailable, setMonthlyAvailable] = useState(minorToMajorInput(savedPlan?.monthly_available_minor ?? defaultMonthlyAvailableMinor, decimalDigits));
  const [priorities, setPriorities] = useState<Record<string, number>>(initialPriorities);
  const [allocations, setAllocations] = useState<Record<string, string>>(() => Object.fromEntries(goals.map((goal) => [goal.id, minorToMajorInput(savedByGoal.get(goal.id)?.monthly_allocation_minor ?? 0, decimalDigits)])));
  const [notes, setNotes] = useState(savedPlan?.notes ?? "");

  const monthlyMinor = parseMajorAmountToMinor(monthlyAvailable || "0", decimalDigits) ?? 0;
  const allocationMinor = Object.fromEntries(goals.map((goal) => [goal.id, parseMajorAmountToMinor(allocations[goal.id] || "0", decimalDigits) ?? 0]));
  const totalAllocated = Object.values(allocationMinor).reduce((sum, value) => sum + value, 0);
  const unallocated = monthlyMinor - totalAllocated;
  const totalNeeded = goals.reduce((sum, goal) => sum + suggested(goal), 0);
  const monthlyGap = monthlyMinor - totalNeeded;

  const reorder = (goalId: string, direction: -1 | 1) => {
    const ordered = [...goals].sort((a, b) => (priorities[a.id] ?? 999) - (priorities[b.id] ?? 999));
    const index = ordered.findIndex((goal) => goal.id === goalId);
    const swap = index + direction;
    if (index < 0 || swap < 0 || swap >= ordered.length) return;
    const next = { ...priorities };
    const a = ordered[index].id;
    const b = ordered[swap].id;
    const aPriority = next[a];
    next[a] = next[b];
    next[b] = aPriority;
    setPriorities(next);
  };

  const autoAllocate = () => {
    const suggestion = strategy === "balanced"
      ? allocateBalanced(goals, monthlyMinor)
      : allocateByPriority(goals, priorities, monthlyMinor);
    setAllocations(Object.fromEntries(goals.map((goal) => [goal.id, minorToMajorInput(suggestion[goal.id] ?? 0, decimalDigits)])));
  };

  const money = (value: number) => formatMinorMoney(value, currencyCode, decimalDigits);
  const orderedGoals = [...goals].sort((a, b) => (priorities[a.id] ?? 999) - (priorities[b.id] ?? 999));

  if (goals.length === 0) {
    return <div className="fin-card rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] p-8 text-center"><PiggyBank className="mx-auto size-7 text-[var(--primary)]" /><h2 className="mt-3 text-lg font-black">Chưa có mục tiêu đang hoạt động</h2><p className="mx-auto mt-2 max-w-lg text-sm text-[var(--muted-foreground)]">Tạo Savings Goal trước, sau đó Finzaro sẽ điều phối nguồn tiền giữa nhiều mục tiêu tại đây.</p></div>;
  }

  return <div className="space-y-4">
    <div className="grid gap-4 lg:grid-cols-[1.05fr_.95fr]">
      <section className="fin-card rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.12em] text-[var(--primary)]">Goal funding pool</p><h2 className="mt-1 text-lg font-black">Nguồn tiền phân bổ mỗi tháng</h2><p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">Mặc định lấy từ Savings Reserve trong Smart Cash Flow Planner nếu có. Bạn có thể điều chỉnh riêng cho kế hoạch mục tiêu.</p></div><span className="fin-badge">{currencyCode}</span></div>
        <div className="mt-5"><span className="field-label">Nguồn tiền mục tiêu / tháng</span><MoneyCalculatorInput name="monthly_available_preview" value={monthlyAvailable} onValueChange={setMonthlyAvailable} decimalDigits={decimalDigits} currencyCode={currencyCode} /></div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="fin-mini-card"><p className="fin-mini-label">Tổng nhu cầu / tháng</p><p className="fin-mini-value">{money(totalNeeded)}</p></div>
          <div className="fin-mini-card"><p className="fin-mini-label">Chênh lệch</p><p className={cn("fin-mini-value", monthlyGap >= 0 ? "text-emerald-600" : "text-rose-500")}>{monthlyGap >= 0 ? "+" : ""}{money(monthlyGap)}</p></div>
        </div>
        <div className={cn("mt-4 flex items-start gap-2 rounded-xl border p-3 text-xs", monthlyGap >= 0 ? "border-emerald-500/20 bg-emerald-500/5" : "border-amber-500/20 bg-amber-500/5")}>
          {monthlyGap >= 0 ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />}
          <p className="leading-5 text-[var(--muted-foreground)]">{monthlyGap >= 0 ? `Nguồn tiền hiện tại đủ bao phủ nhu cầu đề xuất và còn dư ${money(monthlyGap)} mỗi tháng.` : `Thiếu khoảng ${money(Math.abs(monthlyGap))} mỗi tháng nếu muốn giữ target date hiện tại của tất cả mục tiêu.`}</p>
        </div>
      </section>

      <section className="fin-card rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
        <p className="text-xs font-black uppercase tracking-[.12em] text-[var(--primary)]">Allocation strategy</p><h2 className="mt-1 text-lg font-black">Chiến lược phân bổ</h2><div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setStrategy("priority")} className={cn("rounded-xl border p-3 text-left", strategy === "priority" ? "border-[var(--primary)] bg-[var(--sidebar-accent)]" : "border-[var(--border)]")}><Target className="size-4 text-[var(--primary)]" /><p className="mt-2 text-xs font-black">Theo ưu tiên</p><p className="mt-1 text-[10px] leading-4 text-[var(--muted-foreground)]">Mục tiêu quan trọng được cấp tiền trước.</p></button>
          <button type="button" onClick={() => setStrategy("balanced")} className={cn("rounded-xl border p-3 text-left", strategy === "balanced" ? "border-[var(--primary)] bg-[var(--sidebar-accent)]" : "border-[var(--border)]")}><Scale className="size-4 text-[var(--primary)]" /><p className="mt-2 text-xs font-black">Cân bằng</p><p className="mt-1 text-[10px] leading-4 text-[var(--muted-foreground)]">Chia theo nhu cầu hàng tháng của từng goal.</p></button>
        </div>
        <button type="button" onClick={autoAllocate} className="fin-primary-btn mt-4 w-full justify-center"><Sparkles className="size-4" /> Phân bổ tự động</button>
        <div className="mt-4 rounded-xl bg-[var(--muted)] p-3"><div className="flex justify-between text-xs font-bold"><span>Đã phân bổ</span><span>{money(totalAllocated)}</span></div><div className="mt-2 flex justify-between text-xs font-bold"><span className="text-[var(--muted-foreground)]">Chưa phân bổ</span><span className={unallocated < 0 ? "text-rose-500" : "text-[var(--primary)]"}>{money(unallocated)}</span></div></div>
      </section>
    </div>

    <form action={saveFinancialGoalPlanAction} className="space-y-4">
      <input type="hidden" name="currency_code" value={currencyCode} />
      <input type="hidden" name="strategy" value={strategy} />
      <input type="hidden" name="monthly_available" value={monthlyAvailable} />

      <section className="fin-card rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.12em] text-[var(--primary)]">Goals allocation</p><h2 className="mt-1 text-lg font-black">Ưu tiên & phân bổ</h2></div><span className="fin-badge">{goals.length} mục tiêu</span></div>
        <div className="mt-4 space-y-3">
          {orderedGoals.map((goal, index) => {
            const amount = allocationMinor[goal.id] ?? 0;
            const months = amount > 0 ? Math.ceil(goal.remaining_minor / amount) : null;
            const estimated = months ? addMonthsIso(today, months) : null;
            const isLate = Boolean(goal.target_date && estimated && estimated > goal.target_date);
            return <div key={goal.id} className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
              <input type="hidden" name="goal_id" value={goal.id} />
              <input type="hidden" name={`priority_${goal.id}`} value={priorities[goal.id] ?? index + 1} />
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--card)] shadow-sm" style={{ color: iconColorValue(goal.icon_color) }}><CategoryIcon name={goal.icon_name} className="size-4.5" /></span>
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-black">{goal.name}</p><span className="rounded-lg bg-[var(--muted)] px-2 py-1 text-[9px] font-black uppercase">P{priorities[goal.id] ?? index + 1}</span>{isLate && <span className="rounded-lg bg-amber-500/10 px-2 py-1 text-[9px] font-black uppercase text-amber-600">Có thể trễ</span>}</div><p className="mt-1 text-[11px] text-[var(--muted-foreground)]">Còn {money(goal.remaining_minor)} · Target {viDate(goal.target_date)}</p></div>
                <div className="flex shrink-0 gap-1"><button type="button" disabled={index === 0} onClick={() => reorder(goal.id, -1)} className="grid size-8 place-items-center rounded-lg border border-[var(--border)] disabled:opacity-30" aria-label="Tăng ưu tiên"><ArrowUp className="size-3.5" /></button><button type="button" disabled={index === orderedGoals.length - 1} onClick={() => reorder(goal.id, 1)} className="grid size-8 place-items-center rounded-lg border border-[var(--border)] disabled:opacity-30" aria-label="Giảm ưu tiên"><ArrowDown className="size-3.5" /></button></div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"><label><span className="field-label">Phân bổ / tháng</span><MoneyCalculatorInput name={`allocation_${goal.id}`} value={allocations[goal.id] ?? "0"} onValueChange={(value) => setAllocations((current) => ({ ...current, [goal.id]: value }))} decimalDigits={decimalDigits} currencyCode={currencyCode} /></label><div className="rounded-xl bg-[var(--card)] px-3 py-2.5 text-right text-[11px]"><p className="font-bold text-[var(--muted-foreground)]">Ước tính hoàn thành</p><p className={cn("mt-1 font-black", isLate ? "text-amber-600" : "text-[var(--foreground)]")}>{estimated ? viDate(estimated) : "Chưa thể tính"}</p></div></div>
            </div>;
          })}
        </div>
        <label className="mt-4 block"><span className="field-label">Ghi chú kế hoạch</span><textarea name="notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} rows={3} className="fin-textarea" placeholder="VD: Ưu tiên quỹ dự phòng trước, sau đó mua xe..." /></label>
        <div className="mt-4 flex flex-wrap gap-2"><PendingSubmitButton idleLabel={savedPlan ? "Cập nhật kế hoạch mục tiêu" : "Lưu kế hoạch mục tiêu"} pendingLabel="Đang lưu kế hoạch..." disabled={unallocated < 0} className="fin-primary-btn" /></div>
      </section>
    </form>

    {savedPlan && <form action={deleteFinancialGoalPlanAction}><input type="hidden" name="currency_code" value={currencyCode} /><PendingSubmitButton idleLabel="Xóa kế hoạch phân bổ" pendingLabel="Đang xóa..." className="fin-secondary-btn text-rose-500" /></form>}
  </div>;
}
