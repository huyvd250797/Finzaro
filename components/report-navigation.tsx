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
    <div className="grid grid-cols-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-1 shadow-sm">
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
              "flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-black transition sm:text-sm",
              selected ? "bg-[var(--muted)] text-[var(--foreground)] shadow-sm" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
