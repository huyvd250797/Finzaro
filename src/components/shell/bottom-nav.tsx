"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarRange, CirclePlus, ReceiptText, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Tổng quan", icon: BarChart3 },
  { href: "/transactions", label: "Giao dịch", icon: ReceiptText },
  { href: "/quick-entry", label: "Thêm", icon: CirclePlus, primary: true },
  { href: "/plans", label: "Kế hoạch", icon: CalendarRange },
  { href: "/tools", label: "Công cụ", icon: Wrench }
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 px-2 pt-2 backdrop-blur md:hidden" aria-label="Điều hướng chính">
      <div className="mx-auto grid max-w-xl grid-cols-5">
        {items.map(({ href, label, icon: Icon, primary }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link key={href} href={href} className={cn("flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium text-muted-foreground", active && "text-primary")}>
              <span className={cn("grid size-8 place-items-center rounded-xl", primary && "-mt-5 size-12 bg-primary text-primary-foreground shadow-lg", active && !primary && "bg-muted")}>
                <Icon className={cn(primary ? "size-6" : "size-5")} />
              </span>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
