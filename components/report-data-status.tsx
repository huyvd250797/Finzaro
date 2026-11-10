import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { ReportLedgerDiagnostics } from "@/features/reports/data";

/** A temporary database failure must never look like a valid zero balance. */
export function ReportDataStatus({ diagnostics }: { diagnostics?: ReportLedgerDiagnostics }) {
  if (diagnostics?.strategy !== "empty") return null;
  return (
    <div role="alert" className="mx-auto mt-3 flex max-w-3xl items-start gap-3 rounded-xl border border-amber-500/35 bg-amber-500/[.08] px-3 py-3 text-amber-800 dark:text-amber-300">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">Chưa tải được dữ liệu giao dịch</p>
        <p className="mt-1 text-xs leading-5">Các số 0 đang hiển thị không phải số liệu đã xác nhận. Hãy kiểm tra kết nối và tải lại; nếu lỗi tiếp diễn, xem Vercel Runtime Logs với tiền tố [Finzaro Reports].</p>
        <Link href="/reports" className="mt-1 inline-flex text-xs font-bold underline underline-offset-2">Mở lại Báo cáo</Link>
      </div>
    </div>
  );
}
