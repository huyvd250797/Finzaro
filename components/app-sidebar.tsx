"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CreditCard, LayoutDashboard, ReceiptText, Settings2, Shapes, Target, WalletCards } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { APP_RELEASE_NAME, APP_VERSION_LABEL } from "@/lib/app-version";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/overview", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/accounts", label: "Tài khoản", icon: WalletCards },
  { href: "/transactions", label: "Giao dịch", icon: ReceiptText },
  { href: "/categories", label: "Danh mục", icon: Shapes },
  { href: "/budgets", label: "Ngân sách", icon: Target },
  { href: "/reports", label: "Báo cáo", icon: BarChart3 }
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-[var(--border)] bg-[var(--sidebar)] px-4 py-5 lg:flex lg:flex-col">
      <BrandLogo className="px-2" />
      <nav className="mt-8 space-y-1.5">
        {nav.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition", active ? "bg-[var(--sidebar-accent)] text-[var(--primary)]" : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]") }>
              <Icon className="size-4.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary)]"><CreditCard className="size-4" /> Tiếp theo</div>
          <p className="mt-2 text-sm font-semibold">Recurring & Calendar</p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">Tiếp theo: giao dịch định kỳ, lịch tài chính và các khoản sắp đến hạn.</p>
        </div>
        <Link href="/settings" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]">
          <Settings2 className="size-4.5" /> Cài đặt
        </Link>
        <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Finzaro {APP_VERSION_LABEL} · {APP_RELEASE_NAME}</div>
      </div>
    </aside>
  );
}
