"use client";

import { CalendarDays } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

function formatDisplay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Chọn ngày";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function MobileDateInput({
  name,
  defaultValue,
  className,
  ariaLabel = "Chọn ngày"
}: {
  name: string;
  defaultValue: string;
  className?: string;
  ariaLabel?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div className={cn("relative h-11 w-full min-w-0 overflow-hidden rounded-[.8rem] border border-[var(--border)] bg-[var(--background)] transition focus-within:border-[var(--primary)] focus-within:shadow-[0_0_0_3px_var(--ring)]", className)}>
      <div className="pointer-events-none absolute inset-0 flex min-w-0 items-center gap-3 px-3.5">
        <CalendarDays className="size-4 shrink-0 text-[var(--primary)]" />
        <span className="min-w-0 flex-1 truncate text-[16px] sm:text-sm">{formatDisplay(value)}</span>
        <span className="shrink-0 rounded-lg bg-[var(--muted)] px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[var(--muted-foreground)]">Chọn</span>
      </div>
      <input
        type="date"
        name={name}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-label={ariaLabel}
        required
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </div>
  );
}
