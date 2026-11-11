import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandLogo({ compact = false, header = false, className }: { compact?: boolean; header?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center", header ? "gap-1.5" : "gap-3", className)}>
      <div className={cn("relative shrink-0", header ? "size-9 rounded-xl" : "size-11 rounded-[16px]", "overflow-hidden shadow-[0_12px_28px_-14px_rgba(0,0,0,0.42)] ring-1 ring-black/5 dark:ring-white/10")}>
        <Image src="/icons/finzaro-v0012-192.png" alt="Finzaro" fill sizes={header ? "36px" : "44px"} priority className="object-cover" />
      </div>
      {!compact && (
        <div className="min-w-0">
          <div className={cn("truncate font-extrabold tracking-tight", header ? "text-[15px]" : "text-[17px]")}>Finzaro</div>
          {!header && <div className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Smart Personal Finance</div>}
        </div>
      )}
    </div>
  );
}
