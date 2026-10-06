"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, LayoutDashboard, Plus, ReceiptText, WalletCards } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/overview", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/accounts", label: "Tài khoản", icon: WalletCards },
  { href: "/accounts?new=1", label: "Thêm", icon: Plus, main: true },
  { href: "/transactions", label: "Giao dịch", icon: ReceiptText },
  { href: "/reports", label: "Báo cáo", icon: BarChart3 }
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[color:var(--card)]/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur lg:hidden">
      <div className="grid grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = !item.main && pathname === item.href;
          return (
            <Link key={item.label} href={item.href} className="flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-medium">
              <span className={cn("grid place-items-center transition", item.main ? "-mt-7 size-12 rounded-full bg-[var(--primary)] text-white shadow-lg shadow-emerald-500/25" : active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]") }>
                <Icon className={item.main ? "size-5" : "size-4.5"} />
              </span>
              <span className={cn(item.main ? "text-[var(--foreground)]" : active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]")}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
