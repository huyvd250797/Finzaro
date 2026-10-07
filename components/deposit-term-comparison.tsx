"use client";

import { useMemo, useState } from "react";
import { Calculator, Landmark, TrendingUp } from "lucide-react";
import { projectedInterestMinor } from "@/features/deposits/data";
import { formatMinorMoney } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

const TERMS = [3, 6, 12, 24];

export function DepositTermComparison({ currencyCode, decimalDigits }: { currencyCode: string; decimalDigits: number }) {
  const [principalMajor, setPrincipalMajor] = useState(currencyCode === "VND" ? "100000000" : "10000");
  const [rate, setRate] = useState("5.8");
  const scale = 10 ** decimalDigits;
  const principalMinor = Math.max(0, Math.round((Number(principalMajor.replace(/,/g, "")) || 0) * scale));
  const annualRate = Math.max(0, Number(rate) || 0);
  const rows = useMemo(() => TERMS.map((term) => {
    const interest = projectedInterestMinor(principalMinor, annualRate, term, "simple_maturity");
    return { term, interest, total: principalMinor + interest };
  }), [principalMinor, annualRate]);

  return (
    <Card className="border-sky-500/20">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-sky-500"><Calculator className="size-4" /> So sánh kỳ hạn</div><h2 className="mt-1 text-lg font-black">Mô phỏng lãi đơn 3 / 6 / 12 / 24 tháng</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Công cụ planning, không ghi dữ liệu vào database. Ngân hàng thực tế có thể dùng quy ước ngày và cách tính khác.</p></div>
          <div className="grid size-11 place-items-center rounded-2xl bg-sky-500/10 text-sky-500"><Landmark className="size-5" /></div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label><span className="mb-1.5 block text-xs font-bold text-[var(--muted-foreground)]">Số tiền gốc · {currencyCode}</span><input value={principalMajor} onChange={(event) => setPrincipalMajor(event.target.value)} inputMode="decimal" className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--primary)]" /></label>
          <label><span className="mb-1.5 block text-xs font-bold text-[var(--muted-foreground)]">Lãi suất năm (%)</span><input value={rate} onChange={(event) => setRate(event.target.value)} inputMode="decimal" className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--primary)]" /></label>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {rows.map((row) => <div key={row.term} className="rounded-xl border border-[var(--border)] p-3.5"><div className="flex items-center justify-between"><span className="text-xs font-black">{row.term} tháng</span><TrendingUp className="size-3.5 text-emerald-500" /></div><p className="mt-3 text-[10px] font-bold uppercase text-[var(--muted-foreground)]">Lãi dự kiến</p><p className="mt-1 text-sm font-black text-emerald-500">+{formatMinorMoney(row.interest, currencyCode, decimalDigits)}</p><p className="mt-2 text-[10px] text-[var(--muted-foreground)]">Đáo hạn</p><p className="mt-1 text-xs font-black">{formatMinorMoney(row.total, currencyCode, decimalDigits)}</p></div>)}
        </div>
      </CardContent>
    </Card>
  );
}
