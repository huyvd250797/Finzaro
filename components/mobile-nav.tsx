"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  BarChart3,
  CalendarClock,
  CircleDollarSign,
  CreditCard,
  Ellipsis,
  Landmark,
  LayoutDashboard,
  PiggyBank,
  Plus,
  ReceiptText,
  Scale,
  Settings2,
  Shapes,
  Target,
  WalletCards,
  X
} from "lucide-react";
import { useOverlayScrollLock } from "@/components/use-overlay-scroll-lock";
import { cn } from "@/lib/utils";

const moduleItems = [
  { href: "/accounts", label: "Tài khoản", icon: WalletCards },
  { href: "/categories", label: "Danh mục", icon: Shapes },
  { href: "/budgets", label: "Ngân sách", icon: Target },
  { href: "/goals", label: "Mục tiêu", icon: PiggyBank },
  { href: "/deposits", label: "Tiền gửi", icon: Landmark },
  { href: "/loans", label: "Khoản vay", icon: CircleDollarSign },
  { href: "/credit-cards", label: "Thẻ tín dụng", icon: CreditCard },
  { href: "/net-worth", label: "Tài sản ròng", icon: Scale },
  { href: "/reports", label: "Báo cáo", icon: BarChart3 },
  { href: "/settings", label: "Cài đặt", icon: Settings2 }
];

const quickTransactions = [
  { href: "/transactions?new=expense", label: "Chi tiêu", hint: "Ghi khoản tiền đi ra", icon: ArrowUpRight, tone: "text-rose-500 bg-rose-500/10" },
  { href: "/transactions?new=income", label: "Thu nhập", hint: "Ghi khoản tiền đi vào", icon: ArrowDownLeft, tone: "text-emerald-600 bg-emerald-500/10" },
  { href: "/transactions?new=transfer", label: "Chuyển tiền", hint: "Giữa các tài khoản", icon: ArrowLeftRight, tone: "text-sky-600 bg-sky-500/10" }
];

type Sheet = "modules" | "transaction" | null;

export function MobileNav() {
  const pathname = usePathname();
  const [sheet, setSheet] = useState<Sheet>(null);
  useOverlayScrollLock(Boolean(sheet));

  useEffect(() => setSheet(null), [pathname]);

  const leftItems = [
    { href: "/overview", label: "Tổng quan", icon: LayoutDashboard },
    { href: "/transactions", label: "Giao dịch", icon: ReceiptText }
  ];
  const rightItems = [
    { href: "/recurring", label: "Lịch", icon: CalendarClock },
    { href: "#more", label: "Thêm", icon: Ellipsis, more: true }
  ];

  return <>
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[color:var(--card)]/96 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-1.5 shadow-[0_-10px_30px_-24px_rgba(0,0,0,.35)] backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-[1fr_1fr_72px_1fr_1fr] items-end">
        {leftItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return <Link key={item.href} href={item.href} prefetch className={cn("mobile-tabbar-item", active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]")}><span className={cn("mobile-tabbar-icon", active && "bg-[var(--sidebar-accent)]")}><Icon className="size-[18px]" /></span><span className="mobile-tabbar-label">{item.label}</span></Link>;
        })}

        <button type="button" onClick={() => setSheet("transaction")} aria-label="Thêm giao dịch" className="group -mt-7 flex min-h-16 min-w-0 flex-col items-center justify-end gap-1 text-[10px] font-semibold text-[var(--foreground)] active:scale-[.97]">
          <span className="grid size-13 place-items-center rounded-full border-[5px] border-[var(--card)] bg-[var(--primary)] text-white shadow-[0_10px_25px_-10px_rgba(11,143,104,.75)] transition group-active:scale-95"><Plus className="size-6" strokeWidth={2.4} /></span>
          <span className="mobile-tabbar-label">Thêm GD</span>
        </button>

        {rightItems.map((item) => {
          const Icon = item.icon;
          const active = item.more ? sheet === "modules" : pathname === item.href;
          if (item.more) return <button key={item.label} type="button" onClick={() => setSheet("modules")} className={cn("mobile-tabbar-item", active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]")}><span className={cn("mobile-tabbar-icon", active && "bg-[var(--sidebar-accent)]")}><Icon className="size-[18px]" /></span><span className="mobile-tabbar-label">{item.label}</span></button>;
          return <Link key={item.href} href={item.href} prefetch className={cn("mobile-tabbar-item", active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]")}><span className={cn("mobile-tabbar-icon", active && "bg-[var(--sidebar-accent)]")}><Icon className="size-[18px]" /></span><span className="mobile-tabbar-label">{item.label}</span></Link>;
        })}
      </div>
    </nav>

    {sheet && <div className="fixed inset-0 z-50 overflow-hidden lg:hidden" role="dialog" aria-modal="true" aria-label={sheet === "modules" ? "Chọn module Finzaro" : "Thêm giao dịch"}>
      <button aria-label="Đóng" className="absolute inset-0 bg-black/45 backdrop-blur-[2px] animate-[fade-in_.18s_ease-out]" onClick={() => setSheet(null)} />
      <section className="absolute inset-x-0 bottom-0 max-h-[84dvh] overflow-y-auto overscroll-contain rounded-t-[30px] border-t border-[var(--border)] bg-[var(--card)] pb-[max(env(safe-area-inset-bottom),16px)] shadow-2xl [touch-action:pan-y] animate-[sheet-up_.24s_cubic-bezier(.2,.8,.2,1)]">
        <div className="sticky top-0 z-10 bg-[color:var(--card)]/96 px-4 pt-3 backdrop-blur-xl">
          <div className="mx-auto h-1.5 w-11 rounded-full bg-[var(--border)]" />
          <div className="mt-3 flex items-center justify-between gap-3 pb-3">
            <div className="min-w-0"><p className="text-base font-black">{sheet === "modules" ? "Truy cập nhanh" : "Thêm giao dịch"}</p><p className="mt-0.5 truncate text-xs text-[var(--muted-foreground)]">{sheet === "modules" ? "Tất cả module quan trọng ở một nơi" : "Chọn loại giao dịch muốn ghi nhận"}</p></div>
            <button type="button" onClick={() => setSheet(null)} aria-label="Đóng" className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--border)]"><X className="size-4" /></button>
          </div>
        </div>

        {sheet === "transaction" ? <div className="space-y-2 px-4 pb-4">
          {quickTransactions.map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} prefetch onClick={() => setSheet(null)} className="flex min-w-0 items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3.5 transition active:scale-[.99]"><span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl", item.tone)}><Icon className="size-5" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-black">{item.label}</span><span className="mt-0.5 block truncate text-xs text-[var(--muted-foreground)]">{item.hint}</span></span></Link>; })}
        </div> : <div className="grid grid-cols-3 gap-2.5 px-4 pb-4">
          {moduleItems.map((item) => { const Icon = item.icon; const active = pathname === item.href; return <Link key={item.href} href={item.href} prefetch onClick={() => setSheet(null)} className={cn("min-w-0 rounded-2xl border p-3 text-center transition active:scale-[.98]", active ? "border-[var(--primary)] bg-[var(--sidebar-accent)]" : "border-[var(--border)] bg-[var(--background)]")}><span className={cn("mx-auto grid size-10 place-items-center rounded-xl", active ? "bg-[var(--primary)] text-white" : "bg-[var(--muted)] text-[var(--primary)]")}><Icon className="size-[18px]" /></span><p className="mt-2 truncate text-[11px] font-bold">{item.label}</p></Link>; })}
        </div>}
      </section>
    </div>}
  </>;
}
