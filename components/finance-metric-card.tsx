import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tone = "income" | "expense" | "net" | "primary";

/** One compact financial KPI component shared by Reports and Advanced Analytics. */
export function FinanceMetricCard({ label, value, icon: Icon, tone, detail, className }: { label: string; value: string; icon: LucideIcon; tone: Tone; detail?: string; className?: string }) {
  return <Card className={cn("fin-report-kpi fin-metric-card min-w-0", className)} data-tone={tone} title={`${label}: ${value}`}>
    <CardContent className="flex h-full flex-col justify-between gap-3 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2"><p className="min-w-0 text-[11px] font-semibold text-[var(--muted-foreground)] sm:text-xs">{label}</p><span className="fin-metric-icon grid size-8 shrink-0 place-items-center rounded-xl sm:size-9"><Icon className="size-4" aria-hidden="true"/></span></div>
      <div><p className="fin-metric-value break-words text-[clamp(.9rem,3.4vw,1.45rem)] font-extrabold leading-tight tracking-[-.035em] tabular-nums">{value}</p>{detail && <p className="mt-1.5 text-[10px] leading-snug text-[var(--muted-foreground)] sm:text-[11px]">{detail}</p>}</div>
    </CardContent>
  </Card>;
}
