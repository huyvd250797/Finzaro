import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { TransactionSwipeRow } from "@/components/transaction-swipe-row";
import { TransactionActionNotice } from "@/components/transaction-action-notice";
import type { LedgerCurrency, TransactionView } from "@/features/transactions/data";

function dateLabel(value: string) { const [year, month, day] = value.split("-"); return `${day}/${month}/${year}`; }
const dayFormatter = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
function dayHeading(value: string) {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return dateLabel(value);
  return dayFormatter.format(parsed);
}
type Props = { transactions: TransactionView[]; currencies: LedgerCurrency[]; limit?: number; showDelete?: boolean; showEdit?: boolean; showCopy?: boolean; groupByDate?: boolean; deletableTransferIds?: string[]; maskDashboardMoney?: boolean };

export function TransactionList({ transactions, currencies, limit, showDelete = false, showEdit = false, showCopy = false, groupByDate = false, deletableTransferIds = [], maskDashboardMoney = false }: Props) {
  const data = typeof limit === "number" ? transactions.slice(0, limit) : transactions;
  if (!data.length) return <div className="fin-empty-card px-5 py-9 text-center"><p className="text-sm font-bold">Chưa có giao dịch</p><p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">Tạo khoản thu hoặc chi để bắt đầu, hoặc thay đổi bộ lọc để xem dữ liệu.</p><Link href="/transactions?new=expense" className="fin-secondary-btn mt-4 inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-xs font-bold">Thêm giao dịch</Link></div>;
  const permitted = new Set(deletableTransferIds);
  if (!groupByDate) return <div><TransactionActionNotice /><p className="mb-2 text-[11px] text-[var(--muted-foreground)]">Vuốt trái trên giao dịch để hiện Sửa / Xóa; chạm dấu ··· để xem thêm thao tác.</p><div className="divide-y divide-[var(--border)]">{data.map((tx) => <TransactionSwipeRow key={tx.id} tx={tx} currencies={currencies} showDelete={showDelete} showEdit={showEdit} showCopy={showCopy} simpleTransfer={permitted.has(tx.id)} maskDashboardMoney={maskDashboardMoney}/>)}</div></div>;
  const groups = new Map<string, TransactionView[]>();
  for (const tx of data) {
    const bucket = groups.get(tx.transaction_date);
    if (bucket) bucket.push(tx);
    else groups.set(tx.transaction_date, [tx]);
  }
  return <div className="space-y-4"><TransactionActionNotice /><p className="mb-2 text-[11px] text-[var(--muted-foreground)]">Vuốt trái trên giao dịch để hiện Sửa / Xóa; chạm dấu ··· để xem thêm thao tác.</p>{Array.from(groups.entries()).map(([date, rows]) => <details key={date} open className="group/day" aria-label={`Giao dịch ngày ${date}`}>
    <summary className="sticky top-14 z-10 flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3 py-2.5 marker:hidden sm:top-16 [&::-webkit-details-marker]:hidden" title="Chạm để thu gọn hoặc mở giao dịch ngày này">
      <h3 className="min-w-0 flex-1 text-xs font-black capitalize">{dayHeading(date)}</h3>
      <span className="shrink-0 text-[11px] text-[var(--muted-foreground)]">{rows.length} giao dịch</span>
      <ChevronDown className="size-4 shrink-0 text-[var(--muted-foreground)] transition-transform group-open/day:rotate-180" aria-hidden="true" />
    </summary>
    <div className="divide-y divide-[var(--border)] px-1 sm:px-2">{rows.map((tx) => <TransactionSwipeRow key={tx.id} tx={tx} currencies={currencies} showDelete={showDelete} showEdit={showEdit} showCopy={showCopy} simpleTransfer={permitted.has(tx.id)} maskDashboardMoney={maskDashboardMoney}/>)}</div>
  </details>)}</div>;
}
