import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Button({ className, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--primary)] px-4 text-sm font-bold text-white shadow-[0_10px_22px_-14px_rgba(11,143,104,.72)] transition-[transform,filter,background-color] hover:brightness-105 active:scale-[.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
