"use client";

import type { ReactNode } from "react";

type Action = (formData: FormData) => void | Promise<void>;

export function ConfirmSubmitForm({
  action,
  confirmMessage,
  children,
  className
}: {
  action: Action;
  confirmMessage?: string | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <form
      action={action}
      className={className}
      onSubmit={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) event.preventDefault();
      }}
    >
      {children}
    </form>
  );
}
