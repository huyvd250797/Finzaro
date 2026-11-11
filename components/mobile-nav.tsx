"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, BarChart3, Ellipsis, LayoutDashboard, Plus, ReceiptText, Settings2, Shapes, WalletCards, X } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { cn } from "@/lib/utils";
import { APP_RELEASE_NAME, APP_VERSION_LABEL } from "@/lib/app-version";

const moduleItems = [
  { href: "/accounts", label: "Tài khoản & ví", icon: WalletCards },
  { href: "/categories", label: "Danh mục", icon: Shapes },
  { href: "/settings", label: "Cài đặt", icon: Settings2 }
];
const quickTransactions = [
  { href: "/transactions?new=expense", label: "Chi tiền", icon: ArrowUpRight, style: "text-rose-600 bg-rose-500/10 border-rose-500/30" },
  { href: "/transactions?new=income", label: "Thu tiền", icon: ArrowDownLeft, style: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30" },
  { href: "/transactions?new=transfer", label: "Chuyển tiền", icon: ArrowLeftRight, style: "text-sky-600 bg-sky-500/10 border-sky-500/30" }
];
export function MobileNav() {
  const pathname = usePathname();
  const [sheet, setSheet] = useState<"modules" | "transaction" | null>(null);
  useEffect(() => setSheet(null), [pathname]);
  const tabs = [
    { href: "/overview", label: "Tổng quan", icon: LayoutDashboard },
    { href: "/transactions", label: "Giao dịch", icon: ReceiptText },
    { href: "/reports", label: "Báo cáo", icon: BarChart3 }
  ];
  const renderTab = (item: typeof tabs[number]) => { const Icon = item.icon; const active = pathname === item.href || pathname.startsWith(item.href + "/"); return <Link key={item.href} href={item.href} prefetch={false} className={cn("mobile-tabbar-item", active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]")}><span className={cn("mobile-tabbar-icon", active && "bg-[var(--sidebar-accent)]")}><Icon className="size-[18px]" /></span><span className="mobile-tabbar-label">{item.label}</span></Link>; };
  return <>
    <nav className="fin-mobile-taskbar fixed inset-x-0 bottom-0 z-[80] overflow-visible border-t border-[var(--border)] bg-[var(--card)]/96 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-[1fr_1fr_72px_1fr_1fr] items-end">
        {tabs.slice(0,2).map(renderTab)}
        <button type="button" onClick={() => setSheet("transaction")} aria-label="Thêm giao dịch" className="group relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold active:scale-[.97]"><span className="grid size-10 place-items-center rounded-xl bg-[var(--primary)] text-white shadow-sm transition-transform group-active:scale-95"><Plus className="size-5" /></span><span className="mobile-tabbar-label">Thêm GD</span></button>
        {renderTab(tabs[2])}
        <button type="button" onClick={() => setSheet("modules")} className="mobile-tabbar-item text-[var(--muted-foreground)]"><span className="mobile-tabbar-icon"><Ellipsis className="size-[18px]" /></span><span className="mobile-tabbar-label">Thêm</span></button>
      </div>
    </nav>
    <BottomSheet open={Boolean(sheet)} onClose={() => setSheet(null)} label={sheet === "modules" ? "Tiện ích" : "Thêm giao dịch"} mobileOnly panelClassName="border border-[var(--border)] px-4 pb-[max(env(safe-area-inset-bottom),18px)]">
        <div className="mb-4 flex items-center justify-between"><h2 className="font-black">{sheet === "modules" ? "Tiện ích" : "Thêm giao dịch"}</h2><button type="button" onClick={() => setSheet(null)} className="grid size-9 place-items-center rounded-xl bg-[var(--muted)]" aria-label="Đóng"><X className="size-4" /></button></div>
        <div className="grid grid-cols-3 gap-3">{(sheet === "modules" ? moduleItems : quickTransactions).map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} prefetch onClick={() => setSheet(null)} className={cn("flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border text-center text-xs font-bold", "style" in item ? item.style : "border-[var(--border)]")}><Icon className={cn("size-6", "style" in item ? "" : "text-[var(--primary)]")} />{item.label}</Link>; })}</div>
        {sheet === "modules" && <div className="mt-4 flex items-center justify-between rounded-xl bg-[var(--muted)] px-3 py-2.5 text-xs"><span className="text-[var(--muted-foreground)]">{APP_RELEASE_NAME}</span><span className="font-black tabular-nums text-[var(--primary)]">{APP_VERSION_LABEL}</span></div>}
    </BottomSheet>
  </>;
}
