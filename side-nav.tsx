import Link from "next/link";
import { BarChart3, CalendarRange, Landmark, ReceiptText, Settings, Wrench } from "lucide-react";

const items = [
  ["/", "Tổng quan", BarChart3],
  ["/transactions", "Giao dịch", ReceiptText],
  ["/plans", "Kế hoạch", CalendarRange],
  ["/tools", "Công cụ", Wrench],
  ["/settings", "Cài đặt", Settings]
] as const;

export function SideNav() {
  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card md:flex md:min-h-dvh md:flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-5 font-bold tracking-tight">
        <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Landmark className="size-5" /></span>
        Finzaro
      </div>
      <nav className="grid gap-1 p-3">
        {items.map(([href, label, Icon]) => (
          <Link key={href} href={href} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
            <Icon className="size-5" />{label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto border-t p-4 text-xs leading-5 text-muted-foreground">V0.1.0 · Foundation & Secure Account</div>
    </aside>
  );
}
