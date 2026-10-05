import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Khôi phục mật khẩu"
      description="Nhập email tài khoản. Liên kết khôi phục sẽ đưa bạn trở lại ứng dụng qua luồng PKCE."
      footer={<Link href="/login" className="font-semibold text-primary hover:underline">Quay lại đăng nhập</Link>}
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
