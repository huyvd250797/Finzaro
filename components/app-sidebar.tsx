"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BarChart3, CalendarClock, CalendarRange, CircleDollarSign, Coins, CreditCard, HeartPulse, Landmark, LayoutDashboard, PiggyBank, ReceiptText, Scale, Settings2, Shapes, Sparkles, Target, TrendingDown, WalletCards } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { APP_RELEASE_NAME, APP_VERSION_LABEL } from "@/lib/app-version";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/overview", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/accounts", label: "Tài khoản", icon: WalletCards },
  { href: "/transactions", label: "Giao dịch", icon: ReceiptText },
  { href: "/categories", label: "Danh mục", icon: Shapes },
  { href: "/budgets", label: "Ngân sách", icon: Target },
  { href: "/recurring", label: "Định kỳ & Lịch", icon: CalendarClock },
  { href: "/goals", label: "Mục tiêu tiết kiệm", icon: PiggyBank },
  { href: "/goal-planner", label: "Kế hoạch mục tiêu", icon: Sparkles },
  { href: "/deposits", label: "Tiền gửi & lãi suất", icon: Landmark },
  { href: "/loans", label: "Khoản vay & dư nợ", icon: CircleDollarSign },
  { href: "/credit-cards", label: "Thẻ tín dụng", icon: CreditCard },
  { href: "/debt-strategy", label: "Chiến lược trả nợ", icon: TrendingDown },
  { href: "/assets", label: "Đầu tư & tài sản", icon: Coins },
  { href: "/net-worth", label: "Tài sản ròng", icon: Scale },
  { href: "/health", label: "Sức khỏe tài chính", icon: HeartPulse },
  { href: "/forecast", label: "Dự báo & Kịch bản", icon: Activity },
  { href: "/cash-flow", label: "Kế hoạch dòng tiền", icon: CalendarRange },
  { href: "/reports", label: "Báo cáo", icon: BarChart3 }
];

export function AppSidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-[var(--border)] bg-[color:var(--sidebar)]/96 px-4 py-5 shadow-[12px_0_40px_-38px_rgba(0,0,0,.45)] backdrop-blur-xl lg:flex lg:flex-col">
      <BrandLogo className="px-2" />
      <nav className="mt-7 flex-1 space-y-1 overflow-y-auto pr-1">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return <Link key={item.href} href={item.href} prefetch className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition active:scale-[0.99]", active ? "bg-[var(--sidebar-accent)] text-[var(--primary)]" : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]")}><Icon className="size-4.5" />{item.label}</Link>;
        })}
      </nav>
      <div className="mt-auto space-y-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary)]"><Sparkles className="size-4" /> Tiếp theo</div>
          <p className="mt-2 text-sm font-semibold">Production Release</p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">V1.0.0 là Production Release ổn định; các bản tiếp theo tập trung UI/UX, thao tác và hiệu năng thay vì mở rộng module lõi.</p>
        </div>
        <Link href="/settings" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"><Settings2 className="size-4.5" /> Cài đặt</Link>
        <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Finzaro {APP_VERSION_LABEL} · {APP_RELEASE_NAME}</div>
      </div>
    </aside>
  );
}
