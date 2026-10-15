import Link from "next/link";
import { BarChart3, CalendarDays, LayoutDashboard, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ReportSection = "overview" | "calendar" | "analysis";

const items: Array<{ key: ReportSection; href: string; label: string; icon: LucideIcon }> = [
  { key: "overview", href: "/reports", label: "Tổng quan", icon: LayoutDashboard },
  { key: "calendar", href: "/reports/calendar", label: "Lịch", icon: CalendarDays },
  { key: "analysis", href: "/reports/analysis", label: "Phân tích", icon: BarChart3 }
];

export function ReportNavigation({ active }: { active: ReportSection }) {
  return (
    <div className="grid grid-cols-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-1">
      {items.map((item) => {
        const Icon = item.icon;
        const selected = item.key === active;
        return (
          <Link
            key={item.key}
            href={item.href}
            prefetch
            aria-current={selected ? "page" : undefined}
            className={cn(
              "flex min-h-9 min-w-0 items-center justify-center gap-1 rounded-lg px-1.5 text-[11px] font-black transition sm:min-h-10 sm:gap-1.5 sm:px-2 sm:text-sm",
              selected ? "bg-[var(--muted)] text-[var(--foreground)] shadow-sm" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            )}
          >
            <Icon className="size-3.5 shrink-0 sm:size-4" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
