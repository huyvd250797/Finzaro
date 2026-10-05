import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <AuthCard
      title="Tạo tài khoản"
      description="Mỗi tài khoản mới sẽ tự tạo một workspace cá nhân, hồ sơ và bộ danh mục mặc định."
      footer={<>Đã có tài khoản? <Link href="/login" className="font-semibold text-primary hover:underline">Đăng nhập</Link></>}
    >
      <SignupForm />
    </AuthCard>
  );
}
