import { Filter, Plus, Search, SlidersHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { TransactionList } from "@/components/transaction-list";

export default function TransactionsPage() {
  return (
    <div className="mx-auto max-w-[1300px] px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-[var(--primary)]">Money · Ledger</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Giao dịch</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">V0.0.3 vẫn dùng dữ liệu demo tại đây. Transaction Core thật sẽ được kết nối với Accounts ở V0.0.4.</p></div><button disabled title="Sẽ được mở ở Finzaro V0.0.4" className="inline-flex h-10 cursor-not-allowed items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white opacity-60"><Plus className="size-4" /> Giao dịch mới · V0.0.4</button></div>
      <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto_auto]"><div className="relative"><Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" /><input placeholder="Tìm theo nội dung, danh mục, tài khoản..." className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] pl-10 pr-4 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]" /></div><button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-semibold"><Filter className="size-4" /> Bộ lọc</button><button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-semibold"><SlidersHorizontal className="size-4" /> Tùy chọn</button></div>
      <Card className="mt-4"><CardContent className="p-5 sm:p-6"><TransactionList /></CardContent></Card>
    </div>
  );
}
