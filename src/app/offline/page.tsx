import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-muted"><WifiOff className="size-6" /></div>
        <h1 className="text-2xl font-bold">Bạn đang offline</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">V0.1.0 chỉ cache app shell an toàn. Queue giao dịch offline sẽ được triển khai ở V0.6.0.</p>
        <Button asChild className="mt-5"><Link href="/">Thử lại</Link></Button>
      </div>
    </main>
  );
}
