import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <AuthCard
      title="Đăng nhập"
      description="Truy cập không gian tài chính cá nhân của bạn. Phiên đăng nhập được quản lý bằng cookie phía server."
      footer={<>Chưa có tài khoản? <Link href="/signup" className="font-semibold text-primary hover:underline">Đăng ký</Link></>}
    >
      <LoginForm />
    </AuthCard>
  );
}
