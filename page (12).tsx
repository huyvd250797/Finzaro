import { ArrowDownRight, ArrowUpRight, CheckCircle2, Circle, Database, ShieldCheck, Smartphone, WalletCards } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

function money(value: number, currency: string) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency, maximumFractionDigits: currency === "VND" ? 0 : 2 }).format(value);
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub!;
  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase.from("profiles").select("display_name, base_currency").eq("id", userId).maybeSingle(),
    supabase.from("workspace_members").select("workspace_id, role").eq("user_id", userId).eq("status", "active").limit(1).maybeSingle()
  ]);
  const currency = profile?.base_currency || "VND";
  const workspaceId = membership?.workspace_id;
  const [{ data: workspace }, accountsResult, categoriesResult] = await Promise.all([
    workspaceId ? supabase.from("workspaces").select("name").eq("id", workspaceId).maybeSingle() : Promise.resolve({ data: null }),
    workspaceId ? supabase.from("accounts").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId) : Promise.resolve({ count: 0 }),
    workspaceId ? supabase.from("categories").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId) : Promise.resolve({ count: 0 })
  ]);

  return (
    <div className="grid gap-5">
      <section>
        <p className="text-sm text-muted-foreground">{workspace?.name || "Workspace cá nhân"}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">Tổng quan tài chính</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Nền V0.1.0 đã sẵn sàng. Dữ liệu thu/chi thật sẽ bắt đầu từ V0.2.0.</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Card className="sm:col-span-1"><CardContent className="p-5"><div className="flex items-center justify-between text-sm text-muted-foreground"><span>Số dư khả dụng</span><WalletCards className="size-4" /></div><p className="money mt-3 text-2xl font-bold">{money(0, currency)}</p><p className="mt-2 text-xs text-muted-foreground">Sẽ tính từ ledger, không cập nhật balance trực tiếp.</p></CardContent></Card>
        <Card><CardContent className="p-5"><div className="flex items-center justify-between text-sm text-muted-foreground"><span>Thu tháng này</span><ArrowUpRight className="size-4 text-positive" /></div><p className="money mt-3 text-2xl font-bold">{money(0, currency)}</p><p className="mt-2 text-xs text-muted-foreground">Mở ở V0.2.0</p></CardContent></Card>
        <Card><CardContent className="p-5"><div className="flex items-center justify-between text-sm text-muted-foreground"><span>Chi tháng này</span><ArrowDownRight className="size-4 text-danger" /></div><p className="money mt-3 text-2xl font-bold">{money(0, currency)}</p><p className="mt-2 text-xs text-muted-foreground">Mở ở V0.2.0</p></CardContent></Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <Card>
          <CardHeader><h2 className="font-semibold">Foundation readiness</h2><p className="mt-1 text-sm text-muted-foreground">Các thành phần cần hoàn tất trước V0.2.0.</p></CardHeader>
          <CardContent className="grid gap-3">
            {[
              [true, "Auth SSR + session refresh", "Supabase cookie session + Proxy"],
              [true, "Database + RLS", `${categoriesResult.count ?? 0} danh mục mặc định · owner/member policy`],
              [true, "PWA shell", "Manifest, install prompt, offline fallback an toàn"],
              [true, "Audit nền", "Audit login và thay đổi dữ liệu nền"],
              [false, "Income & Expense Core", "Triển khai ở V0.2.0"]
            ].map(([done, title, note]) => (
              <div key={String(title)} className="flex gap-3 rounded-xl border p-3">
                {done ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-positive" /> : <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />}
                <div><p className="text-sm font-medium">{title}</p><p className="mt-0.5 text-xs leading-5 text-muted-foreground">{note}</p></div>
              </div>
            ))}
          </CardContent>
        </Card>
        <div className="grid gap-4">
          <Card><CardContent className="flex gap-3 p-5"><Smartphone className="size-5 shrink-0 text-primary" /><div><p className="font-semibold">Mobile-first PWA</p><p className="mt-1 text-sm leading-6 text-muted-foreground">Bottom navigation, safe-area và installable shell đã có.</p></div></CardContent></Card>
          <Card><CardContent className="flex gap-3 p-5"><ShieldCheck className="size-5 shrink-0 text-positive" /><div><p className="font-semibold">Security baseline</p><p className="mt-1 text-sm leading-6 text-muted-foreground">RLS trên bảng người dùng, header bảo mật và không lưu credential ngân hàng.</p></div></CardContent></Card>
          <Card><CardContent className="flex gap-3 p-5"><Database className="size-5 shrink-0 text-primary" /><div><p className="font-semibold">Data foundation</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{accountsResult.count ?? 0} tài khoản hiện có. Money dùng NUMERIC trong PostgreSQL.</p></div></CardContent></Card>
        </div>
      </section>
    </div>
  );
}
