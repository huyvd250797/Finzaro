import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight } from "lucide-react";
import { transactions } from "@/lib/demo-data";
import { formatMoney } from "@/lib/utils";

export function TransactionList({ limit }: { limit?: number }) {
  const data = typeof limit === "number" ? transactions.slice(0, limit) : transactions;
  return (
    <div className="divide-y divide-[var(--border)]">
      {data.map((tx) => {
        const Icon = tx.kind === "income" ? ArrowDownLeft : tx.kind === "transfer" ? ArrowLeftRight : ArrowUpRight;
        return (
          <div key={tx.id} className="flex items-center gap-3 py-4 first:pt-0 last:pb-0">
            <div className={`grid size-10 shrink-0 place-items-center rounded-xl ${tx.kind === "income" ? "bg-emerald-500/10 text-emerald-600" : tx.kind === "transfer" ? "bg-sky-500/10 text-sky-600" : "bg-rose-500/10 text-rose-500"}`}><Icon className="size-4.5" /></div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{tx.title}</p>
              <p className="mt-0.5 truncate text-xs text-[var(--muted-foreground)]">{tx.category} · {tx.account} · {tx.date}</p>
            </div>
            <div className={`text-right text-sm font-bold ${tx.kind === "income" ? "text-emerald-600 dark:text-emerald-400" : tx.kind === "expense" ? "text-[var(--foreground)]" : "text-sky-600"}`}>{tx.amount > 0 && tx.kind === "income" ? "+" : tx.kind === "expense" ? "−" : ""}{formatMoney(Math.abs(tx.amount))}</div>
          </div>
        );
      })}
    </div>
  );
}
