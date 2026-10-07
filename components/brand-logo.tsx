import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandLogo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative size-11 shrink-0 overflow-hidden rounded-[16px] shadow-[0_12px_28px_-14px_rgba(0,0,0,0.42)] ring-1 ring-black/5 dark:ring-white/10">
        <Image src="/icons/finzaro-v0011-192.png" alt="Finzaro" fill sizes="44px" priority className="object-cover" />
      </div>
      {!compact && (
        <div className="min-w-0">
          <div className="truncate text-[17px] font-extrabold tracking-tight">Finzaro</div>
          <div className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Smart Personal Finance</div>
        </div>
      )}
    </div>
  );
}
