"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReportFlowType } from "@/features/reports/experience";

type PeriodLinks = Record<ReportFlowType, { month: string; year: string; previous: string; next: string }>;

/** Keep period navigation in sync with the client-only Thu/Chi toggle.
 * Prefetch one destination only on intent, never four heavy reports on mount.
 */
export function ReportPeriodControls({ mode, initialType, periodLabel, from, to, periodKey, links }: {
  mode: "month" | "year";
  initialType: ReportFlowType;
  periodLabel: string;
  from: string;
  to: string;
  periodKey: string;
  links: PeriodLinks;
}) {
  const router = useRouter();
  const [type, setType] = useState<ReportFlowType>(initialType);
  useEffect(() => { setType(initialType); }, [initialType, periodKey]);
  useEffect(() => {
    const readHistory = () => setType(new URLSearchParams(window.location.search).get("type") === "income" ? "income" : "expense");
    const onFlowChange = (event: Event) => {
      const flow = (event as CustomEvent<{ type?: ReportFlowType }>).detail?.type;
      if (flow === "income" || flow === "expense") setType(flow);
    };
    window.addEventListener("popstate", readHistory);
    window.addEventListener("finzaro:report-flow-change", onFlowChange);
    return () => { window.removeEventListener("popstate", readHistory); window.removeEventListener("finzaro:report-flow-change", onFlowChange); };
  }, []);
  const current = links[type];
  const warm = (href: string) => { if (!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) router.prefetch(href); };
  return <div className="grid grid-cols-[112px_1fr] items-center gap-2 sm:grid-cols-[150px_1fr]">
    <div className="grid grid-cols-2 rounded-lg bg-[var(--muted)]/70 p-0.5">
      {(["month", "year"] as const).map((value) => <Link key={value} href={current[value]} prefetch={false} onMouseEnter={() => warm(current[value])} onFocus={() => warm(current[value])} className={cn("grid min-h-8 place-items-center rounded-md text-[10px] font-black sm:text-xs", mode === value ? "bg-[var(--card)] shadow-sm" : "text-[var(--muted-foreground)]")}>{value === "month" ? "Tháng" : "Năm"}</Link>)}
    </div>
    <div className="flex min-w-0 items-center gap-1">
      <Link href={current.previous} prefetch={false} onMouseEnter={() => warm(current.previous)} onFocus={() => warm(current.previous)} aria-label="Kỳ trước" className="grid size-8 shrink-0 place-items-center rounded-lg hover:bg-[var(--muted)]"><ChevronLeft className="size-4" /></Link>
      <div className="min-w-0 flex-1 text-center"><p className="truncate text-sm font-black sm:text-base">{periodLabel}</p><p className="hidden text-[9px] font-bold text-[var(--muted-foreground)] sm:block">{from} → {to}</p></div>
      <Link href={current.next} prefetch={false} onMouseEnter={() => warm(current.next)} onFocus={() => warm(current.next)} aria-label="Kỳ sau" className="grid size-8 shrink-0 place-items-center rounded-lg hover:bg-[var(--muted)]"><ChevronRight className="size-4" /></Link>
    </div>
  </div>;
}
