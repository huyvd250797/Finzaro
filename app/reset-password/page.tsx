import { LockKeyhole } from "lucide-react";
import { AuthMessage } from "@/components/auth-message";
import { AuthShell } from "@/components/auth-shell";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { updatePasswordAction } from "@/app/auth/actions";
import { requireUser } from "@/lib/auth";

type SearchParams = Promise<{ error?: string; message?: string }>;

export default async function ResetPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser();
  const params = await searchParams;
  return (
    <AuthShell>
      <div className="mt-8"><h1 className="text-2xl font-black tracking-tight">Đặt mật khẩu mới</h1><p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">Recovery session đã được xác thực. Chọn mật khẩu mới cho tài khoản.</p></div>
      <AuthMessage error={params.error} message={params.message} />
      <form action={updatePasswordAction} className="mt-7 space-y-4">
        <label className="block"><span className="mb-2 block text-sm font-semibold">Mật khẩu mới</span><div className="relative"><LockKeyhole className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" /><input name="password" type="password" autoComplete="new-password" minLength={8} required placeholder="Ít nhất 8 ký tự" className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-10 pr-4 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]" /></div></label>
        <label className="block"><span className="mb-2 block text-sm font-semibold">Xác nhận mật khẩu</span><input name="confirm_password" type="password" autoComplete="new-password" minLength={8} required placeholder="Nhập lại mật khẩu" className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]" /></label>
        <PendingSubmitButton idleLabel="Cập nhật mật khẩu" pendingLabel="Đang cập nhật mật khẩu..." className="h-11 w-full rounded-xl bg-[var(--primary)] text-sm font-bold text-white hover:brightness-110" />
      </form>
    </AuthShell>
  );
}
