import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "default" | "compact";
export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantStyles: Record<ButtonVariant, string> = {
  primary: "fin-button-primary",
  secondary: "fin-button-secondary",
  ghost: "fin-button-ghost",
  danger: "fin-button-danger"
};

/** Finzaro v3.3: a single accessible control primitive across all themes. */
export function Button({ className, type = "button", variant = "primary", size = "default", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "fin-button inline-flex min-h-11 items-center justify-center gap-2 border px-4 text-sm font-semibold transition-[transform,background-color,border-color,box-shadow] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        variantStyles[variant], size === "compact" && "fin-button-compact min-h-9 px-3 text-xs",
        className
      )}
      {...props}
    />
  );
}
