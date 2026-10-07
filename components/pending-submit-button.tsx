"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

export function PendingSubmitButton({
  idleLabel,
  pendingLabel,
  className,
  disabled = false,
  title
}: {
  idleLabel: string;
  pendingLabel: string;
  className?: string;
  disabled?: boolean;
  title?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      title={title}
      disabled={disabled || pending}
      aria-busy={pending}
      className={cn(
        "inline-flex items-center justify-center gap-2 transition disabled:cursor-not-allowed disabled:opacity-65",
        className
      )}
    >
      {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
      <span>{pending ? pendingLabel : idleLabel}</span>
    </button>
  );
}
