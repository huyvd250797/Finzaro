"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, BarChart3, Ellipsis, LayoutDashboard, Plus, ReceiptText, Settings2, Shapes, WalletCards, X } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { cn } from "@/lib/utils";
import { useSmartSectionRoutes } from "@/components/navigation-memory";
import { APP_RELEASE_NAME, APP_VERSION_LABEL } from "@/lib/app-version";

const moduleItems = [
  { href: "/accounts", label: "Tài khoản & ví", icon: WalletCards, style: "border-[var(--border)]" },
  { href: "/categories", label: "Danh mục", icon: Shapes, style: "border-[var(--border)]" },
  { href: "/settings", label: "Cài đặt", icon: Settings2, style: "border-[var(--border)]" }
];
const quickTransactions = [
  { href: "/transactions?new=expense", label: "Chi tiền", icon: ArrowUpRight, style: "text-rose-600 bg-rose-500/10 border-rose-500/30" },
  { href: "/transactions?new=income", label: "Thu tiền", icon: ArrowDownLeft, style: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30" },
  { href: "/transactions?new=transfer", label: "Chuyển tiền", icon: ArrowLeftRight, style: "text-sky-600 bg-sky-500/10 border-sky-500/30" }
];
export function MobileNav() {
  const pathname = usePathname();
  const smartRoutes = useSmartSectionRoutes();
  const [sheet, setSheet] = useState<"modules" | "transaction" | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  useEffect(() => { setPortalReady(true); }, []);
  useEffect(() => {
    const viewport = window.visualViewport;
    const update = () => {
      const bottom = Math.max(0, window.innerHeight - (viewport?.offsetTop ?? 0) - (viewport?.height ?? window.innerHeight));
      document.documentElement.style.setProperty("--fin-mobile-nav-bottom", `${Math.round(bottom)}px`);
      const focused = document.activeElement;
      const inputFocused = focused instanceof HTMLInputElement || focused instanceof HTMLTextAreaElement || focused instanceof HTMLSelectElement;
      document.documentElement.classList.toggle("fin-mobile-keyboard-visible", inputFocused && window.innerHeight - (viewport?.height ?? window.innerHeight) > 180);
    };
    update();
    viewport?.addEventListener("scroll", update);
    viewport?.addEventListener("resize", update);
    window.addEventListener("resize", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    return () => {
      viewport?.removeEventListener("scroll", update);
      viewport?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
      document.documentElement.style.removeProperty("--fin-mobile-nav-bottom");
      document.documentElement.classList.remove("fin-mobile-keyboard-visible");
    };
  }, []);
  useEffect(() => setSheet(null), [pathname]);
  const tabs = [
    { href: "/overview", label: "Tổng quan", icon: LayoutDashboard },
    { href: "/transactions", label: "Giao dịch", icon: ReceiptText },
    { href: "/reports", label: "Báo cáo", icon: BarChart3 }
  ];
  const renderTab = (item: typeof tabs[number]) => { const Icon = item.icon; const active = pathname === item.href || pathname.startsWith(item.href + "/"); return <Link key={item.href} href={smartRoutes[item.href] ?? item.href} prefetch aria-current={active ? "page" : undefined} className={cn("mobile-tabbar-item", active ? "is-active text-[var(--primary)]" : "text-[var(--muted-foreground)]")}><span className={cn("mobile-tabbar-icon", active && "bg-[var(--sidebar-accent)]")}><Icon className="size-[18px]" /></span><span className="mobile-tabbar-label">{item.label}</span></Link>; };
  const taskbar = <nav data-fin-mobile-taskbar="true" className="fin-mobile-taskbar fixed inset-x-0 bottom-0 fin-premium-tabbar z-[80] overflow-visible border-t border-[var(--border)] bg-[var(--card)]/96 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-[1fr_1fr_72px_1fr_1fr] items-end">
        {tabs.slice(0,2).map(renderTab)}
        <button type="button" onClick={() => setSheet("transaction")} aria-label="Thêm giao dịch" aria-expanded={sheet === "transaction"} className="fin-add-transaction group relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold active:scale-[.97]"><span className="grid size-10 place-items-center rounded-xl bg-[var(--primary)] text-white shadow-sm transition-transform group-active:scale-95"><Plus className="size-5" /></span><span className="mobile-tabbar-label">Thêm GD</span></button>
        {renderTab(tabs[2])}
        <button type="button" onClick={() => setSheet("modules")} aria-expanded={sheet === "modules"} className="mobile-tabbar-item text-[var(--muted-foreground)]"><span className="mobile-tabbar-icon"><Ellipsis className="size-[18px]" /></span><span className="mobile-tabbar-label">Thêm</span></button>
      </div>
    </nav>;
  return <>
    {portalReady ? createPortal(taskbar, document.body) : taskbar}
    <BottomSheet open={Boolean(sheet)} onClose={() => setSheet(null)} label={sheet === "modules" ? "Tiện ích" : "Thêm giao dịch"} mobileOnly panelClassName="border border-[var(--border)] px-4 pb-[max(env(safe-area-inset-bottom),18px)]">
        <div className="mb-4 flex items-center justify-between"><h2 className="font-black">{sheet === "modules" ? "Tiện ích" : "Thêm giao dịch"}</h2><button type="button" onClick={() => setSheet(null)} className="grid size-9 place-items-center rounded-xl bg-[var(--muted)]" aria-label="Đóng"><X className="size-4" /></button></div>
        <div className="grid grid-cols-3 gap-3">{(sheet === "modules" ? moduleItems : quickTransactions).map((item) => { const Icon = item.icon; return <Link key={item.href} href={smartRoutes[item.href] ?? item.href} prefetch onClick={() => setSheet(null)} className={cn("flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border text-center text-xs font-bold", item.style)}><Icon className={cn("size-6", sheet === "modules" ? "text-[var(--primary)]" : "")} />{item.label}</Link>; })}</div>
        {sheet === "modules" && <div className="mt-4 flex items-center justify-between rounded-xl bg-[var(--muted)] px-3 py-2.5 text-xs"><span className="text-[var(--muted-foreground)]">{APP_RELEASE_NAME}</span><span className="font-black tabular-nums text-[var(--primary)]">{APP_VERSION_LABEL}</span></div>}
    </BottomSheet>
  </>;
}
