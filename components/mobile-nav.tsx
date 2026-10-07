"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BarChart3, CalendarClock, CreditCard, Ellipsis, Landmark, LayoutDashboard, PiggyBank, PlusCircle, ReceiptText, Settings2, Shapes, Target, WalletCards, CircleDollarSign, X } from "lucide-react";
import { cn } from "@/lib/utils";

const primaryItems = [
  { href: "/overview", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/transactions", label: "Giao dịch", icon: ReceiptText },
  { href: "/budgets", label: "Ngân sách", icon: Target },
  { href: "/recurring", label: "Lịch", icon: CalendarClock }
];

const moduleItems = [
  { href: "/transactions?new=expense", label: "Giao dịch mới", icon: PlusCircle },
  { href: "/accounts", label: "Tài khoản", icon: WalletCards },
  { href: "/categories", label: "Danh mục", icon: Shapes },
  { href: "/goals", label: "Mục tiêu", icon: PiggyBank },
  { href: "/deposits", label: "Tiền gửi", icon: Landmark },
  { href: "/loans", label: "Khoản vay", icon: CircleDollarSign },
  { href: "/credit-cards", label: "Thẻ tín dụng", icon: CreditCard },
  { href: "/reports", label: "Báo cáo", icon: BarChart3 },
  { href: "/settings", label: "Cài đặt", icon: Settings2 }
];

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  return <>
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[color:var(--card)]/96 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-1.5 shadow-[0_-10px_30px_-24px_rgba(0,0,0,.35)] backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-5">
        {primaryItems.map((item) => { const Icon = item.icon; const active = pathname === item.href; return <Link key={item.href} href={item.href} prefetch className={cn("mobile-tabbar-item", active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]")}><span className={cn("mobile-tabbar-icon", active && "bg-[var(--sidebar-accent)]")}><Icon className="size-[18px]" /></span><span className="mobile-tabbar-label">{item.label}</span></Link>; })}
        <button type="button" onClick={() => setOpen(true)} className={cn("mobile-tabbar-item", open ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]")}><span className={cn("mobile-tabbar-icon", open && "bg-[var(--sidebar-accent)]")}><Ellipsis className="size-[18px]" /></span><span className="mobile-tabbar-label">Thêm</span></button>
      </div>
    </nav>

    {open && <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Chọn module Finzaro">
      <button aria-label="Đóng menu" className="absolute inset-0 bg-black/45 backdrop-blur-[2px] animate-[fade-in_.18s_ease-out]" onClick={() => setOpen(false)} />
      <section className="absolute inset-x-0 bottom-0 max-h-[84dvh] overflow-y-auto overscroll-contain rounded-t-[30px] border-t border-[var(--border)] bg-[var(--card)] pb-[max(env(safe-area-inset-bottom),16px)] shadow-2xl animate-[sheet-up_.24s_cubic-bezier(.2,.8,.2,1)]">
        <div className="sticky top-0 z-10 bg-[color:var(--card)]/96 px-4 pt-3 backdrop-blur-xl"><div className="mx-auto h-1.5 w-11 rounded-full bg-[var(--border)]" /><div className="mt-3 flex items-center justify-between gap-3 pb-3"><div className="min-w-0"><p className="text-base font-black">Truy cập nhanh</p><p className="mt-0.5 truncate text-xs text-[var(--muted-foreground)]">Chọn module bạn muốn mở</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Đóng" className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--border)]"><X className="size-4" /></button></div></div>
        <div className="grid grid-cols-3 gap-2.5 px-4 pb-3">
          {moduleItems.map((item) => { const Icon = item.icon; const active = pathname === item.href.split("?")[0]; return <Link key={item.href} href={item.href} prefetch className={cn("min-w-0 rounded-2xl border p-3 text-center transition active:scale-[.98]", active ? "border-[var(--primary)] bg-[var(--sidebar-accent)]" : "border-[var(--border)] bg-[var(--background)]")}><span className={cn("mx-auto grid size-10 place-items-center rounded-xl", active ? "bg-[var(--primary)] text-white" : "bg-[var(--muted)] text-[var(--primary)]")}><Icon className="size-[18px]" /></span><p className="mt-2 truncate text-[11px] font-bold">{item.label}</p></Link>; })}
        </div>
      </section>
    </div>}
  </>;
}
