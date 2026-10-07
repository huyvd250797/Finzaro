"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3, CalendarClock, CreditCard, Ellipsis, Landmark, LayoutDashboard, PiggyBank, Plus,
  ReceiptText, Settings2, Shapes, Target, WalletCards, X
} from "lucide-react";
import { cn } from "@/lib/utils";

const primaryItems = [
  { href: "/overview", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/transactions", label: "Giao dịch", icon: ReceiptText },
  { href: "/transactions?new=expense", label: "Thêm", icon: Plus, main: true },
  { href: "/recurring", label: "Lịch", icon: CalendarClock }
];

const moduleItems = [
  { href: "/accounts", label: "Tài khoản", icon: WalletCards },
  { href: "/categories", label: "Danh mục", icon: Shapes },
  { href: "/budgets", label: "Ngân sách", icon: Target },
  { href: "/goals", label: "Mục tiêu", icon: PiggyBank },
  { href: "/deposits", label: "Tiền gửi", icon: Landmark },
  { href: "/loans", label: "Khoản vay", icon: CreditCard },
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

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[color:var(--card)]/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur lg:hidden">
        <div className="grid grid-cols-5">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const active = !item.main && pathname === item.href;
            return (
              <Link key={item.label} href={item.href} prefetch className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 text-[10px] font-medium active:scale-[0.98]">
                <span className={cn("grid place-items-center transition", item.main ? "-mt-7 size-12 rounded-full bg-[var(--primary)] text-white shadow-lg shadow-emerald-500/25" : active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]")}>
                  <Icon className={item.main ? "size-5" : "size-4.5"} />
                </span>
                <span className={cn("max-w-full truncate", item.main ? "text-[var(--foreground)]" : active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]")}>{item.label}</span>
              </Link>
            );
          })}
          <button type="button" onClick={() => setOpen(true)} className={cn("flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 text-[10px] font-medium active:scale-[0.98]", open ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]")}>
            <span className="grid place-items-center"><Ellipsis className="size-5" /></span>
            <span>Thêm</span>
          </button>
        </div>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Chọn module Finzaro">
          <button aria-label="Đóng menu" className="absolute inset-0 bg-black/45 backdrop-blur-[2px] animate-[fade-in_.18s_ease-out]" onClick={() => setOpen(false)} />
          <section className="absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-y-auto rounded-t-[28px] border-t border-[var(--border)] bg-[var(--card)] pb-[max(env(safe-area-inset-bottom),16px)] shadow-2xl animate-[sheet-up_.24s_cubic-bezier(.2,.8,.2,1)]">
            <div className="sticky top-0 z-10 bg-[var(--card)] px-4 pt-3">
              <div className="mx-auto h-1.5 w-11 rounded-full bg-[var(--border)]" />
              <div className="mt-3 flex items-center justify-between gap-3 pb-3">
                <div className="min-w-0"><p className="text-lg font-black">Thêm module</p><p className="mt-0.5 truncate text-xs text-[var(--muted-foreground)]">Truy cập nhanh mọi khu vực của Finzaro</p></div>
                <button type="button" onClick={() => setOpen(false)} aria-label="Đóng" className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--border)]"><X className="size-4" /></button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 px-4 pb-3 sm:grid-cols-3">
              {moduleItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} prefetch className={cn("min-w-0 rounded-2xl border p-4 transition active:scale-[0.98]", active ? "border-[var(--primary)] bg-[var(--sidebar-accent)]" : "border-[var(--border)] bg-[var(--background)]")}>
                    <span className={cn("grid size-10 place-items-center rounded-xl", active ? "bg-[var(--primary)] text-white" : "bg-[var(--muted)] text-[var(--primary)]")}><Icon className="size-4.5" /></span>
                    <p className="mt-3 truncate text-sm font-black">{item.label}</p>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
