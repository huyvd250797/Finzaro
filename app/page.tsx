import Link from "next/link";
import { ArrowRight, BarChart3, Database, ShieldCheck, Smartphone, WalletCards } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { APP_RELEASE_NAME, APP_VERSION_LABEL } from "@/lib/app-version";

export default function LandingPage() {
  return (
    <main className="finzaro-grid min-h-screen bg-[var(--background)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8">
        <BrandLogo />
        <div className="flex items-center gap-2"><Link href="/login" className="hidden rounded-xl px-4 py-2.5 text-sm font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] sm:block">Đăng nhập</Link><Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/15">Tạo tài khoản <ArrowRight className="size-4" /></Link></div>
      </header>
      <section className="mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-12 md:px-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:pt-20">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/8 px-3 py-1.5 text-xs font-semibold text-[var(--primary)]">{APP_VERSION_LABEL} · {APP_RELEASE_NAME}</div>
          <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.05] tracking-[-0.04em] sm:text-5xl lg:text-6xl">Dòng tiền có cấu trúc,<br /><span className="text-[var(--primary)]">bức tranh tài chính rõ ràng hơn.</span></h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[var(--muted-foreground)] sm:text-lg">Finzaro {APP_VERSION_LABEL} hợp nhất tài sản, tiền gửi, khoản vay và dư nợ thẻ thành Net Worth & Financial Position rõ ràng theo từng currency.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link href="/register" className="inline-flex h-12 items-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white shadow-lg shadow-emerald-500/15">Bắt đầu với Finzaro <ArrowRight className="size-4" /></Link><Link href="/login" className="inline-flex h-12 items-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 text-sm font-bold">Đăng nhập</Link></div>
          <div className="mt-10 grid max-w-xl grid-cols-3 gap-3 text-xs text-[var(--muted-foreground)]"><div className="flex items-center gap-2"><ShieldCheck className="size-4 text-[var(--primary)]" /> Auth + RLS</div><div className="flex items-center gap-2"><Database className="size-4 text-[var(--primary)]" /> Real Ledger</div><div className="flex items-center gap-2"><Smartphone className="size-4 text-[var(--primary)]" /> PWA-ready</div></div>
        </div>
        <div className="relative mx-auto w-full max-w-lg"><div className="absolute -inset-8 -z-10 rounded-full bg-emerald-500/10 blur-3xl" /><div className="rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-5 shadow-2xl shadow-black/8"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Net Worth · Financial Position</p><p className="mt-2 text-3xl font-black">Biết mình đang sở hữu gì và còn nợ bao nhiêu</p></div><div className="grid size-12 place-items-center rounded-2xl bg-[var(--primary)] text-white"><WalletCards className="size-6" /></div></div><div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-emerald-500/8 p-4"><p className="text-xs text-[var(--muted-foreground)]">Tài sản</p><p className="mt-2 font-bold text-emerald-600">Accounts · Deposits</p></div><div className="rounded-2xl bg-[var(--muted)] p-4"><p className="text-xs text-[var(--muted-foreground)]">Nghĩa vụ nợ</p><p className="mt-2 font-bold">Loans · Credit Cards</p></div></div><div className="mt-5 rounded-2xl bg-[var(--muted)] p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-[var(--muted-foreground)]">Net Worth</p><p className="mt-1 text-lg font-black">Assets − Liabilities</p></div><BarChart3 className="size-5 text-[var(--primary)]" /></div></div></div></div>
      </section>
    </main>
  );
}
