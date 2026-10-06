import { Banknote, Landmark, PiggyBank, Plus, Smartphone } from "lucide-react";
import { accounts } from "@/lib/demo-data";
import { formatMoney } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

const iconMap = { bank: Landmark, cash: Banknote, wallet: Smartphone, savings: PiggyBank };

export default function AccountsPage() {
  const total = accounts.reduce((sum, a) => sum + a.balance, 0);
  return (
    <div className="mx-auto max-w-[1300px] px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-[var(--primary)]">Money · Accounts</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Tài khoản & ví</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">Theo dõi tiền mặt, ngân hàng, ví điện tử và khoản tiết kiệm.</p></div><button className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white"><Plus className="size-4" /> Thêm tài khoản</button></div>
      <Card className="mt-6 overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-800 text-white"><CardContent className="p-6 sm:p-7"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100">Tổng số dư</p><p className="mt-3 text-3xl font-black sm:text-4xl">{formatMoney(total)}</p><p className="mt-3 max-w-xl text-sm leading-6 text-emerald-100/85">V0.1.1 vẫn sử dụng dữ liệu demo cho Accounts. Từ V0.3, mỗi tài khoản sẽ là dữ liệu thật thuộc sở hữu user và được bảo vệ bằng RLS.</p></CardContent></Card>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{accounts.map((account)=>{const Icon=iconMap[account.type]; return <Card key={account.id}><CardContent><div className="flex items-start justify-between"><div className="grid size-11 place-items-center rounded-2xl bg-[var(--muted)] text-[var(--primary)]"><Icon className="size-5" /></div><span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-600">Active</span></div><p className="mt-5 text-sm font-semibold text-[var(--muted-foreground)]">{account.institution}</p><h2 className="mt-1 font-bold">{account.name}</h2><p className="mt-4 text-2xl font-black tracking-tight">{formatMoney(account.balance)}</p></CardContent></Card>})}</div>
    </div>
  );
}
