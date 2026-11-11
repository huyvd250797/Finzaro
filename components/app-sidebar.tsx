"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, LayoutDashboard, ReceiptText, Settings2, Shapes, WalletCards } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { APP_RELEASE_NAME, APP_VERSION_LABEL } from "@/lib/app-version";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/overview", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/transactions", label: "Giao dịch", icon: ReceiptText },
  { href: "/accounts", label: "Tài khoản & ví", icon: WalletCards },
  { href: "/reports", label: "Báo cáo & lịch", icon: BarChart3 },
  { href: "/categories", label: "Danh mục", icon: Shapes },
  { href: "/settings", label: "Cài đặt", icon: Settings2 }
];

export function AppSidebar() {
  const pathname = usePathname();
  return <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-[var(--border)] bg-[var(--sidebar)] px-4 py-5 lg:flex">
    <BrandLogo className="px-2" />
    <nav className="mt-7 flex-1 space-y-1 overflow-y-auto" aria-label="Điều hướng chính">
      {nav.map((item, index) => { const Icon = item.icon; const active = pathname === item.href || pathname.startsWith(item.href + "/"); return <div key={item.href}>{index === 4 && <p className="mb-2 mt-5 px-3 text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">Quản lý</p>}<Link href={item.href} prefetch className={cn("flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition", active ? "bg-[var(--sidebar-accent)] text-[var(--primary)]" : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]")}><Icon className="size-4.5" />{item.label}</Link></div>; })}
    </nav>
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5"><p className="text-xs font-black text-[var(--primary)]">Finzaro {APP_VERSION_LABEL}</p><p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">{APP_RELEASE_NAME}</p></div>
  </aside>;
}
