import { WalletCards } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandLogo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="grid size-10 place-items-center rounded-2xl bg-[var(--primary)] text-white shadow-lg shadow-emerald-500/15">
        <WalletCards className="size-5" />
      </div>
      {!compact && (
        <div>
          <div className="text-[17px] font-extrabold tracking-tight">Finzaro</div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Personal Finance</div>
        </div>
      )}
    </div>
  );
}
