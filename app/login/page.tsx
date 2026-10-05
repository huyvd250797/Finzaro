import Link from "next/link";
import { ArrowLeft, LockKeyhole, Mail } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export default function LoginPage() {
  return (
    <main className="finzaro-grid grid min-h-screen place-items-center px-5 py-10">
      <div className="w-full max-w-md rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl shadow-black/5 sm:p-8">
        <BrandLogo />
        <div className="mt-8"><h1 className="text-2xl font-black tracking-tight">Chào mừng trở lại</h1><p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">Màn hình auth mock của V0.1. Supabase Auth sẽ được kết nối ở V0.2.</p></div>
        <form className="mt-7 space-y-4">
          <label className="block"><span className="mb-2 block text-sm font-semibold">Email</span><div className="relative"><Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" /><input type="email" placeholder="name@example.com" className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-10 pr-4 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]" /></div></label>
          <label className="block"><span className="mb-2 block text-sm font-semibold">Mật khẩu</span><div className="relative"><LockKeyhole className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" /><input type="password" placeholder="••••••••" className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-10 pr-4 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]" /></div></label>
          <Link href="/overview" className="flex h-11 w-full items-center justify-center rounded-xl bg-[var(--primary)] text-sm font-bold text-white">Đăng nhập bản demo</Link>
        </form>
        <Link href="/" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)]"><ArrowLeft className="size-4" /> Quay lại trang chủ</Link>
      </div>
    </main>
  );
}
