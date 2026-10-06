import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { APP_VERSION_LABEL } from "@/lib/app-version";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="finzaro-grid grid min-h-screen place-items-center px-5 py-10">
      <div className="w-full max-w-md rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl shadow-black/5 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <BrandLogo />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--primary)]">
            <ShieldCheck className="size-3.5" /> {APP_VERSION_LABEL}
          </span>
        </div>
        {children}
        <div className="mt-6 flex items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            <ArrowLeft className="size-4" /> Quay lại trang chủ
          </Link>
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Finzaro {APP_VERSION_LABEL}</span>
        </div>
      </div>
    </main>
  );
}
