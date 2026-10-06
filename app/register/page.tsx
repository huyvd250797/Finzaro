import Link from "next/link";
import { LockKeyhole, Mail, UserRound } from "lucide-react";
import { redirect } from "next/navigation";
import { AuthMessage } from "@/components/auth-message";
import { AuthShell } from "@/components/auth-shell";
import { createClient } from "@/lib/supabase/server";
import { registerAction } from "@/app/auth/actions";

type SearchParams = Promise<{ error?: string; message?: string }>;

export default async function RegisterPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims?.sub) redirect("/overview");
  const params = await searchParams;

  return (
    <AuthShell>
      <div className="mt-8">
        <h1 className="text-2xl font-black tracking-tight">Tạo tài khoản Finzaro</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">Hồ sơ và tùy chọn mặc định sẽ được tạo tự động sau khi Supabase tạo user.</p>
      </div>
      <AuthMessage error={params.error} message={params.message} />
      <form action={registerAction} className="mt-7 space-y-4">
        <label className="block"><span className="mb-2 block text-sm font-semibold">Tên hiển thị</span><div className="relative"><UserRound className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" /><input name="display_name" type="text" autoComplete="name" minLength={2} maxLength={100} required placeholder="Boss" className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-10 pr-4 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]" /></div></label>
        <label className="block"><span className="mb-2 block text-sm font-semibold">Email</span><div className="relative"><Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" /><input name="email" type="email" autoComplete="email" required placeholder="name@example.com" className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-10 pr-4 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]" /></div></label>
        <label className="block"><span className="mb-2 block text-sm font-semibold">Mật khẩu</span><div className="relative"><LockKeyhole className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" /><input name="password" type="password" autoComplete="new-password" minLength={8} required placeholder="Ít nhất 8 ký tự" className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-10 pr-4 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]" /></div></label>
        <label className="block"><span className="mb-2 block text-sm font-semibold">Xác nhận mật khẩu</span><input name="confirm_password" type="password" autoComplete="new-password" minLength={8} required placeholder="Nhập lại mật khẩu" className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]" /></label>
        <button type="submit" className="flex h-11 w-full items-center justify-center rounded-xl bg-[var(--primary)] text-sm font-bold text-white transition hover:brightness-110">Tạo tài khoản</button>
      </form>
      <p className="mt-5 text-center text-sm text-[var(--muted-foreground)]">Đã có tài khoản? <Link href="/login" className="font-bold text-[var(--primary)] hover:underline">Đăng nhập</Link></p>
    </AuthShell>
  );
}
