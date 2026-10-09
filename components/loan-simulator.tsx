"use client";

import { useMemo, useState } from "react";
import { Calculator, TrendingDown } from "lucide-react";
import { simulateExtraMonthlyPayment, type LoanInterestMethod, type LoanPaymentFrequency } from "@/features/loans/data";
import { formatMinorMoney } from "@/lib/utils";
import { MoneyCalculatorInput } from "@/components/money-calculator-input";

export function LoanSimulator({
  principalMinor,
  annualRatePercent,
  termMonths,
  interestMethod,
  paymentFrequency,
  currencyCode,
  decimalDigits
}: {
  principalMinor: number;
  annualRatePercent: number;
  termMonths: number;
  interestMethod: LoanInterestMethod;
  paymentFrequency: LoanPaymentFrequency;
  currencyCode: string;
  decimalDigits: number;
}) {
  const [extraMajor, setExtraMajor] = useState("0");
  const extraMinor = useMemo(() => {
    const parsed = Number(extraMajor.replace(/,/g, "."));
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return Math.round(parsed * 10 ** decimalDigits);
  }, [extraMajor, decimalDigits]);
  const result = useMemo(() => simulateExtraMonthlyPayment({ original_principal_minor: principalMinor, annual_rate_percent: annualRatePercent, term_months: termMonths, interest_method: interestMethod, payment_frequency: paymentFrequency }, extraMinor), [principalMinor, annualRatePercent, termMonths, interestMethod, paymentFrequency, extraMinor]);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--card)] text-[var(--primary)]"><Calculator className="size-4.5" /></span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-black">Mô phỏng trả thêm mỗi tháng</h3>
          <p className="mt-1 text-[11px] leading-5 text-[var(--muted-foreground)]">Ước tính tác động của khoản trả thêm lên thời gian hết nợ và tổng tiền lãi. Không ghi dữ liệu vào ledger.</p>
        </div>
      </div>
      <label className="mt-4 block">
        <span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Trả thêm mỗi tháng · {currencyCode}</span>
        <MoneyCalculatorInput value={extraMajor} onValueChange={setExtraMajor} decimalDigits={decimalDigits} currencyCode={currencyCode} placeholder="3000000" />
      </label>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl bg-[var(--card)] p-3"><p className="text-[10px] font-black uppercase text-[var(--muted-foreground)]">Thời gian mới</p><p className="mt-1 text-lg font-black">{result.months} tháng</p></div>
        <div className="rounded-xl bg-[var(--card)] p-3"><p className="text-[10px] font-black uppercase text-[var(--muted-foreground)]">Rút ngắn</p><p className="mt-1 text-lg font-black text-emerald-600">{result.monthsSaved} tháng</p></div>
        <div className="rounded-xl bg-[var(--card)] p-3"><p className="text-[10px] font-black uppercase text-[var(--muted-foreground)]">Tiết kiệm lãi</p><p className="mt-1 text-sm font-black text-emerald-600">{formatMinorMoney(result.interestSavedMinor, currencyCode, decimalDigits)}</p></div>
      </div>
      {interestMethod === "interest_only" && <p className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-amber-600"><TrendingDown className="size-3.5" /> Khoản vay chỉ trả lãi không áp dụng mô phỏng trả thêm theo lịch chuẩn.</p>}
    </div>
  );
}
