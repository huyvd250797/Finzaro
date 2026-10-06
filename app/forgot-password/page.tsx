import Link from "next/link";
import { Mail } from "lucide-react";
import { AuthMessage } from "@/components/auth-message";
import { AuthShell } from "@/components/auth-shell";
import { forgotPasswordAction } from "@/app/auth/actions";

type SearchParams = Promise<{ error?: string; message?: string }>;

export default async function ForgotPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  return (
    <AuthShell>
      <div className="mt-8"><h1 className="text-2xl font-black tracking-tight">Khôi phục mật khẩu</h1><p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">Nhập email. Nếu tài khoản tồn tại, Finzaro sẽ gửi liên kết recovery.</p></div>
      <AuthMessage error={params.error} message={params.message} />
      <form action={forgotPasswordAction} className="mt-7 space-y-4">
        <label className="block"><span className="mb-2 block text-sm font-semibold">Email</span><div className="relative"><Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" /><input name="email" type="email" autoComplete="email" required placeholder="name@example.com" className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-10 pr-4 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]" /></div></label>
        <button type="submit" className="flex h-11 w-full items-center justify-center rounded-xl bg-[var(--primary)] text-sm font-bold text-white transition hover:brightness-110">Gửi liên kết khôi phục</button>
      </form>
      <p className="mt-5 text-center text-sm text-[var(--muted-foreground)]"><Link href="/login" className="font-bold text-[var(--primary)] hover:underline">Quay lại đăng nhập</Link></p>
    </AuthShell>
  );
}
