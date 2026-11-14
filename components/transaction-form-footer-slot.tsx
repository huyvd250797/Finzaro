"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useSheetFooterSlot } from "@/components/bottom-sheet";

/** Keep editing actions outside the sheet scrollport when iOS keyboard opens. */
export function TransactionFormFooterSlot({ children }: { children: ReactNode }) {
  const footer = useSheetFooterSlot();
  const actions = <div className="fin-form-footer fin-transaction-savebar flex flex-wrap justify-end gap-2">{children}</div>;
  return footer?.element ? createPortal(actions, footer.element) : actions;
}
