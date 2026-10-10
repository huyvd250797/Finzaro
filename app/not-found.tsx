import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <section className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 text-center shadow-sm">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--muted)] text-[var(--muted-foreground)]"><SearchX className="size-6" /></div>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.14em] text-[var(--primary)]">404</p>
        <h1 className="mt-1 text-xl font-black">Không tìm thấy trang</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">Đường dẫn có thể đã thay đổi hoặc không còn tồn tại.</p>
        <Link href="/overview" className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-black text-white"><ArrowLeft className="size-4" /> Về Tổng quan</Link>
      </section>
    </main>
  );
}
