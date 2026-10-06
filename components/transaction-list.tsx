import { ArrowLeftRight, Trash2 } from "lucide-react";
import { CategoryIcon } from "@/features/categories/icons";
import { deleteTransactionAction } from "@/features/transactions/actions";
import { currencyDigits, transactionEntry, type LedgerCurrency, type TransactionView } from "@/features/transactions/data";
import { formatMinorMoney } from "@/lib/utils";

function dateLabel(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function TransactionList({
  transactions,
  currencies,
  limit,
  showDelete = false
}: {
  transactions: TransactionView[];
  currencies: LedgerCurrency[];
  limit?: number;
  showDelete?: boolean;
}) {
  const data = typeof limit === "number" ? transactions.slice(0, limit) : transactions;

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] px-5 py-9 text-center">
        <p className="text-sm font-bold">Chưa có giao dịch</p>
        <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">Tạo thu nhập, chi tiêu hoặc chuyển tiền để bắt đầu ledger Finzaro.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[var(--border)]">
      {data.map((tx) => {
        const primary = tx.transaction_type === "income"
          ? transactionEntry(tx, "income")
          : tx.transaction_type === "expense"
            ? transactionEntry(tx, "expense")
            : transactionEntry(tx, "transfer_out");
        const destination = tx.transaction_type === "transfer" ? transactionEntry(tx, "transfer_in") : null;
        const digits = primary ? currencyDigits(currencies, primary.currency_code) : 0;
        const destinationDigits = destination ? currencyDigits(currencies, destination.currency_code) : 0;
        const sourceName = primary?.account?.name ?? "Tài khoản";
        const destinationName = destination?.account?.name ?? "Tài khoản nhận";
        const transferDifferentCurrency = Boolean(destination && primary && destination.currency_code !== primary.currency_code);
        const categoryName = tx.category?.name ?? tx.category_label ?? (tx.transaction_type === "transfer" ? "Chuyển tiền" : "Chưa phân loại");

        return (
          <div key={tx.id} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
            <div className={`mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl ${tx.transaction_type === "income" ? "bg-emerald-500/10 text-emerald-600" : tx.transaction_type === "transfer" ? "bg-sky-500/10 text-sky-600" : "bg-rose-500/10 text-rose-500"}`}>
              {tx.transaction_type === "transfer" ? <ArrowLeftRight className="size-4.5" /> : <CategoryIcon name={tx.category?.icon_name} className="size-4.5" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{tx.title}</p>
              <p className="mt-0.5 truncate text-xs text-[var(--muted-foreground)]">
                {categoryName} · {tx.transaction_type === "transfer" ? `${sourceName} → ${destinationName}` : sourceName} · {dateLabel(tx.transaction_date)}
              </p>
              {tx.notes && <p className="mt-1 line-clamp-1 text-xs text-[var(--muted-foreground)]">{tx.notes}</p>}
            </div>
            <div className="flex shrink-0 items-start gap-2">
              <div className={`text-right text-sm font-black ${tx.transaction_type === "income" ? "text-emerald-600 dark:text-emerald-400" : tx.transaction_type === "transfer" ? "text-sky-600 dark:text-sky-400" : "text-[var(--foreground)]"}`}>
                {primary ? (
                  <>
                    <div>{tx.transaction_type === "income" ? "+" : tx.transaction_type === "expense" ? "−" : ""}{formatMinorMoney(Math.abs(primary.amount_minor), primary.currency_code, digits)}</div>
                    {transferDifferentCurrency && destination && <div className="mt-0.5 text-[10px] font-semibold text-[var(--muted-foreground)]">→ {formatMinorMoney(destination.amount_minor, destination.currency_code, destinationDigits)}</div>}
                  </>
                ) : "—"}
              </div>
              {showDelete && (
                <details className="relative">
                  <summary className="grid size-8 cursor-pointer list-none place-items-center rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]" title="Xóa giao dịch"><Trash2 className="size-3.5" /></summary>
                  <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-xl">
                    <p className="text-xs font-semibold">Xóa giao dịch?</p>
                    <p className="mt-1 text-[11px] leading-4 text-[var(--muted-foreground)]">Số dư các tài khoản liên quan sẽ được hoàn nguyên tự động.</p>
                    <form action={deleteTransactionAction} className="mt-3">
                      <input type="hidden" name="transaction_id" value={tx.id} />
                      <button type="submit" className="inline-flex h-8 w-full items-center justify-center rounded-lg bg-rose-600 px-3 text-xs font-bold text-white hover:bg-rose-700">Xác nhận xóa</button>
                    </form>
                  </div>
                </details>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
