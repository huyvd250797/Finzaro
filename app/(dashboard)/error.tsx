"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-10 md:px-6 lg:py-16">
      <div className="rounded-3xl border border-rose-500/20 bg-[var(--card)] p-6 text-center shadow-sm sm:p-8">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-500/10 text-rose-500"><AlertTriangle className="size-6" /></div>
        <h1 className="mt-5 text-xl font-black">Dữ liệu chưa tải được</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">Không có giao dịch mới nào được tạo chỉ vì lỗi hiển thị này. Bạn có thể thử tải lại màn hình hiện tại.</p>
        <button type="button" onClick={reset} className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-black text-white"><RefreshCw className="size-4" /> Thử lại</button>
      </div>
    </div>
  );
}
