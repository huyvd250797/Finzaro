import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Đặt mật khẩu mới" description="Mật khẩu mới sẽ thay thế mật khẩu hiện tại trên tài khoản Supabase Auth của bạn.">
      <ResetPasswordForm />
    </AuthCard>
  );
}
