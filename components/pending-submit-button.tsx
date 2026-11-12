"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

export function PendingSubmitButton({
  idleLabel,
  pendingLabel,
  className,
  disabled = false,
  title,
  form
}: {
  idleLabel: string;
  pendingLabel: string;
  className?: string;
  disabled?: boolean;
  title?: string;
  form?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      form={form}
      title={title}
      disabled={disabled || pending}
      aria-busy={pending}
      data-fin-submit-pending={pending ? "true" : "false"}
      className={cn(
        "inline-flex items-center justify-center gap-2 transition disabled:cursor-not-allowed disabled:opacity-65",
        className
      )}
    >
      {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
      <span aria-live="polite">{pending ? pendingLabel : idleLabel}</span>
    </button>
  );
}
