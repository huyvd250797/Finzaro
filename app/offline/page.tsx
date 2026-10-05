import Link from "next/link";
import { WifiOff } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export default function OfflinePage() {
  return <main className="grid min-h-screen place-items-center px-6"><div className="max-w-md text-center"><BrandLogo className="justify-center" /><div className="mx-auto mt-8 grid size-16 place-items-center rounded-2xl bg-[var(--muted)] text-[var(--primary)]"><WifiOff className="size-7" /></div><h1 className="mt-5 text-2xl font-black">Bạn đang offline</h1><p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">Finzaro V0.1 hỗ trợ offline fallback cho PWA. Offline transaction queue sẽ được triển khai ở V0.9.2.</p><Link href="/overview" className="mt-6 inline-flex h-11 items-center rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white">Thử lại</Link></div></main>;
}
