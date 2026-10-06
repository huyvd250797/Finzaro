import { Bell, Database, KeyRound, Moon, ShieldCheck, Smartphone, UserRound, WalletCards } from "lucide-react";
import { updatePreferencesAction, updateProfileAction } from "@/app/auth/actions";
import { AuthMessage } from "@/components/auth-message";
import { DatabaseStatus } from "@/components/database-status";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { APP_RELEASE_NAME, APP_VERSION_LABEL } from "@/lib/app-version";

const sections = [
  { icon: Smartphone, title: "PWA", desc: "Cài Finzaro lên màn hình chính và chạy ở chế độ standalone.", value: "Ready" },
  { icon: Moon, title: "Giao diện", desc: "Light / dark mode được lưu cục bộ trên thiết bị.", value: "System + Manual" },
  { icon: Database, title: "Database foundation", desc: "Supabase DEV, RLS, migrations và typed clients từ V0.1.1.", value: "Connected" },
  { icon: ShieldCheck, title: "Authentication", desc: "Email/password, cookie SSR, session refresh, protected dashboard và recovery flow.", value: "V0.0.2" },
  { icon: WalletCards, title: "Account Core", desc: "Tài khoản tiền mặt, ngân hàng, ví điện tử, tiết kiệm và số dư thật trên Supabase.", value: "V0.0.3" },
  { icon: Database, title: "Transaction Core", desc: "Income, Expense, Transfer, ledger entries và cập nhật số dư nguyên tử qua database functions.", value: "V0.0.4" },
  { icon: Bell, title: "Thông báo", desc: "Payment reminders và push notifications nằm trong roadmap V1.1.", value: "Roadmap" }
];

type SearchParams = Promise<{ error?: string; message?: string }>;

export default async function SettingsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { supabase, user, userId } = await requireUser();
  const [{ data: profile }, { data: preferences }, { data: currencies }] = await Promise.all([
    supabase.from("profiles").select("display_name, avatar_url").eq("id", userId).maybeSingle(),
    supabase.from("user_preferences").select("currency_code, locale, timezone").eq("id", userId).maybeSingle(),
    supabase.from("supported_currencies").select("code, name, symbol").eq("is_active", true).order("code")
  ]);

  return (
    <div className="mx-auto max-w-[900px] px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <div><p className="text-sm font-semibold text-[var(--primary)]">Account & System</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Cài đặt</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">Account + Transaction ledger, preferences và diagnostics của Finzaro {APP_VERSION_LABEL}.</p></div>
      <AuthMessage error={params.error} message={params.message} />

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-[var(--muted)] text-[var(--primary)]"><UserRound className="size-4.5" /></div><div><h2 className="font-bold">Hồ sơ</h2><p className="text-xs text-[var(--muted-foreground)]">{user.email}</p></div></div>
            <form action={updateProfileAction} className="mt-5 space-y-4">
              <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Tên hiển thị</span><input name="display_name" defaultValue={profile?.display_name ?? ""} minLength={2} maxLength={100} required className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]" /></label>
              <button type="submit" className="h-10 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white">Lưu hồ sơ</button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-[var(--muted)] text-[var(--primary)]"><KeyRound className="size-4.5" /></div><div><h2 className="font-bold">Tài chính mặc định</h2><p className="text-xs text-[var(--muted-foreground)]">Được bảo vệ bằng RLS theo user hiện tại.</p></div></div>
            <form action={updatePreferencesAction} className="mt-5 grid gap-4">
              <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Tiền tệ</span><select name="currency_code" defaultValue={preferences?.currency_code ?? "VND"} className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm">{currencies?.map((item) => <option key={item.code} value={item.code}>{item.code} · {item.name} ({item.symbol})</option>)}</select></label>
              <div className="grid grid-cols-2 gap-3"><label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Ngôn ngữ</span><select name="locale" defaultValue={preferences?.locale ?? "vi-VN"} className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm"><option value="vi-VN">vi-VN</option><option value="en-US">en-US</option></select></label><label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Timezone</span><select name="timezone" defaultValue={preferences?.timezone ?? "Asia/Ho_Chi_Minh"} className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm"><option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh</option><option value="UTC">UTC</option></select></label></div>
              <button type="submit" className="h-10 justify-self-start rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white">Lưu tùy chọn</button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4"><CardContent className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--primary)]">Current release</p><h2 className="mt-1 text-lg font-black">Finzaro {APP_VERSION_LABEL} · {APP_RELEASE_NAME}</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">Version được quản lý tập trung trong lib/app-version.ts và hiển thị trực tiếp trong app.</p></div><span className="rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400">{APP_VERSION_LABEL}</span></CardContent></Card>

      <div className="mt-4"><DatabaseStatus /></div>

      <Card className="mt-4"><CardContent className="divide-y divide-[var(--border)] p-0">{sections.map(({ icon: Icon, title, desc, value }) => <div key={title} className="flex items-start gap-4 p-5 sm:p-6"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--muted)] text-[var(--primary)]"><Icon className="size-4.5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">{title}</h2><span className="rounded-full bg-[var(--muted)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">{value}</span></div><p className="mt-1.5 text-sm leading-6 text-[var(--muted-foreground)]">{desc}</p></div></div>)}</CardContent></Card>
    </div>
  );
}
