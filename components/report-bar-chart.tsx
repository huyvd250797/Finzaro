import { formatCompactMoney } from "@/lib/utils";

export type ReportBarPoint = { label: string; value: number };

export function ReportBarChart({ data, decimalDigits = 0, ariaLabel = "Biểu đồ theo thời gian" }: { data: ReportBarPoint[]; decimalDigits?: number; ariaLabel?: string }) {
  const scale = 10 ** decimalDigits;
  const major = data.map((item) => ({ ...item, major: item.value / scale }));
  const max = Math.max(1, ...major.map((item) => item.major));

  return (
    <div role="img" aria-label={ariaLabel} className="overflow-x-auto pb-1">
      <div className="flex min-w-[520px] items-end gap-2 sm:gap-3" style={{ height: 220 }}>
        {major.map((item) => {
          const height = item.value > 0 ? Math.max(5, (item.major / max) * 150) : 2;
          return (
            <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center justify-end self-stretch">
              <span className="mb-1 min-h-5 whitespace-nowrap text-[9px] font-bold text-[var(--muted-foreground)]">{item.value > 0 ? formatCompactMoney(item.major) : ""}</span>
              <div className="flex h-[155px] w-full items-end justify-center border-b border-[var(--border)]">
                <div className="w-[62%] max-w-9 rounded-t-lg bg-[var(--primary)] transition-[height]" style={{ height }} />
              </div>
              <span className="mt-2 text-[10px] font-bold text-[var(--muted-foreground)]">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
