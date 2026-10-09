"use client";

import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, CircleDollarSign, CreditCard, Landmark, Sparkles, TrendingDown } from "lucide-react";
import { MoneyCalculatorInput } from "@/components/money-calculator-input";
import { Card, CardContent } from "@/components/ui/card";
import { minorToMajorInput, parseMajorAmountToMinor } from "@/features/accounts/money";
import { compareDebtStrategies, type DebtStrategy, type StrategyDebt } from "@/features/debt-strategy/data";
import { saveDebtStrategyPlanAction } from "@/features/debt-strategy/actions";
import { formatMinorMoney } from "@/lib/utils";

function strategyName(value: DebtStrategy) { return value === "avalanche" ? "Avalanche" : "Snowball"; }
function monthsLabel(months: number, debtFree: boolean) { return debtFree ? `${months} tháng` : "> 50 năm"; }

export function DebtStrategyPlanner({ debts, currencyCode, decimalDigits, initialExtraMinor, initialStrategy }: { debts: StrategyDebt[]; currencyCode: string; decimalDigits: number; initialExtraMinor: number; initialStrategy: DebtStrategy }) {
  const [extra, setExtra] = useState(minorToMajorInput(initialExtraMinor, decimalDigits));
  const [strategy, setStrategy] = useState<DebtStrategy>(initialStrategy);
  const extraMinor = parseMajorAmountToMinor(extra || "0", decimalDigits) ?? 0;
  const comparison = useMemo(() => compareDebtStrategies(debts, extraMinor), [debts, extraMinor]);
  const selected = strategy === "avalanche" ? comparison.avalanche : comparison.snowball;
  const other = strategy === "avalanche" ? comparison.snowball : comparison.avalanche;
  const interestSaved = Math.max(0, comparison.baseline.total_interest_minor - selected.total_interest_minor);
  const monthsSaved = Math.max(0, comparison.baseline.months - selected.months);
  const totalDebt = debts.reduce((sum, debt) => sum + debt.balance_minor, 0);
  const minMonthly = debts.reduce((sum, debt) => sum + debt.minimum_monthly_minor, 0);

  if (debts.length === 0) return <Card><CardContent className="py-14 text-center"><CheckCircle2 className="mx-auto size-9 text-emerald-600" /><h2 className="mt-4 text-lg font-black">Không có dư nợ cần tối ưu</h2><p className="mx-auto mt-2 max-w-lg text-sm text-[var(--muted-foreground)]">Khi có Loan hoặc Credit Card đang còn dư nợ bằng {currencyCode}, Finzaro sẽ tự đưa chúng vào mô phỏng Avalanche/Snowball.</p></CardContent></Card>;

  return <div className="space-y-4">
    <div className="grid gap-4 xl:grid-cols-[.82fr_1.18fr]">
      <Card className="border-orange-500/20"><CardContent className="p-5 sm:p-6">
        <p className="text-xs font-black uppercase tracking-[.14em] text-orange-600">Nguồn tiền trả nợ</p>
        <h2 className="mt-1 text-lg font-black">Thiết lập chiến lược</h2>
        <p className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">Finzaro giữ nguyên các khoản minimum payment hiện tại và phân bổ phần tiền trả thêm vào khoản nợ ưu tiên. Khi một khoản hết nợ, phần payment được giải phóng sẽ cuộn sang khoản tiếp theo.</p>
        <div className="mt-5"><span className="field-label">Trả thêm mỗi tháng</span><MoneyCalculatorInput name="extra_preview" value={extra} onValueChange={setExtra} decimalDigits={decimalDigits} currencyCode={currencyCode} /></div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {(["avalanche","snowball"] as DebtStrategy[]).map((item) => <button key={item} type="button" onClick={() => setStrategy(item)} className={`rounded-2xl border p-3 text-left transition ${strategy === item ? "border-[var(--primary)] bg-[var(--sidebar-accent)]" : "border-[var(--border)] bg-[var(--card)]"}`}><p className="text-sm font-black">{strategyName(item)}</p><p className="mt-1 text-[10px] leading-4 text-[var(--muted-foreground)]">{item === "avalanche" ? "Ưu tiên lãi suất cao nhất · giảm tổng lãi" : "Ưu tiên dư nợ nhỏ nhất · tạo động lực trả nhanh"}</p></button>)}
        </div>
        <form action={saveDebtStrategyPlanAction} className="mt-4">
          <input type="hidden" name="currency_code" value={currencyCode} />
          <input type="hidden" name="strategy" value={strategy} />
          <input type="hidden" name="extra_monthly" value={extra} />
          <button type="submit" className="fin-primary-btn w-full"><Sparkles className="size-4" /> Lưu cấu hình {strategyName(strategy)}</button>
        </form>
      </CardContent></Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card><CardContent className="p-4"><CircleDollarSign className="size-5 text-orange-600" /><p className="mt-3 fin-stat-label">Tổng dư nợ</p><p className="mt-1 text-xl font-black">{formatMinorMoney(totalDebt, currencyCode, decimalDigits)}</p><p className="mt-1 text-[11px] text-[var(--muted-foreground)]">{debts.length} khoản Loan + Credit Card</p></CardContent></Card>
        <Card><CardContent className="p-4"><Landmark className="size-5 text-sky-600" /><p className="mt-3 fin-stat-label">Minimum hiện tại</p><p className="mt-1 text-xl font-black">{formatMinorMoney(minMonthly, currencyCode, decimalDigits)}</p><p className="mt-1 text-[11px] text-[var(--muted-foreground)]">+ {formatMinorMoney(extraMinor, currencyCode, decimalDigits)} trả thêm</p></CardContent></Card>
        <Card className="border-emerald-500/20"><CardContent className="p-4"><TrendingDown className="size-5 text-emerald-600" /><p className="mt-3 fin-stat-label">Dự kiến hết nợ · {strategyName(strategy)}</p><p className="mt-1 text-xl font-black">{monthsLabel(selected.months, selected.debt_free)}</p><p className="mt-1 text-[11px] text-emerald-600">Nhanh hơn baseline khoảng {monthsSaved} tháng</p></CardContent></Card>
        <Card className="border-violet-500/20"><CardContent className="p-4"><Sparkles className="size-5 text-violet-600" /><p className="mt-3 fin-stat-label">Lãi ước tính tiết kiệm</p><p className="mt-1 text-xl font-black text-violet-600">{formatMinorMoney(interestSaved, currencyCode, decimalDigits)}</p><p className="mt-1 text-[11px] text-[var(--muted-foreground)]">So với chỉ trả minimum</p></CardContent></Card>
      </div>
    </div>

    <Card><CardContent className="p-5 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.14em] text-[var(--primary)]">So sánh chiến lược</p><h2 className="mt-1 text-lg font-black">Avalanche vs Snowball</h2></div><p className="text-xs text-[var(--muted-foreground)]">Mô phỏng theo lãi suất năm, dư nợ và minimum payment hiện tại.</p></div><div className="mt-4 grid gap-3 md:grid-cols-3">
      {[
        { label: "Minimum only", result: comparison.baseline, active: false },
        { label: "Avalanche", result: comparison.avalanche, active: strategy === "avalanche" },
        { label: "Snowball", result: comparison.snowball, active: strategy === "snowball" }
      ].map((item) => <div key={item.label} className={`rounded-2xl border p-4 ${item.active ? "border-[var(--primary)] bg-[var(--sidebar-accent)]" : "border-[var(--border)]"}`}><div className="flex items-center justify-between gap-2"><p className="font-black">{item.label}</p>{item.active && <span className="fin-badge">Đang chọn</span>}</div><p className="mt-4 text-2xl font-black">{monthsLabel(item.result.months, item.result.debt_free)}</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">Lãi ước tính {formatMinorMoney(item.result.total_interest_minor, currencyCode, decimalDigits)}</p></div>)}
    </div></CardContent></Card>

    <Card><CardContent className="p-5 sm:p-6"><h2 className="text-base font-black">Thứ tự trả nợ · {strategyName(strategy)}</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Ước tính tháng mỗi khoản được tất toán nếu duy trì ngân sách trên.</p><div className="mt-4 space-y-2">{selected.payoff_order.map((item, index) => <div key={item.key} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] p-3"><div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--muted)] font-black">{index + 1}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{item.name}</p><p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">{item.kind === "credit_card" ? "Thẻ tín dụng" : "Khoản vay"}</p></div><div className="flex items-center gap-2 text-xs font-black"><ArrowRight className="size-3.5 text-[var(--muted-foreground)]" /> Tháng {item.month}</div></div>)}</div></CardContent></Card>

    <Card><CardContent className="p-5"><h2 className="text-sm font-black">Các khoản đang được mô phỏng</h2><div className="mt-3 grid gap-2 md:grid-cols-2">{debts.map((debt) => <div key={debt.key} className="flex items-center gap-3 rounded-2xl bg-[var(--muted)] p-3"><div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--card)]">{debt.kind === "credit_card" ? <CreditCard className="size-4 text-sky-600" /> : <Landmark className="size-4 text-orange-600" />}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-black">{debt.name}</p><p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">{debt.annual_rate_percent}%/năm · minimum {formatMinorMoney(debt.minimum_monthly_minor, currencyCode, decimalDigits)}</p></div><p className="text-xs font-black">{formatMinorMoney(debt.balance_minor, currencyCode, decimalDigits)}</p></div>)}</div></CardContent></Card>

    <p className="px-1 text-[11px] leading-5 text-[var(--muted-foreground)]">Mô phỏng là công cụ lập kế hoạch, không phải cam kết của ngân hàng/tổ chức tín dụng. Lãi thực tế có thể khác do ngày tính lãi, phí, lãi phạt, kỳ sao kê và cách phân bổ thanh toán của từng sản phẩm.</p>
  </div>;
}
