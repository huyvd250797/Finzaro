"use client";

import Link from "next/link";
import { CalendarDays, LayoutDashboard, FileText, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSmartSectionRoutes } from "@/components/navigation-memory";

export type ReportSection = "overview" | "calendar" | "statements";

const items: Array<{ key: ReportSection; href: string; label: string; icon: LucideIcon }> = [
  { key: "overview", href: "/reports", label: "Tổng quan", icon: LayoutDashboard },
  { key: "calendar", href: "/reports/calendar", label: "Lịch", icon: CalendarDays },
  { key: "statements", href: "/reports/statements", label: "Sổ báo cáo", icon: FileText }
];

export function ReportNavigation({ active }: { active: ReportSection }) {
  const smartRoutes = useSmartSectionRoutes();
  return (
    <nav aria-label="Khu vực báo cáo" className="fin-report-navigation grid grid-cols-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-1">
      {items.map((item) => {
        const Icon = item.icon;
        const selected = item.key === active;
        return (
          <Link
            key={item.key}
            href={smartRoutes[item.href] ?? item.href}
            prefetch={false}
            aria-current={selected ? "page" : undefined}
            className={cn(
              "fin-report-nav-link flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-bold transition-colors sm:gap-1.5 sm:px-2 sm:text-sm",
              selected ? "bg-[var(--muted)] text-[var(--foreground)] shadow-sm" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            )}
          >
            <Icon className="size-3.5 shrink-0 sm:size-4" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
