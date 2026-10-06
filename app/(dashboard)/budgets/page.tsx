import { Plus, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";

const budgets = [
  { name: "Ăn uống", used: 3_500_000, total: 5_000_000 },
  { name: "Mua sắm", used: 2_800_000, total: 3_000_000 },
  { name: "Di chuyển", used: 1_300_000, total: 2_500_000 }
];

export default function BudgetsPage() {
  return <div className="mx-auto max-w-[1100px] px-4 py-6 md:px-6 lg:px-8 lg:py-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-[var(--primary)]">Planning · Preview</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Ngân sách</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">UI preview cho Budget Engine dự kiến ở V0.0.6, sau Category Engine V0.0.5.</p></div><button className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-bold"><Plus className="size-4" /> Ngân sách mới</button></div><div className="mt-6 grid gap-4 md:grid-cols-3">{budgets.map(b=>{const pct=Math.min(100,Math.round((b.used/b.total)*100));return <Card key={b.name}><CardContent><div className="flex items-center justify-between"><div className="grid size-10 place-items-center rounded-xl bg-[var(--muted)] text-[var(--primary)]"><Target className="size-4.5" /></div><span className={`text-xs font-bold ${pct>=90?"text-rose-500":"text-[var(--primary)]"}`}>{pct}%</span></div><h2 className="mt-4 font-bold">{b.name}</h2><p className="mt-2 text-sm text-[var(--muted-foreground)]">{formatMoney(b.used)} / {formatMoney(b.total)}</p><div className="mt-4 h-2 rounded-full bg-[var(--muted)]"><div className={`h-2 rounded-full ${pct>=90?"bg-rose-500":"bg-[var(--primary)]"}`} style={{width:`${pct}%`}} /></div></CardContent></Card>})}</div></div>;
}
