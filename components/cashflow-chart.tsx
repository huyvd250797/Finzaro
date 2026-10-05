import { monthlyCashflow } from "@/lib/demo-data";

export function CashflowChart() {
  const width = 620;
  const height = 220;
  const pad = 24;
  const max = 42;
  const step = (width - pad * 2) / (monthlyCashflow.length - 1);
  const y = (v: number) => height - pad - (v / max) * (height - pad * 2);
  const line = (key: "income" | "expense") => monthlyCashflow.map((d, i) => `${i === 0 ? "M" : "L"} ${pad + i * step} ${y(d[key])}`).join(" ");

  return (
    <div className="overflow-hidden">
      <div className="mb-4 flex items-center gap-4 text-xs font-medium text-[var(--muted-foreground)]">
        <span className="inline-flex items-center gap-2"><span className="size-2 rounded-full bg-emerald-500" />Thu nhập</span>
        <span className="inline-flex items-center gap-2"><span className="size-2 rounded-full bg-rose-400" />Chi tiêu</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height + 28}`} className="h-auto w-full" role="img" aria-label="Biểu đồ dòng tiền 6 tháng">
        {[0, 1, 2, 3].map((i) => {
          const gy = pad + i * ((height - pad * 2) / 3);
          return <line key={i} x1={pad} y1={gy} x2={width - pad} y2={gy} stroke="currentColor" className="text-[var(--border)]" strokeDasharray="4 6" />;
        })}
        <path d={line("income")} fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d={line("expense")} fill="none" stroke="#fb7185" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {monthlyCashflow.map((d, i) => (
          <g key={d.month}>
            <circle cx={pad + i * step} cy={y(d.income)} r="4.5" fill="#10b981" />
            <circle cx={pad + i * step} cy={y(d.expense)} r="4.5" fill="#fb7185" />
            <text x={pad + i * step} y={height + 12} textAnchor="middle" className="fill-[var(--muted-foreground)] text-[11px]">{d.month}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
