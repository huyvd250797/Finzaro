import Link from "next/link";
import { LockKeyhole, Mail } from "lucide-react";
import { redirect } from "next/navigation";
import { AuthMessage } from "@/components/auth-message";
import { AuthShell } from "@/components/auth-shell";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { createClient } from "@/lib/supabase/server";
import { loginAction } from "@/app/auth/actions";

type SearchParams = Promise<{ error?: string; message?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims?.sub) redirect("/overview");

  const params = await searchParams;

  return (
    <AuthShell>
      <div className="mt-8">
        <h1 className="text-2xl font-black tracking-tight">Chào mừng trở lại</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">Đăng nhập bằng tài khoản Supabase Auth của Finzaro.</p>
      </div>
      <AuthMessage error={params.error} message={params.message} />
      <form action={loginAction} className="mt-7 space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Email</span>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input name="email" type="email" autoComplete="email" required placeholder="name@example.com" className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-10 pr-4 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]" />
          </div>
        </label>
        <label className="block">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold">Mật khẩu</span>
            <Link href="/forgot-password" className="text-xs font-semibold text-[var(--primary)] hover:underline">Quên mật khẩu?</Link>
          </div>
          <div className="relative">
            <LockKeyhole className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input name="password" type="password" autoComplete="current-password" required placeholder="••••••••" className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-10 pr-4 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]" />
          </div>
        </label>
        <PendingSubmitButton idleLabel="Đăng nhập" pendingLabel="Đang đăng nhập..." className="h-11 w-full rounded-xl bg-[var(--primary)] text-sm font-bold text-white hover:brightness-110" />
      </form>
      <p className="mt-5 text-center text-sm text-[var(--muted-foreground)]">Chưa có tài khoản? <Link href="/register" className="font-bold text-[var(--primary)] hover:underline">Đăng ký</Link></p>
    </AuthShell>
  );
}
