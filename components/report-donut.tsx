import type { CSSProperties } from "react";
import { formatMinorMoney } from "@/lib/utils";

const SLICE_COLORS = ["#36c997", "#3b82f6", "#f59e0b", "#f43f5e", "#8b5cf6", "#06b6d4", "#84cc16", "#f97316"];

export type DonutSlice = { label: string; amount: number; percent: number };

export function reportSliceColor(index: number) {
  return SLICE_COLORS[index % SLICE_COLORS.length];
}

export function ReportDonut({ slices, total, currency, decimalDigits = 0, centerLabel }: { slices: DonutSlice[]; total: number; currency: string; decimalDigits?: number; centerLabel: string }) {
  let cursor = 0;
  const stops: string[] = [];
  slices.slice(0, 8).forEach((slice, index) => {
    const start = cursor;
    cursor += slice.percent;
    stops.push(`${reportSliceColor(index)} ${start}% ${Math.min(100, cursor)}%`);
  });
  if (cursor < 100) stops.push(`var(--muted) ${cursor}% 100%`);
  const style = { background: slices.length > 0 ? `conic-gradient(${stops.join(", ")})` : "var(--muted)" } as CSSProperties;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[260px] rounded-full p-[18%]" style={style} role="img" aria-label={`${centerLabel}: ${formatMinorMoney(total, currency, decimalDigits)}`}>
      <div className="grid size-full place-items-center rounded-full bg-[var(--card)] text-center shadow-inner">
        <div className="min-w-0 px-2">
          <p className="break-words text-base font-black sm:text-lg">{formatMinorMoney(total, currency, decimalDigits)}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">{centerLabel}</p>
        </div>
      </div>
    </div>
  );
}
