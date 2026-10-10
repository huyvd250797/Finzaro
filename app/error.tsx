"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-[70vh] place-items-center px-5 py-12">
      <section className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 text-center shadow-sm">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-500/10 text-rose-500"><AlertTriangle className="size-6" /></div>
        <h1 className="mt-5 text-xl font-black">Không thể tải màn hình</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">Finzaro gặp lỗi tạm thời khi xử lý dữ liệu. Giao dịch tài chính không được tự động ghi lại khi màn hình lỗi.</p>
        <button type="button" onClick={reset} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-black text-white"><RefreshCw className="size-4" /> Thử lại</button>
      </section>
    </main>
  );
}
