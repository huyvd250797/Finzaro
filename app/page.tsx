import Link from "next/link";
import { ArrowRight, BarChart3, ShieldCheck, Smartphone, WalletCards } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export default function LandingPage() {
  return (
    <main className="finzaro-grid min-h-screen bg-[var(--background)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8">
        <BrandLogo />
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden rounded-xl px-4 py-2.5 text-sm font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] sm:block">Đăng nhập</Link>
          <Link href="/overview" className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/15">Mở bản demo <ArrowRight className="size-4" /></Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-12 md:px-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:pt-20">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/8 px-3 py-1.5 text-xs font-semibold text-[var(--primary)]">V0.1 · Foundation & PWA</div>
          <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.05] tracking-[-0.04em] sm:text-5xl lg:text-6xl">Tài chính cá nhân,<br /><span className="text-[var(--primary)]">rõ ràng hơn mỗi ngày.</span></h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[var(--muted-foreground)] sm:text-lg">Finzaro giúp bạn nhìn thấy dòng tiền, tài khoản và thói quen chi tiêu trong một không gian tài chính gọn gàng, chuyên nghiệp và sẵn sàng mở rộng.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/overview" className="inline-flex h-12 items-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white shadow-lg shadow-emerald-500/15">Khám phá dashboard <ArrowRight className="size-4" /></Link>
            <Link href="/login" className="inline-flex h-12 items-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 text-sm font-bold">Giao diện đăng nhập</Link>
          </div>
          <div className="mt-10 grid max-w-xl grid-cols-3 gap-3 text-xs text-[var(--muted-foreground)]">
            <div className="flex items-center gap-2"><ShieldCheck className="size-4 text-[var(--primary)]" /> Security-first</div>
            <div className="flex items-center gap-2"><Smartphone className="size-4 text-[var(--primary)]" /> PWA-ready</div>
            <div className="flex items-center gap-2"><BarChart3 className="size-4 text-[var(--primary)]" /> Finance UX</div>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-lg">
          <div className="absolute -inset-8 -z-10 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-5 shadow-2xl shadow-black/8">
            <div className="flex items-center justify-between">
              <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Tổng tài sản khả dụng</p><p className="mt-2 text-3xl font-black">128.500.000 ₫</p></div>
              <div className="grid size-12 place-items-center rounded-2xl bg-[var(--primary)] text-white"><WalletCards className="size-6" /></div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-emerald-500/8 p-4"><p className="text-xs text-[var(--muted-foreground)]">Thu tháng này</p><p className="mt-2 font-bold text-emerald-600">+35.000.000 ₫</p></div><div className="rounded-2xl bg-rose-500/8 p-4"><p className="text-xs text-[var(--muted-foreground)]">Chi tháng này</p><p className="mt-2 font-bold">12.500.000 ₫</p></div></div>
            <div className="mt-5 rounded-2xl bg-[var(--muted)] p-4"><div className="flex h-32 items-end gap-3">{[42,62,50,74,58,86,70].map((h,i)=><div key={i} className="flex-1 rounded-t-lg bg-emerald-500/70" style={{height:`${h}%`}} />)}</div></div>
          </div>
        </div>
      </section>
    </main>
  );
}
