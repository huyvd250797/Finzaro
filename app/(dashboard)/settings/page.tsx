import { Bell, Database, Moon, ShieldCheck, Smartphone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const sections = [
  { icon: Smartphone, title: "PWA", desc: "Cài Finzaro lên màn hình chính và chạy ở chế độ standalone.", value: "Ready" },
  { icon: Moon, title: "Giao diện", desc: "Light / dark mode được lưu cục bộ trên thiết bị.", value: "System + Manual" },
  { icon: Database, title: "Database", desc: "Supabase DEV/PROD sẽ được cấu hình từ V0.1.1.", value: "Planned" },
  { icon: ShieldCheck, title: "Security", desc: "RLS, Auth và validation server-side bắt đầu ở backend phase.", value: "Architecture ready" },
  { icon: Bell, title: "Thông báo", desc: "Payment reminders và push notifications nằm trong roadmap V1.1.", value: "Roadmap" }
];

export default function SettingsPage() {
  return <div className="mx-auto max-w-[900px] px-4 py-6 md:px-6 lg:px-8 lg:py-8"><div><p className="text-sm font-semibold text-[var(--primary)]">System</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Cài đặt</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">Các capability hiện tại của Finzaro V0.1.</p></div><Card className="mt-6"><CardContent className="divide-y divide-[var(--border)] p-0">{sections.map(({icon:Icon,title,desc,value})=><div key={title} className="flex items-start gap-4 p-5 sm:p-6"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--muted)] text-[var(--primary)]"><Icon className="size-4.5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">{title}</h2><span className="rounded-full bg-[var(--muted)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">{value}</span></div><p className="mt-1.5 text-sm leading-6 text-[var(--muted-foreground)]">{desc}</p></div></div>)}</CardContent></Card></div>;
}
