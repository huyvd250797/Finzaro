"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { APP_VERSION_LABEL } from "@/lib/app-version";

export default function ReportsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Finzaro Reports unexpected render error", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
      <div className="rounded-3xl border border-amber-500/25 bg-[var(--card)] p-6 shadow-sm sm:p-8">
        <div className="grid size-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-500"><AlertTriangle className="size-6" /></div>
        <h1 className="mt-4 text-xl font-black">Báo cáo gặp lỗi hiển thị</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{APP_VERSION_LABEL} không còn để lỗi truy vấn ledger làm sập toàn bộ Báo cáo. Nếu bạn vẫn thấy màn hình này, đây là lỗi render ngoài lớp tải dữ liệu; hãy thử tải lại một lần và kiểm tra Runtime Logs bằng mã lỗi bên dưới.</p>
        {error.digest && <p className="mt-3 text-xs font-bold text-[var(--muted-foreground)]">Mã lỗi: {error.digest}</p>}
        <button type="button" onClick={reset} className="fin-primary-btn mt-5"><RefreshCw className="size-4" /> Thử tải lại</button>
      </div>
    </div>
  );
}
