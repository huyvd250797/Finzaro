import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";

export function StatCard({ label, value, delta, icon: Icon, tone = "neutral" }: { label: string; value: number; delta?: number; icon: LucideIcon; tone?: "neutral" | "positive" | "negative" }) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[var(--muted-foreground)]">{label}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight">{formatMoney(value)}</p>
          </div>
          <div className="grid size-10 place-items-center rounded-xl bg-[var(--muted)] text-[var(--primary)]"><Icon className="size-5" /></div>
        </div>
        {typeof delta === "number" && (
          <div className={`mt-4 inline-flex items-center gap-1 text-xs font-semibold ${tone === "negative" ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400"}`}>
            {delta >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            {Math.abs(delta)}% <span className="font-normal text-[var(--muted-foreground)]">so với tháng trước</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
