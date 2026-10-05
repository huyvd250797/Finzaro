import { Bell, Search } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand-logo";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 flex h-18 items-center gap-3 border-b border-[var(--border)] bg-[color:var(--background)]/88 px-4 backdrop-blur-xl md:px-6 lg:ml-64 lg:px-8">
      <BrandLogo compact className="lg:hidden" />
      <div className="hidden min-w-0 flex-1 md:block">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input aria-label="Tìm kiếm" placeholder="Tìm giao dịch, tài khoản..." className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] pl-10 pr-4 text-sm outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]" />
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <button type="button" aria-label="Thông báo" className="relative grid size-10 place-items-center rounded-xl border border-[var(--border)] bg-[var(--card)] transition hover:bg-[var(--muted)]">
          <Bell className="size-4.5" />
          <span className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-rose-500" />
        </button>
        <div className="ml-1 grid size-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white">B</div>
      </div>
    </header>
  );
}
