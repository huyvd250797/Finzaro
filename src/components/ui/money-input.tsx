"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Returns a decimal string. It intentionally does not parse to Number, so callers
 * can pass the value into a decimal-safe domain engine/database boundary later.
 */
export function MoneyInput({ currency = "VND", className, value, onChange, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & { currency?: string; value: string; onChange: (decimal: string) => void }) {
  const sanitize = (raw: string) => {
    const normalized = raw.replace(/,/g, ".").replace(/[^0-9.]/g, "");
    const [whole = "", ...fraction] = normalized.split(".");
    return fraction.length ? `${whole}.${fraction.join("").slice(0, 2)}` : whole;
  };
  return (
    <div className={cn("flex h-12 items-center rounded-xl border bg-card focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15", className)}>
      <input className="money min-w-0 flex-1 bg-transparent px-3.5 text-right text-[15px] font-semibold outline-none" inputMode="decimal" value={value} onChange={(event) => onChange(sanitize(event.target.value))} {...props} />
      <span className="border-l px-3 text-xs font-semibold text-muted-foreground">{currency}</span>
    </div>
  );
}
