"use client";

import { RefreshCw, ShieldAlert } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { APP_VERSION_LABEL } from "@/lib/app-version";

export default function PwaErrorPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--background)] px-6">
      <div className="w-full max-w-md text-center">
        <BrandLogo className="justify-center" />
        <div className="mx-auto mt-8 grid size-16 place-items-center rounded-2xl bg-amber-500/10 text-amber-500"><ShieldAlert className="size-7" /></div>
        <h1 className="mt-5 text-2xl font-black">Finzaro chưa tải được</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">PWA {APP_VERSION_LABEL} gặp lỗi tạm thời khi tải dữ liệu từ máy chủ. Phiên đăng nhập không bị giả định từ Safari; bạn có thể thử lại và đăng nhập trực tiếp trong app.</p>
        <button type="button" onClick={() => window.location.assign("/pwa?source=recovery")} className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white"><RefreshCw className="size-4" /> Thử lại</button>
      </div>
    </main>
  );
}
