"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/** Privacy control is local to the current mounted dashboard; no balance is persisted. */
export function BalanceVisibility({ amount }: { amount: string }) {
  const [visible, setVisible] = useState(true);
  return <div className="fin-available-balance mt-2 flex min-w-0 items-center gap-2">
    <p className="fin-hero-balance min-w-0 break-words text-[clamp(1.65rem,6vw,2.75rem)] font-extrabold leading-tight tracking-[-.045em] tabular-nums" aria-live="polite">
      {visible ? amount : "*****"}
    </p>
    <button type="button" onClick={() => setVisible((current) => !current)}
      className="fin-balance-visibility inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--fin-hero-muted)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
      aria-label={visible ? "Ẩn số dư khả dụng" : "Hiện số dư khả dụng"} aria-pressed={!visible}
      title={visible ? "Ẩn số dư khả dụng" : "Hiện số dư khả dụng"}>
      {visible ? <Eye className="size-5" aria-hidden="true" /> : <EyeOff className="size-5" aria-hidden="true" />}
    </button>
  </div>;
}
