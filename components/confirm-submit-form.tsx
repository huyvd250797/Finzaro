"use client";

import type { ReactNode } from "react";

type Action = (formData: FormData) => void | Promise<void>;

export function ConfirmSubmitForm({
  action,
  confirmMessage,
  children,
  className,
  id
}: {
  action: Action;
  confirmMessage?: string | null;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <form
      id={id}
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
