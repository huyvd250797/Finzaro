import { KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { ProfileForm } from "@/components/auth/profile-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { logoutAction } from "@/app/actions";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub!;
  const { data: profile } = await supabase.from("profiles").select("display_name, base_currency, timezone").eq("id", userId).maybeSingle();

  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      <div><h1 className="text-2xl font-bold tracking-tight">Cài đặt</h1><p className="mt-1 text-sm text-muted-foreground">Hồ sơ, bảo mật và phiên đăng nhập.</p></div>
      <Card>
        <CardHeader><h2 className="font-semibold">Hồ sơ tài chính</h2><p className="mt-1 text-sm text-muted-foreground">Tiền tệ cơ sở chỉ là mặc định hiển thị; số tiền trong DB luôn đi kèm currency.</p></CardHeader>
        <CardContent>
          <ProfileForm userId={userId} initial={{ displayName: profile?.display_name ?? "Người dùng", baseCurrency: profile?.base_currency ?? "VND", timezone: profile?.timezone ?? "Asia/Ho_Chi_Minh" }} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><h2 className="font-semibold">Bảo mật tài khoản</h2></CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex gap-3 rounded-xl border p-4"><ShieldCheck className="size-5 text-positive" /><div><p className="text-sm font-medium">RLS + server authorization</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Mọi bảng tài chính nền đã bật Row Level Security theo workspace.</p></div></div>
          <div className="flex gap-3 rounded-xl border p-4"><KeyRound className="size-5 text-primary" /><div><p className="text-sm font-medium">MFA / Passkey contract</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Cấu trúc auth không khóa provider; UI kích hoạt MFA/passkey được để dành cho hardening khi provider được cấu hình.</p></div></div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center justify-between gap-4 p-5"><div><p className="font-semibold">Đăng xuất</p><p className="mt-1 text-sm text-muted-foreground">Kết thúc phiên hiện tại trên thiết bị này.</p></div><form action={logoutAction}><Button variant="outline" type="submit"><LogOut className="size-4" />Đăng xuất</Button></form></CardContent>
      </Card>
    </div>
  );
}
