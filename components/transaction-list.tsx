import Link from "next/link";
import { ArrowLeftRight, ChevronDown, Copy, Pencil, Trash2 } from "lucide-react";
import { CategoryIcon, iconColorValue } from "@/features/categories/icons";
import { TransactionDeleteControl } from "@/components/transaction-delete-control";
import { TransactionActionNotice } from "@/components/transaction-action-notice";
import { currencyDigits, transactionEntry, type LedgerCurrency, type TransactionView } from "@/features/transactions/data";
import { formatMinorMoney } from "@/lib/utils";

function dateLabel(value: string) { const [year, month, day] = value.split("-"); return `${day}/${month}/${year}`; }
const dayFormatter = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
function dayHeading(value: string) {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return dateLabel(value);
  return dayFormatter.format(parsed);
}

type Props = { transactions: TransactionView[]; currencies: LedgerCurrency[]; limit?: number; showDelete?: boolean; showEdit?: boolean; showCopy?: boolean; groupByDate?: boolean; deletableTransferIds?: string[] };

function TransactionRow({ tx, currencies, showDelete, showEdit, showCopy, simpleTransfer }: { tx: TransactionView; currencies: LedgerCurrency[]; showDelete: boolean; showEdit: boolean; showCopy: boolean; simpleTransfer: boolean }) {
  const primary = tx.transaction_type === "income" ? transactionEntry(tx, "income") : tx.transaction_type === "expense" ? transactionEntry(tx, "expense") : transactionEntry(tx, "transfer_out");
  const destination = tx.transaction_type === "transfer" ? transactionEntry(tx, "transfer_in") : null;
  const digits = primary ? currencyDigits(currencies, primary.currency_code) : 0;
  const destinationDigits = destination ? currencyDigits(currencies, destination.currency_code) : 0;
  const sourceName = primary?.account?.name ?? "Tài khoản";
  const destinationName = destination?.account?.name ?? "Tài khoản nhận";
  const differentCurrency = Boolean(destination && primary && destination.currency_code !== primary.currency_code);
  const category = tx.category?.name ?? tx.category_label ?? (tx.transaction_type === "transfer" ? "Chuyển tiền" : "Chưa phân loại");
  const normal = tx.transaction_purpose === "standard" && ["income", "expense"].includes(tx.transaction_type);
  const canCopy = normal || (tx.transaction_type === "transfer" && simpleTransfer);
  return <div data-fin-transaction-row className="fin-transaction-row flex min-w-0 items-start gap-2.5 py-3 sm:gap-3 sm:py-4">
    <div className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl sm:size-10 ${tx.transaction_type === "transfer" ? "bg-sky-500/10 text-sky-600" : "bg-[var(--muted)]"}`} style={tx.transaction_type === "transfer" ? undefined : { color: iconColorValue(tx.category?.icon_color) }}>
      {tx.transaction_type === "transfer" ? <ArrowLeftRight className="size-4" /> : <CategoryIcon name={tx.category?.icon_name} className="size-4" />}
    </div>
    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{tx.title}</p><p className="mt-0.5 line-clamp-2 text-xs text-[var(--muted-foreground)]">{category} · {tx.transaction_type === "transfer" ? `${sourceName} → ${destinationName}` : sourceName}</p>{tx.notes && <p className="mt-1 line-clamp-1 text-xs text-[var(--muted-foreground)]">{tx.notes}</p>}</div>
    <div className="flex min-w-0 shrink-0 flex-col items-end gap-1.5"><div className={`text-right text-xs font-black sm:text-sm ${tx.transaction_type === "income" ? "text-emerald-600" : tx.transaction_type === "transfer" ? "text-sky-600" : "text-rose-600"}`}>
      {primary ? <><div className="whitespace-nowrap">{tx.transaction_type === "income" ? "+" : tx.transaction_type === "expense" ? "−" : ""}{formatMinorMoney(Math.abs(primary.amount_minor), primary.currency_code, digits)}</div>{differentCurrency && destination && <div className="mt-0.5 text-[10px] font-semibold text-[var(--muted-foreground)]">→ {formatMinorMoney(destination.amount_minor, destination.currency_code, destinationDigits)}</div>}</> : "—"}
    </div>
    <div className="flex items-center gap-1">
      {showCopy && canCopy && <Link href={`/transactions?copy=${encodeURIComponent(tx.id)}`} data-fin-copy-id={tx.id} data-fin-copy-title={tx.title} data-fin-copy-date={tx.transaction_date} data-fin-copy-type={tx.transaction_type} title="Sao chép giao dịch sang ngày khác" aria-label={`Sao chép giao dịch ${tx.title}`} className="fin-transaction-action grid size-10 place-items-center rounded-lg border border-[var(--border)] text-sky-600 hover:bg-sky-500/10"><Copy className="size-3.5" /></Link>}
      {showEdit && normal && <Link href={`/transactions?edit=${encodeURIComponent(tx.id)}`} title="Sửa giao dịch" aria-label={`Sửa giao dịch ${tx.title}`} className="fin-transaction-action grid size-10 place-items-center rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]"><Pencil className="size-3.5" /></Link>}
      {showDelete && (normal || simpleTransfer) && <details className="relative"><summary className="fin-transaction-action grid size-10 cursor-pointer list-none place-items-center rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]" title="Xóa giao dịch"><Trash2 className="size-3.5" /></summary><div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-xl"><p className="text-xs font-semibold">Xóa giao dịch?</p><p className="mt-1 text-[11px] leading-4 text-[var(--muted-foreground)]">Số dư tài khoản sẽ được hoàn nguyên. Giao dịch cũ liên kết module nâng cao vẫn được bảo vệ.</p><div className="mt-3"><TransactionDeleteControl transactionId={tx.id} /></div></div></details>}
    </div></div>
  </div>;
}

export function TransactionList({ transactions, currencies, limit, showDelete = false, showEdit = false, showCopy = false, groupByDate = false, deletableTransferIds = [] }: Props) {
  const data = typeof limit === "number" ? transactions.slice(0, limit) : transactions;
  if (!data.length) return <div className="fin-empty-card px-5 py-9 text-center"><p className="text-sm font-bold">Chưa có giao dịch</p><p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">Tạo khoản thu hoặc chi để bắt đầu, hoặc thay đổi bộ lọc để xem dữ liệu.</p><Link href="/transactions?new=expense" className="fin-secondary-btn mt-4 inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-xs font-bold">Thêm giao dịch</Link></div>;
  const permitted = new Set(deletableTransferIds);
  if (!groupByDate) return <div><TransactionActionNotice /><div className="divide-y divide-[var(--border)]">{data.map((tx) => <TransactionRow key={tx.id} tx={tx} currencies={currencies} showDelete={showDelete} showEdit={showEdit} showCopy={showCopy} simpleTransfer={permitted.has(tx.id)} />)}</div></div>;
  const groups = new Map<string, TransactionView[]>();
  for (const tx of data) {
    const bucket = groups.get(tx.transaction_date);
    if (bucket) bucket.push(tx);
    else groups.set(tx.transaction_date, [tx]);
  }
  return <div className="space-y-4"><TransactionActionNotice />{Array.from(groups.entries()).map(([date, rows]) => <details key={date} open className="group/day" aria-label={`Giao dịch ngày ${date}`}>
    <summary className="sticky top-14 z-10 flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3 py-2.5 marker:hidden sm:top-16 [&::-webkit-details-marker]:hidden" title="Chạm để thu gọn hoặc mở giao dịch ngày này">
      <h3 className="min-w-0 flex-1 text-xs font-black capitalize">{dayHeading(date)}</h3>
      <span className="shrink-0 text-[11px] text-[var(--muted-foreground)]">{rows.length} giao dịch</span>
      <ChevronDown className="size-4 shrink-0 text-[var(--muted-foreground)] transition-transform group-open/day:rotate-180" aria-hidden="true" />
    </summary>
    <div className="divide-y divide-[var(--border)] px-1 sm:px-2">{rows.map((tx) => <TransactionRow key={tx.id} tx={tx} currencies={currencies} showDelete={showDelete} showEdit={showEdit} showCopy={showCopy} simpleTransfer={permitted.has(tx.id)} />)}</div>
  </details>)}</div>;
}
