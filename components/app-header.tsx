import { LogOut, Search } from "lucide-react";
import Link from "next/link";
import { logoutAction } from "@/app/auth/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand-logo";
import { APP_VERSION_LABEL } from "@/lib/app-version";

function initial(displayName?: string, email?: string) {
  return (displayName?.trim()[0] ?? email?.trim()[0] ?? "F").toUpperCase();
}

export function AppHeader({ displayName, email }: { displayName?: string; email?: string }) {
  return (
    <header className="sticky top-0 z-20 flex h-18 items-center gap-3 border-b border-[var(--border)] bg-[color:var(--background)]/92 shadow-[0_8px_28px_-28px_rgba(0,0,0,.45)] px-4 backdrop-blur-xl md:px-6 lg:ml-64 lg:px-8">
      <BrandLogo compact className="lg:hidden" />
      <span className="inline-flex rounded-full bg-[var(--muted)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted-foreground)]">{APP_VERSION_LABEL}</span>
      <div className="hidden min-w-0 flex-1 md:block">
        <Link href="/transactions" className="flex h-10 max-w-md items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--muted-foreground)]"><Search className="size-4" /> Tìm giao dịch</Link>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <div className="ml-1 hidden min-w-0 items-center gap-2 sm:flex">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white">{initial(displayName, email)}</div>
          <div className="hidden min-w-0 xl:block"><p className="max-w-36 truncate text-xs font-bold">{displayName ?? "Finzaro User"}</p><p className="max-w-36 truncate text-[10px] text-[var(--muted-foreground)]">{email}</p></div>
        </div>
        <form action={logoutAction}>
          <button type="submit" title="Đăng xuất" aria-label="Đăng xuất" className="grid size-10 place-items-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"><LogOut className="size-4.5" /></button>
        </form>
      </div>
    </header>
  );
}
